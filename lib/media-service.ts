import {inspectOfficeDocument} from './office-document.ts';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,existsSync,mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve,extname,basename} from 'node:path';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {backup} from 'node:sqlite';
import {db,atomic,audit} from './database.ts';
import {modules} from './modules.ts';
export const reusedMessage='Gambar ini sudah tersedia di Media Library. Media yang sudah ada digunakan kembali.';
export function mediaPath(url:string){if(!/^\/(uploads|media)\/[\w.-]+$/.test(url))throw new Error('Lokasi media tidak valid.');return resolve('public',url.slice(1));}
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
export async function indexMedia(){
 for(const r of db.prepare('SELECT * FROM media WHERE private=0 AND file_hash IS NULL').all() as any[]){
  const file=mediaPath(r.url);if(!existsSync(file))continue;const bytes=readFileSync(file);let width=null,height=null;
  if(r.mime.startsWith('image/'))try{const m=await sharp(bytes,{limitInputPixels:40000000}).metadata();width=m.width||null;height=m.height||null;}catch{}
  db.prepare('UPDATE media SET file_hash=?,width=?,height=? WHERE id=?').run(hash(bytes),width,height,r.id);
 }
}
export async function storePublicMedia(file:File,actor:string){
 if(!file.size||file.size>10*1024*1024)throw new Error('Batas ukuran unggahan 10 MB.');
 const bytes=Buffer.from(await file.arrayBuffer()),extension=extname(file.name).toLowerCase();let mime='',ext='',width:number|null=null,height:number|null=null;
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){mime='image/png';ext='.png';}
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){mime='image/jpeg';ext='.jpg';}
 else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){mime='image/webp';ext='.webp';}
 else if(bytes.toString('ascii',0,5)==='%PDF-'){mime='application/pdf';ext='.pdf';}
 if(!mime){mime=await inspectOfficeDocument(bytes,extension);if(mime)ext=extension;}
 if(!mime||file.type!==mime||!(extension===ext||ext==='.jpg'&&extension==='.jpeg'))throw new Error('Ekstensi, tipe, dan isi berkas tidak cocok.');
 if(mime.startsWith('image/')){try{const image=sharp(bytes,{limitInputPixels:40000000});const m=await image.metadata();if((m.pages||1)>1)throw new Error();await image.stats();width=m.width||null;height=m.height||null;}catch{throw new Error('Gambar tidak dapat dibaca atau resolusinya terlalu besar.');}}
 else if(mime==='application/pdf'){try{const pdf=await PDFDocument.load(bytes);if(pdf.isEncrypted)throw new Error();for(const [,object] of pdf.context.enumerateIndirectObjects())if(/\/(JavaScript|JS|Launch|EmbeddedFiles|OpenAction|AA)\b/.test(String(object)))throw new Error();}catch{throw new Error('PDF tidak valid atau berisi aksi aktif.');}}
 await indexMedia();const digest=hash(bytes);
 return atomic(()=>{
  const candidates=db.prepare('SELECT * FROM media WHERE private=0 AND file_hash=? ORDER BY created_at,id').all(digest) as any[];
  for(const existing of candidates)if(existsSync(mediaPath(existing.url))&&hash(readFileSync(mediaPath(existing.url)))===digest){audit(actor,'media.reuse','media',existing.id);return {...existing,reused:true,message:reusedMessage};}
  const id=randomUUID(),url=`/uploads/${id}${ext}`,title=basename(file.name).replace(/[\x00-\x1f]/g,'').slice(0,180),now=new Date().toISOString();mkdirSync(resolve('public/uploads'),{recursive:true});
  writeFileSync(mediaPath(url),bytes,{flag:'wx'});
  try{db.prepare('INSERT INTO media(id,title,url,mime,size,private,created_at,file_hash,width,height) VALUES(?,?,?,?,?,0,?,?,?,?)').run(id,title,url,mime,bytes.length,now,digest,width,height);audit(actor,'upload','media',id,{title,size:bytes.length});}catch(error){unlinkSync(mediaPath(url));throw error;}
  return {id,title,url,mime,size:bytes.length,created_at:now,file_hash:digest,width,height,reused:false};
 });
}
function urlsFor(row:any){return [row.url,...(db.prepare('SELECT old_url FROM media_aliases WHERE media_id=?').all(row.id) as any[]).map(r=>r.old_url)];}
function mentions(value:unknown,url:string):boolean{if(typeof value==='string')return value.includes('src='+encodeURIComponent(url))||value===url||value.includes('"'+url+'"')||value.includes("'"+url+"'")||value.includes(url+'?')||value.includes(url+'#');if(Array.isArray(value))return value.some(v=>mentions(v,url));if(value&&typeof value==='object')return Object.values(value).some(v=>mentions(v,url));return false;}
export function mediaUsage(row:any){const urls=urlsFor(row),uses:any[]=[];
 for(const [name,m] of Object.entries(modules))for(const r of db.prepare(`SELECT id,title,data,deleted_at FROM ${name}`).all() as any[])if(urls.some(url=>mentions(JSON.parse(r.data),url)))uses.push({module:name,title:r.title,label:m.title,archived:!!r.deleted_at,id:r.id});
 for(const r of db.prepare('SELECT transaction_id,snapshot FROM donation_receipts').all() as any[])if(urls.some(url=>mentions(JSON.parse(r.snapshot),url)))uses.push({module:'donation_transactions',title:'Arsip bukti penerimaan donasi',label:'Kwitansi',archived:true,id:r.transaction_id});
 return uses;
}
export async function listMedia(permissions:string[]){await indexMedia();const rows=db.prepare('SELECT * FROM media WHERE private=0 ORDER BY created_at DESC').all() as any[];const counts=new Map<string,number>();for(const r of rows)if(r.file_hash)counts.set(r.file_hash,(counts.get(r.file_hash)||0)+1);
 return rows.map(r=>({...r,protected:!r.url.startsWith('/uploads/'),duplicates:r.file_hash?(counts.get(r.file_hash)||1)-1:0,usage:mediaUsage(r).map(u=>permissions.includes(modules[u.module]?.permission)?u:{label:'Konten terlindungi',title:'Digunakan oleh modul lain',archived:u.archived}),usageCount:mediaUsage(r).length}));
}
export function deleteMedia(id:string,actor:string){return atomic(()=>{const row=db.prepare('SELECT * FROM media WHERE id=? AND private=0').get(id) as any;if(!row)throw new Error('Media tidak ditemukan.');const uses=mediaUsage(row);if(uses.length)throw new Error(`Media digunakan di ${uses.length} tempat, termasuk arsip. Lihat penggunaan sebelum menghapus.`);if(!row.url.startsWith('/uploads/'))throw new Error('Aset bawaan website dilindungi.');if(existsSync(mediaPath(row.url)))unlinkSync(mediaPath(row.url));db.prepare('DELETE FROM media WHERE id=?').run(id);audit(actor,'delete','media',id);return {ok:true};});}
function replaceReference(value:any,from:string,to:string):any{if(typeof value==='string'){if(value===from)return to;return value.split('src='+encodeURIComponent(from)).join('src='+encodeURIComponent(to)).split('"'+from+'"').join('"'+to+'"').split("'"+from+"'").join("'"+to+"'").split(from+'?').join(to+'?').split(from+'#').join(to+'#');}if(Array.isArray(value))return value.map(v=>replaceReference(v,from,to));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceReference(v,from,to)]));return value;}
export async function mergeMedia(ids:string[],actor:string){
 if(!Array.isArray(ids)||ids.length<2||ids.length>100||new Set(ids).size!==ids.length)throw new Error('Pilih minimal dua media identik.');
 mkdirSync(resolve('data/backups'),{recursive:true});await backup(db,resolve('data/backups',`media-${Date.now()}-${randomUUID()}.sqlite`));
 return atomic(()=>{const rows=ids.map(id=>db.prepare('SELECT * FROM media WHERE id=? AND private=0').get(id) as any);if(rows.some(r=>!r))throw new Error('Media tidak ditemukan.');rows.sort((a,b)=>Number(b.url.startsWith('/media/'))-Number(a.url.startsWith('/media/'))||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));const canonical=rows[0],digest=hash(readFileSync(mediaPath(canonical.url)));
 if(rows.some(r=>hash(readFileSync(mediaPath(r.url)))!==digest))throw new Error('Isi media berbeda. Penggabungan dibatalkan.');
 for(const duplicate of rows.slice(1)){if(!duplicate.url.startsWith('/uploads/'))throw new Error('Aset bawaan tidak digabungkan otomatis.');
  for(const name of Object.keys(modules))for(const r of db.prepare(`SELECT id,data FROM ${name}`).all() as any[]){const value=JSON.parse(r.data),next=replaceReference(value,duplicate.url,canonical.url);if(JSON.stringify(next)!==JSON.stringify(value))db.prepare(`UPDATE ${name} SET data=? WHERE id=?`).run(JSON.stringify(next),r.id);}
  db.prepare('UPDATE media_aliases SET media_id=? WHERE media_id=?').run(canonical.id,duplicate.id);
  db.prepare('INSERT OR REPLACE INTO media_aliases(old_url,media_id) VALUES(?,?)').run(duplicate.url,canonical.id);
  db.prepare('INSERT OR REPLACE INTO media_cleanup VALUES(?,?,?)').run(duplicate.url,digest,canonical.url);
  db.prepare('DELETE FROM media WHERE id=?').run(duplicate.id);
 }
 audit(actor,'media.merge','media',canonical.id,{ids,canonical:canonical.url});return {ok:true,canonical:canonical.url,merged:rows.length-1};});
}
export function cleanupMergedMedia(){let removed=0;for(const r of db.prepare('SELECT * FROM media_cleanup').all() as any[]){const canonical=db.prepare('SELECT * FROM media WHERE url=? AND private=0').get(r.canonical_url) as any;if(!canonical||!existsSync(mediaPath(r.canonical_url))||hash(readFileSync(mediaPath(r.canonical_url)))!==r.file_hash)continue;if(db.prepare('SELECT id FROM media WHERE url=?').get(r.url))continue;const alias=db.prepare('SELECT media_id FROM media_aliases WHERE old_url=?').get(r.url) as any;if(alias?.media_id!==canonical.id)continue;const path=mediaPath(r.url);if(existsSync(path)){if(hash(readFileSync(path))!==r.file_hash)continue;unlinkSync(path);}db.prepare('DELETE FROM media_cleanup WHERE url=?').run(r.url);removed++;}return removed;}
