import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dh-media-test-')),'media.sqlite');
const d=await import('../lib/database.ts');
const m=await import('../lib/media-service.ts');
const {servePublicMedia}=await import('../lib/media-response.ts');
const paths:string[]=[];
const image=await sharp({create:{width:520,height:520,channels:3,background:'#057367'}}).png().toBuffer();
const file=(bytes:Buffer,name='sample.png',type='image/png')=>new File([new Uint8Array(bytes)],name,{type});
test.after(()=>{for(const path of paths)if(existsSync(path))unlinkSync(path);d.db.close()});
test('identical bytes with different names and concurrent uploads share one unchanged master',async()=>{
 const [a,b]=await Promise.all([m.storePublicMedia(file(image),'test'),m.storePublicMedia(file(image,'different.png'),'test')]);paths.push(m.mediaPath(a.url));assert.equal(a.id,b.id);assert.equal([a,b].filter(r=>r.reused).length,1);assert.equal([a,b].find(r=>r.reused)?.message,m.reusedMessage);assert.equal(d.db.prepare('SELECT COUNT(*) n FROM media').get()?.n,1);assert.deepEqual(readFileSync(m.mediaPath(a.url)),image);
 const other=await sharp({create:{width:520,height:520,channels:3,background:'#f5a000'}}).png().toBuffer();const c=await m.storePublicMedia(file(other),'test');paths.push(m.mediaPath(c.url));assert.notEqual(c.id,a.id);
});
test('validation runs before duplicate lookup and rejects extension spoofing / corrupt images',async()=>{
 await assert.rejects(m.storePublicMedia(file(image,'shell.exe'),'test'),/Ekstensi/);await assert.rejects(m.storePublicMedia(file(image,'sample.png','image/jpeg'),'test'),/Ekstensi/);await assert.rejects(m.storePublicMedia(file(image.subarray(0,30)),'test'),/Gambar/);
});
test('private media cannot become a deduplication target or appear in shared library',async()=>{
 const id=randomUUID();d.db.prepare('INSERT INTO media(id,title,url,mime,size,private,created_at,file_hash) SELECT ?,title,?,mime,size,1,created_at,file_hash FROM media LIMIT 1').run(id,'/api/private-media/'+id);
 const reused=await m.storePublicMedia(file(image),'test');assert.notEqual(reused.id,id);assert.ok(!(await m.listMedia([])).some(r=>r.id===id));
});
test('usage counts objects across images, galleries and rich text and protects archived references',async()=>{
 const media=await m.storePublicMedia(file(image),'test');const page=d.saveRecord('pages',{title:'Media page',image:media.url,body:`<p><img src="${media.url}"></p>`},'test');const gallery=d.saveRecord('galleries',{title:'Media gallery',photos:[{url:media.url,caption:''}]},'test');assert.equal(m.mediaUsage(media).length,2);assert.throws(()=>m.deleteMedia(media.id,'test'),/2 tempat/);d.deleteRecord('pages',page.id,'test');assert.equal(m.mediaUsage(media).length,2);assert.throws(()=>m.deleteMedia(media.id,'test'),/arsip/);
 const redacted=(await m.listMedia([])).find(r=>r.id===media.id)!;assert.equal(redacted.usage[0].title,'Digunakan oleh modul lain');assert.ok(!JSON.stringify(redacted.usage).includes(page.title));
 d.saveRecord('galleries',{...gallery,photos:[]},'test');
});
test('legacy merge reassigns content safely, preserves URLs and only then removes duplicate file',async()=>{
 const master=await m.storePublicMedia(file(image),'test');const id=randomUUID(),url=`/uploads/${id}.png`;paths.push(m.mediaPath(url));writeFileSync(m.mediaPath(url),image);d.db.prepare('INSERT INTO media(id,title,url,mime,size,private,created_at) VALUES(?,?,?,?,?,0,?)').run(id,'legacy.png',url,'image/png',image.length,'2099-01-01');
 const page=d.saveRecord('pages',{title:'Legacy',image:url,body:`<p><img src="${url}"><a href="${url}?download=1">Image</a></p>`},'test');await m.indexMedia();assert.equal((await m.listMedia(['institution.manage'])).find(r=>r.id===master.id)?.duplicates,1);
 const result=await m.mergeMedia([master.id,id],'test');assert.equal(result.canonical,master.url);assert.ok(existsSync(m.mediaPath(url)));const next=d.records('pages',true).find(r=>r.id===page.id)!;assert.equal(next.image,master.url);assert.ok(!next.body.includes(url));assert.equal(d.db.prepare('SELECT media_id FROM media_aliases WHERE old_url=?').get(url)?.media_id,master.id);const response=servePublicMedia(url.split('/').pop()!);assert.equal(response.status,308);assert.equal(response.headers.get('location'),master.url);assert.equal(m.cleanupMergedMedia(),1);assert.equal(servePublicMedia(master.url.split('/').pop()!).status,200);assert.ok(!existsSync(m.mediaPath(url)));assert.ok(existsSync(m.mediaPath(master.url)));
 const other=(d.db.prepare('SELECT id FROM media WHERE id<>? AND private=0').get(master.id) as any).id;await assert.rejects(m.mergeMedia([master.id,other],'test'),/berbeda/);assert.ok(d.db.prepare('SELECT id FROM media WHERE id=?').get(other));
});



