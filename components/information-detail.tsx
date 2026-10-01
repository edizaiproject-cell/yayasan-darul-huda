import {imagePosition} from '../lib/media-presets';
import {money} from '@/lib/modules';
import {informationDefaults,informationInstant,nextCalendarOccurrence} from '@/lib/information-schema';
type Row=Record<string,any>;
const when=(value:string)=>value&&Number.isFinite(informationInstant(value))?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(value.length===10?value+'T00:00:00+07:00':informationInstant(value))):'Belum ditentukan';
export function InformationDetail({module,value}:{module:string;value:Row}){
 const r=informationDefaults(module,value),isCalendar=module==='academic_calendars'||r.calendarSource;
 const blocks:[string,any][]=[];
 const add=(label:string,value:any)=>{if(value!==undefined&&value!==null&&value!=='')blocks.push([label,value])};
 if(module==='registrations'){
  add('Jenis pendaftaran',r.kind);add('Tahun/periode',r.year);if(r.date)add('Periode',when(r.date)+(r.endDate?' – '+when(r.endDate):''));
  for(const [key,label] of [['selectionDate','Jadwal seleksi'],['resultDate','Pengumuman hasil'],['reenrollmentDate','Daftar ulang']])if(r[key])add(label,when(r[key])+' • '+r[key].slice(11,16)+' WIB');
  add('Jadwal tambahan',r.schedule);add('Persyaratan',r.requirements);add('Dokumen yang diperlukan',r.documents);add('Ketentuan khusus',r.conditions);add('Biaya',r.feeType);
  if(r.feeType==='Berbayar'){if(r.registrationFee!=null)add('Biaya pendaftaran',money(r.registrationFee));if(r.programFee!=null)add('Biaya program',money(r.programFee));}
  add('Keterangan biaya',r.fees);add('Alur pendaftaran',r.steps);add('Lokasi pendaftaran',r.location);
 }else if(module==='announcements'){
  add('Ditujukan kepada',r.audience==='Unit tertentu'?(r.unitTitle||'Unit pendidikan'):r.audience);
  if(r.startsAt)add('Mulai tampil',when(r.startsAt));if(!r.untilRevoked&&r.endsAt)add('Berakhir',when(r.endsAt));
 }else{
  if(r.date)add('Waktu',when(r.date)+(r.endDate&&r.endDate!==r.date?' – '+when(r.endDate):'')+(r.allDay?' • Sepanjang hari':' • '+(r.startTime||'')+'–'+(r.endTime||'')+' WIB'));
  if(isCalendar){add('Pengulangan',r.repeat||'Tidak');const next=nextCalendarOccurrence(r);if(next&&next!==r.date)add('Tanggal berikutnya',when(next));}
  if(r.mode!=='Online')add('Lokasi',r.location);
  if(!isCalendar){add('Pelaksanaan',r.mode);add('Rundown',r.rundown);add('Narasumber',r.speakers);add('Target peserta',r.audience);if(r.requiresRegistration){if(r.capacity)add('Batas peserta',r.capacity+' peserta');if(r.registrationDeadline)add('Batas pendaftaran',when(r.registrationDeadline)+' • '+r.registrationDeadline.slice(11,16)+' WIB');}}
 }
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const canRegister=module==='registrations'?r.registrationStatus==='Dibuka'&&(!r.date||r.date<=today)&&(!r.endDate||r.endDate>=today):module==='agendas'&&r.requiresRegistration&&r.eventStatus!=='Dibatalkan'&&r.eventStatus!=='Selesai'&&(!r.registrationDeadline||informationInstant(r.registrationDeadline)>=Date.now());
 return <div className={isCalendar?'calendar-color':undefined} style={isCalendar?{borderLeftColor:/^#[0-9a-f]{6}$/i.test(r.color||'')?r.color:'#5b8063',paddingLeft:16}:undefined}>
  <div className="information-public-meta">{[module==='registrations'?r.registrationStatus:module==='announcements'?r.priority:!isCalendar?r.eventStatus:null,r.category||r.kind,r.pinned?'Disematkan':null].filter(Boolean).map((label,i)=><span key={i}>{label}</span>)}</div>
  {r.image&&<img style={{objectPosition:imagePosition(r.image)}} className={'information-public-image '+(module==='agendas'?'information-poster':'information-featured')} src={r.image} alt={r.alt||r.title}/>}{r.summary&&<p>{r.summary}</p>}{r.body&&<div className="prose" dangerouslySetInnerHTML={{__html:r.body}}/>}
  <div className="information-public-details">{blocks.map(([label,value])=><div key={label}><h3>{label}</h3><p className="pre-line">{value}</p></div>)}</div>
  <div className="information-attachments">{[['brochure','Unduh brosur'],['pdf','Unduh PDF'],['document','Unduh dokumen'],['rundownPdf','Unduh rundown']].map(([key,label])=>r[key]?<a key={key} className="button button--outline" href={r[key]} download>{label}</a>:null)}{canRegister&&r.registrationUrl&&<a className="button button--primary" href={r.registrationUrl}>Daftar sekarang ↗</a>}{module==='registrations'&&r.whatsapp&&<a className="button button--outline" href={'https://wa.me/'+String(r.whatsapp).replace(/^0/,'62')}>Hubungi via WhatsApp ↗</a>}{module==='agendas'&&r.mode!=='Online'&&r.maps&&<a className="button button--outline" href={r.maps}>Lihat lokasi ↗</a>}{module==='agendas'&&r.mode!=='Offline'&&r.meetingUrl&&<a className="button button--outline" href={r.meetingUrl}>Link pertemuan ↗</a>}</div>
  {!!r.photos?.length&&<div className="photo-grid">{r.photos.map((p:Row,i:number)=><figure key={i}><img src={p.url} alt={p.caption||r.title}/>{p.caption&&<figcaption>{p.caption}</figcaption>}</figure>)}</div>}
 </div>;
}
