import type {Field} from './modules.ts';
type Row=Record<string,any>;
const f=(key:string,label:string,type='text',options?:string[]):Field=>({key,label,type,options});
const section=(title:string,fields:Field[])=>({title,fields});
const summary=f('summary','Ringkasan','textarea'),body=f('body','Isi lengkap','richtext'),alt=f('alt','Teks alternatif'),photos=f('photos','Foto dokumentasi','photos');
const display=[f('showPublic','Tampilkan di website','checkbox'),f('featured','Jadikan unggulan','checkbox')];
export const contentSchema:Record<string,{title:string;route:string;sections:{title:string;fields:Field[]}[]}>= {
 posts:{title:'Tulisan',route:'berita',sections:[
  section('Informasi Tulisan',[f('title','Judul'),f('kind','Jenis konten','select',['Berita','Artikel','Wawasan','Opini','Liputan','Kegiatan','Lainnya']),f('categoryId','Kategori','relation:post_categories'),f('authorId','Penulis terdaftar'),f('author','Nama penulis'),f('publishAt','Tanggal publikasi','datetime-local'),f('tags','Tag')]),
  section('Isi Tulisan',[summary,body]),section('Media & Lampiran',[f('image','Foto utama','image'),alt,photos,f('pdf','Lampiran dokumen','document')]),
  section('SEO & Mesin Pencari',[f('seoTitle','Judul SEO'),f('seoDescription','Deskripsi SEO','textarea'),f('ogImage','Gambar sosial / OG (opsional)','image')]),
  section('Status & Publikasi',[f('status','Status','select',['draft','scheduled','published','archived']),f('showOnHome','Tampilkan di beranda','checkbox'),f('featured','Jadikan unggulan','checkbox'),f('pinned','Pin di bagian atas','checkbox'),f('sort_order','Urutan unggulan','number')])]},
 post_categories:{title:'Kategori',route:'',sections:[section('Informasi Kategori',[f('title','Nama kategori'),f('summary','Deskripsi singkat','textarea')]),section('Tampilan Kategori',[f('color','Warna aksen','color')]),section('Status & Urutan',[f('status','Status','select',['published','draft']),f('sort_order','Urutan tampil','number')])]},
 galleries:{title:'Album',route:'galeri',sections:[section('Informasi Album',[f('title','Nama album'),f('category','Kategori album','select',['Kegiatan','Pendidikan','Santri','Pengajian','Sosial','Prestasi','Pembangunan','Lainnya','PBM','Kegiatan Santri','Ramadhan','Bakti Masyarakat','Unit Pendidikan','Outbound','Olahraga','Karya Santri','Religi','Guru/Ustaz']),f('date','Tanggal kegiatan','date'),f('location','Lokasi'),f('unitId','Unit terkait','relation:education_units'),summary]),section('Foto & Dokumentasi',[photos,f('image','Foto sampul album','image'),alt]),section('Keterangan Album',[f('body','Cerita kegiatan (opsional)','richtext'),f('source','Sumber dokumentasi'),f('photographer','Fotografer')]),section('Status & Tampilan',[f('status','Status','select',['draft','published','archived']),f('showPublic','Tampilkan di Galeri','checkbox'),f('showOnHome','Tampilkan di beranda','checkbox'),f('featured','Album unggulan','checkbox')])]},
 library_items:{title:'Pustaka',route:'pustaka',sections:[section('Informasi Pustaka',[f('title','Judul'),f('kind','Jenis pustaka','select',['Buku','E-book','Modul','Artikel','Jurnal','Makalah','Panduan','Dokumen','Materi Kajian','Lainnya']),f('category','Kategori'),summary]),section('Data Bibliografi',[f('author','Penulis'),f('publisher','Penerbit'),f('year','Tahun terbit','number'),f('city','Kota terbit'),f('isbn','ISBN / ISSN'),f('edition','Edisi'),f('language','Bahasa'),f('pages','Jumlah halaman','number'),f('journal','Nama jurnal'),f('volume','Volume'),f('issue','Nomor jurnal'),f('doi','DOI / URL')]),section('File & Akses',[f('source','Sumber pustaka','select',['Upload file','Tautan eksternal','Keduanya']),f('pdf','Berkas PDF','file'),f('externalUrl','Tautan eksternal','url'),f('linkText','Teks tombol'),f('access','Akses','select',['Publik','Hanya informasi']),f('allowDownload','Download diperbolehkan','checkbox')]),section('Sampul Pustaka',[f('image','Sampul buku / dokumen','image'),alt]),section('Status & Tampilan',[f('status','Status','select',['draft','published','archived']),...display.map(field=>field.key==='showPublic'?{...field,label:'Tampilkan di Pustaka'}:field),f('sort_order','Urutan tampil','number')])]}
};
export function contentFields(name:string){return contentSchema[name].sections.flatMap(s=>s.fields).filter(f=>!['title','status','sort_order'].includes(f.key)).concat(name==='library_items'?[body]:[]);}
export function contentDefaults(name:string,r:Row):Row {
 const defaults:Row=name==='posts'?{kind:'Berita',showOnHome:true,featured:false,pinned:false}:name==='post_categories'?{color:'#155e49'}:name==='galleries'?{showPublic:true,showOnHome:true,featured:false}:{kind:'Buku',source:r.pdf?'Upload file':r.externalUrl?'Tautan eksternal':'Upload file',access:r.pdf||r.externalUrl?'Publik':'Hanya informasi',allowDownload:true,showPublic:true,featured:false};
 return {...defaults,...r};
}
export function contentFieldVisible(name:string,key:string,r:Row){
 if(name==='posts')return key==='author'?!r.authorId:key==='sort_order'?!!r.featured:true;
 if(name!=='library_items')return true;
 if(['journal','volume','issue','doi'].includes(key))return r.kind==='Jurnal';
 if(['city','isbn','edition','publisher'].includes(key))return ['Buku','E-book','Jurnal','Modul','Panduan'].includes(r.kind);
 if(key==='pdf')return r.source!=='Tautan eksternal';
 if(['externalUrl','linkText'].includes(key))return r.source!=='Upload file';
 if(key==='allowDownload')return r.access==='Publik'&&r.source!=='Tautan eksternal';
 return true;
}
export function publicLibrary(r:Row){return {...r,pdf:r.access==='Publik'&&r.allowDownload&&r.source!=='Tautan eksternal'?r.pdf:'',externalUrl:r.access==='Publik'&&r.source!=='Upload file'?r.externalUrl:''};}
export function validateContent(name:string,r:Row){
 if(name==='post_categories'&&r.color&&!/^#[0-9a-f]{6}$/i.test(r.color))throw new Error('Warna aksen harus berupa warna HEX.');
 if(name==='library_items'){
  for(const key of ['year','pages'])if(r[key]!=null&&(!Number.isSafeInteger(r[key])||r[key]<1||r[key]>(key==='year'?9999:100000)))throw new Error('Tahun dan jumlah halaman harus angka bulat positif.');
  if(r.externalUrl&&!/^https?:\/\/[^\s]+$/i.test(r.externalUrl))throw new Error('Tautan eksternal harus menggunakan HTTP atau HTTPS.');
  if(r.status==='published'&&r.access==='Publik'){
   if(r.source!=='Tautan eksternal'&&!r.pdf)throw new Error('Pilih file PDF atau gunakan akses Hanya informasi.');
   if(r.source!=='Upload file'&&!r.externalUrl)throw new Error('Isi tautan eksternal atau gunakan akses Hanya informasi.');
  }
 }
}
