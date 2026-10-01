import type {DatabaseSync} from 'node:sqlite';
import {normalizeDonorName} from './donation-identity.ts';
// Rename the existing JSON field, without adding another SQL column or duplicate key.
export function migrateDonorNames(db:DatabaseSync){
 if(db.prepare('SELECT version FROM schema_migrations WHERE version=3').get())return;
 db.exec('BEGIN IMMEDIATE');
 try{
  const rows=db.prepare('SELECT id,data FROM donation_transactions').all() as {id:string;data:string}[];
  const update=db.prepare('UPDATE donation_transactions SET data=? WHERE id=?');
  for(const row of rows){const data=JSON.parse(row.data);data.donor_name=normalizeDonorName(data.donor_name??data.donor);delete data.donor;update.run(JSON.stringify(data),row.id)}
  db.prepare('INSERT INTO schema_migrations VALUES(3,?)').run(new Date().toISOString());
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
}
