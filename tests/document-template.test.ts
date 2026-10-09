import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {normalizeDocumentSettings,normalizeTemplate,templateFor,newSigner,signerRows,approvalDate,documentKinds} from '../lib/document-template.ts';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dh-document-template-')),'test.sqlite');
const d=await import('../lib/database.ts'),{getDocumentSettings,saveDocumentSettings}=await import('../lib/document-settings.ts'),{documentPreview}=await import('../lib/document-preview.ts'),{handle}=await import('../lib/api.ts');
const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
const profile={name:'Lembaga Profil',logo:'/media/image1.png',address:'Jalan Profil 10',phone:'075212345',email:'profil@example.test',website:'https://example.test'};
d.initializeRoles();d.saveRecord('site_settings',{...profile,title:'Profil',status:'published'},'test');
async function content(bytes:Buffer){const task=pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true}),pdf=await task.promise;const pages:any[]=[];for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),c=await p.getTextContent();pages.push({items:c.items.filter((v:any)=>'str' in v),width:p.view[2],height:p.view[3]});}await task.destroy();return {pages,text:pages.flatMap(p=>p.items.map((v:any)=>v.str)).join(' ')}}
const sample=(n:number)=>normalizeDocumentSettings({version:2,city:'Payakumbuh',signers:Array.from({length:n},(_,i)=>({...newSigner(i),name:'Dr. Penguji '+(i+1)+', M.Pd.',role:i===0?'Ketua Bidang Pendidikan':'Bendahara',identifier:'00'+i,identifierType:'NIY',position:['left','center','right'][i%3]})),receipt:true,report:true,donors:true,transactions:true,other:true});
test('legacy settings migrate and dynamic 1–6 signers persist with separate template overrides',()=>{
 const legacy=normalizeDocumentSettings({count:1,city:'Solok',signers:[{name:'Nama Lama',role:'Bendahara',identifier:'LAMA'},{name:'Cadangan',role:'Pimpinan'}],receipt:true,report:false,donors:false});assert.equal(legacy.signers.length,1);assert.equal(legacy.signers[0].position,'right');assert.equal(legacy.signers[0].identifier,'LAMA');
 const value=sample(6);value.shared=false;value.templates.receipt=normalizeTemplate({...sample(1),city:'Bukittinggi'});saveDocumentSettings(value,'test');const loaded=getDocumentSettings();assert.equal(loaded.signers.length,6);assert.equal(templateFor(loaded,'receipt').city,'Bukittinggi');assert.equal(templateFor(loaded,'report').city,'Payakumbuh');assert.throws(()=>saveDocumentSettings({...value,signers:[...value.signers,newSigner(7)]},'test'),/1 sampai 6/);assert.throws(()=>saveDocumentSettings({...value,signers:[]},'test'),/1 sampai 6/);assert.equal(getDocumentSettings().signers.length,6);
});
test('layout, date formats and source choice keep predictable row sizes',()=>{
 for(const [n,lengths] of [[1,[1]],[2,[2]],[3,[3]],[4,[2,2]],[5,[3,2]],[6,[3,3]]] as const)assert.deepEqual(signerRows(sample(n)).map(r=>r.length),lengths);
 for(const [layout,expected] of [['row',[6]],['two',[2,2,2]],['three',[3,3]]] as const)assert.deepEqual(signerRows({...sample(6),layout}).map(r=>r.length),expected);
 const t=sample(1);assert.equal(approvalDate('2026-10-04',{...t,dateFormat:'long-padded'}),'04 Oktober 2026');assert.equal(approvalDate('2026-10-04',{...t,dateFormat:'long'}),'4 Oktober 2026');assert.equal(approvalDate('2026-10-04',{...t,dateFormat:'numeric'}),'04-10-2026');assert.equal(approvalDate('2000-01-01',{...t,dateSource:'print',dateFormat:'numeric'},new Date('2026-11-02T00:00:00Z')),'02-11-2026');
});
test('left, center, right positions move the actual PDF signer',async()=>{
 const xs:number[]=[];for(const position of ['left','center','right'] as const){const t=sample(1);t.signers[0].position=position;const doc=await content(await documentPreview(t,'receipt'));const name=doc.pages.flatMap(p=>p.items).find((v:any)=>v.str.includes('Dr. Penguji'));assert.ok(name);xs.push(name.transform[4]);}assert.ok(xs[0]<xs[1]&&xs[1]<xs[2]);
});
test('all document types use their selected header, approval switches and unsaved names',async()=>{
 const t=sample(3);t.shared=false;t.templates.receipt=normalizeTemplate({...sample(1),header:{useProfile:false,custom:{name:'Kop Khusus',address:'Alamat Khusus'},style:'compact',line:'single'}});
 let receipt=await content(await documentPreview(t,'receipt'));assert.match(receipt.text,/Kop Khusus/);assert.doesNotMatch(receipt.text,/Lembaga Profil|Dr. Penguji 2/);
 assert.match((await content(await documentPreview(t,'report'))).text,/Lembaga Profil/);
 for(const kind of documentKinds){const off={...t,[kind]:false};assert.doesNotMatch((await content(await documentPreview(off,kind))).text,/Dr\. Penguji/)}
 const noHeader=sample(1);noHeader.header.enabled=false;noHeader.signers[0].identifierType='hidden';const hidden=await content(await documentPreview(noHeader,'receipt'));assert.doesNotMatch(hidden.text,/Lembaga Profil|Jalan Profil|NIY:|NIP:/);
});
test('styles and missing assets are safe; all six signer names fit pages at readable sizes',async()=>{
 mkdirSync(resolve('tmp/pdfs/template-qa'),{recursive:true});
 for(const style of ['formal','minimal','compact'] as const){const t=sample(style==='formal'?6:3);t.header.style=style;t.stamp={enabled:true,image:'/media/missing-stamp.png',position:'center',preset:'center'};t.signers[0].imageEnabled=true;t.signers[0].image='/media/missing-signature.png';const bytes=await documentPreview(t,'receipt'),doc=await content(bytes);for(let i=1;i<=t.signers.length;i++)assert.ok(doc.text.includes('Penguji '+i));for(const page of doc.pages)for(const item of page.items)if(item.str.trim()){assert.ok(item.transform[4]>=40&&item.transform[4]+item.width<=page.width-35,item.str);assert.ok(item.transform[5]>15&&item.transform[5]<page.height-25,item.str)}writeFileSync(resolve('tmp/pdfs/template-qa/'+style+'.pdf'),bytes);}
 const empty=sample(1);empty.header.useProfile=false;empty.header.custom.name='';assert.equal((await documentPreview(empty,'receipt')).subarray(0,5).toString(),'%PDF-');
 assert.throws(()=>normalizeDocumentSettings({...sample(1),stamp:{image:'../../.env'}}),/gambar lokal/);
});
test('draft preview is authenticated, read-only, and contains only sample transaction data',async()=>{
 await d.createUser({email:'template-admin@test.local',password:'Template!2026Safe',name:'Admin',role_id:'Super Admin'},'test');const cookie='darul_huda_session='+await d.login('template-admin@test.local','Template!2026Safe','template');
 d.saveRecord('donation_transactions',{title:'Privat',donor_name:'DONATUR PRIVAT RAHASIA',amount:150000,kind:'Pemasukan',status:'valid',date:'2026-10-04'},'test');
 const before=d.db.prepare('SELECT data FROM document_settings WHERE id=1').get();const preview=(session:string,body:any)=>handle(new Request('http://localhost/api/document-settings/preview',{method:'POST',headers:{cookie:session,origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(body)}));
 const draft=sample(2);draft.signers[0].name='Nama Draft Belum Disimpan';const r=await preview(cookie,{settings:draft,kind:'receipt'});assert.equal(r.status,200);assert.match(r.headers.get('content-disposition')!,/Contoh-receipt.pdf/);const doc=await content(Buffer.from(await r.arrayBuffer()));assert.match(doc.text,/Nama Draft Belum Disimpan|Donatur Contoh/);assert.doesNotMatch(doc.text,/DONATUR PRIVAT RAHASIA/);assert.deepEqual(d.db.prepare('SELECT data FROM document_settings WHERE id=1').get(),before);
 assert.equal((await preview('',{settings:draft,kind:'receipt'})).status,401);
 await d.createUser({email:'template-editor@test.local',password:'Template!2026Safe',name:'Editor',role_id:'Editor Berita'},'test');const editor='darul_huda_session='+await d.login('template-editor@test.local','Template!2026Safe','template-editor');assert.equal((await preview(editor,{settings:draft,kind:'receipt'})).status,403);
 const bad=await preview(cookie,{settings:{...draft,signers:[]},kind:'receipt'});assert.ok(bad.status>=400);assert.match((await bad.json()).details,/1 sampai 6/);
});

test('signature and stamp assets render and remain protected while configured',async()=>{
 const {mediaUsage}=await import('../lib/media-service.ts');
 d.db.prepare('INSERT OR IGNORE INTO media(id,title,url,mime,size,private,created_at) VALUES(?,?,?,?,?,?,?)').run('template-logo','Logo contoh','/media/image1.png','image/png',100,0,new Date().toISOString());
 const t=sample(1);t.signers[0].imageEnabled=true;t.signers[0].image='/media/image1.png';t.stamp={enabled:true,image:'/media/image1.png',position:'custom',preset:'left'};saveDocumentSettings(t,'test');
 assert.ok(mediaUsage({id:'template-logo',url:'/media/image1.png'}).some(u=>u.id==='document-settings'));
 const bytes=await documentPreview(t,'receipt'),task=pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true}),pdf=await task.promise;const page=await pdf.getPage(1),operators=await page.getOperatorList();assert.ok(operators.fnArray.filter((op:number)=>op===pdfjs.OPS.paintImageXObject).length>=3);await task.destroy();
 writeFileSync(resolve('tmp/pdfs/template-qa/images.pdf'),bytes);
});
