import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import sharp from 'sharp';
const root=mkdtempSync(join(tmpdir(),'dh-production-test-'));
process.env.DARUL_HUDA_DB=join(root,'smoke.sqlite');
const d=await import('../lib/database.ts');
d.initializeRoles();
const password='Smoke!'+randomBytes(12).toString('hex')+'A';
const id=await d.createUser({email:'smoke@test.local',password,role_id:'Super Admin'},'test');
const child=spawn(process.execPath,['scripts/start.mjs'],{cwd:process.cwd(),windowsHide:true,env:{...process.env,APP_PORT:'5176',DARUL_HUDA_DB:process.env.DARUL_HUDA_DB},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
const base='http://localhost:5176';let cookie='';
async function req(path,method='GET',body){return fetch(base+path,{method,headers:{Origin:base,Cookie:cookie,...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});}
try{
 for(let i=0;i<80;i++){try{await fetch(base+'/api/me');break}catch{await new Promise(r=>setTimeout(r,150))}}
 const html=await (await req('/')).text();const assetPaths=[...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)/g)].map(m=>m[1]);assert.ok(assetPaths.length>0);
 for(const url of [...new Set(assetPaths),'/media/image1.png','/icons/icon-192.png','/manifest.webmanifest','/sw.js']){const r=await req(url);assert.equal(r.status,200,url);assert.ok(!r.headers.get('content-type')?.includes('text/html'),url);}
 assert.equal((await req('/api/me')).status,401);
 const login=await req('/api/login','POST',{email:'smoke@test.local',password});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/Secure/);cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await req('/api/bootstrap')).status,403,'Initial password must be changed');
 d.db.prepare('UPDATE users SET must_change=0 WHERE id=?').run(id);
 assert.equal((await req('/api/bootstrap')).status,200);
 const appearanceRows=[{id:'smoke-custom',title:'Bagian pengujian',section:'custom',customText:'Konten builder tersimpan',heading:'Judul builder',layout:'grid2',limit:3,status:'published',showAll:false}];
 const appearanceSave=await req('/api/content/home_sections','POST',{appearanceItems:appearanceRows,expected:[]});assert.equal(appearanceSave.status,200,await appearanceSave.clone().text());
 const appearanceHtml=await (await req('/')).text();assert.ok(appearanceHtml.includes('Konten builder tersimpan'));assert.ok(appearanceHtml.includes('Judul builder'));
 assert.equal((await req('/api/content/home_sections','POST',{appearanceItems:appearanceRows,expected:[]})).status,400);

 // Builder settings must survive the production API and reach the public renderer.
 const homeSnapshot=await appearanceSave.json();
 const builderItems=[{id:'smoke-hero-section',title:'Hero',section:'hero',status:'published'},...homeSnapshot.map(r=>({...r,width:'full',spacing:'tight',background:'sage',animation:'none',columnsDesktop:4,columnsTablet:2,columnsMobile:1}))];
 const builderSaved=await req('/api/content/home_sections','POST',{appearanceItems:builderItems,expected:homeSnapshot.map(r=>({id:r.id,updated_at:r.updated_at}))});
 assert.equal(builderSaved.status,200,await builderSaved.clone().text());
 const heroSave=await req('/api/content/hero_slides','POST',{appearanceItems:[{id:'smoke-hero',title:'Hero builder produksi',status:'published',image:'/media/image2.png',duration:7,transition:'split',transitionSpeed:'slow',textPosition:'right',overlay:'dark'}],expected:[]});
 assert.equal(heroSave.status,200,await heroSave.clone().text());const heroRows=await heroSave.json();assert.equal(heroRows[0].duration,7);assert.equal(heroRows[0].transition,'split');
 const builderHtml=await (await req('/')).text();assert.ok(builderHtml.includes('Hero builder produksi'));assert.ok(builderHtml.includes('section-width-full'));assert.ok(builderHtml.includes('section-spacing-tight'));assert.ok(builderHtml.includes('hero-text-right'));
 const disableHero=await req('/api/content/hero_slides','POST',{appearanceItems:heroRows.map(r=>({...r,status:'draft'})),expected:heroRows.map(r=>({id:r.id,updated_at:r.updated_at}))});assert.equal(disableHero.status,200);
 const fallbackHtml=await (await req('/')).text();assert.ok(fallbackHtml.includes('Sorotan Darul Huda'));assert.ok(!fallbackHtml.includes('Hero builder produksi'));

 // PDFKit package-private fonts must resolve in the bundled production server.
 const institution=d.saveRecord('site_settings',{title:'Lembaga Uji PDF',name:'Lembaga Uji PDF',logo:'/media/logo-tidak-ada.png',status:'published'},id);
 const donation=d.saveRecord('donation_transactions',{title:'Donasi PDF produksi',status:'valid',kind:'Pemasukan',donor_name:'Ahmad Uji',donor_phone:'081363123456',publicName:false,anonymous:true,amount:200000,date:'2026-10-04'},id);
 const receipt=d.db.prepare('SELECT token FROM donation_receipts WHERE transaction_id=?').get(donation.id);
 for(const path of ['/api/donations/export?format=pdf','/api/donors/export?format=pdf','/api/donations/'+donation.id+'/pdf','/api/receipts/'+receipt.token+'/pdf']){
  const pdf=await req(path);assert.equal(pdf.status,200,await pdf.clone().text());assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.match(pdf.headers.get('content-disposition'),/attachment; filename=/);assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
 }
 const preview=await req('/api/donations/'+donation.id+'/pdf?view=1');assert.match(preview.headers.get('content-disposition'),/^inline/);
 const missing=await req('/api/donations/no-such-id/pdf');assert.equal(missing.status,404);const failure=await missing.json();assert.equal(failure.error,'PDF belum dapat dibuat.');assert.match(failure.details,/tidak ditemukan/);
 const announcement=d.saveRecord('announcements',{title:'Pengumuman pengujian halaman',summary:'Ringkasan dari database',body:'<p>Isi detail terpisah</p>',category:'Akademik',priority:'Penting',untilRevoked:true,status:'published'},id);
 const draft=d.saveRecord('announcements',{title:'Draft tidak boleh terlihat',status:'draft'},id);
 const event=d.saveRecord('agendas',{title:'Agenda pengujian',date:'2099-10-01',allDay:true,location:'Aula',status:'published'},id);
 d.saveRecord('academic_calendars',{title:'Ujian kalender',date:'2026-10-01',allDay:true,kind:'Ujian',showPublic:true,status:'published'},id);
 d.saveRecord('registrations',{title:'Penerimaan dari admin',requirements:'Persyaratan uji',registrationStatus:'Dibuka',feeType:'Gratis',registrationUrl:'https://example.test/daftar',status:'published'},id);
 for(const [route,title] of [['/informasi','Informasi &amp; Layanan'],['/informasi/pendaftaran','Pendaftaran Santri Baru'],['/informasi/pengumuman','Pengumuman'],['/informasi/agenda','Agenda'],['/informasi/kalender','Kalender Pendidikan']]){const response=await req(route);assert.equal(response.status,200,route);assert.ok((await response.text()).includes(title),route);}
 const landing=await (await req('/informasi')).text();assert.ok(landing.includes('information-services'));assert.ok(!landing.includes('information-detail-card'));
 const detail=await req('/informasi/pengumuman/'+announcement.slug);assert.equal(detail.status,200);assert.ok((await detail.text()).includes('Isi detail terpisah'));
 assert.equal((await req('/informasi/pengumuman/'+draft.slug)).status,404);
 assert.equal((await req('/informasi/jenis-tidak-ada')).status,404);
 assert.equal((await req('/informasi/agenda/'+event.slug)).status,200);
 const sitemap=await (await req('/sitemap.xml')).text();assert.ok(sitemap.includes('/informasi/kalender'));assert.ok(sitemap.includes('/informasi/pengumuman/'+announcement.slug));

 const form=new FormData();form.set('file',new File([readFileSync('public/media/image1.png')],'production-upload.png',{type:'image/png'}));
 const uploaded=await req('/api/media','POST',form);assert.equal(uploaded.status,200);const media=await uploaded.json();assert.equal(media.mime,'image/png');
 const image=await req(media.url);assert.equal(image.status,200,'New uploads must work after build');assert.equal(image.headers.get('content-type'),'image/png');
 const variant='/api/media-image?'+new URLSearchParams({src:media.url,purpose:'featured',x:'0',y:'0.21875',w:'1',h:'0.5625'});
 const transformed=await req(variant);assert.equal(transformed.status,200,'Crop derivative must work in production');assert.equal(transformed.headers.get('content-type'),'image/webp');assert.ok((await transformed.arrayBuffer()).byteLength>0);
 const afterVariant=await (await req('/api/media')).json();assert.equal(afterVariant.filter(r=>r.id===media.id).length,1,'Derivative must reuse master');
 assert.equal((await req('/api/media/'+media.id,'DELETE')).status,200);
 // Exercise multipart uploads at real hero dimensions (well above 1 MB).
 for(const [purpose,width,height] of [['hero',1920,840],['heroMobile',1080,1350],['hero',2400,1400]]){
  const bytes=await sharp(randomBytes(width*height*3),{raw:{width,height,channels:3}}).png().toBuffer();
  assert.ok(bytes.length>1024*1024&&bytes.length<10*1024*1024);
  const form=new FormData();form.set('purpose',purpose);form.set('file',new File([bytes],purpose+'.png',{type:'image/png'}));
  const response=await req('/api/media','POST',form);
  assert.equal(response.status,200,await response.clone().text());
  const uploaded=await response.json();
  const preview=await req('/api/media-image?'+new URLSearchParams({src:uploaded.url,purpose}));
  assert.equal(preview.status,200);assert.ok((await preview.arrayBuffer()).byteLength>0);
  assert.equal((await req('/api/media/'+uploaded.id,'DELETE')).status,200);
 }
 const oversized=new FormData();oversized.set('purpose','hero');oversized.set('file',new File([new Uint8Array(10*1024*1024+1)],'oversized.png',{type:'image/png'}));
 const rejected=await req('/api/media','POST',oversized);assert.equal(rejected.status,400);assert.match((await rejected.json()).error,/10 MB/);
 assert.equal((await req('/halaman-yang-tidak-ada')).status,404);
 assert.equal((await req('/sw.js')).headers.get('cache-control'),'no-store');
 assert.equal((await req('/api/me')).headers.get('cache-control'),'no-store');
 const admin=await req('/admin');assert.equal(admin.headers.get('cache-control'),'no-store');
 const manifest=await (await req('/manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');
 const documentSettings=await (await req('/api/document-settings')).json();
 const documentBefore=d.db.prepare('SELECT data FROM document_settings WHERE id=1').get();
 documentSettings.signers[0].name='Contoh Produksi';
 const documentPreview=await req('/api/document-settings/preview','POST',{kind:'receipt',settings:documentSettings});
 assert.equal(documentPreview.status,200,await documentPreview.clone().text());assert.match(documentPreview.headers.get('content-type'),/application\/pdf/);assert.equal(Buffer.from(await documentPreview.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
 assert.deepEqual(d.db.prepare('SELECT data FROM document_settings WHERE id=1').get(),documentBefore,'Preview must not persist settings');
 console.log('PASS: production static assets, new uploads, Secure cookies, forced initial password change, private no-store, 404, PWA manifest.');
}catch(e){console.error(logs);throw e;}finally{child.kill();d.db.close();}
