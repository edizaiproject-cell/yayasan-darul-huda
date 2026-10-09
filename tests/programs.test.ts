import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {selectedSectionRows} from '../lib/appearance.ts';
import {migrateProgramNavigation} from '../lib/program-navigation.ts';
import {institutionFields} from '../lib/institution-schema.ts';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dh-programs-')),'test.sqlite');
const d=await import('../lib/database.ts');
const save=(name:string,r:any)=>d.saveRecord(name,r,'test');
test.after(()=>d.db.close());

test('one source preserves body, slug and SEO; dashboard uses visibility, order then newest',()=>{
 const a=save('program_highlights',{title:'Program A',slug:'url-lama',status:'published',sort_order:2,primary:true,body:'<p>Isi lama</p>',seoTitle:'SEO A',seoDescription:'Deskripsi A',activities:'Belajar bersama'});
 const b=save('program_highlights',{title:'Program B',status:'published',sort_order:1});
 const c=save('program_highlights',{title:'Program C',status:'published',sort_order:1});
 d.db.prepare('UPDATE program_highlights SET created_at=? WHERE id=?').run('2020-01-01',b.id);
 const hidden=save('program_highlights',{title:'Hanya halaman publik',status:'published',showOnHome:false});
 const edited=save('program_highlights',{id:a.id,title:'Nama baru'});
 assert.equal(edited.slug,'url-lama');assert.equal(edited.body,a.body);assert.equal(edited.seoTitle,'SEO A');assert.equal(edited.activities,'Belajar bersama');
 const home=()=>selectedSectionRows({section:'program',source:'featured',limit:3},d.publicData());
 assert.deepEqual(home().map(r=>r.id),[c.id,b.id,a.id]);
 assert.ok(d.publicData().program_highlights.some((r:any)=>r.id===hidden.id));
 save('program_highlights',{id:b.id,status:'draft'});
 assert.ok(!home().some(r=>r.id===b.id));assert.ok(!d.publicData().program_highlights.some((r:any)=>r.id===b.id));
 d.deleteRecord('program_highlights',c.id,'test');assert.ok(!home().some(r=>r.id===c.id));assert.ok(d.db.prepare('SELECT deleted_at FROM program_highlights WHERE id=?').get(c.id)?.deleted_at);
 for(const field of ['body','photos','showOnHome','seoTitle','seoDescription','activities'])assert.ok(institutionFields('program_highlights').some(f=>f.key===field));
});

test('menu migration reuses existing program link, preserves others and respects later unpublish',()=>{
 const parent=save('menu_items',{title:'Pendidikan',url:'/pendidikan',status:'published',managed:true,parentId:''});
 const academic=save('menu_items',{title:'Akademik & Kurikulum',url:'/akademik',parentId:parent.id,status:'published'});
 const old=save('menu_items',{title:'Program Unggulan',url:'/program',status:'published'});
 const count=d.records('program_highlights',true).length;
 migrateProgramNavigation(d.db);migrateProgramNavigation(d.db);
 const menus=d.records('menu_items',true),program=menus.find(r=>r.url==='/program')!;
 assert.equal(menus.filter(r=>r.url==='/program').length,1);assert.equal(program.id,old.id);assert.equal(program.title,'Ilmu & Pengabdian');assert.equal(program.parentId,parent.id);assert.ok(menus.some(r=>r.id===academic.id));assert.equal(d.records('program_highlights',true).length,count);
 save('menu_items',{id:program.id,status:'draft'});migrateProgramNavigation(d.db);assert.ok(!d.publicData().menu_items.some((r:any)=>r.id===program.id));
});
