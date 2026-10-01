import {db,atomic,audit} from './database.ts';
import {donorPhone} from './donation-workflow-shared.ts';
import {donationQuery} from './donation-service.ts';
export const donorCategories=['Donatur Tetap','Donatur Tidak Tetap'];
const profileFields=['address','city','province','occupation','institution','email','notes','description'];
function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
const aggregate=`WITH stats AS (SELECT donor_id, SUM(CASE WHEN status='valid' THEN CAST(json_extract(data,'$.amount') AS INTEGER) ELSE 0 END) total, SUM(CASE WHEN status='valid' THEN 1 ELSE 0 END) transactions,MAX(COALESCE(NULLIF(json_extract(data,'$.date'),''),substr(created_at,1,10))) last_donation FROM donation_transactions WHERE deleted_at IS NULL GROUP BY donor_id), master AS (SELECT d.*,COALESCE(s.total,0) total,COALESCE(s.transactions,0) transactions,s.last_donation FROM donors d LEFT JOIN stats s ON s.donor_id=d.id WHERE d.merged_into IS NULL)`;
export function supportedPrograms(id:string){return db.prepare(`SELECT COALESCE(p.id,'general') id,COALESCE(p.title,'Donasi Umum') title,COALESCE(NULLIF(json_extract(p.data,'$.category'),''),'Belum dikategorikan') category,SUM(CASE WHEN t.status='valid' THEN CAST(json_extract(t.data,'$.amount') AS INTEGER) ELSE 0 END) total FROM donation_transactions t LEFT JOIN donation_programs p ON p.id=t.program_id WHERE t.donor_id=? AND t.deleted_at IS NULL GROUP BY COALESCE(p.id,'general') ORDER BY total DESC,title`).all(id);}
function unpack(row:any){return {...row,...JSON.parse(row.profile),programs:supportedPrograms(row.id)};}
export function donorQuery(q:URLSearchParams,all=false){
 const where=['1=1'],args:any[]=[],labels:string[]=[];
 const add=(sql:string,value:any,label:string)=>{where.push(sql);args.push(value);labels.push(label+': '+value);};
 for(const [key,col,label] of [['name','name','Nama'],['category','category','Kategori Donatur'],['source','source','Sumber']])if(q.get(key))add(`d.${col} ${key==='name'?'LIKE':'='} ?`,key==='name'?'%'+q.get(key)+'%':q.get(key),label);
 if(q.get('phone')){let phone=q.get('phone')!.replace(/\D/g,'');if(phone.startsWith('62'))phone='0'+phone.slice(2);add('EXISTS(SELECT 1 FROM donor_phones ph WHERE ph.donor_id=d.id AND ph.phone LIKE ?)','%'+phone+'%','Telepon');}
 for(const [key,col,op,label] of [['registered_from','substr(d.created_at,1,10)','>=','Terdaftar mulai'],['registered_to','substr(d.created_at,1,10)','<=','Terdaftar sampai'],['min','d.total','>=','Minimum'],['max','d.total','<=','Maksimum']])if(q.get(key)){const value=key==='min'||key==='max'?Number(q.get(key)):q.get(key);if(typeof value==='number'&&(!Number.isFinite(value)||value<0))fail('Filter nominal tidak valid.');add(`${col}${op}?`,value,label);}
 for(const key of ['address','email'])if(q.get(key)){where.push(`COALESCE(json_extract(d.profile,'$.${key}'),'')${q.get(key)==='yes'?'<>':'='}''`);labels.push((key==='address'?'Alamat':'Email')+': '+(q.get(key)==='yes'?'Ada':'Belum ada'));}
 const tx=['t.donor_id=d.id','t.deleted_at IS NULL'];const txArgs:any[]=[];
 for(const [key,sql,label] of [['program',"COALESCE(t.program_id,'')=?",'Program'],['donation_category',"COALESCE(NULLIF(json_extract(p.data,'$.category'),''),'Belum dikategorikan')=?",'Kategori Donasi'],['from',"json_extract(t.data,'$.date')>=?",'Pernah donasi mulai'],['to',"json_extract(t.data,'$.date')<=?",'Pernah donasi sampai']])if(q.get(key)){const v=q.get(key)!;tx.push(sql);txArgs.push(v==='general'?'':v);const program=key==='program'?db.prepare('SELECT title FROM donation_programs WHERE id=?').get(v) as any:null;labels.push(label+': '+(program?.title||(v==='general'?'Donasi Umum':v)));}
 if(txArgs.length){where.push(`EXISTS(SELECT 1 FROM donation_transactions t LEFT JOIN donation_programs p ON p.id=t.program_id WHERE ${tx.join(' AND ')})`);args.push(...txArgs);}
 const from=`FROM master d WHERE ${where.join(' AND ')}`;
 const summary=db.prepare(`${aggregate} SELECT COUNT(*) count,COALESCE(SUM(total),0) total,SUM(category='Donatur Tetap') regular,SUM(category='Donatur Tidak Tetap') occasional ${from}`).get(...args) as any;
 if(all&&summary.count>25000)fail('Persempit filter hingga maksimal 25.000 donatur.');
 const sorts:Record<string,string>={name:'name COLLATE NOCASE',created_at:'created_at',last_donation:'last_donation',total:'total'};
 const sort=sorts[q.get('sort')||'']||'created_at',direction=q.get('direction')==='asc'?'ASC':'DESC';
 const page=Math.max(1,Math.min(Math.ceil(summary.count/20)||1,Math.trunc(Number(q.get('page')))||1));
 const rows=db.prepare(`${aggregate} SELECT d.* ${from} ORDER BY ${sort} ${direction},id ${all?'':'LIMIT 20 OFFSET ?'}`).all(...args,...(all?[]:[(page-1)*20])).map(unpack);
 return {...summary,rows,page,labels};
}
export function getDonor(id:string,q=new URLSearchParams()){
 const row=db.prepare(`${aggregate} SELECT * FROM master WHERE id=?`).get(id);if(!row)fail('Donatur tidak ditemukan.',404);
 const filter=new URLSearchParams(q);filter.set('donor',id);return {...unpack(row),history:donationQuery(filter)};
}
export function phoneOwner(value:string){const phone=donorPhone(value);return db.prepare('SELECT d.id,d.name FROM donor_phones ph JOIN donors d ON d.id=ph.donor_id WHERE ph.phone=?').get(phone);}
export function saveDonor(input:any,actor:string,id?:string){return atomic(()=>{
 const old=id?db.prepare('SELECT * FROM donors WHERE id=? AND merged_into IS NULL').get(id) as any:null;if(id&&!old)fail('Donatur tidak ditemukan.',404);
 const name=String(input.name||'').trim().slice(0,200);if(!name)fail('Nama donatur wajib diisi.');const phone=input.phone?donorPhone(input.phone):'';if(!phone&&!old)fail('Nomor WhatsApp / Telepon wajib diisi.');
 const owner=phone?phoneOwner(phone) as any:null;if(owner&&owner.id!==id)fail(`Nomor ini sudah terdaftar atas nama ${owner.name}.`,409);
 const category=String(input.category||'Donatur Tidak Tetap');if(!donorCategories.includes(category))fail('Kategori donatur tidak valid.');
 const profile:any={};for(const key of profileFields)profile[key]=String(input[key]||'').trim().slice(0,4000);if(profile.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))fail('Email tidak valid.');
 const now=new Date().toISOString();id ||=crypto.randomUUID();
 if(old)db.prepare('UPDATE donors SET name=?,phone=?,category=?,profile=?,updated_at=? WHERE id=?').run(name,phone,category,JSON.stringify(profile),now,id);
 else db.prepare('INSERT INTO donors(id,name,phone,category,source,profile,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,name,phone,category,'admin',JSON.stringify(profile),now,now);
 if(phone)db.prepare('INSERT OR IGNORE INTO donor_phones VALUES(?,?)').run(phone,id);
 audit(actor,old?'update':'create','donors',id,{before:old,after:{name,phone,category,...profile}});return {id};
 });}
