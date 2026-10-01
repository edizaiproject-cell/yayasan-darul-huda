import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {appearanceDefaults,appearanceRows,validateAppearanceCollection,validateAppearance,selectedSectionRows,destinationOptions} from '../lib/appearance.ts';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'appearance-')),'test.sqlite');
const d=await import('../lib/database.ts');
const save=(name:string,r:any)=>d.saveRecord(name,r,'test');
const expected=(name:string)=>d.records(name,true).map(r=>({id:r.id,updated_at:r.updated_at}));
test.after(()=>d.db.close());
test('legacy hero and menu IDs, URLs, slugs and unknown metadata survive edit',()=>{
 d.db.prepare("INSERT INTO hero_slides(id,title,slug,status,data,created_at,updated_at) VALUES('legacy-hero','Hero lama','old-hero','published',?,'2020-01-01','2020-01-01')").run(JSON.stringify({body:'<p>Arsip isi lama</p>',summary:'Subjudul lama',unknownLegacy:'tetap',image:'/media/image2.png',primaryText:'Daftar',primaryUrl:'/informasi'}));
 const before=d.records('hero_slides',true)[0];assert.equal(before.showOnHome,true);
 const changed=save('hero_slides',{id:before.id,title:'Hero baru',overlay:'dark'});assert.equal(changed.slug,'old-hero');assert.equal(changed.body,'<p>Arsip isi lama</p>');assert.equal(changed.unknownLegacy,'tetap');assert.equal(changed.primaryUrl,'/informasi');
 const parent=save('menu_items',{title:'Profil',url:'/profil',status:'published'}),child=save('menu_items',{title:'Tentang',url:'/profil/tentang',parent:'Profil',status:'published'});
 const converted=appearanceRows('menu_items',d.records('menu_items',true));assert.equal(converted.find(r=>r.id===child.id)?.parentId,parent.id);d.saveAppearanceBatch('menu_items',converted,expected('menu_items'),'test');assert.equal(d.records('menu_items',true).find(r=>r.id===child.id)?.parentId,parent.id);
});
test('tree validation rejects cycles and depth four; moving to root is allowed',()=>{
 const rows=[{id:'a',parentId:''},{id:'b',parentId:'a'},{id:'c',parentId:'b'}];assert.doesNotThrow(()=>validateAppearanceCollection('menu_items',rows));assert.throws(()=>validateAppearanceCollection('menu_items',[...rows,{id:'d',parentId:'c'}]),/tiga/);assert.throws(()=>validateAppearanceCollection('menu_items',[{id:'a',parentId:'b'},{id:'b',parentId:'a'}]),/sendiri/);assert.throws(()=>validateAppearanceCollection('footer_links',[{id:'link',groupId:'missing'}]),/Kelompok/);
});
test('batch order, optimistic concurrency and rollback preserve complete collections',()=>{
 const first=save('footer_links',{title:'Tautan A',url:'/kontak',status:'published'}),second=save('footer_links',{title:'Tautan B',url:'/informasi',status:'published'}),snapshot=expected('footer_links');
 assert.throws(()=>d.saveAppearanceBatch('footer_links',[{...first,title:'Harus rollback'},{...second,slug:first.slug}],snapshot,'test'),/UNIQUE/);assert.equal(d.records('footer_links',true).find(r=>r.id===first.id)?.title,'Tautan A');
 const saved=d.saveAppearanceBatch('footer_links',[second,first],snapshot,'test');assert.equal(saved[0].id,second.id);assert.equal(d.records('footer_links',true)[0].id,second.id);assert.throws(()=>d.saveAppearanceBatch('footer_links',saved,snapshot,'test'),/berubah/);
});
test('home sections are unique, dynamic and retain explicit disabled hero/footer',()=>{
 assert.throws(()=>validateAppearanceCollection('home_sections',[{id:'a',section:'berita'},{id:'b',section:'berita'}]),/sekali/);assert.doesNotThrow(()=>validateAppearanceCollection('home_sections',[{id:'a',section:'custom'},{id:'b',section:'custom'}]));
 const migrated=appearanceRows('home_sections',[{id:'news',title:'Berita',section:'berita'}]);assert.equal(migrated[0].section,'hero');assert.equal(migrated.at(-1)?.section,'footer');
 const data={posts:[{id:'a',categoryId:'x',featured:true,created_at:'2026-01-01'},{id:'b',categoryId:'y',created_at:'2026-02-01'},{id:'c',categoryId:'x',showOnHome:false}]};assert.deepEqual(selectedSectionRows({section:'berita',source:'category',categoryId:'x',limit:6},data).map(r=>r.id),['a']);assert.equal(selectedSectionRows({section:'berita',source:'latest',limit:1},data)[0].id,'b');
 save('home_sections',{title:'Hero',section:'hero',managed:true,status:'draft'});assert.equal(d.publicData().appearanceManaged.home_sections,true);assert.equal(d.publicData().home_sections.length,0);
});
test('hero controls and destination types validate before publish',()=>{
 assert.throws(()=>validateAppearance('hero_slides',appearanceDefaults('hero_slides',{title:'x'.repeat(141)})),/140/);assert.throws(()=>validateAppearance('hero_slides',appearanceDefaults('hero_slides',{primaryType:'internal',primaryText:'Buka',primaryUrl:'https://example.test'})),/internal/);
 const none=appearanceDefaults('hero_slides',{primaryType:'none',primaryUrl:'/lama',primaryText:'Lama'});validateAppearance('hero_slides',none);assert.equal(none.primaryUrl,'');
 assert.equal(destinationOptions({donation_programs:[{title:'Program uji',slug:'uji'}]},'donation')[1].url,'/donasi/uji');
});
test('footer contacts and socials reference central data and disabled contact stays hidden',()=>{
 const generated=appearanceRows('footer_links',[],{instagram:'https://example.test/ig'});assert.equal(generated[0].useCentral,true);assert.equal(generated[0].url,'');assert.doesNotThrow(()=>validateAppearance('footer_links',generated[0]));
 save('footer_links',{title:'Kontak',kind:'settings',status:'draft',managed:true});assert.equal(d.publicData().appearanceContactVisible,false);
});

test('intentionally empty managed collections do not revive legacy defaults',()=>{
 d.saveAppearanceBatch('home_sections',[],expected('home_sections'),'test');assert.equal(d.publicData().appearanceManaged.home_sections,true);assert.deepEqual(d.publicData().home_sections,[]);
});
