import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {informationVisible,nextCalendarOccurrence,informationFieldVisible} from '../lib/information-schema.ts';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'information-')),'test.sqlite');
const d=await import('../lib/database.ts');
const {dashboardSummary}=await import('../lib/dashboard-service.ts');
const save=(name:string,row:any)=>d.saveRecord(name,row,'test');
test('legacy content is mapped without writes, and survives an edit including old custom calendar categories',()=>{
 const old={summary:'Ringkasan lama',body:'<p>Isi asli</p>',schedule:'Seleksi pekan kedua',fees:'Gratis untuk semua',requirements:'Syarat lama',steps:'Datang ke kantor',registrationUrl:'https://example.test/daftar',extraLegacy:'tetap utuh'};
 d.db.prepare("INSERT INTO registrations(id,title,slug,status,data,created_at,updated_at) VALUES('legacy','Penerimaan','penerimaan','published',?,'2020-01-01','2020-01-01')").run(JSON.stringify(old));
 const row=d.records('registrations',true)[0];assert.equal(row.feeType,'Gratis');assert.equal(row.registrationStatus,'Dibuka');assert.equal(row.showOnHome,true);
 assert.equal((d.db.prepare("SELECT data FROM registrations WHERE id='legacy'").get() as any).data,JSON.stringify(old));
 const edited=save('registrations',{id:row.id,title:'Penerimaan diperbarui'});
 for(const key of Object.keys(old))assert.deepEqual(edited[key],old[key as keyof typeof old]);
 assert.equal(edited.slug,'penerimaan');
 d.db.prepare("INSERT INTO academic_calendars(id,title,slug,status,data,created_at,updated_at) VALUES('old-calendar','Peristiwa','peristiwa','published',?,'2020-01-01','2020-01-01')").run(JSON.stringify({kind:'Kategori lama',date:'2026-10-01',body:'<p>Isi kalender asli</p>',year:'2026/2027'}));
 const calendar=save('academic_calendars',{id:'old-calendar',title:'Peristiwa baru'});assert.equal(calendar.kind,'Kategori lama');assert.equal(calendar.body,'<p>Isi kalender asli</p>');assert.equal(calendar.year,'2026/2027');
});
test('automatic slugs allow repeated titles and maintain independent records',()=>{
 const a=save('registrations',{title:'Penerimaan Santri',status:'draft'}),b=save('registrations',{title:'Penerimaan Santri',status:'draft'});assert.notEqual(a.slug,b.slug);
 assert.equal(save('registrations',{...a,title:'Judul berubah'}).slug,a.slug);
});
test('announcement windows use WIB, until-revoked overrides expiry, and target units must exist',()=>{
 const r={status:'published',startsAt:'2026-10-01T08:00',endsAt:'2026-10-01T09:00',untilRevoked:false};
 assert.equal(informationVisible('announcements',r,Date.parse('2026-10-01T00:59Z')),false);
 assert.equal(informationVisible('announcements',r,Date.parse('2026-10-01T01:00Z')),true);
 assert.equal(informationVisible('announcements',r,Date.parse('2026-10-01T02:00Z')),false);
 assert.equal(informationVisible('announcements',{...r,untilRevoked:true},Date.parse('2026-10-02T02:00Z')),true);
 assert.throws(()=>save('announcements',{title:'Tidak valid',untilRevoked:false}),/berakhir/);
 assert.throws(()=>save('announcements',{title:'Unit hilang',audience:'Unit tertentu',unitId:'missing'}),/Unit pendidikan/);
 const unit=save('education_units',{title:'Madrasah',status:'published'});const news=save('announcements',{title:'Informasi untuk unit',status:'published',audience:'Unit tertentu',unitId:unit.id,pinned:true});
 assert.equal(d.publicData().announcements.find((r:any)=>r.id===news.id).unitTitle,'Madrasah');
});
test('invalid chronology, money, time, participant limit and recurrence are rejected',()=>{
 assert.throws(()=>save('registrations',{title:'Biaya salah',feeType:'Berbayar',registrationFee:-1}),/tidak negatif/);
 assert.throws(()=>save('registrations',{title:'Periode salah',date:'2026-10-10',endDate:'2026-10-01'}),/Tanggal selesai/);
 assert.throws(()=>save('agendas',{title:'Jam salah',date:'2026-10-01',allDay:false,startTime:'10:00',endTime:'09:00'}),/Jam selesai/);
 assert.throws(()=>save('agendas',{title:'Peserta salah',requiresRegistration:true,capacity:1.5}),/angka bulat/);
 assert.throws(()=>save('agendas',{title:'Batas salah',date:'2026-10-01',requiresRegistration:true,registrationDeadline:'2026-10-02T12:00'}),/Batas pendaftaran/);
 assert.throws(()=>save('academic_calendars',{title:'Belum bertanggal',status:'published'}),/Tanggal mulai/);
 assert.throws(()=>save('academic_calendars',{title:'Pola salah',repeat:'Per detik'}),/Pilihan tidak valid/);
});
test('conditional controls retain values when hidden without making hidden fields effective',()=>{
 const r=save('agendas',{title:'Acara hybrid',status:'published',date:'2026-10-05',mode:'Hybrid',requiresRegistration:true,registrationUrl:'https://example.test/register',capacity:50});
 const changed=save('agendas',{...r,mode:'Offline',requiresRegistration:false});assert.equal(changed.registrationUrl,r.registrationUrl);
 assert.equal(informationFieldVisible('agendas','registrationUrl',changed),false);assert.equal(informationFieldVisible('agendas','meetingUrl',changed),false);
 assert.equal(informationFieldVisible('academic_calendars','startTime',{allDay:true}),false);
});
test('calendar visibility switches work independently without duplicating stored events',()=>{
 const r=save('academic_calendars',{title:'Rapat internal',status:'published',date:'2026-10-02',showPublic:false,showDashboard:true,showAgenda:true,repeat:'Mingguan'});
 const publicData=d.publicData();assert.ok(!publicData.academic_calendars.some((x:any)=>x.id===r.id));assert.equal(publicData.agendas.filter((x:any)=>x.calendarSource&&x.id==='calendar-'+r.id).length,1);
 assert.ok(!d.records('agendas',true).some(x=>x.title===r.title));
 assert.ok(dashboardSummary(['information.manage'],new Date('2026-10-01T00:00Z')).highlights.some(x=>x.target.id===r.id));
 assert.ok(!dashboardSummary([],new Date('2026-10-01T00:00Z')).highlights.some(x=>x.target.id===r.id));
 save('academic_calendars',{...r,status:'draft'});assert.ok(!d.publicData().agendas.some((x:any)=>x.id==='calendar-'+r.id));
});
test('recurrence keeps the original date anchor across month ends and leap years',()=>{
 assert.equal(nextCalendarOccurrence({date:'2026-01-31',repeat:'Bulanan'},'2026-02-02'),'2026-02-28');
 assert.equal(nextCalendarOccurrence({date:'2026-01-31',repeat:'Bulanan'},'2026-03-01'),'2026-03-31');
 assert.equal(nextCalendarOccurrence({date:'2024-02-29',repeat:'Tahunan'},'2025-02-01'),'2025-02-28');
 assert.equal(nextCalendarOccurrence({date:'2026-10-01',repeat:'Mingguan'},'2026-10-03'),'2026-10-08');
 assert.equal(nextCalendarOccurrence({date:'2026-10-01',repeat:'Harian'},'2026-10-03'),'2026-10-03');
});


