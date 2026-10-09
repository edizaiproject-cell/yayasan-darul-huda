import {sqlSort} from './list-sort.ts';
import {db,records} from './database.ts';
import {modules} from './modules.ts';
import {searchTokens,searchPattern,dateSearchSql} from './list-search.ts';
export function adminList(name:string,q:URLSearchParams,all=false){
 if(['users','audit'].includes(name)){
 const isUser=name==='users',table=isUser?'users':'audit_logs',columns=isUser?'id,email,name,role_id,active,must_change,created_at':'id,actor,action,entity,entity_id,details,created_at';
 const haystack=isUser?"id || ' ' || email || ' ' || name || ' ' || role_id || ' ' || CASE active WHEN 1 THEN 'aktif' ELSE 'nonaktif' END":"COALESCE(actor,'') || ' ' || action || ' ' || entity || ' ' || details";
 const terms=searchTokens(q.get('q')||''),where=terms.map(()=>`(${haystack} || ' ' || ${dateSearchSql('created_at')}) LIKE ? ESCAPE '\\'`).join(' AND ')||'1=1',args:any[]=terms.map(searchPattern);
 const chosen=q.has('ids')?q.get('ids')!.split(',').filter(Boolean):[];if(q.has('ids')&&(!chosen.length||chosen.length>100))throw new Error('Pilih antara 1 dan 100 data.');
 let extra=(isUser?' AND id NOT IN (SELECT id FROM deleted_users)':'')+(chosen.length?' AND id IN ('+chosen.map(()=>'?').join(',')+')':'');args.push(...chosen);if(isUser&&q.get('status')){extra+=' AND active=?';args.push(q.get('status')==='active'?1:0)}if(isUser&&q.get('category')){extra+=' AND role_id=?';args.push(q.get('category'))}
 const count=Number((db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${where}${extra}`).get(...args) as any).n),page=Math.max(1,Math.min(Math.ceil(count/12)||1,Math.trunc(Number(q.get('page')))||1));
 if(all&&count>25000)throw new Error('Persempit filter ekspor hingga maksimal 25.000 data.');
 const order=sqlSort(q,isUser?{name:'name COLLATE NOCASE',email:'email COLLATE NOCASE',role_id:'role_id COLLATE NOCASE',active:"CASE active WHEN 1 THEN 'Aktif' ELSE 'Nonaktif' END",created_at:'created_at'}:{created_at:'created_at',actor:'actor',action:'action',entity:'entity'},'created_at DESC');
 return {rows:db.prepare(`SELECT ${columns} FROM ${table} WHERE ${where}${extra} ORDER BY ${order},id ${all?'':'LIMIT 12 OFFSET ?'}`).all(...args,...(all?[]:[(page-1)*12])),count,page};
 }
 if(!modules[name])throw new Error('Modul tidak ditemukan.');
 const where=['t.deleted_at IS NULL'],args:any[]=[];
 const relations=modules[name].fields.filter(f=>f.type?.startsWith('relation:')).map(f=>{const table=f.type!.split(':')[1];return modules[table]?`COALESCE((SELECT title FROM ${table} WHERE id=json_extract(t.data,'$.${f.key}')),'')`:"''"});
 const dates=["t.created_at","t.updated_at","json_extract(t.data,'$.date')","json_extract(t.data,'$.publishAt')"].map(dateSearchSql);
 const haystack=["t.id","t.title","t.slug","t.status","t.data",...relations,...dates,`CASE t.status WHEN 'published' THEN 'aktif terbit dipublikasikan' WHEN 'draft' THEN 'draft belum terbit' WHEN 'active' THEN 'aktif' WHEN 'archived' THEN 'arsip' WHEN 'scheduled' THEN 'terjadwal' WHEN 'completed' THEN 'selesai' ELSE '' END`,"COALESCE((SELECT name FROM users WHERE id=json_extract(t.data,'$.authorId')),'')"].map(e=>`COALESCE(${e},'')`).join(" || ' ' || ");
 for(const term of searchTokens(q.get('q')||'')){where.push(`(${haystack}) LIKE ? ESCAPE '\\'`);args.push(searchPattern(term))}
 if(name==='donation_accounts'){const filters:Record<string,string>={active:"t.status='published'",inactive:"t.status<>'published'",general:"NOT EXISTS(SELECT 1 FROM donation_programs p WHERE p.account_id=t.id AND p.deleted_at IS NULL)",program:"EXISTS(SELECT 1 FROM donation_programs p WHERE p.account_id=t.id AND p.deleted_at IS NULL)",qris:"json_extract(t.data,'$.qr_type')='QRIS' AND COALESCE(json_extract(t.data,'$.qr_image'),'')<>''"};if(filters[q.get('filter')||''])where.push(filters[q.get('filter')!]);}
 if(q.get('status')){where.push('t.status=?');args.push(q.get('status'))}
 if(q.get('category')){where.push(name==='donation_updates'?"COALESCE((SELECT NULLIF(json_extract(data,'$.category'),'') FROM donation_programs WHERE id=json_extract(t.data,'$.programId')),'Belum dikategorikan')=?":"COALESCE(NULLIF(json_extract(t.data,'$.category'),''),'Belum dikategorikan')=?");args.push(q.get('category'))}
 if(q.has('ids')){const ids=q.get('ids')!.split(',').filter(Boolean);if(!ids.length||ids.length>100)throw new Error('Pilih antara 1 dan 100 data.');where.push(`t.id IN (${ids.map(()=>'?').join(',')})`);args.push(...ids);}
 const from=`FROM ${name} t WHERE ${where.join(' AND ')}`;
 const count=Number((db.prepare(`SELECT COUNT(*) n ${from}`).get(...args) as any).n),page=Math.max(1,Math.min(Math.ceil(count/12)||1,Math.trunc(Number(q.get('page')))||1));
 if(all&&count>25000)throw new Error('Persempit filter ekspor hingga maksimal 25.000 data.');
 const accountSort:Record<string,string|string[]>={bank:"json_extract(t.data,'$.bank') COLLATE NOCASE",holder:"json_extract(t.data,'$.holder') COLLATE NOCASE",number:["length(ltrim(json_extract(t.data,'$.number'),'0'))","ltrim(json_extract(t.data,'$.number'),'0')"],usage:"CASE WHEN EXISTS(SELECT 1 FROM donation_programs p WHERE p.account_id=t.id AND p.deleted_at IS NULL) THEN 'Program Khusus' WHEN t.sort_order<0 AND t.status='published' THEN 'Rekening Utama' ELSE 'Rekening Umum' END",status:"CASE t.status WHEN 'published' THEN 'Aktif' ELSE 'Nonaktif' END",program:"(SELECT count(*) FROM donation_programs p WHERE p.account_id=t.id AND p.deleted_at IS NULL)"};
 const sort=sqlSort(q,name==='donation_accounts'?accountSort:{title:'t.title COLLATE NOCASE',updated_at:'t.updated_at',category:"COALESCE(json_extract(t.data,'$.kind'),json_extract(t.data,'$.category'),'') COLLATE NOCASE",status:"CASE t.status WHEN 'published' THEN 'Terbit' WHEN 'draft' THEN 'Draft' WHEN 'active' THEN 'Aktif' WHEN 'archived' THEN 'Arsip' WHEN 'scheduled' THEN 'Terjadwal' WHEN 'completed' THEN 'Selesai' WHEN 'closed' THEN 'Ditutup' ELSE t.status END"},'t.sort_order,t.created_at DESC');
 const ids=(db.prepare(`SELECT t.id ${from} ORDER BY ${sort},t.id ${all?'':'LIMIT 12 OFFSET ?'}`).all(...args,...(all?[]:[(page-1)*12])) as any[]).map(r=>r.id);
 const map=new Map(records(name,true,ids).map(r=>[r.id,r]));return {rows:ids.map(id=>map.get(id)),count,page};
}
