export type ReportField={key:string;label:string;type:'text'|'textarea'|'number'|'date'|'select'|'richtext'|'image'|'photos'|'file';group:string;options?:string[];unit?:string;integer?:boolean;required?:boolean;hidden?:boolean;custom?:boolean};
type Row=Record<string,any>;
export const PROGRAM_TYPES=[['physical','Pembangunan / Fisik'],['education','Pendidikan'],['social','Anak Yatim / Sosial'],['food','Pangan'],['health','Kesehatan'],['goods','Wakaf / Pengadaan Barang'],['event','Kegiatan / Event'],['general','Umum / Lainnya'],['custom','Jenis sendiri']] as const;
export function programType(p?:Row){return PROGRAM_TYPES.some(([key])=>key===p?.programType)?p!.programType:'general';}
export function programTypeLabel(p?:Row){return programType(p)==='custom'?(p?.customProgramType||'Jenis sendiri'):PROGRAM_TYPES.find(([key])=>key===programType(p))![1];}
const f=(key:string,label:string,group:string,type:ReportField['type']='text',extra:Partial<ReportField>={}):ReportField=>({key,label,group,type,...extra});
const n=(key:string,label:string,group:string,unit=''):ReportField=>f(key,label,group,'number',{integer:true,unit});
const usage=(label='Dana digunakan (Rp)')=>[n('amountUsed',label,'Keuangan','rupiah'),f('usageNotes','Keterangan penggunaan dana','Keuangan','textarea')];
const location=f('location','Lokasi penyaluran','Penerima & Penyaluran');
const beneficiaries=n('recipientCount','Jumlah penerima manfaat','Penerima & Penyaluran','orang');
const period=f('period','Periode bantuan','Penerima & Penyaluran');
export const REPORT_TEMPLATES:Record<string,ReportField[]>={
 physical:[f('progress','Progres fisik (%)','Progres Pembangunan','number',{unit:'%'}),f('stage','Tahap pekerjaan','Progres Pembangunan','select',{options:['Pondasi','Struktur','Dinding','Atap','Finishing','Selesai']}),f('latestWork','Kondisi / pekerjaan terbaru','Progres Pembangunan','textarea'),f('nextWork','Target pekerjaan berikutnya','Progres Pembangunan','textarea'),...usage()],
 social:[{...beneficiaries,label:'Jumlah penerima / anak'},f('recipientGroup','Kelompok penerima','Penerima & Penyaluran'),location,f('aidType','Bentuk bantuan','Penerima & Penyaluran','select',{options:['Uang tunai','Sembako','Perlengkapan sekolah','Pakaian','Makanan','Kebutuhan lainnya']}),period,...usage('Nominal disalurkan (Rp)')],
 education:[f('period','Semester / periode','Penerima & Pendidikan'),n('recipientCount','Jumlah penerima beasiswa','Penerima & Pendidikan','orang'),f('educationLevel','Jenjang pendidikan','Penerima & Pendidikan'),f('institution','Institusi / sekolah','Penerima & Pendidikan'),f('aidType','Jenis bantuan','Penerima & Pendidikan','select',{options:['SPP','Uang sekolah','Buku','Seragam','Perlengkapan','Biaya pendidikan lainnya']}),f('impact','Perkembangan penerima','Dampak','textarea'),...usage('Nominal disalurkan (Rp)')],
 food:[location,n('packageCount','Jumlah paket','Penerima & Penyaluran','paket'),{...beneficiaries,unit:'keluarga'},f('aidType','Jenis bantuan pangan','Penerima & Penyaluran'),...usage('Nilai penyaluran (Rp)')],
 health:[f('aidType','Jenis bantuan','Informasi Bantuan'),n('recipientCount','Jumlah penerima / pasien','Informasi Bantuan','orang'),f('facility','Fasilitas kesehatan','Informasi Bantuan'),f('careStatus','Status bantuan','Informasi Bantuan','select',{options:['Dalam proses','Sedang menjalani perawatan','Selesai','Tindak lanjut']}),...usage('Nominal bantuan (Rp)')],
 goods:[f('itemType','Jenis barang','Pengadaan'),n('targetCount','Target jumlah','Pengadaan','barang'),n('availableCount','Jumlah sudah tersedia','Pengadaan','barang'),n('distributedCount','Jumlah sudah disalurkan','Pengadaan','barang'),{...location,label:'Lokasi distribusi',group:'Pengadaan'},...usage()],
 event:[f('eventName','Nama kegiatan','Pelaksanaan'),f('location','Lokasi kegiatan','Pelaksanaan'),n('participantCount','Jumlah peserta','Pelaksanaan','orang'),f('eventStatus','Status kegiatan','Pelaksanaan','select',{options:['Persiapan','Berjalan','Selesai']}),...usage()],
 general:[f('outcome','Hasil / capaian','Hasil Program','textarea'),{...beneficiaries,group:'Hasil Program'},...usage()]
};
const shared:ReportField[]=[f('summary','Ringkasan perkembangan','Cerita & Dokumentasi','textarea'),f('body','Cerita / dampak bantuan','Cerita & Dokumentasi','richtext'),f('image','Foto perkembangan','Cerita & Dokumentasi','image'),f('alt','Teks alternatif foto','Cerita & Dokumentasi'),f('photos','Galeri dokumentasi','Cerita & Dokumentasi','photos'),f('document','Dokumen pendukung','Cerita & Dokumentasi','file')];
export const SHARED_REPORT_KEYS=new Set(['progress',...shared.map(f=>f.key)]);
export function reportFields(program?:Row,includeHidden=false):ReportField[]{
 const kind=programType(program),settings=program?.reportSettings||{};
 const base=[...(REPORT_TEMPLATES[kind]||REPORT_TEMPLATES.general),...shared].map(field=>({...field,...(settings.fields?.[field.key]||{})}));
 if(kind==='social'){const recipient=base.find(f=>f.key==='recipientCount');if(recipient){recipient.label=/yatim/i.test(program?.title||'')?'Jumlah anak':'Jumlah penerima manfaat';recipient.unit=/yatim/i.test(program?.title||'')?'anak':'orang';}}
 const image=base.find(f=>f.key==='image');if(image)image.label=({social:'Foto penyaluran',education:'Foto kegiatan pendidikan',food:'Foto distribusi',health:'Dokumentasi bantuan',goods:'Foto pengadaan / distribusi',event:'Foto kegiatan'} as Record<string,string>)[kind]||image.label;
 const custom=(Array.isArray(settings.custom)?settings.custom:[]).map((field:ReportField)=>({...field,group:'Indikator Tambahan',custom:true}));
 return [...base,...custom].filter(field=>includeHidden||!field.hidden);
}
export function reportValue(report:Row,field:ReportField){return field.custom?report.reportValues?.[field.key]:SHARED_REPORT_KEYS.has(field.key)?report[field.key]:report.reportValues?.[field.key];}
export function validReportDate(value:any){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function reportErrors(program:Row,report:Row){
 const errors:{field:string;label:string;message:string}[]=[];
 const add=(field:string,label:string,message:string)=>errors.push({field,label,message});
 if(!validReportDate(report.date))add('date','Tanggal perkembangan','Tanggal perkembangan harus valid.');
 for(const field of reportFields(program)){
  const value=reportValue(report,field),key=SHARED_REPORT_KEYS.has(field.key)?field.key:'reportValues.'+field.key;
  const empty=value==null||value===''||Array.isArray(value)&&value.length===0||field.type==='richtext'&&!String(value).replace(/<[^>]*>/g,'').trim();
  if(empty){if(field.required)add(key,field.label,field.label+' wajib diisi.');continue;}
  if(field.type==='number'&&(!Number.isFinite(Number(value))||Number(value)<0||field.integer&&!Number.isSafeInteger(Number(value))))add(key,field.label,field.label+' harus berupa angka '+(field.integer?'bulat ':'')+'minimal 0.');
  if(field.key==='progress'&&Number(value)>100)add(key,field.label,'Progres fisik harus antara 0 dan 100.');
  if(field.type==='date'&&!validReportDate(value))add(key,field.label,field.label+' harus berupa tanggal valid.');
  if(field.type==='select'&&!field.options?.includes(String(value)))add(key,field.label,'Pilih '+field.label.toLowerCase()+' yang valid.');
 }
 if(programType(program)==='goods'){
  const v=report.reportValues||{},fields=reportFields(program);
  if(fields.some(f=>f.key==='distributedCount')&&Number(v.distributedCount)>Number(v.availableCount||0))add('reportValues.distributedCount','Jumlah sudah disalurkan','Jumlah disalurkan tidak boleh melebihi jumlah tersedia.');
 }
 return errors;
}
export function normalizeReportSettings(value:any){
 if(value==null||value==='')return {fields:{},custom:[]};
 if(typeof value!=='object'||Array.isArray(value))throw new Error('Pengaturan laporan tidak valid.');
 const fields:Row={};for(const [key,setting] of Object.entries(value.fields||{})){if(!/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)||!setting||typeof setting!=='object')throw new Error('Pengaturan field tidak valid.');fields[key]={hidden:!!(setting as Row).hidden,required:!!(setting as Row).required};}
 if(value.custom!=null&&!Array.isArray(value.custom))throw new Error('Field tambahan tidak valid.');
 if((value.custom||[]).length>30)throw new Error('Maksimal 30 field tambahan.');
 const seen=new Set<string>();const custom=(value.custom||[]).map((field:Row)=>{
  if(!/^custom_[a-zA-Z0-9_-]{1,70}$/.test(field.key)||seen.has(field.key))throw new Error('ID field tambahan tidak valid atau berulang.');seen.add(field.key);
  const label=String(field.label||'').trim();if(!label||label.length>100)throw new Error('Nama field tambahan wajib diisi (maksimal 100 karakter).');
  if(!['text','textarea','number','date'].includes(field.type))throw new Error('Tipe field tambahan tidak valid.');
  return {key:field.key,label,type:field.type,unit:String(field.unit||'').slice(0,40),required:!!field.required,hidden:!!field.hidden,custom:true};
 });return {fields,custom};
}
export function normalizeReportValues(value:any){
 if(value==null||value==='')return {};
 if(typeof value!=='object'||Array.isArray(value)||JSON.stringify(value).length>50000)throw new Error('Nilai laporan tidak valid.');
 const out:Row={};for(const [key,v] of Object.entries(value)){if(!/^[a-zA-Z][\w-]{0,80}$/.test(key)||['__proto__','constructor','prototype'].includes(key)||v!=null&&!['string','number','boolean'].includes(typeof v))throw new Error('Nilai field laporan tidak valid.');out[key]=v;}return out;
}
// Only posted, effective reports affect expenditure. Editing a report replaces its amount.
export function reportFinance(total:number,reports:Row[]){const used=reports.filter(r=>r.status==='published'&&(!r.publishAt||Date.parse(r.publishAt)<=Date.now())).reduce((sum,r)=>sum+Math.max(0,Number(r.reportValues?.amountUsed)||0),0);return {total,used,remaining:total-used};}
// Health narratives and attachments require a deliberate publication consent flag.
export function publicReport(program:Row,report:Row){
 const out:Row={...report,reportValues:{...report.reportValues}};
 const visible=new Set(reportFields(program).map(f=>f.key));
 for(const key of SHARED_REPORT_KEYS)if(!visible.has(key))delete out[key];
 for(const key of Object.keys(out.reportValues))if(!visible.has(key))delete out.reportValues[key];
 if(programType(program)==='health'&&!report.publicContentApproved){
  out.title='Perkembangan bantuan kesehatan';for(const key of ['summary','body','image','alt','photos','document'])delete out[key];
  for(const key of Object.keys(out.reportValues))if(!['recipientCount','amountUsed','careStatus'].includes(key))delete out.reportValues[key];
 }
 return out;
}
