import type {Field} from './modules.ts';
type Row=Record<string,any>;
export type InformationSection={title:string;description?:string;fields:Field[]};
const f=(key:string,label:string,type='text',options?:string[]):Field=>({key,label,type,options});
export const informationSchema:Record<string,{title:string;description:string;sections:InformationSection[]}>={
 registrations:{title:'Pendaftaran',description:'Atur penerimaan peserta, jadwal, persyaratan, dan cara mendaftar.',sections:[
  {title:'Informasi Pendaftaran',fields:[f('title','Judul pendaftaran'),f('kind','Jenis pendaftaran','select',['Santri baru','Siswa baru','Program tahfiz','Kegiatan','Lainnya']),f('year','Tahun/periode'),f('registrationStatus','Status pendaftaran','select',['Akan dibuka','Dibuka','Ditutup'])]},
  {title:'Periode & Jadwal',fields:[f('date','Tanggal mulai','date'),f('endDate','Tanggal akhir','date'),f('selectionDate','Jadwal seleksi','datetime-local'),f('resultDate','Pengumuman hasil','datetime-local'),f('reenrollmentDate','Daftar ulang','datetime-local')]},
  {title:'Syarat & Ketentuan',fields:[f('requirements','Persyaratan','textarea'),f('documents','Dokumen yang diperlukan','textarea'),f('conditions','Ketentuan khusus','textarea')]},
  {title:'Biaya',fields:[f('feeType','Gratis / Berbayar','select',['Gratis','Berbayar']),f('registrationFee','Biaya pendaftaran (Rp)','number'),f('programFee','Biaya program (Rp)','number'),f('fees','Keterangan biaya','textarea')]},
  {title:'Cara Mendaftar',fields:[f('steps','Alur pendaftaran','textarea'),f('registrationUrl','Link formulir','url'),f('whatsapp','WhatsApp','tel'),f('location','Lokasi pendaftaran')]},
  {title:'Media',fields:[f('image','Foto utama','image'),f('alt','Teks alternatif foto'),f('brochure','Brosur PDF','file'),f('photos','Galeri (opsional)','photos')]},
  {title:'Status & Tampilan',fields:[f('status','Aktif','publication-toggle'),f('showOnHome','Tampilkan di beranda','checkbox'),f('sort_order','Urutan','number')]}
 ]},
 announcements:{title:'Pengumuman',description:'Sampaikan informasi kepada audiens yang tepat pada waktu yang tepat.',sections:[
  {title:'Informasi Pengumuman',fields:[f('title','Judul pengumuman'),f('category','Kategori','select',['Akademik','Santri/Siswa','Orang Tua','Keuangan','Kegiatan','Umum']),f('priority','Prioritas','select',['Biasa','Penting','Mendesak'])]},
  {title:'Isi Pengumuman',fields:[f('summary','Ringkasan','textarea'),f('body','Isi lengkap','richtext')]},
  {title:'Waktu Tayang',description:'Jadwal menggunakan waktu Indonesia Barat (WIB).',fields:[f('startsAt','Mulai tampil','datetime-local'),f('untilRevoked','Tampilkan sampai dicabut','checkbox'),f('endsAt','Berakhir','datetime-local')]},
  {title:'Target Pengumuman',description:'Target menjadi label audiens, bukan pembatasan akses. Pengumuman terbit tetap dapat dibaca publik.',fields:[f('audience','Target pengumuman','select',['Semua','Santri/Siswa','Orang Tua','Guru/Ustaz','Unit tertentu']),f('unitId','Unit pendidikan','relation:education_units')]},
  {title:'Lampiran',fields:[f('image','Gambar','image'),f('alt','Teks alternatif gambar'),f('pdf','PDF','file'),f('document','Dokumen (PDF)','file')]},
  {title:'Status & Tampilan',fields:[f('status','Status publikasi','select',['draft','published']),f('pinned','Pin pengumuman','checkbox'),f('showOnHome','Tampilkan di beranda','checkbox')]}
 ]},
 agendas:{title:'Agenda',description:'Kelola jadwal acara, peserta, tempat, dan kebutuhan pendaftaran.',sections:[
  {title:'Informasi Agenda',fields:[f('title','Nama kegiatan'),f('kind','Jenis kegiatan','select',['Kajian','Rapat','Seminar','Kegiatan santri','Akademik','Umum']),f('summary','Ringkasan','textarea')]},
  {title:'Waktu & Tempat',description:'Jam kegiatan menggunakan waktu Indonesia Barat (WIB).',fields:[f('date','Tanggal mulai','date'),f('endDate','Tanggal selesai','date'),f('allDay','Sepanjang hari','checkbox'),f('startTime','Jam mulai','time'),f('endTime','Jam selesai','time'),f('mode','Pelaksanaan','select',['Offline','Online','Hybrid']),f('location','Lokasi'),f('maps','Link Maps','url'),f('meetingUrl','Link Zoom/Meet','url')]},
  {title:'Detail Kegiatan',fields:[f('body','Deskripsi','richtext'),f('rundown','Rundown','textarea'),f('speakers','Narasumber'),f('audience','Target peserta')]},
  {title:'Pendaftaran',fields:[f('requiresRegistration','Perlu pendaftaran','checkbox'),f('registrationUrl','Link pendaftaran','url'),f('capacity','Batas peserta','number'),f('registrationDeadline','Batas pendaftaran','datetime-local')]},
  {title:'Media & Dokumen',fields:[f('image','Poster/foto','image'),f('alt','Teks alternatif poster/foto'),f('document','Lampiran (PDF)','file'),f('rundownPdf','Rundown PDF','file')]},
  {title:'Status & Tampilan',fields:[f('eventStatus','Status kegiatan','select',['Akan datang','Berlangsung','Selesai','Dibatalkan']),f('status','Dipublikasikan','publication-toggle'),f('showOnHome','Tampilkan di beranda','checkbox')]}
 ]},
 academic_calendars:{title:'Kalender',description:'Catat tanggal penting dan peristiwa pendidikan secara ringkas.',sections:[
  {title:'Informasi Kalender',fields:[f('title','Nama peristiwa'),f('kind','Kategori','select',['Akademik','Libur','Ujian','Pendaftaran','Kegiatan','Rapat','Keagamaan','Lainnya'])]},
  {title:'Tanggal & Pengulangan',fields:[f('date','Tanggal mulai','date'),f('endDate','Tanggal selesai','date'),f('allDay','Sepanjang hari','checkbox'),f('startTime','Jam mulai','time'),f('endTime','Jam selesai','time'),f('repeat','Berulang?','select',['Tidak','Harian','Mingguan','Bulanan','Tahunan'])]},
  {title:'Keterangan',fields:[f('summary','Deskripsi singkat','textarea'),f('location','Lokasi (opsional)')]},
  {title:'Tampilan Kalender',fields:[f('color','Warna kategori','color'),f('showPublic','Tampilkan di kalender publik','checkbox'),f('showDashboard','Tampilkan di dashboard','checkbox'),f('showAgenda','Tampilkan di agenda','checkbox')]},
  {title:'Status',fields:[f('status','Aktif','publication-toggle')]}
 ]}
};
// Retain old generic fields in storage. They remain editable in a collapsed legacy card.
export const informationLegacy:Record<string,Field[]>={
 registrations:[f('summary','Ringkasan lama','textarea'),f('body','Deskripsi lama','richtext'),f('schedule','Jadwal lama','textarea')],
 announcements:[f('date','Tanggal pengumuman lama','date')],
 agendas:[],
 academic_calendars:[f('year','Tahun ajaran lama'),f('body','Isi lama','richtext'),f('image','Gambar lama','image'),f('alt','Teks alternatif gambar lama')]
};
export function informationFields(name:string):Field[]{return [...informationSchema[name].sections.flatMap(s=>s.fields).filter(f=>!['title','status','sort_order'].includes(f.key)),...informationLegacy[name]];}
export function informationDefaults(name:string,r:Row):Row{
 const common={showOnHome:r.showOnHome??true};
 if(name==='registrations')return {...common,kind:'Santri baru',registrationStatus:r.status==='published'&&r.registrationUrl?'Dibuka':'Akan dibuka',feeType:r.fees&&!/^gratis\b/i.test(r.fees)?'Berbayar':'Gratis',...r};
 if(name==='announcements')return {...common,category:'Umum',priority:'Biasa',audience:'Semua',untilRevoked:!r.endsAt,startsAt:r.date?`${r.date}T00:00`:'',...r};
 if(name==='agendas')return {...common,kind:'Umum',eventStatus:'Akan datang',allDay:true,mode:'Offline',requiresRegistration:!!r.registrationUrl,...r};
 if(name==='academic_calendars')return {allDay:true,repeat:'Tidak',color:'#5b8063',showPublic:true,showDashboard:false,showAgenda:false,...r};
 return r;
}
export function informationFieldVisible(name:string,key:string,r:Row){
 if(['registrationFee','programFee'].includes(key))return r.feeType==='Berbayar';
 if(name==='announcements'&&key==='endsAt')return !r.untilRevoked;
 if(name==='announcements'&&key==='unitId')return r.audience==='Unit tertentu';
 if(['startTime','endTime'].includes(key))return !r.allDay;
 if(name==='agendas'&&['location','maps'].includes(key))return r.mode!=='Online';
 if(name==='agendas'&&key==='meetingUrl')return r.mode!=='Offline';
 if(name==='agendas'&&['registrationUrl','capacity','registrationDeadline'].includes(key))return !!r.requiresRegistration;
 return true;
}
export function informationInstant(value:string){return Date.parse(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)?value+'+07:00':value);}
export function nextCalendarOccurrence(r:Row,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){
 if(!r.date||!Number.isFinite(Date.parse(r.date)))return '';
 if(!r.repeat||r.repeat==='Tidak'||r.date>=today)return r.date;
 const start=new Date(r.date+'T00:00:00Z'),current=new Date(today+'T00:00:00Z');
 if(['Harian','Mingguan'].includes(r.repeat)){const step=r.repeat==='Harian'?1:7;return new Date(start.getTime()+Math.ceil((current.getTime()-start.getTime())/(86400000*step))*step*86400000).toISOString().slice(0,10);}
 const date=(year:number,month:number)=>new Date(Date.UTC(year,month,Math.min(start.getUTCDate(),new Date(Date.UTC(year,month+1,0)).getUTCDate()))).toISOString().slice(0,10);
 if(r.repeat==='Bulanan'){const candidate=date(current.getUTCFullYear(),current.getUTCMonth());return candidate>=today?candidate:date(current.getUTCFullYear(),current.getUTCMonth()+1);}
 if(r.repeat==='Tahunan'){const candidate=date(current.getUTCFullYear(),start.getUTCMonth());return candidate>=today?candidate:date(current.getUTCFullYear()+1,start.getUTCMonth());}
 return r.date;
}
export function informationVisible(name:string,r:Row,now=Date.now()){
 return r.status==='published'&&(name!=='announcements'||(!r.startsAt||informationInstant(r.startsAt)<=now)&&(r.untilRevoked||!r.endsAt||informationInstant(r.endsAt)>now));
}
export function validateInformation(name:string,r:Row){
 const fail=(s:string)=>{throw new Error(s)};
 if(r.date&&r.endDate&&r.endDate<r.date)fail('Tanggal selesai tidak boleh sebelum tanggal mulai.');
 if(name==='announcements'){
  if(r.status!=='draft'&&!r.untilRevoked&&!r.endsAt)fail('Isi waktu berakhir atau pilih tampilkan sampai dicabut.');
  if(!r.untilRevoked&&r.startsAt&&r.endsAt&&informationInstant(r.endsAt)<=informationInstant(r.startsAt))fail('Waktu berakhir harus setelah mulai tampil.');
  if(r.status!=='draft'&&r.audience==='Unit tertentu'&&!r.unitId)fail('Pilih unit pendidikan yang dituju.');
 }
 if(['agendas','academic_calendars'].includes(name)){
  if(r.status==='published'&&!r.date)fail('Tanggal mulai wajib diisi sebelum diaktifkan.');
  for(const key of ['startTime','endTime'])if(r[key]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(r[key]))fail('Jam tidak valid.');
  if(r.status!=='draft'&&!r.allDay&&(!r.startTime||!r.endTime))fail('Isi jam mulai dan jam selesai, atau pilih sepanjang hari.');
  if(!r.allDay&&(r.endDate||r.date)===r.date&&r.endTime<=r.startTime)fail('Jam selesai harus setelah jam mulai.');
 }
 for(const key of ['registrationFee','programFee','capacity'])if(r[key]!=null&&(!Number.isSafeInteger(r[key])||r[key]<0))fail('Biaya dan batas peserta harus berupa angka bulat, tidak negatif.');
 if(name==='agendas'&&r.requiresRegistration&&r.registrationDeadline&&r.date&&String(r.registrationDeadline).slice(0,10)>r.date)fail('Batas pendaftaran tidak boleh setelah tanggal mulai kegiatan.');
 if(name==='academic_calendars'&&r.color&&!/^#[0-9a-f]{6}$/i.test(r.color))fail('Warna kategori tidak valid.');
}
