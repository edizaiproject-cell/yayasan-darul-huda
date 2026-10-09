import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dh-list-search-')),'test.sqlite');
const d=await import('../lib/database.ts'),{donationQuery}=await import('../lib/donation-service.ts'),{donorQuery,saveDonor}=await import('../lib/donor-service.ts'),{adminList}=await import('../lib/admin-list-service.ts'),{handle}=await import('../lib/api.ts');
d.initializeRoles();
const account=d.saveRecord('donation_accounts',{title:'Bank BSI',bank:'BSI',number:'1234567890',holder:'Darul Huda',status:'published'},'test');
const program=d.saveRecord('donation_programs',{title:'Pembangunan Asrama',status:'active',category:'Pembangunan'},'test');
const transaction=d.saveRecord('donation_transactions',{title:'Donasi Ahmad',donor_name:'Ahmad',donor_phone:'081234567890',programId:program.id,accountId:account.id,amount:200000,kind:'Pemasukan',status:'valid',date:'2026-10-04'},'test');
test('donation universal search covers joined fields, status, dates, receipt, and intersection',()=>{
 for(const q of ['Ahmad','0812','asrama','200000','BSI','terverifikasi','04 okt','04 oktober 2026',transaction.transaction_code]){const result=donationQuery(new URLSearchParams({q}));assert.ok(result.rows.some(r=>r.id===transaction.id),q)}
 const receipt=d.db.prepare('SELECT receipt_number FROM donation_receipts WHERE transaction_id=?').get(transaction.id) as any;
 assert.equal(donationQuery(new URLSearchParams({q:receipt.receipt_number})).count,1);
 assert.equal(donationQuery(new URLSearchParams({q:'asrama BSI',status:'pending'})).count,0);
 for(const q of ['%',"' OR 1=1 --",'not-found'])assert.equal(donationQuery(new URLSearchParams({q})).count,0);
});
test('donor universal search includes profile, aliases, supported programs and totals',()=>{
 const donor=saveDonor({name:'Maryam',phone:'081299988877',email:'maryam@example.test',address:'Bukittinggi',category:'Donatur Tetap'},'test');
 for(const q of ['Maryam','0812999','maryam@example','Bukittinggi','Donatur Tetap'])assert.ok(donorQuery(new URLSearchParams({q})).rows.some(r=>r.id===donor.id),q);
 for(const q of ['asrama','200000','0812345'])assert.ok(donorQuery(new URLSearchParams({q})).rows.some(r=>r.id===transaction.donor_id),q);
});
test('generic list search paginates and hydrates only matching records',()=>{
 for(let i=0;i<26;i++)d.saveRecord('donation_programs',{title:'Program Ilmu '+i,status:'active',category:'Pendidikan'},'test');
 const first=adminList('donation_programs',new URLSearchParams({q:'Ilmu',page:'1'})),third=adminList('donation_programs',new URLSearchParams({q:'Ilmu',page:'3'}));
 assert.equal(first.count,26);assert.equal(first.rows.length,12);assert.equal(third.rows.length,2);assert.ok(!first.rows.some(r=>third.rows.some(t=>t.id===r.id)));
 assert.equal(adminList('donation_programs',new URLSearchParams({q:'Ilmu',status:'draft'})).count,0);
 assert.equal(adminList('donation_programs',new URLSearchParams({q:'Pendidikan'})).count,26);
 assert.equal(adminList('donation_programs',new URLSearchParams({q:'%'})).count,0);
});
test('paginated endpoint enforces authentication and module permission',async()=>{
 const call=(path:string,cookie='')=>handle(new Request('http://localhost/api/'+path,{headers:{cookie}}));
 assert.equal((await call('admin-list/donation_programs?q=asrama')).status,401);
 const id=await d.createUser({email:'list-editor@example.test',password:'ListTest!2026Safe',name:'Editor',role_id:'Editor Berita'},'test');
 const cookie='darul_huda_session='+await d.login('list-editor@example.test','ListTest!2026Safe','list-test');
 assert.equal((await call('admin-list/donation_programs',cookie)).status,403);
 assert.equal((await call('admin-list/posts',cookie)).status,200);
 assert.equal((await call('admin-list/users',cookie)).status,403);
 assert.ok(id);
});
test('selected exports contain only selected IDs and keep filters',()=>{
 const ids=transaction.id;
 assert.equal(donationQuery(new URLSearchParams({ids}),true).rows.length,1);
 assert.equal(donationQuery(new URLSearchParams({ids:'does-not-exist'}),true).rows.length,0);
 assert.equal(donationQuery(new URLSearchParams({ids,status:'pending'}),true).rows.length,0);
 assert.equal(donorQuery(new URLSearchParams({ids:transaction.donor_id}),true).rows.length,1);
 assert.throws(()=>donationQuery(new URLSearchParams({ids:''}),true),/Pilih/);
 assert.throws(()=>donorQuery(new URLSearchParams({ids:Array.from({length:101},(_,i)=>String(i)).join(',')}),true),/Pilih/);
 assert.equal(donationQuery(new URLSearchParams({ids:"' OR 1=1 --"}),true).count,0);
});
