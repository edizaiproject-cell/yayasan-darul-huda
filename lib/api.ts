import {isAppearance,appearanceDefaults,validateAppearanceCollection} from './appearance.ts';
import {saveAppearanceBatch} from './database.ts';
import {serveMediaImage} from './media-image.ts';
import {validateMedia,type MediaPurpose} from './media-presets.ts';
import {storePublicMedia,listMedia,deleteMedia,mergeMedia,cleanupMergedMedia,mediaPath} from './media-service.ts';
import {dashboardSummary} from './dashboard-service.ts';
import {donorQuery,getDonor,saveDonor,mergeDonors,phoneOwner} from './donor-service.ts';
import {donorExcel,donorReportPdf} from './donation-documents.ts';
import {submitDonation,getDonation,verifyDonation,receiptByToken,donationQuery,privateDirectory} from './donation-service.ts';
import {receiptPdf,donationExcel,donationReportPdf} from './donation-documents.ts';
import { inspectPaymentQr } from './payment-qr-image.ts';
import { normalizeWhatsapp } from './whatsapp.ts';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, extname, basename } from 'node:path';
import sharp from 'sharp';
import { modules, allPermissions } from './modules.ts';
import { db, records, publicData, identity, login, logout, saveRecord, deleteRecord, audit, createUser, changePassword, atomic, donationTotal } from './database.ts';
const json=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const cookie=(value:string,clear=false)=>`darul_huda_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear?0:43200}${process.env.NODE_ENV==='production'?'; Secure':''}`;
export async function handle(request:Request):Promise<Response>{
 try {
 const path=new URL(request.url).pathname.replace(/^\/api\//,'').split('/');
 const mutating=!['GET','HEAD'].includes(request.method);
 if(mutating){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return json({error:'Permintaan lintas situs ditolak.'},403);}
 if(path[0]==='donation-submit'&&request.method==='POST')return json(await submitDonation(request),201);
 const download=(bytes:Buffer,name:string,mime='application/pdf')=>new Response(new Uint8Array(bytes),{headers:{'Content-Type':mime,'Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});
 if(path[0]==='receipts'&&request.method==='GET'){const receipt=receiptByToken(path[1]);if(path[2]==='pdf')return download(await receiptPdf(receipt),`Kwitansi_Donasi_${receipt.receipt_number}.pdf`);const {transaction_code,bank,number,holder,verified_at,...publicReceipt}=receipt;return json(publicReceipt);}
 if(path[0]==='media-image'&&request.method==='GET')return serveMediaImage(new URL(request.url).searchParams);
 if(path[0]==='public'&&request.method==='GET')return json(publicData());
 if(path[0]==='login'&&request.method==='POST') {const b=await request.json();const token=await login(String(b.email||''),String(b.password||''),String(b.email||'').toLowerCase());return Response.json({ok:true},{headers:{'Set-Cookie':cookie(token),'Cache-Control':'no-store'}});}
 const actor=identity(request);
 if(!actor)return json({error:'Silakan masuk terlebih dahulu.'},401);
 if(path[0]==='me')return json(actor);
 if(path[0]==='logout'&&request.method==='POST'){logout(request);return Response.json({ok:true},{headers:{'Set-Cookie':cookie('',true),'Cache-Control':'no-store'}});}
 if(path[0]==='password'&&request.method==='POST'){const b=await request.json();await changePassword(actor.id,b.current,b.password);return json({ok:true});}
 if(process.env.NODE_ENV==='production'&&actor.must_change)return json({error:'Ganti kata sandi awal sebelum mengelola website.'},403);
 if(path[0]==='profile'){
 if(path[1]==='photo'){
 if(request.method==='GET'){const row=db.prepare('SELECT photo FROM user_profiles WHERE user_id=?').get(actor.id) as any;if(!row?.photo)return json({error:'Foto belum tersedia.'},404);return new Response(row.photo,{headers:{'Content-Type':'image/webp','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 if(request.method==='POST'||request.method==='DELETE'){
 let photo:Buffer|null=null;
 if(request.method==='POST'){
 if(Number(request.headers.get('content-length')||0)>11*1024*1024)throw new Error('Batas ukuran foto 10 MB.');
 const form=await request.formData();const file=form.get('file');
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024)throw new Error('Pilih JPG, PNG, atau WebP hingga 5 MB.');
 try{const image=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:40000000});const meta=await image.metadata();if(!['jpeg','png','webp'].includes(meta.format||'')||file.type!=='image/'+meta.format)throw new Error();photo=await image.rotate().resize(256,256,{fit:'cover'}).webp({quality:85}).toBuffer();}catch{throw new Error('Isi foto tidak valid atau resolusinya terlalu besar.');}
 }
 atomic(()=>{db.prepare("INSERT INTO user_profiles(user_id,photo,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET photo=excluded.photo,updated_at=excluded.updated_at").run(actor.id,photo,new Date().toISOString());audit(actor.id,photo?'profile.photo.update':'profile.photo.delete','users',actor.id);});return json(identity(request));
 }
 }else if(request.method==='GET')return json(actor);
 else if(request.method==='PUT'){
 const b=await request.json();const name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),whatsapp=normalizeWhatsapp(b.whatsapp);
 if(!name||name.length>100)throw new Error('Nama wajib diisi, maksimal 100 karakter.');
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new Error('Email tidak valid.');
 atomic(()=>{db.prepare('UPDATE users SET name=?,email=? WHERE id=?').run(name,email,actor.id);db.prepare("INSERT INTO user_profiles(user_id,whatsapp,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET whatsapp=excluded.whatsapp,updated_at=excluded.updated_at").run(actor.id,whatsapp,new Date().toISOString());audit(actor.id,'profile.update','users',actor.id,{name,email});});return json(identity(request));
 }
 return json({error:'Metode tidak tersedia.'},405);
 }
 const allow=(p:string)=>{if(!actor.permissions.includes(p))throw Object.assign(new Error('Anda tidak memiliki hak akses untuk tindakan ini.'),{status:403});};
 if(path[0]==='donation-options'&&request.method==='GET'){allow('donations.transaction');return json({programs:records('donation_programs',true).map(r=>({id:r.id,title:r.title,category:r.category})),accounts:records('donation_accounts',true).map(r=>({id:r.id,bank:r.bank,number:r.number}))});}
 if(path[0]==='donors'){
 allow('donations.transaction');const q=new URL(request.url).searchParams;
 if(request.method==='GET'&&path[1]==='export'){const data=donorQuery(q,true);audit(actor.id,'export','donors','',{format:q.get('format'),filters:data.labels});return q.get('format')==='xlsx'?download(await donorExcel(data),'Daftar_Donatur.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):download(await donorReportPdf(data,records('site_settings',true)[0]||{}),'Daftar_Donatur.pdf');}
 if(request.method==='GET'&&path[1]==='lookup')return json(phoneOwner(q.get('phone')||'')||null);
 if(request.method==='GET')return json(path[1]?getDonor(path[1],q):donorQuery(q));
 if(request.method==='POST'&&path[2]==='merge'){const b=await request.json();return json(mergeDonors(path[1],String(b.target||''),actor.id));}
 if(request.method==='POST'&&!path[1])return json(saveDonor(await request.json(),actor.id),201);
 if(request.method==='PUT'&&path[1])return json(saveDonor(await request.json(),actor.id,path[1]));
 return json({error:'Metode tidak tersedia.'},405);
 }
 if(path[0]==='donations'){
  allow('donations.transaction');const q=new URL(request.url).searchParams;
  if(request.method==='GET'&&path[1]==='export'){const data=donationQuery(q,true);if(q.get('format')==='xlsx')return download(await donationExcel(data),'Rekap_Donasi.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');return download(await donationReportPdf(data,records('site_settings',true)[0]||{}),'Rekap_Donasi.pdf');}
  if(request.method==='GET'&&!path[1])return json(donationQuery(q));
  if(path[1]&&request.method==='GET')return json(getDonation(path[1]));
  if(path[1]&&request.method==='POST')return json(verifyDonation(path[1],await request.json(),actor.id));
 }
 if(path[0]==='bootstrap'){
 const data:Record<string,any>={};for(const [name,m] of Object.entries(modules))if(actor.permissions.includes(m.permission))data[name]=name==='donation_transactions'?[]:records(name,true);
 // Reference labels only, so an editor can select a unit without gaining permission to edit it.
 const references:Record<string,any>={};const needed=new Set(Object.values(modules).filter(m=>actor.permissions.includes(m.permission)).flatMap(m=>m.fields.filter(f=>f.type?.startsWith('relation:')).map(f=>f.type!.split(':')[1])));for(const name of needed)references[name]=records(name,true).map(r=>({id:r.id,title:r.title,...(name==='donation_programs'?{category:r.category}:{})}));
 if(actor.permissions.includes('posts.manage'))references.content_authors=db.prepare('SELECT id,name AS title FROM users WHERE active=1 ORDER BY name').all();
 return json({data,references,appearanceData:actor.permissions.includes('appearance.manage')?publicData():undefined,dashboard:dashboardSummary(actor.permissions),donationSummary:actor.permissions.includes('donations.transaction')?donationQuery(new URLSearchParams()):undefined,donationQris:actor.permissions.includes('donations.manage')?records('site_settings',true)[0]?.donationQris||'':undefined,totals:actor.permissions.includes('donations.manage')?records('donation_programs',true).map(r=>({id:r.id,target:r.target,total:donationTotal(r.id)})):[],user:actor});
 }
 if(path[0]==='payment-qr'&&request.method==='POST'){
 allow('donations.manage');
 if(Number(request.headers.get('content-length')||0)>5*1024*1024+65536)throw new Error('Gambar QR maksimal 5 MB.');
 const form=await request.formData(),file=form.get('file');if(!(file instanceof File))throw new Error('Pilih gambar QR.');
 const bytes=Buffer.from(await file.arrayBuffer());const result=await inspectPaymentQr(bytes,file.type);
 const stored=await storePublicMedia(file,actor.id);return json({...stored,...result});
 }
 if(path[0]==='content'){
 const name=path[1];if(!modules[name])return json({error:'Modul tidak ditemukan.'},404);allow(modules[name].permission);
 if(request.method==='GET')return json(records(name,true));
 if(request.method==='POST'||request.method==='PUT') {const b=await request.json();if(isAppearance(name)&&b.appearanceItems)return json(saveAppearanceBatch(name,b.appearanceItems,b.expected,actor.id));if(isAppearance(name)){const rows=records(name,true);validateAppearanceCollection(name,[...rows.filter(r=>r.id!==b.id),appearanceDefaults(name,{...rows.find(r=>r.id===b.id),...b,id:b.id||'new'})]);}if(name==='posts'&&['published','scheduled','active'].includes(b.status))allow('posts.publish');const old=name==='donation_accounts'&&b.id?records(name,true).find(r=>r.id===b.id):null;
 if(name==='donation_accounts'&&b.qr_image&&b.qr_image!==old?.qr_image){
  const media=db.prepare('SELECT * FROM media WHERE url=? AND private=0').get(b.qr_image) as any;
  if(!media||!/^\/(uploads|media)\/[\w.-]+$/.test(b.qr_image))throw new Error('Unggah gambar QR melalui QR Pembayaran.');
  await inspectPaymentQr(readFileSync(mediaPath(b.qr_image)),media.mime);
 }
 const saved=saveRecord(name,b,actor.id);
 return json(saved);}
 if(request.method==='DELETE'){deleteRecord(name,path[2],actor.id,new URL(request.url).searchParams.get('replacementId')||undefined);return json({ok:true});}
 }
 if(path[0]==='users'){
 allow('users.manage');
 if(request.method==='GET')return json(db.prepare('SELECT id,email,name,role_id,active,must_change,created_at FROM users ORDER BY created_at DESC').all());
 if(request.method==='POST')return json({id:await createUser(await request.json(),actor.id)});
 if(request.method==='PUT'){const b=await request.json();if(b.id===actor.id)throw new Error('Ubah pengguna lain; akun aktif sendiri tidak boleh dinonaktifkan atau diturunkan.');atomic(()=>{db.prepare('UPDATE users SET active=?,role_id=? WHERE id=?').run(b.active?1:0,b.role_id,b.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(b.id);audit(actor.id,'access.update','users',b.id,{active:b.active,role:b.role_id});});return json({ok:true});}
 }
 if(path[0]==='roles'){
 allow('users.manage');if(request.method==='GET')return json({permissions:allPermissions,roles:db.prepare('SELECT * FROM roles').all().map((r:any)=>({...r,permissions:(db.prepare('SELECT permission FROM role_permissions WHERE role_id=?').all(r.id) as any[]).map(x=>x.permission)}))});
 if(request.method==='PUT'){const b=await request.json();if(b.id==='Super Admin')throw new Error('Hak akses Super Admin tidak dapat dikurangi.');if(!Array.isArray(b.permissions)||b.permissions.some((p:string)=>!allPermissions.includes(p)))throw new Error('Hak akses tidak valid.');atomic(()=>{db.prepare('DELETE FROM role_permissions WHERE role_id=?').run(b.id);for(const p of b.permissions)db.prepare('INSERT INTO role_permissions VALUES(?,?)').run(b.id,p);audit(actor.id,'permissions.update','roles',b.id,{permissions:b.permissions});});return json({ok:true});}
 }
 if(path[0]==='audit'){allow('audit.read');return json(db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500').all());}
 if(path[0]==='private-media'){
 allow('donations.transaction');const media=db.prepare('SELECT * FROM media WHERE id=? AND private=1').get(path[1]) as any;if(!media)return json({error:'Berkas tidak ditemukan.'},404);return new Response(readFileSync(resolve(privateDirectory,media.id+extname(media.title))),{headers:{'Content-Security-Policy':"sandbox; default-src 'none'",'Content-Type':media.mime,'Content-Disposition':`${new URL(request.url).searchParams.get('view')==='1'?'inline':'attachment'}; filename="bukti${extname(media.title)}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(path[0]==='media'){
 if(request.method==='POST'){if(!actor.permissions.includes('media.manage'))allow('donations.transaction');}else allow('media.manage');
 if(request.method==='GET')return json(await listMedia(actor.permissions));
 if(request.method==='POST'&&path[1]==='merge'){allow('media.manage');const result=await mergeMedia((await request.json()).ids,actor.id);return json({...result,removed:cleanupMergedMedia()});}
 if(request.method==='PUT'){allow('media.manage');const title=String((await request.json()).title||'').trim().slice(0,180);if(!title)throw new Error('Nama media wajib diisi.');db.prepare('UPDATE media SET title=? WHERE id=? AND private=0').run(title,path[1]);audit(actor.id,'media.rename','media',path[1]);return json({ok:true});}
 if(request.method==='POST'){
 if(Number(request.headers.get('content-length')||0)>11*1024*1024)throw new Error('Batas ukuran unggahan 10 MB.');
 const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||file.size>10*1024*1024||file.size===0)throw new Error('Pilih JPG, PNG, WebP, atau PDF hingga 10 MB.');
 const privateFile=form.get('private')==='true';if(privateFile){allow('donations.transaction');validateMedia(file,'proof');}else {allow('media.manage');const purpose=form.get('purpose');if(purpose)validateMedia(file,purpose as MediaPurpose);return json(await storePublicMedia(file,actor.id));}
 let bytes:Buffer=Buffer.from(await file.arrayBuffer());let mime='',ext='';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){mime='image/png';ext='.png';}
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){mime='image/jpeg';ext='.jpg';}
 else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){mime='image/webp';ext='.webp';}
 else if(bytes.toString('ascii',0,5)==='%PDF-'){mime='application/pdf';ext='.pdf';}
 if(!mime||file.type!==mime||!(extname(file.name).toLowerCase()===ext||ext==='.jpg'&&extname(file.name).toLowerCase()==='.jpeg'))throw new Error('Ekstensi, tipe, dan isi berkas tidak cocok.');

 if(mime.startsWith('image/')){try{const image=sharp(bytes,{limitInputPixels:40000000});await image.metadata();await image.stats();}catch{throw new Error('Gambar tidak dapat dibaca atau resolusinya terlalu besar.');}}
 const id=crypto.randomUUID();const directory=resolve(privateFile?privateDirectory:'public/uploads');mkdirSync(directory,{recursive:true});writeFileSync(resolve(directory,id+ext),bytes);
 const url=privateFile?`/api/private-media/${id}`:`/uploads/${id}${ext}`;const title=basename(file.name,extname(file.name)).slice(0,150)+ext;
 db.prepare('INSERT INTO media(id,title,url,mime,size,private,created_at) VALUES(?,?,?,?,?,?,?)').run(id,title,url,mime,bytes.length,privateFile?1:0,new Date().toISOString());audit(actor.id,'upload','media',id,{title,size:file.size,private:privateFile});return json({id,url,title,mime});
 }
 if(request.method==='DELETE'){
 return json(deleteMedia(path[1],actor.id));
 }
 }
 return json({error:'Endpoint tidak ditemukan.'},404);
 }catch(e:any){const message=String(e.message||'');const safe=e instanceof TypeError?'Data tidak valid. Periksa masukan dan coba kembali.':e.code&&!/SQLITE_CONSTRAINT/.test(e.code)?'Data gagal diproses. Silakan coba kembali.':/UNIQUE constraint/.test(message)?'Slug atau email sudah digunakan.':/FOREIGN KEY/.test(message)?'Referensi data tidak valid.':/SQLITE|ENOENT|Unexpected token|JSON/.test(message)?'Data gagal diproses. Periksa masukan dan coba kembali.':message;return json({error:safe||'Data gagal diproses.'},e.status||400);}
}






