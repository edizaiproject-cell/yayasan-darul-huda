import type {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {donorPhone} from './donation-workflow-shared.ts';
export function initializeDonationLedger(db:DatabaseSync){db.exec(`CREATE TABLE IF NOT EXISTS donation_sequences(day TEXT PRIMARY KEY,value INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS donation_receipts(transaction_id TEXT PRIMARY KEY REFERENCES donation_transactions(id),receipt_number TEXT UNIQUE NOT NULL,receipt_generated_at TEXT NOT NULL,token TEXT UNIQUE NOT NULL,snapshot TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_code ON donation_transactions(json_extract(data,'$.transaction_code'));
CREATE INDEX IF NOT EXISTS idx_donation_date ON donation_transactions(json_extract(data,'$.date'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_submission ON donation_transactions(json_extract(data,'$.submission_key')) WHERE json_extract(data,'$.submission_key') IS NOT NULL;`);}
export function prepareDonation(db:DatabaseSync,data:any,old:any,now:string){
 const previous=old?JSON.parse(old.data):{};
 if(data.donor_phone)data.donor_phone=donorPhone(data.donor_phone);
 for(const key of ['transaction_code','submitted_at','verified_at','verified_by','receipt_number','receipt_generated_at','submission_key']){delete data[key];if(previous[key])data[key]=previous[key];}
 if(!data.transaction_code){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now)).replace(/-/g,'');const row=db.prepare('INSERT INTO donation_sequences VALUES(?,1) ON CONFLICT(day) DO UPDATE SET value=value+1 RETURNING value').get(day) as any;data.transaction_code=`DON-${day}-${String(row.value).padStart(5,'0')}`;}
 data.submitted_at ||=now;
}
export function issueReceipt(db:DatabaseSync,id:string,data:any,status:string,actor:string,now:string){
 if(status!=='valid')return;
 data.verified_at ||=now;data.verified_by ||=actor;
 if(data.amount<=0||data.kind==='Koreksi')return;
 const exists=db.prepare('SELECT receipt_number,receipt_generated_at FROM donation_receipts WHERE transaction_id=?').get(id) as any;
 if(exists){Object.assign(data,exists);return;}
 const settings=db.prepare('SELECT title,data FROM site_settings WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1').get() as any;
 const s=settings?JSON.parse(settings.data):{},program=db.prepare('SELECT title FROM donation_programs WHERE id=?').get(data.programId||'') as any,account=db.prepare('SELECT data FROM donation_accounts WHERE id=?').get(data.accountId||'') as any;
 const bank=account?JSON.parse(account.data):{};
 data.receipt_number='KWT-'+data.transaction_code;data.receipt_generated_at=now;
 const snapshot={receipt_number:data.receipt_number,transaction_code:data.transaction_code,donor_name:data.publicName&&!data.anonymous?data.donor_name:'Hamba Allah',program:program?.title||'Donasi Umum',amount:data.amount,date:data.date||now.slice(0,10),verified_at:now,bank:bank.bank||'',number:bank.number||'',holder:bank.holder||'',institution:{name:s.name||settings?.title||'',logo:s.logo||'',address:s.address||'',phone:s.phone||'',email:s.email||'',website:s.website||''}};
 db.prepare('INSERT INTO donation_receipts VALUES(?,?,?,?,?)').run(id,data.receipt_number,now,randomBytes(32).toString('hex'),JSON.stringify(snapshot));
}