test('public information routes separate landing, modules and published details',async()=>{
 const {informationRoute,informationHref,informationMenu,routeActive}=await import('../lib/information-public.ts');
 const data={registrations:[],announcements:[{slug:'pengumuman-uji',title:'Pengumuman uji'}],agendas:[],academic_calendars:[]};
 assert.equal(informationRoute(['informasi'],data)?.title,'Informasi & Layanan');
 assert.equal(informationRoute(['informasi','pengumuman'],data)?.service?.module,'announcements');
 assert.equal(informationRoute(['informasi','pengumuman','pengumuman-uji'],data)?.item.title,'Pengumuman uji');
 assert.equal(informationRoute(['informasi','pengumuman','missing'],data),null);
 assert.equal(informationRoute(['informasi','unknown'],data),null);
 assert.equal(informationRoute(['informasi','agenda','x','extra'],data),null);
 assert.equal(informationHref('agenda',{slug:'ujian',calendarSource:true}),'/informasi/agenda/kalender-ujian');
 const menu=informationMenu([{id:'home',title:'Beranda',url:'/'},{id:'info',title:'Informasi',url:'/informasi'},{id:'old',parent:'Informasi',title:'Lama',url:'/informasi#agenda'}]);
 assert.equal(menu.filter(r=>r.title==='Informasi').length,1);assert.equal(menu.filter(r=>r.parent==='Informasi').length,4);
 assert.deepEqual(informationMenu(menu),menu);assert.equal(routeActive('/informasi/agenda/acara','/informasi/agenda'),true);assert.equal(routeActive('/informasi/agenda','/informasi'),false);
});
test('calendar month handles spans, leap years and recurring events without inventing data',async()=>{
 const {calendarMonth,agendaFinished,agendaOccurrence}=await import('../lib/information-public.ts');
 const rows=[{id:'monthly',title:'Bulanan',date:'2024-01-31',repeat:'Bulanan'},{id:'span',date:'2024-02-28',endDate:'2024-03-02',repeat:'Tidak'},{id:'future',date:'2025-01-01',repeat:'Harian'}];
 const days=calendarMonth('2024-02',rows);assert.equal(days.length,29);assert.deepEqual(days.at(-1)?.events.map(r=>r.id),['monthly','span']);
 assert.equal(calendarMonth('2024-03',rows)[0].events[0].id,'span');assert.equal(calendarMonth('2024-03',rows).at(-1)?.events[0].id,'monthly');
 assert.equal(calendarMonth('2025-02',[]).length,28);
 const now=Date.parse('2026-10-01T12:00:00+07:00');assert.equal(agendaFinished({date:'2026-10-01',allDay:false,endTime:'11:00'},now),true);assert.equal(agendaFinished({date:'2026-10-01',allDay:true},now),false);assert.equal(agendaFinished({date:'2026-09-01',eventStatus:'Akan datang'},now),true);
 assert.equal(agendaOccurrence({date:'2024-01-31',repeat:'Bulanan',calendarSource:true},'2024-02-01').date,'2024-02-29');
});