export function mergeDonors(source:string,target:string,actor:string){return atomic(()=>{
 if(source===target)fail('Pilih dua donatur yang berbeda.');
 const a=db.prepare('SELECT * FROM donors WHERE id=? AND merged_into IS NULL').get(source) as any,b=db.prepare('SELECT * FROM donors WHERE id=? AND merged_into IS NULL').get(target) as any;if(!a||!b)fail('Donatur tidak ditemukan.',404);
 const profile=JSON.parse(b.profile),other=JSON.parse(a.profile);const conflicts:string[]=[];for(const key of profileFields)if(other[key]){if(!profile[key])profile[key]=other[key];else if(profile[key]!==other[key])conflicts.push(key+': '+other[key]);}if(conflicts.length)profile.notes=[profile.notes,'Data tambahan dari '+a.name+':',...conflicts].filter(Boolean).join('\n');
 db.prepare('UPDATE donation_transactions SET donor_id=? WHERE donor_id=?').run(target,source);db.prepare('UPDATE donor_phones SET donor_id=? WHERE donor_id=?').run(target,source);
 const now=new Date().toISOString();db.prepare('UPDATE donors SET profile=?,created_at=?,updated_at=? WHERE id=?').run(JSON.stringify(profile),a.created_at<b.created_at?a.created_at:b.created_at,now,target);
 db.prepare('UPDATE donors SET merged_into=?,updated_at=? WHERE id=?').run(target,now,source);audit(actor,'merge','donors',target,{source:a,target:b});return {id:target};
 });}


