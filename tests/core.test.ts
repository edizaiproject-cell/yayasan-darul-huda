import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'darul-huda-tests-')),'test.sqlite');
const d=await import('../lib/database.ts');
const {handle}=await import('../lib/api.ts');
d.initializeRoles();
let cookie='';let editorCookie='';let program:any;let transaction:any;
async function request(path:string,method='GET',body?:any,session=cookie,origin='http://localhost:5174') {return handle(new Request('http://localhost:5174/api/'+path,{method,headers:{origin,cookie:session,...(body&&!(body instanceof FormData)?{'content-type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined}));}
test('setup hashes password, login creates HttpOnly isolated session',async()=>{
 await d.createUser({email:'admin@test.local',password:'StrongPassword!2026',role_id:'Super Admin'},'test');
 const row=d.db.prepare('SELECT password_hash FROM users').get() as any;assert.ok(row.password_hash.startsWith('pbkdf2_sha256$'));assert.ok(!row.password_hash.includes('StrongPassword'));
 const res=await request('login','POST',{email:'admin@test.local',password:'StrongPassword!2026'});assert.equal(res.status,200);assert.match(res.headers.get('set-cookie')!,/HttpOnly; SameSite=Strict/);cookie=res.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await request('me')).status,200);assert.equal((await request('bootstrap','GET',undefined,'')).status,401);
});
test('cross-origin changes and invalid credentials rejected',async()=>{assert.equal((await request('content/posts','POST',{title:'No'},cookie,'https://hostile.example')).status,403);assert.equal((await request('login','POST',{email:'admin@test.local',password:'wrong'})).status,400)});
test('separate content tables CRUD, draft visibility, schedule and HTML sanitation',async()=>{
 const draft=d.saveRecord('posts',{title:'Draft',slug:'draft',body:'<p onclick="alert(1)">Hello</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a>'},'test');assert.doesNotMatch(draft.body,/onclick|onerror|<script|javascript:/);assert.equal(d.publicData().posts.length,0);
 d.saveRecord('posts',{...draft,status:'scheduled',publishAt:'2020-01-01T10:00'},'test');assert.equal(d.publicData().posts.length,1);
 d.saveRecord('posts',{...draft,status:'scheduled',publishAt:'2099-01-01T10:00'},'test');assert.equal(d.publicData().posts.length,0);
 for(const name of ['education_units','galleries','library_items','pages','academics','registrations','announcements','agendas','academic_calendars','business_units','hero_slides','home_sections','menu_items','footer_links']){const r=d.saveRecord(name,{title:'Test '+name,status:'published',...(name==='footer_links'?{url:'/kontak'}:{}),...(['agendas','academic_calendars'].includes(name)?{date:'2026-10-01',allDay:true}:{})},'test');assert.ok(d.records(name).some(x=>x.id===r.id));d.saveRecord(name,{...r,title:'Updated '+name},'test');d.deleteRecord(name,r.id,'test');assert.equal(d.records(name).length,0);}
});
test('donation totals are valid transaction sums, correction reasons required',()=>{
 program=d.saveRecord('donation_programs',{title:'Test program',status:'active',target:100000},'test');
 transaction=d.saveRecord('donation_transactions',{title:'Donation',programId:program.id,amount:50000,kind:'Pemasukan',status:'valid',anonymous:true,donor:'Private donor'},'test');
 assert.equal(d.donationTotal(program.id),50000);
 d.saveRecord('donation_transactions',{title:'Draft',programId:program.id,amount:10000,kind:'Pemasukan',status:'draft'},'test');assert.equal(d.donationTotal(program.id),50000);
 assert.throws(()=>d.saveRecord('donation_transactions',{title:'Bad correction',programId:program.id,amount:-10000,kind:'Koreksi',status:'valid'},'test'),/Alasan/);
 d.saveRecord('donation_transactions',{title:'Correction',programId:program.id,amount:-10000,kind:'Koreksi',note:'Duplicate amount correction',status:'valid'},'test');assert.equal(d.donationTotal(program.id),40000);
 assert.throws(()=>d.saveRecord('donation_transactions',{...transaction,amount:1},'test'),/tidak boleh diubah/);
 assert.throws(()=>d.deleteRecord('donation_transactions',transaction.id,'test'),/tidak boleh dihapus/);
 assert.throws(()=>d.saveRecord('donation_transactions',{title:'Excess correction',programId:program.id,amount:-90000,kind:'Koreksi',note:'test',status:'valid'},'test'),/negatif/);
 assert.throws(()=>d.deleteRecord('donation_programs',program.id,'test'),/masih digunakan/);
 assert.equal(d.publicData().donation_programs[0].percentage,40);assert.ok(!JSON.stringify(d.publicData()).includes('Private donor'));
});
test('void transaction preserves original amount, adds audit, changes aggregate',()=>{
 const correction=d.records('donation_transactions',true).find(r=>r.title==='Correction')!;
 d.saveRecord('donation_transactions',{...correction,status:'void',note:'Reversed correction'},'test');assert.equal(d.donationTotal(program.id),50000);
 const voided=d.saveRecord('donation_transactions',{...transaction,status:'void',amount:1,note:'Duplicate donation'},'test');assert.equal(voided.amount,50000);assert.equal(d.donationTotal(program.id),0);assert.ok(d.db.prepare("SELECT id FROM audit_logs WHERE entity='donation_transactions' AND action='update'").get());
});
test('server permissions prohibit editor finance and user administration',async()=>{
 await d.createUser({email:'editor@test.local',password:'StrongPassword!2026',role_id:'Editor Berita'},'test');const res=await request('login','POST',{email:'editor@test.local',password:'StrongPassword!2026'});editorCookie=res.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await request('content/donation_transactions','GET',undefined,editorCookie)).status,403);
 assert.equal((await request('users','GET',undefined,editorCookie)).status,403);
 const body=await (await request('bootstrap','GET',undefined,editorCookie)).json();assert.ok(body.data.posts);assert.equal(body.data.donation_transactions,undefined);
 assert.equal((await request('content/posts','POST',{title:'Editor post',status:'published'},editorCookie)).status,200);
});
test('upload detects MIME mismatch; public media delete respects references',async()=>{
 const bad=new FormData();bad.set('file',new File(['<script>evil</script>'],'x.png',{type:'image/png'}));assert.equal((await request('media','POST',bad)).status,400);
 const body=new FormData();body.set('file',new File([readFileSync('public/media/image1.png')],'logo.png',{type:'image/png'}));const response=await request('media','POST',body);assert.equal(response.status,200);const media=await response.json();
 const page=d.saveRecord('pages',{title:'Media reference',image:media.url},'test');assert.equal((await request('media/'+media.id,'DELETE')).status,400);d.saveRecord('pages',{...page,image:''},'test');d.deleteRecord('pages',page.id,'test');assert.equal((await request('media/'+media.id,'DELETE')).status,200);
});
test('login throttling and logout revoke session',async()=>{for(let i=0;i<9;i++)await request('login','POST',{email:'throttle@test.local',password:'wrong'});const r=await request('login','POST',{email:'throttle@test.local',password:'wrong'});assert.match((await r.json()).error,/Terlalu banyak/);await request('logout','POST',{});assert.equal((await request('me')).status,401);});

test('private donation proofs require finance permission and are never in media library',async()=>{
 const admin=await request('login','POST',{email:'admin@test.local',password:'StrongPassword!2026'});cookie=admin.headers.get('set-cookie')!.split(';')[0];
 const form=new FormData();form.set('private','true');form.set('file',new File([readFileSync('public/media/image1.png')],'private-proof.png',{type:'image/png'}));const upload=await request('media','POST',form);assert.equal(upload.status,200);const proof=await upload.json();assert.match(proof.url,/^\/api\/private-media\//);
 assert.equal((await request('private-media/'+proof.id,'GET',undefined,'')).status,401);assert.equal((await request('private-media/'+proof.id,'GET',undefined,editorCookie)).status,403);
 const file=await request('private-media/'+proof.id);assert.equal(file.status,200);assert.equal(file.headers.get('cache-control'),'no-store');
 const library=await (await request('media')).json();assert.ok(!library.some((r:any)=>r.id===proof.id));
 const {unlinkSync}=await import('node:fs');assert.match(proof.id,/^[a-f0-9-]{36}$/);unlinkSync(join('data/private',proof.id+'.png'));
});
test('future publication and invalid references stay out of public catalog',()=>{assert.throws(()=>d.saveRecord('posts',{title:'Unknown category',categoryId:'missing'},'test'),/Referensi/);assert.throws(()=>d.saveRecord('hero_slides',{title:'Bad URL',primaryUrl:'javascript:alert(1)'},'test'),/URL/);assert.throws(()=>d.saveRecord('agendas',{title:'Bad date',date:'not a date'},'test'),/Tanggal/)});
test('post publication permission cannot be bypassed with donation-only statuses',async()=>{d.db.prepare("DELETE FROM role_permissions WHERE role_id='Editor Berita' AND permission='posts.publish'").run();assert.equal((await request('content/posts','POST',{title:'No publish permission',status:'published'},editorCookie)).status,403);assert.equal((await request('content/posts','POST',{title:'Status bypass',status:'closed'},editorCookie)).status,400);assert.equal((await request('content/posts','POST',{title:'Draft allowed',status:'draft'},editorCookie)).status,200);});

test('self profile is private, validated, and cannot escalate role or edit another account',async()=>{
 const before=await (await request('me','GET',undefined,editorCookie)).json();
 const response=await request('profile','PUT',{name:'Editor Test',email:'editor-updated@test.local',whatsapp:'+62 (812) 3456-7890',id:'someone-else',role_id:'Super Admin',active:0},editorCookie);
 assert.equal(response.status,200);const after=await response.json();assert.equal(after.name,'Editor Test');assert.equal(after.whatsapp,'6281234567890');assert.equal(after.role_id,before.role_id);assert.equal(after.active,1);assert.deepEqual(after.permissions,before.permissions);
 assert.equal((await request('profile','GET',undefined,'')).status,401);
 assert.equal((await request('profile','PUT',{name:'',email:'invalid'},editorCookie)).status,400);
 assert.equal((await request('profile','PUT',{name:'Editor',email:'admin@test.local'},editorCookie)).status,400);
 assert.equal((await request('users','GET',undefined,editorCookie)).status,403);
 assert.ok(!JSON.stringify(d.publicData()).includes('editor-updated@test.local'));
});
test('profile photo upload is owner-only, sanitized, replaceable and removable without media permission',async()=>{
 d.db.prepare("DELETE FROM role_permissions WHERE role_id='Editor Berita' AND permission='media.manage'").run();
 const body=new FormData();body.set('file',new File([readFileSync('public/media/image1.png')],'avatar.png',{type:'image/png'}));
 assert.equal((await request('profile/photo','POST',body,editorCookie)).status,200);
 const res=await request('profile/photo','GET',undefined,editorCookie);assert.equal(res.headers.get('content-type'),'image/webp');assert.equal(res.headers.get('cache-control'),'no-store');
 const sharp=(await import('sharp')).default;const meta=await sharp(Buffer.from(await res.arrayBuffer())).metadata();assert.equal(meta.width,256);assert.equal(meta.height,256);
 assert.equal((await request('profile/photo','GET',undefined,'')).status,401);
 assert.equal((await request('profile/photo')).status,404);
 const bad=new FormData();bad.set('file',new File(['<svg/>'],'x.png',{type:'image/png'}));assert.equal((await request('profile/photo','POST',bad,editorCookie)).status,400);
 assert.equal((await request('profile/photo','POST',body,editorCookie)).status,200);
 assert.equal((await request('profile/photo','DELETE',undefined,editorCookie)).status,200);
 assert.equal((await (await request('me','GET',undefined,editorCookie)).json()).avatar_url,'');
});
test('WhatsApp settings normalize number, encode message and respect enabled state',async()=>{
 const {normalizeWhatsapp,whatsappLink}=await import('../lib/whatsapp.ts');
 for(const value of ['081234567890','+62 (812) 3456-7890','6281234567890'])assert.equal(normalizeWhatsapp(value),'6281234567890');
 assert.equal(whatsappLink({whatsapp:'081234567890',whatsappEnabled:false}),null);assert.equal(whatsappLink({whatsappEnabled:true,whatsapp:''}),null);
 const message="Assalamu'alaikum & informasi?";const link=whatsappLink({whatsappEnabled:true,whatsapp:'081234567890',whatsappMessage:message})!;assert.equal(new URL(link).searchParams.get('text'),message);assert.equal(new URL(link).pathname,'/6281234567890');
 const settings=d.saveRecord('site_settings',{title:'Settings',status:'published',whatsappEnabled:true,whatsapp:'081234567890',whatsappMessage:message},'test');assert.equal(settings.whatsapp,'6281234567890');assert.equal(settings.whatsappMessage,message);
});
test('self password change validates current password and revokes sessions',async()=>{
 assert.equal((await request('password','POST',{current:'wrong',password:'NewStrongPass!2026'},editorCookie)).status,400);
 assert.equal((await request('password','POST',{current:'StrongPassword!2026',password:'NewStrongPass!2026'},editorCookie)).status,200);
 assert.equal((await request('me','GET',undefined,editorCookie)).status,401);
 const login=await request('login','POST',{email:'editor-updated@test.local',password:'NewStrongPass!2026'});assert.equal(login.status,200);
});

test('transaction saves donor_name with fallback and supports legacy donor input',()=>{
 const p=d.saveRecord('donation_programs',{title:'Donor identity tests',status:'active'},'test');
 for(const [i,value] of ['', '  \t ', null, undefined, '  Fatimah  '].entries()){
  const saved=d.saveRecord('donation_transactions',{title:'Donor identity '+i,programId:p.id,kind:'Pemasukan',amount:10000,status:'draft',donor_name:value},'test');
  assert.equal(saved.donor_name,i===4?'Fatimah':'Hamba Allah');
  const stored=JSON.parse((d.db.prepare('SELECT data FROM donation_transactions WHERE id=?').get(saved.id) as any).data);
  assert.equal(stored.donor_name,saved.donor_name);assert.ok(!Object.hasOwn(stored,'donor'));
 }
 const legacy=d.saveRecord('donation_transactions',{title:'Legacy input',programId:p.id,kind:'Pemasukan',amount:10000,status:'draft',donor:'  Ahmad  '},'test');assert.equal(legacy.donor_name,'Ahmad');
 const edited=d.saveRecord('donation_transactions',{...legacy,donor_name:' '},'test');assert.equal(edited.donor_name,'Hamba Allah');
});

test('payment QR upload validates images, preserves bytes and replaces only after successful save',async()=>{
 const sharp=(await import('sharp')).default;
 const QRCode=(await import('qrcode')).default;
 const {existsSync,readFileSync}=await import('node:fs');
 const {resolve,basename}=await import('node:path');
 await d.createUser({email:'qr-admin@test.local',password:'StrongPassword!2026',role_id:'Admin Donasi'},'test');
 const auth=await request('login','POST',{email:'qr-admin@test.local',password:'StrongPassword!2026'});const qrCookie=auth.headers.get('set-cookie')!.split(';')[0];
 async function upload(bytes:Buffer,mime='image/png',session=qrCookie){const body=new FormData();body.set('file',new File([new Uint8Array(bytes)],'official-qr.png',{type:mime}));return request('payment-qr','POST',body,session)}
 assert.equal((await upload(Buffer.from('<svg onload="alert(1)"/>'))).status,400);
 assert.equal((await upload(Buffer.alloc(3*1024*1024+1))).status,400);
 const tiny=await sharp({create:{width:64,height:64,channels:3,background:'white'}}).png().toBuffer();assert.equal((await upload(tiny)).status,400);
 const png=await QRCode.toBuffer('TEST ONLY - payment QR validation',{width:600});
 assert.equal((await upload(png,'image/jpeg')).status,400);
 assert.equal((await upload(png,'image/png','')).status,401);
 const first=await (await upload(png)).json();assert.match(first.url,/^\/uploads\/[a-f0-9-]{36}\.png$/);assert.deepEqual(readFileSync(resolve('public/uploads',basename(first.url))),png);
 const settings=d.records('site_settings',true)[0]||d.saveRecord('site_settings',{title:'Website',status:'published'},'test');
 const account=d.saveRecord('donation_accounts',{title:'QR test bank',bank:'TEST',number:'000123',holder:'Test',status:'published',qr_enabled:true,qr_active:true,qr_type:'QRIS',qr_image:first.url,qr_primary:true},'test');
 assert.equal(d.records('site_settings',true).find(r=>r.id===settings.id)?.donationQris,first.url);
 const second=await (await upload(png)).json();
 const bad=await request('content/donation_accounts','POST',{...account,qr_image:second.url,qr_type:'invalid'},qrCookie);assert.equal(bad.status,400);assert.ok(existsSync(resolve('public/uploads',basename(first.url))));
 const changed=await request('content/donation_accounts','POST',{...account,qr_image:second.url,qr_primary:true},qrCookie);assert.equal(changed.status,200);assert.equal(second.url,first.url);assert.ok(existsSync(resolve('public/uploads',basename(first.url))));
 assert.equal(d.records('site_settings',true).find(r=>r.id===settings.id)?.donationQris,second.url);
 const current=await changed.json();const disabled=await request('content/donation_accounts','POST',{...current,qr_active:false,qr_primary:false},qrCookie);assert.equal(disabled.status,200);assert.ok(existsSync(resolve('public/uploads',basename(second.url))));assert.equal(d.records('site_settings',true).find(r=>r.id===settings.id)?.donationQris,'');
 const removed=await request('content/donation_accounts','POST',{...current,qr_image:'',qr_enabled:false,qr_active:false,qr_primary:false},qrCookie);assert.equal(removed.status,200);assert.ok(existsSync(resolve('public/uploads',basename(second.url))));
});

test('program category accepts donation choices and rejects unrelated new categories',()=>{
 const p=d.saveRecord('donation_programs',{title:'Category test',category:'Pendidikan',status:'active'},'test');assert.equal(p.category,'Pendidikan');
 assert.throws(()=>d.saveRecord('donation_programs',{...p,category:'Berita'},'test'),/Pilihan tidak valid/);
 d.db.prepare("UPDATE donation_programs SET data=json_set(data,'$.category','Kategori historis') WHERE id=?").run(p.id);
 const legacy=d.records('donation_programs',true).find(r=>r.id===p.id)!;
 assert.equal(d.saveRecord('donation_programs',{...legacy,title:'Historical category retained'},'test').category,'Kategori historis');
 assert.equal(d.saveRecord('donation_programs',{...legacy,category:'Wakaf'},'test').category,'Wakaf');
});

test('donation account editor maintains existing program relations atomically without requiring CMS identity',()=>{
 const a=d.saveRecord('donation_accounts',{bank:'BNI',number:'0012345',holder:'Darul Huda',status:'published'},'test');assert.ok(a.title.includes('BNI'));assert.ok(a.slug);
 const p=d.saveRecord('donation_programs',{title:'Relasi rekening',category:'Wakaf',status:'active',target:1000},'test');
 d.saveRecord('donation_accounts',{...a,linkedPrograms:[p.id]},'test');assert.equal(d.records('donation_programs',true).find(x=>x.id===p.id)?.accountId,a.id);assert.equal((d.db.prepare('SELECT account_id FROM donation_programs WHERE id=?').get(p.id) as any).account_id,a.id);
 assert.throws(()=>d.saveRecord('donation_accounts',{...a,linkedPrograms:['missing']},'test'),/tidak valid/);assert.equal(d.records('donation_programs',true).find(x=>x.id===p.id)?.accountId,a.id);
 d.saveRecord('donation_accounts',{...a,linkedPrograms:[]},'test');const restored=d.records('donation_programs',true).find(x=>x.id===p.id)!;assert.equal(restored.accountId,'');assert.equal(restored.category,'Wakaf');assert.equal(restored.target,1000);
});
test('donation update publishing date controls visibility while preserving program and documentation',()=>{
 const p=d.saveRecord('donation_programs',{title:'Perkembangan terjadwal',status:'active'},'test');
 const update=d.saveRecord('donation_updates',{title:'Tahap pertama',programId:p.id,summary:'Ringkasan tahap',status:'published',publishAt:'2099-01-01T10:00',document:'/media/contoh.pdf',progress:25},'test');
 assert.ok(!d.records('donation_updates').some(r=>r.id===update.id));d.saveRecord('donation_updates',{...update,publishAt:'2020-01-01T10:00'},'test');assert.equal(d.records('donation_updates').find(r=>r.id===update.id)?.document,'/media/contoh.pdf');assert.throws(()=>d.saveRecord('donation_updates',{title:'Tanpa program'},'test'),/Pilih program/);
});
// Remove only files registered in this isolated test database.
test.after(async()=>{const {existsSync,unlinkSync}=await import('node:fs');const {resolve,sep}=await import('node:path');const root=resolve('public/uploads')+sep;for(const row of d.db.prepare('SELECT url FROM media WHERE private=0').all() as any[]){if(!/^\/uploads\/[a-f0-9-]{36}\.(png|jpg|webp|pdf)$/.test(row.url))continue;const path=resolve('public',row.url.slice(1));if(path.startsWith(root)&&existsSync(path))unlinkSync(path);}});
