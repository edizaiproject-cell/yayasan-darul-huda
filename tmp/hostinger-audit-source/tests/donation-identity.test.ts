import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {normalizeDonorName,donationMessage} from '../lib/donation-identity.ts';
import {migrateDonorNames} from '../lib/migrate-donor-name.ts';
test('donor fallback handles empty, whitespace, null and trims real names',()=>{
 for(const value of ['', '  \t\n',null,undefined])assert.equal(normalizeDonorName(value),'Hamba Allah');
 assert.equal(normalizeDonorName('  Ahmad  '),'Ahmad');
});
test('WhatsApp message contains donor, exact bank and formatted amount',()=>{
 const data={name:' ',amount:'500000',bank:'BSI',number:'9005559930'};
 assert.equal(donationMessage(data),"Assalamu'alaikum,\nsaya ingin mengonfirmasi donasi.\n\nNama: Hamba Allah\nNominal: Rp500.000\nBank tujuan: BSI\nNo. Rekening: 9005559930");
 assert.match(donationMessage({...data,name:'  Aisyah  ',bank:'BRI',number:'0256 01002137309',program:'Asrama'}),/Nama: Aisyah\nNominal: Rp500.000\nBank tujuan: BRI\nNo. Rekening: 0256 01002137309\nProgram: Asrama/);
});
test('migration renames existing donor JSON without duplicates or lost names, and is idempotent',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT);CREATE TABLE donation_transactions(id TEXT PRIMARY KEY,data TEXT)');
 for(const [id,data] of Object.entries({a:{donor:'  Ahmad  ',amount:50000},b:{donor:null},c:{donor:'legacy',donor_name:'Aisyah'},d:{donor:' \t '}}))db.prepare('INSERT INTO donation_transactions VALUES(?,?)').run(id,JSON.stringify(data));
 migrateDonorNames(db);migrateDonorNames(db);
 const rows=db.prepare('SELECT id,data FROM donation_transactions ORDER BY id').all() as {id:string;data:string}[];
 assert.deepEqual(rows.map(r=>JSON.parse(r.data).donor_name),['Ahmad','Hamba Allah','Aisyah','Hamba Allah']);
 for(const r of rows)assert.ok(!Object.hasOwn(JSON.parse(r.data),'donor'));
 assert.equal(JSON.parse(rows[0].data).amount,50000);
 assert.equal(db.prepare('SELECT count(*) n FROM schema_migrations').get()?.n,1);db.close();
});
