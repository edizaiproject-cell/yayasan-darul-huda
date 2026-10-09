import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {donorPhone} from './donation-workflow-shared.ts';

// Phone aliases survive merges and contact edits, preventing future duplicate records.
export function linkDonor(db:DatabaseSync,data:any,previous:any,now:string){
 let phone='';try{phone=data.donor_phone?donorPhone(data.donor_phone):'';}catch{/* Preserve invalid legacy phones without matching them. */}
 const matched=phone?db.prepare('SELECT donor_id FROM donor_phones WHERE phone=?').get(phone) as any:null;
 let id=matched?.donor_id;
 if(!id&&previous?.donor_id&&String(previous.donor_phone||'')===String(data.donor_phone||''))id=previous.donor_id;
 if(!id){id=randomUUID();db.prepare('INSERT INTO donors(id,name,phone,category,source,profile,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,data.donor_name||'Hamba Allah',phone,'Donatur Tidak Tetap','automatic','{}',now,now);if(phone)db.prepare('INSERT INTO donor_phones VALUES(?,?)').run(phone,id);}
 db.prepare('UPDATE donors SET deleted_at=NULL WHERE id=?').run(id);
 return id as string;
}
export function initializeDonors(db:DatabaseSync){
 db.exec(`CREATE TABLE IF NOT EXISTS donors(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,source TEXT NOT NULL,profile TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,merged_into TEXT REFERENCES donors(id));
 CREATE TABLE IF NOT EXISTS donor_phones(phone TEXT PRIMARY KEY,donor_id TEXT NOT NULL REFERENCES donors(id));
 CREATE INDEX IF NOT EXISTS idx_donor_phone_owner ON donor_phones(donor_id);`);
 db.exec('BEGIN IMMEDIATE');try{
 if(!(db.prepare('PRAGMA table_info(donors)').all() as any[]).some(c=>c.name==='deleted_at'))db.exec('ALTER TABLE donors ADD COLUMN deleted_at TEXT');
 if(!(db.prepare('PRAGMA table_info(donation_transactions)').all() as any[]).some(c=>c.name==='donor_id'))db.exec('ALTER TABLE donation_transactions ADD COLUMN donor_id TEXT REFERENCES donors(id)');
 db.exec('CREATE INDEX IF NOT EXISTS idx_transaction_donor ON donation_transactions(donor_id);CREATE INDEX IF NOT EXISTS idx_donor_registered ON donors(created_at);');
 if(!db.prepare('SELECT version FROM schema_migrations WHERE version=5').get()){
 for(const row of db.prepare('SELECT * FROM donation_transactions WHERE donor_id IS NULL ORDER BY created_at,id').all() as any[]){const data=JSON.parse(row.data);const id=linkDonor(db,data,null,row.created_at);db.prepare('UPDATE donation_transactions SET donor_id=? WHERE id=?').run(id,row.id);}
 db.prepare('INSERT INTO schema_migrations VALUES(5,?)').run(new Date().toISOString());
 }db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
