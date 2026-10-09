import {modules} from './modules.ts';
import {contentSchema,contentDefaults,contentFieldVisible} from './content-schema.ts';
import {institutionSchema,institutionDefaults} from './institution-schema.ts';
import {informationSchema,informationDefaults,informationFieldVisible} from './information-schema.ts';
import {appearanceDefaults,isAppearance} from './appearance.ts';
export type ValidationIssue={field:string;label:string;section:string;tab?:number;itemId?:string;message:string;severity:'error'|'warning';required?:boolean;technical?:boolean};
type Row=Record<string,any>;
export function validationFields(module:string){return [{key:'title',label:'Judul / nama',type:'text'},...(modules[module]?.fields||[])];}
export function validationRecord(module:string,value:Row){return isAppearance(module)?appearanceDefaults(module,value):contentSchema[module]?contentDefaults(module,value):institutionSchema[module]?institutionDefaults(module,value):informationSchema[module]?informationDefaults(module,value):value;}
export function fieldLocation(module:string,key:string){const schema=contentSchema[module]||institutionSchema[module]||informationSchema[module];const section=schema?.sections.find(s=>s.fields.some(f=>f.key===key));if(section)return section.title;if(module==='hero_slides')return key==='title'?'Konten Hero':['image','mobileImage','alt'].includes(key)?'Media Hero':/^(primary|secondary)/.test(key)?'Tombol Aksi':'Status';return key==='title'?'Informasi dasar':key.startsWith('subjects')?'Struktur Akademik':key.startsWith('products')?'Produk & Layanan':key.startsWith('qr_')?'QR & QRIS':'Pengaturan';}
export function recordValidation(module:string,value:Row){const r=validationRecord(module,value),issues:ValidationIssue[]=[],required=new Set<string>();const draft=['draft','archived'].includes(r.status||'draft');
 const label=(key:string)=>validationFields(module).find(f=>f.key===key)?.label||key;
 const add=(key:string,message:string,technical=false,isRequired=false,customLabel?:string)=>{if(issues.some(i=>i.field===key))return;const section=fieldLocation(module,key);issues.push({field:key,label:customLabel||label(key),section,tab:module==='hero_slides'?['Konten Hero','Media Hero','Tombol Aksi','Tampilan Hero','Status'].indexOf(section):0,itemId:r.id,message,severity:technical||!draft?'error':'warning',technical,required:isRequired});};
 const need=(key:string,text=label(key),technical=false)=>{required.add(key);if(!String(r[key]??'').trim())add(key,`${text} belum ${/image|pdf|Id|Url/.test(key)?'dipilih':'diisi'}.`,technical,true,text);};
 if(module!=='donation_accounts')need('title',module==='hero_slides'?'Judul hero':contentSchema[module]?.sections[0]?.fields[0]?.label||institutionSchema[module]?.sections[0]?.fields[0]?.label||'Judul / nama',true);
 if(module==='hero_slides'){
  need('image','Gambar hero desktop');for(const key of ['primary','secondary'])if(r[key+'Type']!=='none'){const title=key==='primary'?'Tombol Utama':'Tombol Kedua';need(key+'Text',`Teks ${title}`);need(key+'Url',`Halaman tujuan tombol “${r[key+'Text']||title}”`);}
 }
 if(module==='menu_items'&&r.targetType!=='dropdown')need('url','Tujuan menu');
 if(module==='footer_links'&&['link','social'].includes(r.kind)&&!r.useCentral)need('url','URL '+(r.title||'tautan footer'));
 if(module==='home_sections'&&!['hero','footer'].includes(r.section)){if(r.source==='category')need('categoryId','Kategori berita');if(r.showAll&&['cta','custom'].includes(r.section))need('url','Tujuan tombol Lihat semua');}
 if(module==='posts'){need('image','Foto utama berita');if(r.status==='scheduled')need('publishAt','Tanggal dan waktu publikasi');}
 if(module==='galleries')need('image','Foto sampul album');
 if(module==='library_items'&&r.access==='Publik'){if(r.source!=='Tautan eksternal')need('pdf','Berkas PDF');if(r.source!=='Upload file')need('externalUrl','Tautan eksternal');}
 if(module==='academics')need('level','Jenjang');
 if(module==='program_highlights'&&!['','Tanpa tombol','Lihat detail'].includes(r.ctaType||'')&&!(r.ctaType==='Hubungi'&&r.whatsapp))need('ctaUrl','Tujuan tombol');
 if(module==='donation_updates')need('programId','Program donasi');
 if(module==='donation_accounts'){for(const [key,text] of [['bank','Nama bank'],['number','Nomor rekening'],['holder','Atas nama']])need(key,text,true);if(r.qr_enabled){need('qr_type','Jenis QR');need('qr_image','Gambar QR');}}
 if(module==='announcements'){if(!r.untilRevoked)need('endsAt','Waktu berakhir');if(r.audience==='Unit tertentu')need('unitId','Unit pendidikan tujuan');}
 if(['agendas','academic_calendars'].includes(module)){need('date','Tanggal mulai');if(!r.allDay){need('startTime','Jam mulai');need('endTime','Jam selesai');}}
 for(const f of validationFields(module)){
  if(contentSchema[module]&&!contentFieldVisible(module,f.key,r)||informationSchema[module]&&!informationFieldVisible(module,f.key,r))continue;
  if(module==='hero_slides'&&/^(primary|secondary)(Text|Url)$/.test(f.key)&&r[f.key.startsWith('primary')?'primaryType':'secondaryType']==='none')continue;
  if(f.key==='ctaUrl'&&['','Tanpa tombol','Lihat detail'].includes(r.ctaType||''))continue;
  const v=String(r[f.key]??'').trim();if(!v)continue;
  if(f.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))add(f.key,`${f.label} harus berupa alamat email yang valid.`,true);
  if((f.type==='url'||/Url$/.test(f.key)||f.key==='url')&&!/^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*|mailto:[^\s@]+@[^\s@]+|tel:\+?[\d ()-]+)$/.test(v))add(f.key,`${f.label} harus berupa URL HTTP/HTTPS atau alamat halaman yang valid.`,true);
  if(/whatsapp/i.test(f.key)&&f.type!=='checkbox'&&f.key!=='whatsappMessage'&&!/^(?:\+?62|0)\d{7,13}$/.test(v.replace(/[\s()-]/g,'')))add(f.key,`${f.label} harus menggunakan nomor valid, misalnya 08… atau 62….`,true);
  if(['date','datetime-local'].includes(f.type||'')&&!Number.isFinite(Date.parse(v)))add(f.key,`${f.label} harus berupa tanggal yang valid.`,true);
  if(f.type==='number'&&!Number.isFinite(Number(v)))add(f.key,`${f.label} harus berupa angka.`,true);
 }
 for(const prefix of ['primary','secondary','']){const type=r[prefix?prefix+'Type':'targetType'],key=prefix?prefix+'Url':'url',v=r[key];if(!v||type==='none'||type==='dropdown')continue;if(type==='external'&&!/^https?:\/\/[^\s]+$/i.test(v))add(key,'URL eksternal harus menggunakan HTTP atau HTTPS.',true);if(type==='whatsapp'&&!/^https:\/\/wa\.me\/\d{8,15}(?:\?|$)/.test(v))add(key,'Nomor WhatsApp tujuan harus valid.',true);if(['registration','donation','internal','module'].includes(type)&&!/^\/(?!\/)/.test(v))add(key,'Pilih halaman tujuan internal dari daftar.',true);}
 for(const [start,end] of [['date','endDate'],['startsAt','endsAt'],['startDate','endDate']])if(r[start]&&r[end]&&r[end]<r[start])add(end,`${end==='endDate'?'Tanggal selesai':label(end)} harus setelah ${label(start).toLowerCase()}.`,true);
 if(module==='donation_programs'&&r.target!==''&&r.target!=null&&(!Number.isSafeInteger(Number(r.target))||Number(r.target)<=0))add('target','Target donasi harus berupa rupiah bulat lebih besar dari Rp0. Kosongkan jika tanpa target.',true);

 for(const collection of ['subjects','products'])if(Array.isArray(r[collection])){const seen=new Set();r[collection].forEach((item:Row,index:number)=>{const key=`${collection}.${item.id||index}.name`,title=collection==='subjects'?'Mata pelajaran':'Produk/layanan';required.add(key);if(!String(item.name||'').trim())add(key,`${title} ke-${index+1} belum memiliki nama.`,true,true,`${title} ke-${index+1}`);else if(seen.has(item.name.trim().toLowerCase()))add(key,`${title} “${item.name}” memiliki nama yang berulang.`,true,false,item.name);seen.add(String(item.name||'').trim().toLowerCase());});}
 return {issues,required:[...required],complete:required.size-issues.filter(i=>required.has(i.field)).length};
}
export function blockingIssues(module:string,r:Row){return recordValidation(module,r).issues.filter(i=>i.technical||!['draft','archived'].includes(r.status||'draft')).sort((a,b)=>Number(!!b.technical)-Number(!!a.technical));}
export class ValidationFailure extends Error {status=400;issues:ValidationIssue[];constructor(issues:ValidationIssue[]){super(issues[0]?.message||'Periksa isian yang ditandai.');this.issues=issues;}}
