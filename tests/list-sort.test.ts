import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {nextSort,sortRows,sqlSort} from '../lib/list-sort.ts';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dh-sort-')),'test.sqlite');
const d=await import('../lib/database.ts'),{donationQuery}=await import('../lib/donation-service.ts'),{donorQuery}=await import('../lib/donor-service.ts'),{adminList}=await import('../lib/admin-list-service.ts'),{reorderList}=await import('../lib/list-reorder.ts'),{handle}=await import('../lib/api.ts');
d.initializeRoles();
test('header cycle, stable defaults and long numeric strings without precision loss',()=>{
 assert.equal(nextSort('','number'),'number:asc');assert.equal(nextSort('number:asc','number'),'number:desc');assert.equal(nextSort('number:desc','number'),'');assert.equal(nextSort('number:desc','bank'),'bank:asc');
 const rows=[{number:'99999999999999999999'},{number:'0002'},{number:'100000000000000000000'},{number:'10'}];
 assert.deepEqual(sortRows(rows,'number:asc').map(r=>r.number),['0002','10','99999999999999999999','100000000000000000000']);assert.equal(sortRows(rows,''),rows);
 assert.equal(sqlSort(new URLSearchParams({sort:'__proto__'}),{name:'name'},'created_at DESC'),'created_at DESC');
});
const programs=Array.from({length:26},(_,i)=>d.saveRecord('donation_programs',{title:'Sorting '+String(i).padStart(2,'0'),status:'active',category:'Pendidikan',sort_order:i},'test'));
const account=d.saveRecord('donation_accounts',{title:'Sorting Account',bank:'BSI',number:'12345678',holder:'Lembaga',status:'published'},'test');
for(let i=0;i<26;i++)d.saveRecord('donation_transactions',{title:'Sorting TX '+i,donor_name:'Donatur '+String(i).padStart(2,'0'),donor_phone:'08123456'+String(i).padStart(4,'0'),amount:(i+1)*1000,kind:'Pemasukan',status:'valid',date:'2026-09-'+String(i+1).padStart(2,'0'),accountId:account.id,programId:programs[i].id},'test');
test('SQL sorts the full filtered result before pagination and preserves public order',()=>{
 const before=d.db.prepare('SELECT id,sort_order,updated_at FROM donation_programs ORDER BY id').all();
 const page=adminList('donation_programs',new URLSearchParams({sort:'title:desc',page:'2',q:'Sorting'}));
 assert.equal(page.rows[0]?.title,'Sorting 13');assert.equal(page.rows.at(-1)?.title,'Sorting 02');
 assert.equal(adminList('donation_programs',new URLSearchParams({sort:'title:asc'})).rows[0]?.title,'Sorting 00');
 assert.deepEqual(d.db.prepare('SELECT id,sort_order,updated_at FROM donation_programs ORDER BY id').all(),before);
 assert.equal(donationQuery(new URLSearchParams({sort:'amount:desc',page:'2'})).rows[0].amount,6000);
 assert.equal(donationQuery(new URLSearchParams({sort:'date:asc'})).rows[0].date,'2026-09-01');
 assert.equal(donationQuery(new URLSearchParams({sort:'donor:desc',bank:account.id}),true).rows[0].donor_name,'Donatur 25');
 assert.equal(donorQuery(new URLSearchParams({sort:'total',direction:'desc',page:'2'})).rows[0].total,6000);
 assert.equal(donorQuery(new URLSearchParams({sort:'name:asc'})).rows[0].name,'Donatur 00');
 for(const sort of ['bank:desc','status:asc','program:desc'])assert.equal(donationQuery(new URLSearchParams({sort})).count,26);
 assert.equal(donorQuery(new URLSearchParams({sort:'program:desc'})).count,26);
 assert.equal(adminList('donation_programs',new URLSearchParams({sort:'title; DROP TABLE users'})).count,26);
});
test('account export uses numeric order and linked program counts',()=>{
 const long=d.saveRecord('donation_accounts',{title:'Long',bank:'BNI',number:'99999999999999999999',holder:'A',status:'published'},'test');
 const longer=d.saveRecord('donation_accounts',{title:'Longer',bank:'BRI',number:'100000000000000000000',holder:'B',status:'published'},'test');
 d.saveRecord('donation_programs',{...programs[0],accountId:account.id},'test');
 const rows=adminList('donation_accounts',new URLSearchParams({sort:'number:desc'}),true).rows;
 assert.equal(rows[0]?.id,longer.id);assert.equal(rows[1]?.id,long.id);
 assert.equal(adminList('donation_accounts',new URLSearchParams({sort:'program:desc'}),true).rows[0]?.id,account.id);
});
test('public reordering persists all positions atomically and rejects invalid IDs',()=>{
 reorderList('donation_programs',programs[25].id,programs[0].id,'test');
 assert.equal(adminList('donation_programs',new URLSearchParams()).rows[0]?.id,programs[25].id);
 const before=d.db.prepare('SELECT id,sort_order FROM donation_programs ORDER BY id').all();
 assert.throws(()=>reorderList('donation_programs',programs[0].id,'missing','test'),/tidak ditemukan/);
 assert.deepEqual(d.db.prepare('SELECT id,sort_order FROM donation_programs ORDER BY id').all(),before);
 assert.throws(()=>reorderList('donation_accounts',account.id,account.id,'test'),/pengaturan/);
});
test('list ordering endpoints require authentication and module permissions',async()=>{
 const call=(path:string,cookie='',body?:any)=>handle(new Request('http://localhost/api/'+path,{method:body?'POST':'GET',headers:{cookie,origin:'http://localhost','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
 assert.equal((await call('list-reorder/donation_programs','',{id:programs[0].id,target:programs[1].id})).status,401);
 await d.createUser({email:'sort-editor@example.test',password:'SortTest!2026Safe',name:'Editor',role_id:'Editor Berita'},'test');
 const cookie='darul_huda_session='+await d.login('sort-editor@example.test','SortTest!2026Safe','sort-test');
 assert.equal((await call('list-reorder/donation_programs',cookie,{id:programs[0].id,target:programs[1].id})).status,403);
 assert.equal((await call('admin-list/donation_programs?sort=title:asc',cookie)).status,403);
 const names=adminList('users',new URLSearchParams({sort:'name:asc'})).rows.map((r:any)=>r.name);assert.ok(names.includes('Editor'));
});
