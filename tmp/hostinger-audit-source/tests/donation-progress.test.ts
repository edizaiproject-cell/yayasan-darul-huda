import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dh-progress-')),'test.sqlite');
const d=await import('../lib/database.ts');

test('website visibility hides a program and its reports without deleting admin data or totals',()=>{
 const p=d.saveRecord('donation_programs',{title:'Publikasi terpisah',status:'active',target:null,hidePublic:true},'test');
 const report=d.saveRecord('donation_updates',{title:'Laporan tersimpan',programId:p.id,status:'published',date:'2026-10-04'},'test');
 assert.ok(d.records('donation_programs',true).some(r=>r.id===p.id));
 assert.ok(!d.publicData().donation_programs.some((r:any)=>r.id===p.id));
 assert.ok(!d.publicData().donation_updates.some((r:any)=>r.id===report.id));
 d.saveRecord('donation_programs',{...p,hidePublic:false},'test');
 assert.ok(d.publicData().donation_programs.some((r:any)=>r.id===p.id));
 assert.ok(d.publicData().donation_updates.some((r:any)=>r.id===report.id));
 d.db.prepare('UPDATE donation_updates SET deleted_at=? WHERE id=?').run(new Date().toISOString(),report.id);
 d.db.prepare('UPDATE donation_programs SET deleted_at=? WHERE id=?').run(new Date().toISOString(),p.id);
});
test('fundraising updates without reports and retains percentages at and above target',()=>{
 const program=d.saveRecord('donation_programs',{title:'Program otomatis',status:'active',target:100000},'test');
 const current=()=>d.publicData().donation_programs.find((r:any)=>r.id===program.id)!;
 assert.equal(current().percentage,0);
 const pending=d.saveRecord('donation_transactions',{title:'Donasi menunggu',programId:program.id,amount:100000,kind:'Pemasukan',status:'pending',date:'2026-10-04'},'test');
 assert.equal(current().percentage,0);
 d.saveRecord('donation_transactions',{...pending,status:'valid'},'test');
 assert.equal(current().percentage,100);
 d.saveRecord('donation_transactions',{title:'Donasi tambahan',programId:program.id,amount:25000,kind:'Pemasukan',status:'valid',date:'2026-10-04'},'test');
 assert.equal(current().percentage,125);
 assert.equal(d.records('donation_updates',true).length,0);
 d.saveRecord('donation_programs',{...program,target:''},'test');
 assert.equal(current().total,125000);
 assert.equal(current().percentage,null);
});
test('published reports allow omitted story, photos and physical progress; explicit zero is preserved',()=>{
 const program=d.records('donation_programs',true)[0];
 const report=d.saveRecord('donation_updates',{title:'Laporan lapangan',programId:program.id,status:'published',date:'2026-10-04',progress:''},'test');
 assert.equal(report.progress,null);
 assert.equal(report.body,'');
 assert.deepEqual(report.photos,[]);
 const updated=d.saveRecord('donation_updates',{...report,progress:0},'test');
 assert.equal(updated.progress,0);
});
import {PROGRAM_TYPES,programType,reportFields,reportErrors,normalizeReportSettings,publicReport} from '../lib/donation-report-schema.ts';
test('every program template has contextual fields and only physical projects show progress',()=>{
 for(const [kind] of PROGRAM_TYPES){const fields=reportFields({programType:kind});assert.equal(fields.some(f=>f.key==='progress'),kind==='physical');assert.ok(fields.some(f=>f.key==='summary'));}
 assert.equal(programType({category:'Pembangunan'}),'general');
 assert.ok(reportFields({programType:'social'}).some(f=>f.key==='recipientCount'));
 assert.ok(reportFields({programType:'goods'}).some(f=>f.key==='availableCount'));
});
test('contextual validation rejects negative counts, invalid dates and over-distribution',()=>{
 const base={date:'2026-10-04'};
 assert.ok(reportErrors({programType:'physical'},{...base,progress:101}).some(i=>i.field==='progress'));
 assert.ok(!reportErrors({programType:'social'},{...base,progress:101}).some(i=>i.field==='progress'));
 assert.ok(reportErrors({programType:'social'},{...base,reportValues:{recipientCount:-1}}).length);
 assert.ok(reportErrors({programType:'social'},{...base,reportValues:{recipientCount:1.5}}).length);
 assert.ok(reportErrors({programType:'goods'},{...base,reportValues:{availableCount:10,distributedCount:11}}).length);
 assert.ok(reportErrors({programType:'event'},{date:'2026-02-30'}).length);
 assert.equal(reportErrors({programType:'physical'},{...base,progress:0}).length,0);
});
test('custom fields and visibility survive save; required fields are enforced by the server',()=>{
 const settings=normalizeReportSettings({fields:{location:{hidden:true,required:true}},custom:[{key:'custom_books',label:'Al-Quran disalurkan',type:'number',unit:'Eksemplar',required:true}]});
 const program=d.saveRecord('donation_programs',{title:'Wakaf khusus',status:'active',programType:'custom',customProgramType:'Wakaf perpustakaan',reportSettings:settings},'test');
 assert.equal(program.reportSettings.custom[0].unit,'Eksemplar');
 assert.throws(()=>d.saveRecord('donation_updates',{title:'Laporan',programId:program.id,status:'published',date:'2026-10-04'},'test'),/wajib diisi/);
 const report=d.saveRecord('donation_updates',{title:'Laporan',programId:program.id,status:'published',date:'2026-10-04',reportValues:{custom_books:25}},'test');
 assert.equal(report.reportValues.custom_books,25);
 assert.throws(()=>normalizeReportSettings({custom:[{key:'progress',label:'Bad',type:'number'}]}),/ID field/);
});
test('legacy progress remains stored but is not published for unspecified or nonphysical types',()=>{
 const program=d.saveRecord('donation_programs',{title:'Program lama',status:'active'},'test');
 const report=d.saveRecord('donation_updates',{title:'Laporan lama',programId:program.id,status:'published',date:'2026-10-04',progress:45,summary:'Cerita lama'},'test');
 const changed=d.saveRecord('donation_updates',{id:report.id,title:'Judul diperbarui'},'test');
 assert.equal(changed.progress,45);assert.equal(changed.summary,'Cerita lama');
 assert.equal(d.publicData().donation_updates.find((r:any)=>r.id===report.id)?.progress,undefined);
 const physical=d.saveRecord('donation_programs',{...program,programType:'physical'},'test');
 assert.equal(publicReport(physical,changed).progress,45);
});
test('report expenditure counts published reports once and responds to editing, archive and deletion',()=>{
 const program=d.saveRecord('donation_programs',{title:'Penyaluran',status:'active',programType:'social'},'test');
 d.saveRecord('donation_transactions',{title:'Dana',programId:program.id,amount:1000000,kind:'Pemasukan',status:'valid',date:'2026-10-04'},'test');
 const base={title:'Penyaluran',programId:program.id,date:'2026-10-04',reportValues:{amountUsed:250000}};
 const report=d.saveRecord('donation_updates',{...base,status:'published'},'test');
 d.saveRecord('donation_updates',{...base,status:'draft'},'test');
 d.saveRecord('donation_updates',{...base,status:'published',publishAt:'2099-01-01T00:00'},'test');
 assert.deepEqual(d.donationFinance(program.id),{total:1000000,used:250000,remaining:750000});
 d.saveRecord('donation_updates',{...report,reportValues:{amountUsed:300000}},'test');
 assert.equal(d.donationFinance(program.id).used,300000);
 d.saveRecord('donation_updates',{...report,status:'archived'},'test');assert.equal(d.donationFinance(program.id).used,0);
 d.saveRecord('donation_updates',{...report,status:'published'},'test');d.deleteRecord('donation_updates',report.id,'test');assert.equal(d.donationFinance(program.id).used,0);
});
test('health content is filtered at the public data boundary until approved',()=>{
 const program=d.saveRecord('donation_programs',{title:'Bantuan kesehatan',status:'active',programType:'health'},'test');
 const report=d.saveRecord('donation_updates',{title:'Nama pribadi',programId:program.id,status:'published',date:'2026-10-04',body:'Catatan pribadi',summary:'Informasi pribadi',reportValues:{recipientCount:2,amountUsed:10000,facility:'Nama fasilitas',usageNotes:'Informasi penggunaan pribadi'}},'test');
 const read=()=>d.publicData().donation_updates.find((r:any)=>r.id===report.id)!;
 assert.equal(read().body,undefined);assert.equal(read().summary,undefined);assert.equal(read().title,'Perkembangan bantuan kesehatan');assert.equal(read().reportValues.facility,undefined);assert.equal(read().reportValues.recipientCount,2);
 d.saveRecord('donation_updates',{...report,publicContentApproved:true},'test');assert.equal(read().body,'Catatan pribadi');
 d.saveRecord('donation_programs',{...program,status:'draft'},'test');assert.equal(read(),undefined);
});
