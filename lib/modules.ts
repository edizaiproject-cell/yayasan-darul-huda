import {appearanceFields} from './appearance.ts';
import {contentFields} from './content-schema.ts';
import {institutionFields,academicExtraFields} from './institution-schema.ts';
import {informationFields} from './information-schema.ts';
import {DONATION_CATEGORIES} from './donation-categories.ts';
export type Field = { key: string; label: string; type?: string; options?: string[]; required?: boolean };
export type Module = { title: string; permission: string; fields: Field[]; public?: boolean };
const f = (key:string,label:string,type='text',options?:string[]):Field => ({key,label,type,options});
const content = [f('summary','Ringkasan','textarea'),f('body','Isi','richtext'),f('image','Foto utama','image'),f('alt','Teks alternatif foto')];
const contact = [f('address','Alamat','textarea'),f('email','Email','email'),f('phone','Telepon'),f('whatsapp','Nomor WhatsApp'),f('website','Website','url'),f('maps','Tautan Google Maps','url'),f('instagram','Instagram','url'),f('facebook','Facebook','url'),f('youtube','YouTube','url')];
export const modules: Record<string,Module> = {
 hero_slides:{title:'Hero Beranda',permission:'appearance.manage',public:true,fields:appearanceFields.hero_slides},
 program_highlights:{title:'Program unggulan',permission:'institution.manage',public:true,fields:institutionFields('program_highlights')},
 pages:{title:'Profil & halaman',permission:'institution.manage',public:true,fields:institutionFields('pages')},
 education_units:{title:'Unit pendidikan',permission:'institution.manage',public:true,fields:institutionFields('education_units')},
 posts:{title:'Berita & wawasan',permission:'posts.manage',public:true,fields:contentFields('posts')},
 post_categories:{title:'Kategori berita',permission:'posts.manage',public:true,fields:contentFields('post_categories')},
 galleries:{title:'Album galeri',permission:'gallery.manage',public:true,fields:contentFields('galleries')},
 library_items:{title:'Pustaka',permission:'content.manage',public:true,fields:contentFields('library_items')},
 business_units:{title:'Usaha Ma’had',permission:'institution.manage',public:true,fields:institutionFields('business_units')},
 academics:{title:'Akademik & kurikulum',permission:'institution.manage',public:true,fields:[f('level','Jenjang'),f('year','Tahun ajaran / tahun aktif'),...content,f('subjects','Mata pelajaran','academicSubjects'),f('structureNotes','Catatan struktur kurikulum','textarea'),f('pdf','Dokumen kurikulum','document'),f('scheduleUrl','Tautan jadwal pembelajaran','url'),...academicExtraFields]},
 registrations:{title:'Pendaftaran',permission:'information.manage',public:true,fields:informationFields('registrations')},
 announcements:{title:'Pengumuman',permission:'information.manage',public:true,fields:informationFields('announcements')},
 agendas:{title:'Agenda',permission:'information.manage',public:true,fields:informationFields('agendas')},
 academic_calendars:{title:'Kalender pendidikan',permission:'information.manage',public:true,fields:informationFields('academic_calendars')},
 donation_programs:{title:'Program donasi',permission:'donations.manage',public:true,fields:[f('category','Kategori Donasi','select',DONATION_CATEGORIES),...content,f('background','Latar belakang','textarea'),f('purpose','Tujuan','textarea'),f('beneficiaries','Penerima manfaat','textarea'),f('target','Target dana (Rp)','number'),f('startDate','Tanggal mulai','date'),f('endDate','Tanggal selesai','date'),f('accountId','Rekening khusus (kosong = global)','relation:donation_accounts'),f('adminName','Admin konfirmasi'),f('whatsapp','WhatsApp konfirmasi'),f('priority','Tampil prioritas','checkbox'),f('urgent','Mendesak','checkbox'),f('photos','Dokumentasi','photos')]},
 donation_transactions:{title:'Transaksi donasi',permission:'donations.transaction',fields:[f('programId','Program','relation:donation_programs'),f('date','Tanggal','date'),f('kind','Jenis','select',['Pemasukan','Koreksi']),f('amount','Nominal (koreksi dapat negatif)','number'),f('donor_name','Nama donatur'),f('donor_phone','Nomor WhatsApp / Telepon'),f('accountId','Rekening tujuan','relation:donation_accounts'),f('source_page','Sumber halaman'),f('anonymous','Anonim','checkbox'),f('publicName','Izinkan nama tampil publik','checkbox'),f('note','Keterangan / alasan koreksi','textarea'),f('proof','Bukti privat','privatefile')]},
 donation_updates:{title:'Perkembangan donasi',permission:'donations.manage',public:true,fields:[f('document','Dokumen pendukung (PDF)','file'),f('publishAt','Tanggal publikasi','datetime-local'),f('programId','Program','relation:donation_programs'),f('date','Tanggal','date'),...content,f('progress','Progres fisik (%)','number'),f('photos','Dokumentasi','photos')]},
 donation_accounts:{title:'Rekening Donasi',permission:'donations.manage',public:true,fields:[f('bank','Bank'),f('number','Nomor rekening'),f('holder','Nama pemilik'),f('logo','Logo bank (opsional)','image'),f('qr_enabled','Gunakan QR / QRIS','checkbox'),f('qr_type','Jenis QR','select',['QRIS','QR Rekening','QR Pembayaran Lainnya']),f('qr_image','Gambar QR','image'),f('qr_title','Judul QR'),f('qr_description','Keterangan singkat','textarea'),f('qr_active','QR aktif','checkbox'),f('qr_merchant','Nama merchant / lembaga pada QRIS')]},
 site_settings:{title:'Pengaturan website',permission:'settings.manage',public:true,fields:[f('name','Nama lembaga'),f('shortName','Nama singkat'),f('motto','Motto'),f('description','Deskripsi','textarea'),f('logo','Logo','image'),f('favicon','Favicon','image'),...contact,f('mapsEmbed','URL embed Google Maps (opsional, bukan kode iframe)','url'),f('tiktok','URL TikTok','url'),f('twitter','URL X / Twitter','url'),f('telegram','URL Telegram','url'),f('whatsappEnabled','WhatsApp mengambang aktif','checkbox'),f('whatsappMessage','Pesan awal WhatsApp (kosong = tanpa pesan)','textarea'),f('donationAdmin','Admin donasi'),f('donationWhatsapp','WhatsApp donasi'),f('donationQris','QRIS utama donasi (opsional)','image'),f('seoTitle','Judul SEO'),f('seoDescription','Deskripsi SEO','textarea'),f('ogImage','Gambar OpenGraph','image'),f('footer','Deskripsi footer','textarea'),f('copyright','Copyright'),f('founded','Tahun berdiri')]},
 home_sections:{title:'Builder Beranda',permission:'appearance.manage',public:true,fields:appearanceFields.home_sections},
 menu_items:{title:'Pengelola Menu Navigasi',permission:'appearance.manage',public:true,fields:appearanceFields.menu_items},
 footer_links:{title:'Tautan Footer',permission:'appearance.manage',public:true,fields:appearanceFields.footer_links}
};
export const allPermissions=[...new Set(Object.values(modules).map(m=>m.permission)),'users.manage','media.manage','audit.read','posts.publish'];
export const roleDefaults: Record<string,string[]> = {
 'Super Admin':allPermissions,
 'Admin Website':allPermissions.filter(p=>p!=='users.manage'),
 'Editor Berita':['posts.manage','posts.publish','media.manage'],
 'Admin Donasi':['donations.manage','donations.transaction','media.manage'],
 'Admin Galeri':['gallery.manage','media.manage']
};
export function slugify(s:string){return s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
export const money=(v:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);


