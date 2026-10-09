import {sqlSort} from './list-sort.ts';
import {searchTokens,searchPattern,dateSearchSql} from './list-search.ts';
import {eligibleAccounts} from './account-usage.ts';
import {db,decode,records,saveRecord,audit,atomic} from './database.ts';
import {donorPhone,donationStatuses} from './donation-workflow-shared.ts';
import {normalizeDonorName} from './donation-identity.ts';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve,extname,dirname} from 'node:path';
import sharp from 'sharp';
import {PDFDocument,PDFDict,PDFName} from 'pdf-lib';
export const privateDirectory=resolve(process.env.DARUL_HUDA_PRIVATE_DIR||'data/private');
function reject(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
const attempts=new Map<string,{count:number;until:number}>();
export async function submitDonation(request:Request){
 if(Number(request.headers.get('content-length')||0)>6*1024*1024)reject('Bukti transfer maksimal 5 MB.');
 const chunks:Uint8Array[]=[];let length=0;const reader=request.body?.getReader();if(!reader)reject('Formulir kosong.');
 while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>6*1024*1024){await reader.cancel();reject('Bukti transfer maksimal 5 MB.');}chunks.push(value);}
 const f=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData(),phone=donorPhone(f.get('donor_phone')),key=String(f.get('submission_key')||'');
 if(!/^[a-f0-9-]{36}$/.test(key))reject('Muat ulang formulir lalu coba kembali.');
 const existing=db.prepare("SELECT data FROM donation_transactions WHERE json_extract(data,'$.submission_key')=?").get(key) as any;
 if(existing){const d=JSON.parse(existing.data);if(d.donor_phone!==phone)reject('Permintaan tidak valid.');return {transaction_code:d.transaction_code,status:'pending'};}
 const now=Date.now();for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
 const a=attempts.get(phone)||{count:0,until:now+3600000};if(a.count>=5)reject('Terlalu banyak konfirmasi. Silakan hubungi admin donasi.',429);a.count++;attempts.set(phone,a);
 const programId=String(f.get('programId')||''),accountId=String(f.get('accountId')||'');
 const program=records('donation_programs').find(r=>r.id===programId);
 if(programId&&(!program||['closed','completed'].includes(program.status)))reject('Program tidak menerima donasi saat ini.');
 const account=eligibleAccounts(records('donation_accounts'),program).find(r=>r.id===accountId);if(!account)reject('Pilih rekening tujuan yang tersedia.');
 const amount=Number(f.get('amount'));if(!Number.isSafeInteger(amount)||amount<=0||amount>1e12)reject('Nominal donasi harus rupiah bulat antara Rp1 dan Rp1 triliun.');
 const date=String(f.get('date')||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||date>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}))reject('Tanggal transfer tidak valid.');
 const source=String(f.get('source_page')||'/donasi');if(!/^\/donasi(?:\/[\w-]+)?$/.test(source))reject('Sumber halaman tidak valid.');
 const file=f.get('proof');if(!(file instanceof File)||!file.size||file.size>5*1024*1024)reject('Unggah bukti transfer PNG, JPG, WEBP, atau PDF maksimal 5 MB.');
 const types:Record<string,string[]>={'image/png':['.png'],'image/jpeg':['.jpg','.jpeg'],'image/webp':['.webp'],'application/pdf':['.pdf']};
 if(!types[file.type]?.includes(extname(file.name).toLowerCase()))reject('Tipe dan ekstensi bukti transfer tidak cocok.');
 let bytes:Buffer=Buffer.from(await file.arrayBuffer()),mime=file.type,extension=extname(file.name).toLowerCase();
 if(mime==='application/pdf'){
  const raw=bytes.toString('latin1');if(!raw.startsWith('%PDF-')||!raw.slice(-1024).includes('%%EOF')||/\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)\b/i.test(raw))reject('PDF tidak valid atau berisi konten aktif. Gunakan gambar bukti transfer.');
  try{const document=await PDFDocument.load(bytes,{throwOnInvalidObject:true});if(document.isEncrypted||document.getPageCount()<1||document.getPageCount()>10)throw new Error();
   // Inspect decoded objects too: compressed object streams can hide action dictionaries.
   const seen=new Set<unknown>();const inspect=(value:any)=>{if(!value||seen.has(value))return;seen.add(value);if(value instanceof PDFName&&/^(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA|RichMedia|XFA|SubmitForm|ImportData|GoToR|URI)$/.test(value.decodeText()))throw new Error();if(value instanceof PDFDict)for(const [k,v] of value.entries()){inspect(k);inspect(v);}else if(typeof value.asArray==='function')for(const v of value.asArray())inspect(v);if(value.dict)inspect(value.dict);};
   for(const [,object] of document.context.enumerateIndirectObjects())inspect(object);
  }catch{reject('PDF tidak valid, terkunci, atau berisi konten aktif. Gunakan gambar bukti transfer.');}
 }else{try{const image=sharp(bytes,{limitInputPixels:25000000}),meta=await image.metadata();if(mime!=='image/'+meta.format)throw new Error();bytes=await image.rotate().webp({quality:95}).toBuffer();mime='image/webp';extension='.webp';}catch{reject('Bukti transfer bukan gambar yang valid.');}}
 const retry=db.prepare("SELECT data FROM donation_transactions WHERE json_extract(data,'$.submission_key')=?").get(key) as any;
 if(retry){const data=JSON.parse(retry.data);if(data.donor_phone!==phone)reject('Permintaan tidak valid.');return {transaction_code:data.transaction_code,status:'pending'};}
 const id=randomUUID(),target=resolve(privateDirectory,id+extension),url='/api/private-media/'+id,time=new Date().toISOString();mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes,{flag:'wx'});
 try{
 db.prepare('INSERT INTO media(id,title,url,mime,size,private,created_at) VALUES(?,?,?,?,?,?,?)').run(id,'bukti-transfer'+extension,url,mime,bytes.length,1,time);
 const anonymous=f.get('anonymous')!=='false',name=normalizeDonorName(anonymous?'':String(f.get('donor_name')||'').slice(0,200));
 const transaction=saveRecord('donation_transactions',{title:'Konfirmasi donasi '+id,slug:'donasi-'+id,status:'pending',kind:'Pemasukan',programId,accountId,donor_name:name,donor_phone:phone,anonymous,publicName:!anonymous&&f.get('publicName')==='true',amount,date,proof:url,source_page:source,submission_key:key},'public');
 return {transaction_code:transaction.transaction_code,status:'pending'};
 }catch(error){if(!db.prepare("SELECT id FROM donation_transactions WHERE json_extract(data,'$.proof')=?").get(url)){db.prepare('DELETE FROM media WHERE id=?').run(id);unlinkSync(target);}throw error;}
}
export function getDonation(id:string){const row=db.prepare('SELECT * FROM donation_transactions WHERE id=? AND deleted_at IS NULL').get(id);if(!row)reject('Transaksi tidak ditemukan.',404);const r=decode(row),p=db.prepare('SELECT title FROM donation_programs WHERE id=?').get(r.programId||'') as any,a=db.prepare('SELECT data FROM donation_accounts WHERE id=?').get(r.accountId||'') as any;
 const receipt=db.prepare('SELECT receipt_number,receipt_generated_at,token FROM donation_receipts WHERE transaction_id=?').get(id) as any;
 const proof=r.proof?db.prepare('SELECT title,mime,size,created_at FROM media WHERE url=? AND private=1').get(r.proof):null;
 const history=db.prepare("SELECT a.id,a.action,a.created_at,a.details,COALESCE(u.name,CASE WHEN a.actor='public' THEN 'Donatur' ELSE 'Sistem' END) actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor WHERE a.entity='donation_transactions' AND a.entity_id=? ORDER BY a.id DESC").all(id).map((h:any)=>{const d=JSON.parse(h.details||'{}');return {id:h.id,action:h.action,date:h.created_at,actor:h.actor_name,before:d.before?.status||'',after:d.after?.status||'',note:d.after?.note||''};});
 return {...r,program:p?.title||'Donasi Umum',account:a?JSON.parse(a.data):{},receipt,proofInfo:proof,history};}
