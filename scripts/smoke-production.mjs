import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
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
 assert.equal((await req('/halaman-yang-tidak-ada')).status,404);
 assert.equal((await req('/sw.js')).headers.get('cache-control'),'no-store');
 assert.equal((await req('/api/me')).headers.get('cache-control'),'no-store');
 const admin=await req('/admin');assert.equal(admin.headers.get('cache-control'),'no-store');
 const manifest=await (await req('/manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');
 console.log('PASS: production static assets, new uploads, Secure cookies, forced initial password change, private no-store, 404, PWA manifest.');
}catch(e){console.error(logs);throw e;}finally{child.kill();d.db.close();}
