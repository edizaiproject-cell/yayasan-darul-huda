import {db,atomic,audit} from './database.ts';
import {modules} from './modules.ts';
import {isAppearance} from './appearance.ts';
export function reorderList(name:string,id:string,target:string,actor:string){
 if(!Object.hasOwn(modules,name)||isAppearance(name)||['site_settings','donation_transactions','donation_accounts'].includes(name))throw new Error('Gunakan pengaturan urutan pada modul ini.');
 return atomic(()=>{
  const rows=db.prepare(`SELECT id,sort_order FROM ${name} WHERE deleted_at IS NULL ORDER BY sort_order,created_at DESC,id`).all() as {id:string;sort_order:number}[];
  const from=rows.findIndex(r=>r.id===id),to=rows.findIndex(r=>r.id===target);
  if(from<0||to<0)throw new Error('Data tidak ditemukan. Muat ulang daftar.');
  if(from===to)return {ok:true};
  rows.splice(to,0,rows.splice(from,1)[0]);const now=new Date().toISOString();
  const update=db.prepare(`UPDATE ${name} SET sort_order=?,updated_at=? WHERE id=?`);
  rows.forEach((r,i)=>{if(r.sort_order!==i)update.run(i,now,r.id)});
  audit(actor,'reorder',name,id,{target,order:rows.map(r=>r.id)});
  return {ok:true};
 });
}