export function verifyDonation(id:string,input:any,actor:string){const r=getDonation(id),status=String(input.status||'');if(!['valid','correction','rejected','void'].includes(status))reject('Status tidak valid.');if(['void','rejected'].includes(r.status))reject('Transaksi ini sudah ditutup.');if(r.status==='valid'&&status!=='void')reject('Transaksi terverifikasi hanya dapat dibatalkan dengan alasan.');if(status!=='valid'&&!String(input.note||'').trim())reject('Isi alasan perubahan status.');saveRecord('donation_transactions',{...r,status,note:String(input.note||'').trim().slice(0,2000)},actor);return getDonation(id);}
export function receiptByToken(token:string){if(!/^[a-f0-9]{64}$/.test(token))reject('Kwitansi tidak ditemukan.',404);const r=db.prepare('SELECT r.snapshot,t.status FROM donation_receipts r JOIN donation_transactions t ON t.id=r.transaction_id WHERE r.token=? AND t.deleted_at IS NULL').get(token) as any;if(!r)reject('Kwitansi tidak ditemukan.',404);return {...JSON.parse(r.snapshot),status:r.status};}
export function donationQuery(q:URLSearchParams,exportAll=false){
 const conditions=['t.deleted_at IS NULL'],args:any[]=[],labels:string[]=[];
 const add=(sql:string,value:any,label:string)=>{conditions.push(sql);args.push(value);labels.push(label);};
 if(q.get('donor'))add('t.donor_id=?',q.get('donor'),'ID Donatur: '+q.get('donor'));
 if(q.get('q')){for(const term of searchTokens(q.get('q')!)){conditions.push(`(COALESCE(json_extract(t.data,'$.donor_name'),'') || ' ' || COALESCE(json_extract(t.data,'$.donor_phone'),'') || ' ' || COALESCE(p.title,'Donasi Umum') || ' ' || COALESCE(json_extract(p.data,'$.category'),'') || ' ' || COALESCE(json_extract(t.data,'$.amount'),'') || ' ' || COALESCE(json_extract(a.data,'$.bank'),'') || ' ' || COALESCE(json_extract(t.data,'$.transaction_code'),'') || ' ' || COALESCE(r.receipt_number,'') || ' ' || t.status || ' ' || CASE t.status WHEN 'valid' THEN 'terverifikasi' WHEN 'pending' THEN 'menunggu verifikasi' WHEN 'draft' THEN 'menunggu verifikasi' WHEN 'void' THEN 'dibatalkan' WHEN 'rejected' THEN 'ditolak' WHEN 'correction' THEN 'perlu koreksi' ELSE '' END || ' ' || ${dateSearchSql("COALESCE(NULLIF(json_extract(t.data,'$.date'),''),t.created_at)")}) LIKE ? ESCAPE '\\'`);args.push(searchPattern(term));}labels.push('Pencarian: '+q.get('q'));}

 for(const [key,sql,label] of [['from',"json_extract(t.data,'$.date')>=?",'Mulai'],['to',"json_extract(t.data,'$.date')<=?",'Sampai'],['program',"COALESCE(t.program_id,'')=?",'Program'],['bank',"json_extract(t.data,'$.accountId')=?",'Rekening'],['source',"json_extract(t.data,'$.source_page')=?",'Sumber'],['category',"COALESCE(NULLIF(json_extract(p.data,'$.category'),''),'Belum dikategorikan')=?",'Kategori']] as const){const value=q.get(key);if(value){const v=value==='general'?'':value;let display=value;if(key==='program')display=value==='general'?'Donasi Umum':(db.prepare('SELECT title FROM donation_programs WHERE id=?').get(v) as any)?.title||value;if(key==='bank')display=(db.prepare('SELECT title FROM donation_accounts WHERE id=?').get(v) as any)?.title||value;add(sql,v,label+': '+display);}}
 if(q.get('status')){if(q.get('status')==='pending'){conditions.push("t.status IN ('pending','draft')");labels.push('Status: Menunggu Verifikasi');}else add('t.status=?',q.get('status'),'Status: '+(donationStatuses[q.get('status')!]||q.get('status')));}
 for(const [key,op,label] of [['min','>=','Minimum'],['max','<=','Maksimum']])if(q.get(key)){const value=Number(q.get(key));if(!Number.isFinite(value))reject('Filter nominal tidak valid.');add(`CAST(json_extract(t.data,'$.amount') AS INTEGER)${op}?`,value,label+': '+value);}
 if(q.get('anonymous'))add("CASE WHEN json_extract(t.data,'$.anonymous')=1 OR json_extract(t.data,'$.donor_name')='Hamba Allah' THEN 1 ELSE 0 END=?",q.get('anonymous')==='yes'?1:0,'Anonim: '+(q.get('anonymous')==='yes'?'Ya':'Tidak'));
 if(q.get('proof')){conditions.push(`COALESCE(json_extract(t.data,'$.proof'),'')${q.get('proof')==='yes'?'<>':'='}''`);labels.push('Bukti: '+(q.get('proof')==='yes'?'Ada':'Belum ada'));}
 if(q.has('ids')){const ids=[...new Set(q.get('ids')!.split(',').filter(Boolean))];if(!ids.length||ids.length>100)throw new Error('Pilih antara 1 dan 100 data.');conditions.push(`t.id IN (${ids.map(()=>'?').join(',')})`);args.push(...ids);labels.push(ids.length+' data dipilih');}
 const from=`FROM donation_transactions t LEFT JOIN donation_programs p ON p.id=t.program_id LEFT JOIN donation_receipts r ON r.transaction_id=t.id LEFT JOIN donation_accounts a ON a.id=json_extract(t.data,'$.accountId') WHERE ${conditions.join(' AND ')}`;
 const summary=db.prepare(`SELECT COUNT(*) count,COALESCE(SUM(CASE WHEN t.status='valid' THEN CAST(json_extract(t.data,'$.amount') AS INTEGER) ELSE 0 END),0) total ${from}`).get(...args) as any;
 const page=Math.max(1,Math.min(Math.ceil(Number(summary.count)/20)||1,Math.trunc(Number(q.get('page')))||1));
 if(exportAll&&summary.count>25000)reject('Persempit filter ekspor hingga maksimal 25.000 transaksi.');
 const order=sqlSort(q,{date:"COALESCE(NULLIF(json_extract(t.data,'$.date'),''),t.created_at)",donor:"COALESCE(NULLIF(json_extract(t.data,'$.donor_name'),''),'Hamba Allah') COLLATE NOCASE",program:"COALESCE(p.title,'Donasi Umum') COLLATE NOCASE",amount:"CAST(json_extract(t.data,'$.amount') AS INTEGER)",bank:"COALESCE(json_extract(a.data,'$.bank'),'') COLLATE NOCASE",status:"CASE t.status WHEN 'valid' THEN 'Terverifikasi' WHEN 'pending' THEN 'Menunggu Verifikasi' WHEN 'draft' THEN 'Menunggu Verifikasi' WHEN 'void' THEN 'Dibatalkan' WHEN 'rejected' THEN 'Ditolak' WHEN 'correction' THEN 'Perlu Koreksi' ELSE t.status END"},'t.created_at DESC');
 const rows=(db.prepare(`SELECT t.*,COALESCE(p.title,'Donasi Umum') program,r.receipt_number,r.token ${from} ORDER BY ${order},t.id DESC ${exportAll?'':'LIMIT 20 OFFSET ?'}`).all(...args,...(exportAll?[]:[(page-1)*20])) as any[]).map(decode);
 const categoryReport=db.prepare(`SELECT COALESCE(NULLIF(json_extract(p.data,'$.category'),''),'Belum dikategorikan') category,COUNT(*) count,COALESCE(SUM(CASE WHEN t.status='valid' THEN CAST(json_extract(t.data,'$.amount') AS INTEGER) ELSE 0 END),0) total ${from} GROUP BY category`).all(...args);
 const accounts=records('donation_accounts',true);return {rows:rows.map(r=>({...r,bank:accounts.find(a=>a.id===r.accountId)?.bank||'',number:accounts.find(a=>a.id===r.accountId)?.number||''})),count:Number(summary.count),total:Number(summary.total),page,labels,categoryReport};
}




