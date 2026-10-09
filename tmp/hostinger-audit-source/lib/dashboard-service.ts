import {db,records} from './database.ts';
import {modules,money} from './modules.ts';
import {eligibleAccounts} from './account-usage.ts';
import {hasPaymentQr} from './payment-qr.ts';
import {nextCalendarOccurrence,informationVisible} from './information-schema.ts';
import type {DashboardData,DashboardItem} from './dashboard-types.ts';

const contentModules=['posts','galleries','announcements','agendas','hero_slides'];
const labels:Record<string,string>={posts:'Berita & Artikel',galleries:'Galeri Foto',announcements:'Pengumuman',agendas:'Agenda',hero_slides:'Hero Beranda',donation_programs:'Program Donasi',donation_accounts:'Rekening Donasi',donation_transactions:'Donasi'};
const icons:Record<string,string>={posts:'Konten',galleries:'photo',announcements:'megaphone',agendas:'calendar',hero_slides:'Tampilan',donation_programs:'Donasi',donation_accounts:'bank',donation_transactions:'wallet'};

// Dashboard reads existing records and the ledger; it never creates summary tables.
export function dashboardSummary(permissions:string[],now=new Date()):DashboardData{
 const allowed=(name:string)=>permissions.includes(modules[name]?.permission);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const month=today.slice(0,7),start=month+'-01',end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
 const result:DashboardData={generatedAt:now.toISOString(),month:new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(now),stats:[],highlights:[],attention:[],activities:[]};
 const item=(module:string,label:string,value:string|number,helper?:string,extra:Partial<DashboardItem['target']>={}):DashboardItem=>({label,value,helper,icon:icons[module]||'Konten',target:{module,...extra}});
 const rows:Record<string,any[]>={};
 for(const name of Object.keys(labels))if(allowed(name)&&name!=='donation_transactions')rows[name]=records(name,true);
 for(const name of ['posts','galleries','announcements','agendas'])if(allowed(name))result.stats.push(item(name,labels[name],rows[name].length,'Kelola seluruh '+labels[name].toLowerCase()));
 if(allowed('donation_programs')){
  const programs=rows.donation_programs.filter(p=>['active','achieved'].includes(p.status));
  result.stats.splice(Math.min(1,result.stats.length),0,item('donation_programs','Program Donasi Aktif',programs.length,'Termasuk program yang mencapai target'));
  const accounts=rows.donation_accounts,active=accounts.filter(a=>a.status==='published');
  const missing=programs.filter(p=>!eligibleAccounts(accounts,p).length);
  if(missing.length)result.attention.push(item('donation_programs','Program belum memiliki rekening yang aktif',missing.length,'Periksa rekening umum atau rekening khusus program'));
  const noQr=active.filter(a=>!hasPaymentQr(a));
  if(noQr.length)result.attention.push(item('donation_accounts','Rekening belum memiliki QR/QRIS aktif',noQr.length,'Lengkapi agar donatur lebih mudah membayar'));
  result.highlights.push(item('donation_accounts','Rekening aktif',active.length,'Siap menerima donasi'));
 }
 if(allowed('donation_transactions')){
  const totals=db.prepare(`SELECT COALESCE(SUM(CASE WHEN status='valid' THEN CAST(json_extract(data,'$.amount') AS INTEGER) ELSE 0 END),0) total,
   COALESCE(SUM(CASE WHEN status='valid' AND json_extract(data,'$.date') BETWEEN ? AND ? THEN CAST(json_extract(data,'$.amount') AS INTEGER) ELSE 0 END),0) monthly,
   SUM(CASE WHEN status IN ('pending','draft') THEN 1 ELSE 0 END) pending FROM donation_transactions WHERE deleted_at IS NULL`).get(start,end) as any;
  const donors=db.prepare('SELECT COUNT(*) count FROM donors WHERE merged_into IS NULL').get() as any;
  result.stats.splice(Math.min(2,result.stats.length),0,item('donation_transactions','Donasi Diterima',money(Number(totals.total)),'Total terverifikasi, termasuk koreksi',{filters:{status:'valid'}}));
  result.highlights.unshift(item('donation_transactions','Donasi bulan ini',money(Number(totals.monthly)),'Berdasarkan tanggal donasi • '+result.month,{filters:{status:'valid',from:start,to:end}}),item('donation_transactions','Menunggu verifikasi',Number(totals.pending||0),'Donasi yang perlu diperiksa',{filters:{status:'pending'}}));
  result.highlights.push({...item('donation_transactions','Jumlah donatur',Number(donors.count),'Data donatur yang belum digabung'),target:{module:'donors'},icon:'people'});
  if(totals.pending)result.attention.unshift(item('donation_transactions','Donasi menunggu verifikasi',Number(totals.pending),'Periksa bukti transfer dan konfirmasi penerimaan',{filters:{status:'pending'}}));
  const top=db.prepare(`SELECT p.id,p.title,COUNT(DISTINCT CASE WHEN CAST(json_extract(t.data,'$.amount') AS INTEGER)>0 THEN t.donor_id END) supporters
   FROM donation_transactions t JOIN donation_programs p ON p.id=t.program_id WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL AND t.status='valid'
   GROUP BY p.id HAVING supporters>0 ORDER BY supporters DESC,p.title LIMIT 1`).get() as any;
  result.highlights.push(item('donation_transactions','Program paling banyak didukung',top?.title||'Belum ada dukungan',top?`${top.supporters} donatur • donasi terverifikasi`:'Dukungan akan muncul setelah donasi diverifikasi',top?{filters:{status:'valid',program:top.id}}:{filters:{status:'valid'}}));
 }
 const published:any[]=[];
 const contentAccess=contentModules.filter(allowed);
 const publicationTimes=new Map<string,string>();
 if(contentAccess.length)for(const event of db.prepare(`SELECT entity,entity_id,MAX(created_at) date FROM audit_logs WHERE entity IN (${contentAccess.map(()=>'?').join(',')}) AND action IN ('create','update') AND json_extract(details,'$.after.status')='published' AND COALESCE(json_extract(details,'$.before.status'),'')<>'published' GROUP BY entity,entity_id`).all(...contentAccess) as any[])publicationTimes.set(event.entity+':'+event.entity_id,event.date);
 for(const name of contentModules.filter(allowed)){
  const drafts=rows[name].filter(r=>r.status==='draft');
  if(drafts.length)result.attention.push(item(name,name==='announcements'?'Pengumuman belum tayang':labels[name]+' masih draft',drafts.length,'Lanjutkan penyuntingan sebelum diterbitkan',{status:'draft'}));
  const live=rows[name].filter(r=>name==='announcements'?informationVisible(name,r,now.getTime()):['published','scheduled'].includes(r.status)&&(!r.publishAt||Date.parse(r.publishAt)<=now.getTime())&&(r.status!=='scheduled'||r.publishAt)&&(!r.startsAt||Date.parse(r.startsAt)<=now.getTime())&&(!r.endsAt||Date.parse(r.endsAt)>now.getTime()));
  published.push(...live.map(r=>({...r,module:name,publishedAt:r.publishAt||publicationTimes.get(name+':'+r.id)||r.created_at})));
 }
 published.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 const latest=published[0];
 if(latest)result.highlights.push(item(latest.module,'Konten terbaru dipublikasikan',latest.title,labels[latest.module],{id:latest.id}));
 if(allowed('agendas')){
  const next=rows.agendas.filter(a=>a.status==='published'&&/^\d{4}-\d{2}-\d{2}$/.test(String(a.date||''))&&Number.isFinite(Date.parse(a.date))&&a.date>=today).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0];
  const agendaDate=next?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(String(next.date).slice(0,10)+'T00:00:00+07:00')):'';
  result.highlights.push(item('agendas','Agenda terdekat',next?.title||'Belum ada agenda mendatang',next?agendaDate:'Tambahkan jadwal kegiatan berikutnya',next?{id:next.id}:{}));
  if(next)result.attention.push(item('agendas','Persiapkan agenda terdekat',next.title,agendaDate,{id:next.id}));
 }
 if(allowed('academic_calendars')){
  const dates=records('academic_calendars',true).filter(r=>r.status==='published'&&r.showDashboard).map(r=>({...r,repeat:r.repeat,nextDate:nextCalendarOccurrence(r,today)})).filter(r=>r.nextDate>=today).sort((a,b)=>a.nextDate.localeCompare(b.nextDate)).slice(0,3);
  for(const r of dates)result.highlights.push(item('academic_calendars','Kalender: '+r.title,r.nextDate,r.repeat&&r.repeat!=='Tidak'?'Berulang '+r.repeat.toLowerCase():'Tanggal penting',{id:r.id}));
 }
 // Only module-authorized, nondeleted records. Never return audit JSON or private donor details.
 const entities=Object.keys(labels).filter(allowed);
 if(entities.length){
  const exists=entities.map(name=>`(a.entity='${name}' AND EXISTS(SELECT 1 FROM ${name} r WHERE r.id=a.entity_id AND r.deleted_at IS NULL))`).join(' OR ');
  const activity=db.prepare(`SELECT a.id,a.entity,a.entity_id,a.action,a.created_at,json_extract(a.details,'$.after.title') title,json_extract(a.details,'$.after.status') status,json_extract(a.details,'$.before.status') previous_status FROM audit_logs a WHERE (${exists}) AND a.action IN ('create','update','account.assign','account.primary.remove') ORDER BY a.created_at DESC,a.id DESC LIMIT 7`).all() as any[];
  result.activities=activity.map(a=>({id:a.id,label:labels[a.entity]+(a.status==='published'&&a.previous_status!=='published'?' diterbitkan':a.action==='create'?' ditambahkan':a.entity==='donation_transactions'&&a.status==='valid'&&a.previous_status!=='valid'?' diterima':' diperbarui'),title:a.entity==='donation_transactions'?'Lihat rincian transaksi':String(a.title||rows[a.entity]?.find(r=>r.id===a.entity_id)?.title||labels[a.entity]),date:a.created_at,target:{module:a.entity,id:a.entity_id},icon:icons[a.entity]}));
 }
 return result;
}
