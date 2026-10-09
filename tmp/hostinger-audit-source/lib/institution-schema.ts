import {cardPositionFields} from './card-image.ts';
import type {Field} from './modules.ts';
type Row=Record<string,any>;
const f=(key:string,label:string,type='text',options?:string[]):Field=>({key,label,type,options});
const media=[f('image','Foto utama','image'),f('alt','Teks alternatif foto'),f('photos','Galeri (opsional)','photos')];
const contact=[f('address','Alamat','textarea'),f('whatsapp','Nomor WhatsApp','tel'),f('phone','Telepon','tel'),f('email','Email','email'),f('maps','Link Google Maps','url')];
const display=[f('status','Aktif','publication-toggle'),f('showWebsite','Tampilkan di website','checkbox'),f('showOnHome','Tampilkan di beranda','checkbox'),f('sort_order','Urutan tampil','number')];
export const institutionSchema:Record<string,{title:string;description:string;sections:{title:string;fields:Field[]}[]}>= {
 pages:{title:'Halaman Lembaga',description:'Susun profil dan informasi resmi Ma’had sesuai jenis halamannya.',sections:[
  {title:'Informasi Halaman',fields:[f('title','Judul halaman'),f('kind','Jenis halaman','select',['Profil Ma’had','Sejarah','Visi & Misi','Sambutan','Struktur Organisasi','Fasilitas','Lainnya'])]},
  {title:'Isi Halaman',fields:[f('summary','Ringkasan','textarea'),f('body','Isi lengkap','richtext')]},
  {title:'Media',fields:[...media,f('document','Dokumen pendukung','document')]},
  {title:'Status & Tampilan',fields:[f('status','Status halaman','select',['draft','published','archived']),f('showMenu','Tampilkan di menu profil','checkbox'),f('showOnHome','Tampilkan di beranda','checkbox'),f('sort_order','Urutan tampil','number')]}
 ]},
 education_units:{title:'Unit Pendidikan',description:'Kelola identitas sekolah, informasi akademik, dan layanan unit pendidikan.',sections:[
  {title:'Informasi Unit',fields:[f('title','Nama unit'),f('kind','Jenis unit','select',['TK/RA','SD/MI','SMP/MTs','SMA/MA','Tahfiz','Pesantren','Program nonformal']),f('level','Jenjang pendidikan'),f('summary','Deskripsi singkat','textarea'),f('head','Kepala/Penanggung jawab unit')]},
  {title:'Informasi Akademik',fields:[f('founded','Tahun/tanggal berdiri'),f('curriculumId','Kurikulum yang digunakan','relation:academics'),f('classCount','Jumlah kelas (opsional)','number'),f('studentCount','Jumlah santri/siswa (opsional)','number')]},
  {title:'Kontak & Lokasi',fields:[...contact,f('serviceHours','Jam layanan')]},
  {title:'Media Unit',fields:[f('logo','Logo unit','image'),...media]},
  {title:'Status & Tampilan',fields:display}
 ]},
 program_highlights:{title:'Ilmu & Pengabdian',description:'Jelaskan tujuan program, pelaksanaan, dan cara peserta bergabung.',sections:[
  {title:'Informasi Program',fields:[f('title','Nama program'),f('category','Kategori program','select',['Tahfiz','Bahasa','Akademik','Keagamaan','Keterampilan','Kepemimpinan','Sosial','Lainnya']),f('summary','Ringkasan','textarea'),f('programStatus','Status program','select',['Direncanakan','Akan datang','Berjalan','Selesai','Dihentikan'])]},
  {title:'Isi Program',fields:[f('body','Deskripsi / isi lengkap','richtext'),f('activities','Kegiatan & cakupan program','textarea')]},
  {title:'SEO',fields:[f('seoTitle','SEO title'),f('seoDescription','Meta description','textarea')]},
  {title:'Tujuan & Manfaat',fields:[f('objectives','Tujuan program','textarea'),f('benefits','Manfaat','textarea'),f('audience','Sasaran peserta')]},
  {title:'Pelaksanaan Program',fields:[f('period','Periode'),f('schedule','Hari/jadwal'),f('location','Lokasi'),f('head','Penanggung jawab'),f('method','Metode pelaksanaan','select',['Tatap muka','Online','Hybrid']),f('requirements','Syarat mengikuti program','textarea')]},
  {title:'Media Program',fields:[...media,f('videoUrl','Link video (opsional)','url'),f('brochure','Brosur PDF (opsional)','file')]},
  {title:'Aksi / CTA',fields:[f('ctaType','Tombol tindakan','select',['Tanpa tombol','Daftar','Hubungi','Lihat detail','Link eksternal']),f('ctaUrl','Tautan tujuan','url'),f('whatsapp','WhatsApp untuk dihubungi','tel')]},
  {title:'Status & Tampilan',fields:[f('status','Status publikasi','select',['draft','published','archived']),f('showOnHome','Tampilkan di Dashboard','checkbox'),f('sort_order','Urutan tampil','number')]}
 ]},
 business_units:{title:'Usaha Ma’had',description:'Kelola profil usaha, produk atau layanan, serta cara pelanggan menghubungi Anda.',sections:[
  {title:'Informasi Usaha',fields:[f('title','Nama usaha'),f('kind','Jenis usaha','select',['Toko','Koperasi','Kantin','Percetakan','Jasa','Produk santri','Pertanian','Lainnya']),f('summary','Deskripsi singkat','textarea'),f('head','Penanggung jawab')]},
  {title:'Produk & Layanan',fields:[]},
  {title:'Operasional & Kontak',fields:[f('serviceHours','Jam operasional'),...contact,f('marketplaceUrl','Link marketplace','url'),f('orderUrl','Link pemesanan','url')]},
  {title:'Media Usaha',fields:[f('logo','Logo usaha','image'),...media]},
  {title:'Status & Tampilan',fields:display}
 ]}
};
export const institutionLegacy:Record<string,Field[]>={
 pages:[],
 education_units:[f('body','Penjelasan tambahan','richtext'),f('npsn','NPSN / NSP'),f('accreditation','Akreditasi'),f('foundingDecree','SK pendirian'),f('operatingDecree','SK operasional'),f('accreditationDecree','SK akreditasi'),f('website','Website','url'),f('instagram','Instagram','url'),f('facebook','Facebook','url'),f('youtube','YouTube','url')],
 program_highlights:[],
 business_units:[f('body','Penjelasan usaha lama','richtext'),f('website','Website','url'),f('instagram','Instagram','url'),f('facebook','Facebook','url'),f('youtube','YouTube','url')]
};
export const academicExtraFields=[f('effectiveYear','Tahun mulai berlaku','number'),f('syllabus','Silabus','document'),f('teachingDocument','RPS/RPP/modul','document'),f('objectives','Tujuan kurikulum','textarea'),f('characteristics','Karakteristik','textarea'),f('evaluation','Sistem evaluasi','textarea'),f('notes','Keterangan tambahan','textarea'),f('showWebsite','Tampilkan di halaman Akademik','checkbox')];
export const isInstitution=(name:string)=>!!institutionSchema[name]||name==='academics';
export const institutionFields=(name:string)=>[...institutionSchema[name].sections.flatMap(s=>s.fields).filter(f=>!['title','status','sort_order'].includes(f.key)),...institutionLegacy[name],...(name==='education_units'?cardPositionFields:[])];
export function institutionDefaults(name:string,r:Row):Row{
 const defaults:Row={showWebsite:true,showOnHome:true};
 if(name==='pages'){defaults.kind='Lainnya';defaults.showMenu=true;defaults.showOnHome=r.slug==='tentang';}
 if(name==='program_highlights'){defaults.category='Lainnya';defaults.programStatus='Berjalan';defaults.ctaType='Tanpa tombol';}
 if(name==='business_units'){defaults.products=[];defaults.showOnHome=false;}
 return {...defaults,...r};
}
export function validateInstitution(name:string,r:Row){
 for(const key of ['classCount','studentCount','effectiveYear'])if(r[key]!=null&&(!Number.isSafeInteger(r[key])||r[key]<0))throw new Error('Jumlah dan tahun harus angka bulat, tidak negatif.');
 if(r.effectiveYear!=null&&(r.effectiveYear<1000||r.effectiveYear>9999))throw new Error('Tahun mulai berlaku harus terdiri dari 4 digit.');
 if(r.status!=='draft'&&name==='program_highlights'&&r.ctaType&&r.ctaType!=='Tanpa tombol'&&r.ctaType!=='Lihat detail'&&!r.ctaUrl&&!(r.ctaType==='Hubungi'&&r.whatsapp))throw new Error('Isi tujuan tombol atau nomor WhatsApp yang dihubungi.');
}