test('context limits reject PDFs in images, oversized thumbnails and JPEG logos',async()=>{
 const {validateMedia,assessImage,mediaPurpose,mediaHint}=await import('../lib/media-presets.ts');
 assert.throws(()=>validateMedia({type:'application/pdf',size:100},'featured'),/Format/);
 assert.throws(()=>validateMedia({type:'image/jpeg',size:100},'logo'),/Format/);
 assert.throws(()=>validateMedia({type:'image/png',size:6*1024*1024},'thumbnail'),/5 MB/);
 assert.doesNotThrow(()=>validateMedia({type:'image/png',size:5*1024*1024},'qr'));
 assert.equal(mediaPurpose('hero_slides','mobileImage'),'heroMobile');assert.equal(mediaPurpose('site_settings','donationQris'),'qr');
 assert.equal(mediaPurpose('agendas','image'),'poster');assert.match(mediaHint('document'),/^PDF • maks. 10 MB$/);
 assert.deepEqual(assessImage(1600,900,'featured'),{mismatch:false,small:false});assert.equal(assessImage(1200,1200,'featured').mismatch,true);
 assert.equal(assessImage(320,180,'featured').small,true);
 assert.throws(()=>d.saveRecord('posts',{title:'PDF disguised as image',image:'/uploads/example.pdf'},'test'),/Format/);
 assert.throws(()=>d.saveRecord('galleries',{title:'PDF gallery',photos:[{url:'/uploads/example.pdf'}]},'test'),/Foto/);
});
test('crop derivatives preserve master, count usage, avoid duplicate rows and never upscale',async()=>{
 const {imageVariant}=await import('../lib/media-presets.ts');const {serveMediaImage}=await import('../lib/media-image.ts');
 const master=await m.storePublicMedia(file(image),'test'),count=d.db.prepare('SELECT COUNT(*) n FROM media').get()?.n;
 const url=imageVariant(master.url,'featured',{x:0,y:.21875,w:1,h:.5625},{x:80,y:30});
 const response=await serveMediaImage(new URL(url,'http://local').searchParams);assert.equal(response.status,200);
 const meta=await sharp(Buffer.from(await response.arrayBuffer())).metadata();assert.equal(meta.width,520);assert.equal(meta.height,293);
 assert.deepEqual(readFileSync(m.mediaPath(master.url)),image);assert.equal(d.db.prepare('SELECT COUNT(*) n FROM media').get()?.n,count);
 const page=d.saveRecord('pages',{title:'Cropped photo',image:url},'test');assert.ok(m.mediaUsage(master).some(r=>r.id===page.id));assert.throws(()=>m.deleteMedia(master.id,'test'),/digunakan/);
 const rejected=imageVariant(master.url,'qr',{x:0,y:0,w:.5,h:.5});assert.equal((await serveMediaImage(new URL(rejected,'http://local').searchParams)).status,400);
 const invalid=imageVariant(master.url,'featured',{x:.9,y:0,w:.5,h:.5});assert.equal((await serveMediaImage(new URL(invalid,'http://local').searchParams)).status,400);
 assert.equal((await serveMediaImage(new URLSearchParams({src:'/api/private-media/abc',purpose:'featured'}))).status,400);
});
