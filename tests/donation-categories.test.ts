import test from 'node:test';
import assert from 'node:assert/strict';
import {DONATION_CATEGORIES,categoryReport,transactionCategory,UNCATEGORIZED} from '../lib/donation-categories.ts';
test('donation categories are dedicated and contain the nine requested choices',()=>{assert.deepEqual(DONATION_CATEGORIES,['Pendidikan','Beasiswa Santri','Wakaf','Pembangunan','Sosial','Operasional Ma’had','Bantuan Darurat','Infak & Sedekah','Lainnya'])});
test('category report counts valid transactions, includes signed corrections and excludes draft/void',()=>{
 const programs=[{id:'p1',category:'Pendidikan'},{id:'p2',category:'Wakaf'},{id:'p3',category:''}];
 const transactions=[{programId:'p1',status:'valid',amount:500000},{programId:'p1',status:'valid',amount:-50000},{programId:'p1',status:'draft',amount:900000},{programId:'p2',status:'void',amount:100000},{programId:'p3',status:'valid',amount:20000}];
 const report=categoryReport(transactions,programs);
 assert.deepEqual(report.find(r=>r.category==='Pendidikan'),{category:'Pendidikan',count:2,total:450000});
 assert.equal(report.find(r=>r.category==='Wakaf'),undefined);assert.equal(report.find(r=>r.category===UNCATEGORIZED)?.total,20000);
 const filtered=transactions.filter(t=>transactionCategory(t,programs)==='Pendidikan');assert.equal(categoryReport(filtered,programs).length,1);
});
