import type {DatabaseSync} from 'node:sqlite';
export function accountUsage(db:DatabaseSync,rows:any[]){
 const linked=new Set((db.prepare('SELECT DISTINCT account_id FROM donation_programs WHERE account_id IS NOT NULL AND deleted_at IS NULL').all() as any[]).map(p=>p.account_id));
 const primary=rows.find(r=>r.status==='published'&&r.sort_order<0&&!linked.has(r.id));
 return rows.map(r=>({...r,usage_mode:linked.has(r.id)?'program':'general',is_primary:r.id===primary?.id}));
}
export function migrateAccountUsage(db:DatabaseSync){
 db.exec('BEGIN IMMEDIATE');try{
 if(!db.prepare('SELECT version FROM schema_migrations WHERE version=6').get()){
 // Preserve the previous default among general accounts, including installations
 // that only used positive display orders. Existing program relations stay intact.
 const primary=db.prepare("SELECT a.id FROM donation_accounts a WHERE a.status='published' AND a.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM donation_programs p WHERE p.account_id=a.id AND p.deleted_at IS NULL) ORDER BY a.sort_order,a.created_at DESC,a.id LIMIT 1").get() as any;
 db.prepare('UPDATE donation_accounts SET sort_order=0 WHERE sort_order<0').run();
 if(primary)db.prepare('UPDATE donation_accounts SET sort_order=-1 WHERE id=?').run(primary.id);
 db.prepare('INSERT INTO schema_migrations VALUES(6,?)').run(new Date().toISOString());
 }db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
export function prepareAccountUsage(db:DatabaseSync,id:string,input:any,old:any,status:string,sort:number,demote:(id:string)=>void){
 const linked=(db.prepare('SELECT id,account_id FROM donation_programs WHERE deleted_at IS NULL').all() as any[]);
 const chosen:string[]=input.linkedPrograms??linked.filter(p=>p.account_id===id).map(p=>p.id);
 if(input.usageMode&&!['general','program'].includes(input.usageMode))throw new Error('Mode penggunaan rekening tidak valid.');
 if(input.usageMode==='program'&&!chosen.length)throw new Error('Pilih minimal satu program donasi.');
 if(input.usageMode==='general'&&chosen.length)throw new Error('Rekening Umum tidak boleh memiliki program khusus.');
 if(input.linkedPrograms!==undefined)for(const p of linked)if(chosen.includes(p.id)&&p.account_id&&p.account_id!==id&&input.confirmedAssignments?.[p.id]!==p.account_id)throw new Error('Program ini sudah memiliki rekening khusus. Konfirmasi penggantian rekening terlebih dahulu.');
 const primary=input.primaryAccount??(old?old.sort_order<0:sort<0);
 if(primary&&chosen.length&&input.primaryAccount===true)throw new Error('Rekening Utama harus berupa Rekening Umum.');
 if(primary&&!chosen.length&&status==='published'){
 const existing=db.prepare("SELECT a.id FROM donation_accounts a WHERE a.id<>? AND a.sort_order<0 AND a.status='published' AND a.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM donation_programs p WHERE p.account_id=a.id AND p.deleted_at IS NULL) LIMIT 1").get(id) as any;
 if(existing&&input.replacePrimary!==existing.id)throw new Error('Rekening Utama telah berubah atau belum dikonfirmasi. Muat ulang dan konfirmasi penggantian rekening utama.');
 for(const r of db.prepare('SELECT id FROM donation_accounts WHERE sort_order<0 AND id<>?').all(id) as any[])demote(r.id);
 return -1;
 }
 return Math.max(0,sort);
}
