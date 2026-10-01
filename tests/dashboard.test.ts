import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dashboard-')),'test.sqlite');
const d=await import('../lib/database.ts');
const {dashboardSummary}=await import('../lib/dashboard-service.ts');
const {donationQuery}=await import('../lib/donation-service.ts');
const now=new Date('2026-09-30T18:00:00Z'); // Already October in Payakumbuh.
const permissions=['posts.manage','gallery.manage','information.manage','appearance.manage','donations.manage','donations.transaction'];
const save=(module:string,data:any)=>d.saveRecord(module,data,'test');
const program=save('donation_programs',{title:'Asrama',status:'active'});
const tx=(amount:number,date:string,status='valid',phone='081363123456')=>save('donation_transactions',{title:crypto.randomUUID(),donor_name:'PRIVATE PERSON',donor_phone:phone,note:'PRIVATE NOTE',amount,date,status,kind:amount<0?'Koreksi':'Pemasukan',programId:program.id});
test('financial summary uses Jakarta month, verified signed amounts and matching drill-down filters',()=>{
 tx(100000,'2026-10-01');tx(20000,'2026-09-30');tx(-10000,'2026-10-02');tx(30000,'2026-10-02','pending');tx(40000,'2026-10-02','rejected');
 const removed=tx(50000,'2026-10-02');d.db.prepare('UPDATE donation_transactions SET deleted_at=? WHERE id=?').run(now.toISOString(),removed.id);
 const s=dashboardSummary(permissions,now),month=s.highlights.find(h=>h.label==='Donasi bulan ini')!;
 assert.equal(s.month,'Oktober 2026');assert.equal(donationQuery(new URLSearchParams(month.target.filters)).total,90000);
 assert.equal(s.highlights.find(h=>h.label==='Menunggu verifikasi')?.value,1);
 assert.equal(s.highlights.find(h=>h.label==='Jumlah donatur')?.value,1);
 assert.equal(s.highlights.find(h=>h.label==='Program paling banyak didukung')?.helper,'1 donatur • donasi terverifikasi');
 assert.equal(donationQuery(new URLSearchParams(s.stats.find(h=>h.label==='Donasi Diterima')!.target.filters)).total,110000);
});
test('attention respects general account fallback and unusable dedicated accounts',()=>{
 assert.ok(dashboardSummary(permissions,now).attention.some(h=>h.label.includes('Program belum')));
 const general=save('donation_accounts',{title:'Umum',bank:'BSI',holder:'Yayasan',number:'123456',status:'published'});
 assert.ok(!dashboardSummary(permissions,now).attention.some(h=>h.label.includes('Program belum')));
 const special=save('donation_accounts',{title:'Khusus',bank:'BNI',holder:'Yayasan',number:'123457',status:'draft'});
 save('donation_programs',{...program,accountId:special.id});
 assert.equal(dashboardSummary(permissions,now).attention.find(h=>h.label.includes('Program belum'))?.value,1);
 assert.equal(dashboardSummary(permissions,now).highlights.find(h=>h.label==='Rekening aktif')?.value,1);
 assert.ok(general.id);
});
test('publication and upcoming agenda ignore drafts and future publication',()=>{
 save('posts',{title:'Tayang',status:'published',publishAt:'2026-09-01T10:00:00Z'});
 save('posts',{title:'Masih draft',status:'draft'});
 save('posts',{title:'Belum waktunya',status:'scheduled',publishAt:'2026-12-01T10:00:00Z'});
 save('agendas',{title:'Sudah lewat',status:'published',date:'2026-09-30'});
 save('agendas',{title:'Besok',status:'published',date:'2026-10-02'});
 save('agendas',{title:'Draft hari ini',status:'draft',date:'2026-10-01'});
 const s=dashboardSummary(permissions,now);
 assert.equal(s.attention.find(h=>h.label==='Berita & Artikel masih draft')?.value,1);
 assert.equal(s.highlights.find(h=>h.label==='Agenda terdekat')?.value,'Besok');
 assert.notEqual(s.highlights.find(h=>h.label==='Konten terbaru dipublikasikan')?.value,'Belum waktunya');
});
test('summary and activities are permission-scoped and never expose raw audit or private donor fields',()=>{
 const editor=dashboardSummary(['posts.manage'],now);
 assert.deepEqual(editor.stats.map(s=>s.target.module),['posts']);
 assert.ok(editor.activities.every(a=>a.target.module==='posts'));
 assert.ok(editor.highlights.every(a=>a.target.module==='posts'));
 const text=JSON.stringify(dashboardSummary(permissions,now));
 for(const secret of ['PRIVATE PERSON','PRIVATE NOTE','081363123456','password_hash','details'])assert.ok(!text.includes(secret));
 const empty=dashboardSummary([],now);assert.equal(empty.stats.length+empty.attention.length+empty.highlights.length+empty.activities.length,0);
});
test('deleted records do not produce broken activity links',()=>{
 const p=save('posts',{title:'Akan dihapus',status:'draft'});d.deleteRecord('posts',p.id,'test');
 assert.ok(!dashboardSummary(permissions,now).activities.some(a=>a.target.id===p.id));
});
test('newly published old drafts use the publication event, not their creation date',()=>{
 const p=save('posts',{title:'Draft lama baru terbit',status:'draft'});
 d.db.prepare('UPDATE posts SET created_at=? WHERE id=?').run('2020-01-01T00:00:00Z',p.id);
 save('posts',{...p,status:'published'});
 // Model a legacy publication without an explicit date; normal saves now set it.
 d.db.prepare("UPDATE posts SET data=json_remove(data,'$.publishAt') WHERE id=?").run(p.id);
 d.db.prepare("UPDATE audit_logs SET created_at=? WHERE entity='posts' AND entity_id=? AND action='update'").run('2026-10-01T01:00:00Z',p.id);
 const summary=dashboardSummary(['posts.manage'],new Date('2026-10-01T02:00:00Z'));
 assert.equal(summary.highlights.find(h=>h.label==='Konten terbaru dipublikasikan')?.value,p.title);
});
