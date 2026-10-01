import {isAppearance,appearanceDefaults,validateAppearance,validateAppearanceCollection} from './appearance.ts';
import {contentSchema,contentDefaults,validateContent,publicLibrary} from './content-schema.ts';
import {isInstitution,institutionDefaults,validateInstitution} from './institution-schema.ts';
import {initializeProducts,productsFor,validateProducts,saveProducts} from './business-products.ts';
import {originalMediaUrl,mediaPurpose,validateMedia} from './media-presets.ts';
import {informationSchema,informationDefaults,informationVisible,validateInformation} from './information-schema.ts';
import {academicSubjects,validateAcademicSubjects,academicLink} from './academics.ts';
import {initializeMedia} from './media-schema.ts';
import {accountUsage,migrateAccountUsage,prepareAccountUsage} from './account-usage-database.ts';
import {initializeDonors,linkDonor} from './donor-ledger.ts';
import {initializeDonationLedger,prepareDonation,issueReceipt} from './donation-ledger.ts';
import { hasPaymentQr } from './payment-qr.ts';
import { normalizeDonorName } from './donation-identity.ts';
import { migrateDonorNames } from './migrate-donor-name.ts';
import { normalizeWhatsapp } from './whatsapp.ts';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { modules, roleDefaults, slugify } from './modules.ts';
import { hashPassword, verifyPassword, validatePasswordStrength } from './auth/crypto.ts';
export type RecordData = {id:string;title:string;slug:string;status:string;sort_order:number;created_at:string;updated_at:string;[key:string]:any};
const filename=resolve(process.env.DARUL_HUDA_DB || 'data/darul-huda.sqlite');
mkdirSync(dirname(filename),{recursive:true});
export const db = new DatabaseSync(filename);
db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec(`CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS permissions (code TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS role_permissions (role_id TEXT REFERENCES roles(id),permission TEXT REFERENCES permissions(code),PRIMARY KEY(role_id,permission));
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password_hash TEXT NOT NULL,role_id TEXT REFERENCES roles(id),active INTEGER NOT NULL DEFAULT 1,must_change INTEGER DEFAULT 1,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY,count INTEGER NOT NULL,until_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT,action TEXT,entity TEXT,entity_id TEXT,details TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT UNIQUE NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,private INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);`);
initializeMedia(db);
db.exec(`CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id),whatsapp TEXT NOT NULL DEFAULT '',photo BLOB,updated_at TEXT NOT NULL);`);
for(const name of Object.keys(modules)) {
 const relation=name==='donation_transactions'||name==='donation_updates'? ',program_id TEXT REFERENCES donation_programs(id)':name==='posts'?',category_id TEXT REFERENCES post_categories(id)':name==='galleries'?',unit_id TEXT REFERENCES education_units(id)':name==='donation_programs'?',account_id TEXT REFERENCES donation_accounts(id)':'';
 db.exec(`CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT${relation}); CREATE INDEX IF NOT EXISTS idx_${name}_status ON ${name}(status,sort_order);`);
}
db.prepare('INSERT OR IGNORE INTO schema_migrations VALUES (1,?)').run(new Date().toISOString());
db.prepare('INSERT OR IGNORE INTO schema_migrations VALUES (2,?)').run(new Date().toISOString());
initializeProducts(db);
migrateDonorNames(db); initializeDonationLedger(db); initializeDonors(db); migrateAccountUsage(db);
let atomicDepth=0;
export function atomic<T>(fn:()=>T):T {if(atomicDepth)return fn();db.exec('BEGIN IMMEDIATE');atomicDepth++;try {const result=fn();db.exec('COMMIT');return result;} catch(e){db.exec('ROLLBACK');throw e;}finally{atomicDepth--;}}
export function audit(actor:string,action:string,entity:string,id:string,details:any={}){db.prepare('INSERT INTO audit_logs(actor,action,entity,entity_id,details,created_at) VALUES(?,?,?,?,?,?)').run(actor,action,entity,id,JSON.stringify(details),new Date().toISOString());}
export function decode(r:any):RecordData {const {data,deleted_at,...base}=r;return {...JSON.parse(data),...base};}
export function records(name:string,includeHidden=false):RecordData[]{
 if(!modules[name]) throw new Error('Modul tidak ditemukan.');
 let rows=(db.prepare(`SELECT * FROM ${name} WHERE deleted_at IS NULL ORDER BY sort_order,created_at DESC`).all() as any[]).map(decode);
 if(name==='donation_accounts')rows=accountUsage(db,rows);
 if(informationSchema[name])rows=rows.map(r=>informationDefaults(name,r) as RecordData);
 if(isInstitution(name))rows=rows.map(r=>institutionDefaults(name,{...r,...(name==='business_units'?{products:productsFor(db,r.id)}:{})}) as RecordData);
 if(contentSchema[name])rows=rows.map(r=>contentDefaults(name,r) as RecordData);
 if(isAppearance(name))rows=rows.map(r=>appearanceDefaults(name,r) as RecordData);
 if(includeHidden) return rows;
 if(name==='hero_slides')rows=rows.filter(r=>r.showOnHome!==false).sort((a,b)=>Number(!!b.primary)-Number(!!a.primary)||a.sort_order-b.sort_order);
 if(contentSchema[name])rows=rows.filter(r=>r.showPublic!==false).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||Number(!!b.featured)-Number(!!a.featured)||a.sort_order-b.sort_order);
 if(isInstitution(name))rows=rows.filter(r=>r.showWebsite!==false);
 if(name==='program_highlights')rows.sort((a,b)=>Number(!!b.primary)-Number(!!a.primary)||a.sort_order-b.sort_order);
 if(informationSchema[name])return rows.filter(r=>informationVisible(name,r));
 const now=Date.now();
 return rows.filter(r=>['published','active','completed','achieved','closed'].includes(r.status) && (!r.publishAt||Date.parse(r.publishAt)<=now)&&(!r.startsAt||Date.parse(r.startsAt)<=now)&&(!r.endsAt||Date.parse(r.endsAt)>now) || r.status==='scheduled'&&!!r.publishAt&&Date.parse(r.publishAt)<=now);
}
export function donationTotal(id:string):number {return Number((db.prepare("SELECT COALESCE(SUM(CAST(json_extract(data,'$.amount') AS INTEGER)),0) total FROM donation_transactions WHERE COALESCE(program_id,'')=? AND status='valid' AND deleted_at IS NULL").get(id) as any).total);}
export function publicData(){
 const result:Record<string,any>={};
 for(const [name,m] of Object.entries(modules)) if(m.public) result[name]=records(name);
 result.announcements=result.announcements.map((r:RecordData)=>({...r,unitTitle:result.education_units.find((u:RecordData)=>u.id===r.unitId)?.title||''})).sort((a:RecordData,b:RecordData)=>Number(!!b.pinned)-Number(!!a.pinned)||a.sort_order-b.sort_order);
 const calendar=result.academic_calendars;result.academic_calendars=calendar.filter((r:RecordData)=>r.showPublic);
 result.agendas=[...result.agendas,...calendar.filter((r:RecordData)=>r.showAgenda).map((r:RecordData)=>({...r,id:'calendar-'+r.id,calendarSource:true,showOnHome:false,mode:'Offline'}))];
 result.donation_programs=result.donation_programs.map((r:RecordData)=>({...r,total:donationTotal(r.id),percentage:r.target>0?Math.round(donationTotal(r.id)/r.target*1000)/10:null}));
 result.academics=result.academics.map((r:RecordData)=>Array.isArray(r.subjects)?{...r,subjects:r.subjects.filter((s:any)=>s.active!==false),body:''}:r);
 result.library_items=result.library_items.map(publicLibrary);
 const hiddenPageLinks=new Set(result.pages.filter((r:RecordData)=>r.showMenu===false).map((r:RecordData)=>'/profil/'+r.slug));
 result.menu_items=result.menu_items.filter((r:RecordData)=>!hiddenPageLinks.has(r.url));
 const footerSettings=records('footer_links',true).find(r=>r.kind==='settings');result.appearanceContactVisible=footerSettings?footerSettings.status==='published'&&footerSettings.showContact!==false:true;
 result.appearanceManaged=Object.fromEntries(['home_sections','footer_links','menu_items'].map(name=>[name,!!db.prepare(`SELECT 1 FROM ${name} WHERE json_extract(data,'$.managed')=1 LIMIT 1`).get()]));
 result.updatedAt=new Date().toISOString();
 return result;
}
export function cleanHtml(s:string){return sanitizeHtml(s,{allowedTags:['p','br','h2','h3','h4','strong','b','em','i','u','ul','ol','li','blockquote','a','img'],allowedAttributes:{a:['href','target','rel'],img:['src','alt'],p:['style'],h2:['style'],h3:['style']},allowedStyles:{'*':{'text-align':[/^(left|center|right)$/]}},allowedSchemes:['http','https','mailto'],allowedSchemesByTag:{img:['http','https']},allowProtocolRelative:false,transformTags:{a:sanitizeHtml.simpleTransform('a',{rel:'noopener noreferrer'})}});}
function fail(message:string):never {throw new Error(message);}
function urlSafe(value:string){return !value || /^\/(?!\/)/.test(value)||/^https?:\/\//i.test(value)||/^mailto:|^tel:/.test(value);}
export function saveRecord(name:string,input:any,actor:string):RecordData {
 const m=modules[name]; if(!m) fail('Modul tidak ditemukan.');
 const id=String(input.id||crypto.randomUUID());
 const old=db.prepare(`SELECT * FROM ${name} WHERE id=? AND deleted_at IS NULL`).get(id) as any;
 if(informationSchema[name])input=informationDefaults(name,{...(old?decode(old):{}),...input});
 if(isInstitution(name))input=institutionDefaults(name,{...(old?decode(old):{}),...(name==='business_units'?{products:productsFor(db,id)}:{}),...input});
 if(isAppearance(name))input=appearanceDefaults(name,{...(old?decode(old):{}),...input});
 const previousProducts=name==='business_units'?productsFor(db,id):null;
 const productRows=name==='business_units'?validateProducts(db,id,input.products??productsFor(db,id)):null;
 if(contentSchema[name])input=contentDefaults(name,{...(old?decode(old):{}),...input});
 const title=String(input.title||(name==='donation_accounts'?[input.bank,input.number].filter(Boolean).join(' • '):'')).trim().slice(0,200);if(!title)fail('Judul wajib diisi.');
 let status=String(input.status||'draft');
 const statuses=name==='donation_transactions'?['draft','pending','correction','rejected','valid','void']:name==='donation_programs'?['draft','active','completed','achieved','closed']:name==='posts'?['draft','published','scheduled','archived']:['draft','published','archived'];
 if(!statuses.includes(status))fail('Status tidak valid.');
 const data:Record<string,any>=(informationSchema[name]||isInstitution(name)||contentSchema[name]||isAppearance(name))&&old?{...JSON.parse(old.data)}:{};
 for(const field of m.fields){const value=input[field.key];
  if(field.type==='academicSubjects'){const previous=old?JSON.parse(old.data):{};data[field.key]=validateAcademicSubjects(value===undefined?(previous.subjects??academicSubjects({...previous,...input,id,title},true)):value);for(const subject of data[field.key])if(subject.document&&!db.prepare("SELECT id FROM media WHERE url=? AND private=0 AND mime='application/pdf'").get(subject.document))fail('Dokumen mata pelajaran harus dipilih dari Media Library.');}
  else if(field.type==='photos'){if(!Array.isArray(value)){data[field.key]=[];continue;} if(value.length>100)fail('Maksimal 100 foto.');data[field.key]=value.map((p:any)=>({url:String(p.url||''),caption:String(p.caption||'').slice(0,500),alt:String(p.alt||'').slice(0,500)})); if(data[field.key].some((p:any)=>!/^\/(media|uploads)\/[\w.-]+$/.test(originalMediaUrl(p.url))||!/\.(png|jpe?g|webp)$/i.test(originalMediaUrl(p.url))))fail('Foto harus berasal dari media website.');}
  else if(field.type==='number'){data[field.key]=value===''||value==null?null:Number(value);if(data[field.key]!=null&&!Number.isFinite(data[field.key]))fail('Angka tidak valid.');}
  else if(field.type==='checkbox') data[field.key]=!!value;
  else {let s=String(value||'').trim();if(s.length>100000)fail('Konten terlalu panjang.');if(field.type==='richtext')s=cleanHtml(s);if((field.type==='url'||/Url$/.test(field.key)||field.key==='url')&&!urlSafe(s))fail('URL harus berupa HTTP, HTTPS, atau path lokal.');if(['image','file','document'].includes(field.type||'')&&s&&!/^\/(media|uploads)\/[\w.-]+$/.test(originalMediaUrl(s)))fail('Pilih berkas dari media website.');if(field.type==='privatefile'&&s&&!/^\/api\/private-media\/[\w.-]+$/.test(s))fail('Bukti harus menggunakan unggahan privat.');if(field.type==='select'&&s&&!field.options?.includes(s)&&!((name==='donation_programs'&&field.key==='category'||informationSchema[name]||isInstitution(name)||contentSchema[name])&&old&&JSON.parse(old.data)[field.key]===s))fail('Pilihan tidak valid.');if(field.key.toLowerCase().includes('whatsapp')&&field.key!=='whatsappMessage')s=normalizeWhatsapp(s);if(['image','file','document'].includes(field.type||'')&&s){const source=originalMediaUrl(s);if(field.type==='image'&&!/\.(png|jpe?g|webp)$/i.test(source)||field.type==='file'&&!/\.pdf$/i.test(source))fail('Format berkas tidak sesuai field.');const media=db.prepare('SELECT mime,size FROM media WHERE url=? AND private=0').get(source) as any;const previous=old?JSON.parse(old.data)[field.key]:'';if(field.type==='document'&&(!media||!/\.(pdf|doc|docx|xlsx)$/i.test(source)))fail('Pilih dokumen dari Media Library.');if(media&&s!==previous)validateMedia({type:media.mime,size:media.size},mediaPurpose(name,field.key,field.type));}data[field.key]=s;}
 }
 for(const f of m.fields){if(['date','datetime-local'].includes(f.type||'')&&data[f.key]&&!Number.isFinite(Date.parse(data[f.key])))fail('Tanggal tidak valid.');}
 if(informationSchema[name]){validateInformation(name,{...data,status});if(name==='announcements'&&data.unitId&&!db.prepare('SELECT id FROM education_units WHERE id=? AND deleted_at IS NULL').get(data.unitId))fail('Unit pendidikan tidak tersedia.');}
 if(isInstitution(name))validateInstitution(name,{...data,status});
 if(isAppearance(name)){validateAppearance(name,{...data,title,status});if(name==='hero_slides')for(const k of ['primary','secondary'])if(data[k+'Type']==='none'){data[k+'Url']='';data[k+'Text']='';}}
 if(name==='education_units'&&data.curriculumId&&!db.prepare('SELECT id FROM academics WHERE id=? AND deleted_at IS NULL').get(data.curriculumId))fail('Kurikulum tidak tersedia.');
 if(contentSchema[name])validateContent(name,{...data,status});
 if(name==='posts'&&data.authorId){const author=db.prepare('SELECT name FROM users WHERE id=? AND active=1').get(data.authorId) as any;if(!author)fail('Penulis terdaftar tidak tersedia.');data.author=author.name;}
 if(name==='academics'){if(data.year.length>80)fail('Tahun kurikulum maksimal 80 karakter.');if(data.scheduleUrl&&!academicLink(data.scheduleUrl))fail('Tautan jadwal harus berupa HTTP, HTTPS, atau path lokal yang valid.');}
 if(name==='posts'&&status==='published'&&!data.publishAt)data.publishAt=new Date().toISOString();
 if(name==='donation_programs'&&data.target!=null&&(!Number.isSafeInteger(data.target)||data.target<0))fail('Target harus rupiah bulat dan tidak negatif.');
 if(name==='donation_updates'&&!data.programId)fail('Pilih program donasi untuk perkembangan ini.');
 if(name==='donation_updates'&&data.progress!=null&&(data.progress<0||data.progress>100))fail('Progres fisik harus 0 sampai 100.');
 if(status==='scheduled'&&!data.publishAt)fail('Tanggal publikasi wajib untuk penjadwalan.');
 if(name==='donation_transactions') {

  if(data.accountId&&!db.prepare('SELECT id FROM donation_accounts WHERE id=? AND deleted_at IS NULL').get(data.accountId))fail('Rekening tujuan tidak tersedia.');
  if(!Number.isSafeInteger(data.amount)||data.amount===0)fail('Nominal harus rupiah bulat, tidak nol.');
  if(data.kind==='Pemasukan'&&data.amount<0)fail('Pemasukan harus positif.');
  if(data.kind==='Koreksi'&&!data.note)fail('Alasan koreksi wajib diisi.');
  if(old&&['valid','void','rejected'].includes(old.status)){
   if(status!=='void'||!data.note)fail('Transaksi valid tidak boleh diubah. Batalkan dengan alasan, lalu buat koreksi.');
   const previous=decode(old); Object.assign(data,Object.fromEntries(m.fields.map(f=>[f.key,previous[f.key]]))); data.note=String(input.note); 
  }
 }
 if(name==='donation_accounts'){
  if(input.linkedPrograms!==undefined){if(!Array.isArray(input.linkedPrograms)||input.linkedPrograms.some((id:any)=>typeof id!=='string'||!db.prepare('SELECT id FROM donation_programs WHERE id=? AND deleted_at IS NULL').get(id)))fail('Program penggunaan rekening tidak valid.');}
  if((data.qr_title||'').length>150||(data.qr_merchant||'').length>150||(data.qr_description||'').length>500)fail('Judul dan merchant maksimal 150 karakter; keterangan maksimal 500 karakter.');
  if(data.qr_enabled&&(!data.qr_type||!data.qr_image))fail('Pilih jenis dan unggah gambar QR sebelum menggunakan QR.');
  if(data.qr_image&&!db.prepare("SELECT id FROM media WHERE url=? AND private=0 AND mime IN ('image/png','image/jpeg','image/webp')").get(data.qr_image))fail('Pilih gambar QR yang sudah diunggah.');
  if(input.qr_primary&&(!hasPaymentQr(data)||data.qr_type!=='QRIS'||status!=='published'))fail('QRIS utama harus berupa QRIS aktif pada rekening terbit.');
 }
 if(name==='donation_transactions')data.donor_name=normalizeDonorName(old&&['valid','void','rejected'].includes(old.status)?data.donor_name:(input.donor_name??input.donor));
 let slug=slugify(String(input.slug||(['donation_accounts','donation_updates'].includes(name)?name+'-'+id:title)));if(!slug)fail('Slug tidak valid.');
 if((informationSchema[name]||isInstitution(name)||isAppearance(name))&&!old&&db.prepare(`SELECT id FROM ${name} WHERE slug=?`).get(slug))slug+='-'+id.slice(0,8);
 let sort=Number(input.sort_order||0); if(!Number.isSafeInteger(sort))fail('Urutan harus angka bulat.');
 const relationFields:Record<string,[string,string]>={donation_transactions:['program_id','programId'],donation_updates:['program_id','programId'],posts:['category_id','categoryId'],galleries:['unit_id','unitId'],donation_programs:['account_id','accountId']};
 const relation=relationFields[name]; const referenceTables:Record<string,string>={program_id:'donation_programs',category_id:'post_categories',unit_id:'education_units',account_id:'donation_accounts'};if(relation&&data[relation[1]]&&!db.prepare(`SELECT id FROM ${referenceTables[relation[0]]} WHERE id=? AND deleted_at IS NULL`).get(data[relation[1]]))fail('Referensi data tidak tersedia.'); const now=new Date().toISOString();
 return atomic(()=>{
  if(name==='donation_transactions') {const previous=old?decode(old):null; const before=donationTotal(data.programId); const after=before-(previous?.status==='valid'?previous.amount:0)+(status==='valid'?data.amount:0);if(after<0)fail('Koreksi atau pembatalan membuat saldo program negatif.');}
  if(name==='donation_transactions'){prepareDonation(db,data,old,now);if(!old&&actor==='public'&&input.submission_key)data.submission_key=input.submission_key;}
  const demoteAccount=(accountId:string)=>{const before=db.prepare('SELECT sort_order FROM donation_accounts WHERE id=?').get(accountId) as any;db.prepare('UPDATE donation_accounts SET sort_order=0,updated_at=? WHERE id=?').run(now,accountId);audit(actor,'account.primary.remove','donation_accounts',accountId,{before,after:{sort_order:0}});};
  if(name==='donation_accounts')sort=prepareAccountUsage(db,id,input,old,status,sort,demoteAccount);
  const vals:any[]=[title,slug,status,sort,JSON.stringify(data),now];
  if(old){db.prepare(`UPDATE ${name} SET title=?,slug=?,status=?,sort_order=?,data=?,updated_at=?${relation?`,${relation[0]}=?`:''} WHERE id=?`).run(...vals,...(relation?[data[relation[1]]||null]:[]),id);}
  else {db.prepare(`INSERT INTO ${name}(title,slug,status,sort_order,data,updated_at,id,created_at${relation?','+relation[0]:''}) VALUES(?,?,?,?,?,?,?,?${relation?',?':''})`).run(...vals,id,now,...(relation?[data[relation[1]]||null]:[]));}
  if(productRows)saveProducts(db,id,productRows,now);
  if(name==='donation_transactions'){const donorId=linkDonor(db,data,old?decode(old):null,now);db.prepare('UPDATE donation_transactions SET donor_id=? WHERE id=?').run(donorId,id);issueReceipt(db,id,data,status,actor,now);db.prepare('UPDATE donation_transactions SET data=? WHERE id=?').run(JSON.stringify(data),id);}
  if(name==='donation_accounts'){
   if(input.linkedPrograms!==undefined){const selected=new Set(input.linkedPrograms);for(const row of db.prepare('SELECT * FROM donation_programs WHERE deleted_at IS NULL').all() as any[]){const previous=decode(row);const accountId=selected.has(row.id)?id:previous.accountId===id?'':previous.accountId;if(accountId!==previous.accountId){const info={...JSON.parse(row.data),accountId};db.prepare('UPDATE donation_programs SET data=?,account_id=?,updated_at=? WHERE id=?').run(JSON.stringify(info),accountId||null,now,row.id);audit(actor,'account.assign','donation_programs',row.id,{before:previous,after:{...previous,accountId}});}}}
   const setting=db.prepare("SELECT id,data FROM site_settings WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1").get() as any;
   if(input.qr_primary&&!setting)fail('Simpan pengaturan website terlebih dahulu.');
   if(setting){const settings=JSON.parse(setting.data),previous=old?JSON.parse(old.data):{};
    const wasMain=!!previous.qr_image&&settings.donationQris===previous.qr_image;
    if(input.qr_primary)settings.donationQris=data.qr_image;
    else if(wasMain&&(input.qr_primary===false||!hasPaymentQr(data)||data.qr_type!=='QRIS'||status!=='published'||previous.qr_image!==data.qr_image))settings.donationQris='';
    if(settings.donationQris!==JSON.parse(setting.data).donationQris){db.prepare('UPDATE site_settings SET data=?,updated_at=? WHERE id=?').run(JSON.stringify(settings),now,setting.id);audit(actor,'qris.primary.update','site_settings',setting.id,{image:settings.donationQris});}
   }
  }
  if(name==='donation_programs'&&data.accountId){const a=db.prepare('SELECT sort_order FROM donation_accounts WHERE id=?').get(data.accountId) as any;if(a?.sort_order<0)demoteAccount(data.accountId);}
  audit(actor,old?'update':'create',name,id,{before:old?{...decode(old),...(previousProducts?{products:previousProducts}:{})}:null,after:{title,status,...data,...(productRows?{products:productRows}:{})}});
  return {...decode(db.prepare(`SELECT * FROM ${name} WHERE id=?`).get(id)),...(productRows?{products:productRows}:{})};
 });
}
export function deleteRecord(name:string,id:string,actor:string,replacementId?:string){
 if(name==='post_categories'&&replacementId){
  if(replacementId===id||!db.prepare('SELECT id FROM post_categories WHERE id=? AND deleted_at IS NULL').get(replacementId))fail('Pilih kategori pengganti yang tersedia.');
  return atomic(()=>{const now=new Date().toISOString();const posts=db.prepare('SELECT id FROM posts WHERE category_id=? AND deleted_at IS NULL').all(id) as any[];db.prepare("UPDATE posts SET category_id=?,data=json_set(data,'$.categoryId',?),updated_at=? WHERE category_id=? AND deleted_at IS NULL").run(replacementId,replacementId,now,id);db.prepare('UPDATE post_categories SET deleted_at=?,updated_at=? WHERE id=?').run(now,now,id);audit(actor,'category.transfer-delete',name,id,{replacementId,posts:posts.map(r=>r.id)});});
 }
 if(!modules[name])fail('Modul tidak ditemukan.');if(name==='donation_transactions')fail('Transaksi tidak boleh dihapus. Gunakan pembatalan dengan alasan.');
 if(name==='site_settings')fail('Pengaturan utama tidak dapat dihapus.');
 const checks:Record<string,[string,string][]>= {post_categories:[['posts','category_id']],education_units:[['galleries','unit_id']],donation_programs:[['donation_transactions','program_id'],['donation_updates','program_id']],donation_accounts:[['donation_programs','account_id']]};
 for(const [table,key] of checks[name]||[])if(db.prepare(`SELECT id FROM ${table} WHERE ${key}=? AND deleted_at IS NULL LIMIT 1`).get(id))fail('Data masih digunakan dan tidak dapat dihapus.');
 atomic(()=>{if(name==='donation_accounts'){const old=db.prepare('SELECT data FROM donation_accounts WHERE id=?').get(id) as any;const image=old?JSON.parse(old.data).qr_image:'';if(image)db.prepare("UPDATE site_settings SET data=json_set(data,'$.donationQris',''),updated_at=? WHERE json_extract(data,'$.donationQris')=?").run(new Date().toISOString(),image);}
 db.prepare(`UPDATE ${name} SET deleted_at=?,updated_at=? WHERE id=?`).run(new Date().toISOString(),new Date().toISOString(),id);audit(actor,'delete',name,id);});
}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function identity(request:Request){const raw=request.headers.get('cookie')?.match(/(?:^|;\s*)darul_huda_session=([^;]+)/)?.[1];if(!raw)return null;const user=db.prepare('SELECT u.id,u.email,u.name,u.role_id,u.must_change,u.active FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').get(digest(raw),Date.now()) as any;if(!user)return null;const profile=db.prepare('SELECT whatsapp,photo IS NOT NULL has_photo,updated_at FROM user_profiles WHERE user_id=?').get(user.id) as any;const last=db.prepare("SELECT created_at FROM audit_logs WHERE actor=? AND action='login' ORDER BY id DESC LIMIT 1").get(user.id) as any;return {...user,whatsapp:profile?.whatsapp||'',avatar_url:profile?.has_photo?'/api/profile/photo?v='+encodeURIComponent(profile.updated_at):'',last_login:last?.created_at||null,permissions:(db.prepare('SELECT permission FROM role_permissions WHERE role_id=?').all(user.role_id) as any[]).map(r=>r.permission)};}
export async function login(email:string,password:string,key:string){
 const k=digest(key);const attempt=db.prepare('SELECT * FROM login_attempts WHERE key=?').get(k) as any;if(attempt&&attempt.until_at>Date.now()&&attempt.count>=8)fail('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
 db.prepare('INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until_at<? THEN 1 ELSE count+1 END,until_at=CASE WHEN until_at<? THEN excluded.until_at ELSE until_at END').run(k,Date.now()+900000,Date.now(),Date.now());
 const u=db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email.toLowerCase().trim()) as any;
 if(!u||!await verifyPassword(password,u.password_hash)) {audit('anonymous','login.failed','users','');fail('Email atau kata sandi tidak sesuai.');}
 db.prepare('DELETE FROM login_attempts WHERE key=?').run(k);
 const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),u.id,Date.now()+12*3600000);audit(u.id,'login','users',u.id);return token;
}
export function logout(request:Request){const raw=request.headers.get('cookie')?.match(/(?:^|;\s*)darul_huda_session=([^;]+)/)?.[1];if(raw)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(raw));}
export async function createUser(input:any,actor:string){
 const email=String(input.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Email tidak valid.');
 const error=validatePasswordStrength(String(input.password||''));if(error)fail(error);
 const hash=await hashPassword(input.password);const id=crypto.randomUUID();
 atomic(()=>{db.prepare('INSERT INTO users(id,email,name,password_hash,role_id,created_at) VALUES(?,?,?,?,?,?)').run(id,email,String(input.name||email),hash,String(input.role_id||'Super Admin'),new Date().toISOString());audit(actor,'create','users',id,{email,role:input.role_id});});return id;
}
export async function changePassword(id:string,current:string,password:string){const u=db.prepare('SELECT * FROM users WHERE id=?').get(id) as any;if(!u||!await verifyPassword(current,u.password_hash))fail('Kata sandi saat ini salah.');const error=validatePasswordStrength(password);if(error)fail(error);const hash=await hashPassword(password);atomic(()=>{db.prepare('UPDATE users SET password_hash=?,must_change=0 WHERE id=?').run(hash,id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);audit(id,'password.change','users',id);});}
export function initializeRoles(){for(const [role,perms] of Object.entries(roleDefaults)){db.prepare('INSERT OR IGNORE INTO roles VALUES(?,?)').run(role,role);for(const p of perms){db.prepare('INSERT OR IGNORE INTO permissions VALUES(?)').run(p);db.prepare('INSERT OR IGNORE INTO role_permissions VALUES(?,?)').run(role,p);}}}




// Backfill identifiers once, preserving existing amounts, status, and audit history.
if(!db.prepare('SELECT version FROM schema_migrations WHERE version=4').get())atomic(()=>{
 for(const row of db.prepare('SELECT * FROM donation_transactions WHERE deleted_at IS NULL ORDER BY created_at,id').all() as any[]){
  const data=JSON.parse(row.data);prepareDonation(db,data,row,row.created_at);
  if(row.status==='valid')issueReceipt(db,row.id,data,row.status,'migration',row.updated_at);
  db.prepare('UPDATE donation_transactions SET data=? WHERE id=?').run(JSON.stringify(data),row.id);
 }
 db.prepare('INSERT INTO schema_migrations VALUES(4,?)').run(new Date().toISOString());
});



export function saveAppearanceBatch(name:string,items:any[],expected:{id:string;updated_at:string}[],actor:string){
 if(!isAppearance(name)||!Array.isArray(items)||!Array.isArray(expected))throw new Error('Daftar tampilan tidak valid.');
 return atomic(()=>{const current=records(name,true);if(current.length!==expected.length||current.some(r=>!expected.some(e=>e.id===r.id&&e.updated_at===r.updated_at)))throw new Error('Data tampilan telah berubah. Muat ulang sebelum menyimpan.');const normalized=items.map((r,i)=>({...appearanceDefaults(name,r),managed:true,sort_order:i,...(name==='menu_items'?{parent:''}:{})}));validateAppearanceCollection(name,normalized);for(const row of normalized)validateAppearance(name,row);const kept=new Set(normalized.map((r:any)=>r.id));for(const row of current)if(!kept.has(row.id))deleteRecord(name,row.id,actor);return normalized.map(row=>saveRecord(name,row,actor));});
}
