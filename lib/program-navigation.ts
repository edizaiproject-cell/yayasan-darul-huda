import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';

/** One-time menu addition: preserve all program rows and administrators' later menu edits. */
export function migrateProgramNavigation(db:DatabaseSync){
 if(db.prepare('SELECT version FROM schema_migrations WHERE version=7').get())return;
 db.exec('BEGIN IMMEDIATE');
 try{
  if(db.prepare('SELECT version FROM schema_migrations WHERE version=7').get()){db.exec('COMMIT');return;}
  const rows=(db.prepare('SELECT * FROM menu_items WHERE deleted_at IS NULL').all() as any[]).map(r=>({...JSON.parse(r.data),...r}));
  const parent=rows.find(r=>(r.parentId!==undefined?!r.parentId:!r.parent)&&(r.title==='Pendidikan'||r.url==='/pendidikan'));
  // A fresh database is seeded later; retry on the next startup once menus exist.
  if(!parent){db.exec('COMMIT');return;}
  const existing=rows.find(r=>r.url==='/program');
  const data={...(existing?JSON.parse(existing.data):{}),url:'/program',parent:parent.title,parentId:parent.id,targetType:'internal'};
  const now=new Date().toISOString();
  if(existing)db.prepare('UPDATE menu_items SET title=?,data=?,updated_at=? WHERE id=?').run('Ilmu & Pengabdian',JSON.stringify(data),now,existing.id);
  else db.prepare('INSERT INTO menu_items(id,title,slug,status,sort_order,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),'Ilmu & Pengabdian',db.prepare('SELECT 1 FROM menu_items WHERE slug=?').get('pendidikan-ilmu-pengabdian')?'pendidikan-ilmu-pengabdian-'+randomUUID().slice(0,8):'pendidikan-ilmu-pengabdian','published',Math.max(0,...rows.filter(r=>r.parentId===parent.id||r.parent===parent.title).map(r=>Number(r.sort_order)||0))+1,JSON.stringify(data),now,now);
  db.prepare('INSERT INTO schema_migrations VALUES(7,?)').run(now);
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
