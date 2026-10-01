import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import JSZip from 'jszip';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dh-institution-')),'db.sqlite');
const d=await import('../lib/database.ts');
const media=await import('../lib/media-service.ts');
const {servePublicMedia}=await import('../lib/media-response.ts');
const saved:string[]=[];
const save=(name:string,value:any)=>d.saveRecord(name,value,'test');
test.after(()=>{for(const p of saved)unlinkSync(p);d.db.close()});
test('legacy institution fields, unknown metadata, slugs and subject identities survive partial edits',()=>{
 for(const name of ['pages','education_units','program_highlights','business_units','academics']){
  const r=save(name,{title:name,body:'<p>Arsip penting</p>',status:'published',level:'SMP',subjects:[{id:'subject-1',name:'Matematika',category:'Umum',icon:'calculator',workload:'4 JP'}]});
  d.db.prepare(`UPDATE ${name} SET data=json_set(data,'$.legacyExtra','tetap') WHERE id=?`).run(r.id);
  const next=save(name,{id:r.id,title:'Diperbarui '+name});assert.equal(next.body,'<p>Arsip penting</p>');assert.equal(next.legacyExtra,'tetap');assert.equal(next.slug,r.slug);
  if(name==='academics'){assert.equal(next.subjects[0].id,'subject-1');assert.equal(next.subjects[0].workload,'4 JP');}
 }
});
test('products persist separately, enforce ownership and preserve removed rows',()=>{
 const a=save('business_units',{title:'Toko A',products:[{id:'p-1',name:'Buku',price:12000,available:true}]}),b=save('business_units',{title:'Toko B'});
 assert.equal(d.records('business_units',true).find(r=>r.id===a.id)?.products[0].name,'Buku');
 assert.equal(JSON.parse(String(d.db.prepare('SELECT data FROM business_units WHERE id=?').get(a.id)?.data)).products,undefined);
 assert.throws(()=>save('business_units',{...b,products:a.products}),/milik usaha lain/);
 assert.throws(()=>save('business_units',{...a,title:'Tidak tersimpan',products:[{name:'Salah',price:-1}]}),/Harga/);
 assert.equal(d.records('business_units',true).find(r=>r.id===a.id)?.title,'Toko A');
 save('business_units',{id:a.id,title:'Toko A edit'});assert.equal(d.records('business_units',true).find(r=>r.id===a.id)?.products.length,1);
 save('business_units',{...a,products:[]});assert.ok(d.db.prepare('SELECT deleted_at FROM business_products WHERE id=?').get('p-1')?.deleted_at);
 const audit=JSON.parse(String(d.db.prepare("SELECT details FROM audit_logs WHERE entity_id=? ORDER BY id DESC LIMIT 1").get(a.id)?.details));assert.equal(audit.before.products.length,1);
});
test('visibility, curriculum reference and conditional CTA validation are effective',()=>{
 const unit=save('education_units',{title:'Hidden unit',status:'published',showWebsite:false});assert.ok(!d.publicData().education_units.some((r:any)=>r.id===unit.id));assert.ok(d.records('education_units',true).some(r=>r.id===unit.id));
 assert.throws(()=>save('education_units',{title:'Invalid relation',curriculumId:'missing'}),/Kurikulum/);
 assert.throws(()=>save('program_highlights',{title:'CTA',ctaType:'Daftar'}),/tujuan tombol/);
 assert.throws(()=>save('education_units',{title:'Count',studentCount:1.5}),/angka bulat/);
 const p=save('program_highlights',{title:'Unggulan utama',status:'published',primary:true});assert.equal(d.publicData().program_highlights[0].id,p.id);
});
test('Office uploads validate contents, deduplicate, attach and serve as downloads',async()=>{
 for(const [ext,mime,path,xml] of [['docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document','word/document.xml','<w:document xmlns:w="test"/>'],['xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xl/workbook.xml','<workbook/>']]){
  const zip=new JSZip();zip.file('[Content_Types].xml','<Types/>');zip.file(path,xml);const bytes=await zip.generateAsync({type:'nodebuffer'});
  const file=new File([new Uint8Array(bytes)],'kurikulum.'+ext,{type:mime});const stored=await media.storePublicMedia(file,'test');saved.push(media.mediaPath(stored.url));assert.equal((await media.storePublicMedia(file,'test')).id,stored.id);
  const r=save('academics',{title:'Document '+ext,pdf:stored.url,syllabus:stored.url});assert.equal(r.pdf,stored.url);
  const response=servePublicMedia(stored.url.split('/').at(-1)!);assert.equal(response.status,200);assert.match(response.headers.get('Content-Disposition')||'',/attachment/);
  await assert.rejects(media.storePublicMedia(new File([new Uint8Array(bytes)],'fake.pdf',{type:'application/pdf'}),'test'),/Ekstensi/);
 }
 await assert.rejects(media.storePublicMedia(new File(['not word'],'bad.doc',{type:'application/msword'}),'test'),/Word/);
});
