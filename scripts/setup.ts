import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { db, initializeRoles, createUser, saveRecord } from '../lib/database.ts';
initializeRoles();
const lines=readFileSync('source-reference/document-content.txt','utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const segment=(a:string,b:string)=>lines.slice(lines.indexOf(a)+1,lines.indexOf(b)).filter(s=>!s.startsWith('[Gambar:'));
const html=(v:string[])=>v.map(s=>`<p>${s.replaceAll('dua nangan kementrian, Kementrian Pendidikan dan Kementrian Agam','naungan dua kementerian, Kementerian Pendidikan dan Kementerian Agama').replaceAll('bercita cita','bercita-cita').replaceAll('masa dating','masa datang').replaceAll('di harapkan','diharapkan').replaceAll('status social','status sosial').replaceAll('&','&amp;').replaceAll('<','&lt;')}</p>`).join('');
function seed(name:string,title:string,data:any={},slug?:string){const key=slug||title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const old=db.prepare(`SELECT id FROM ${name} WHERE slug=?`).get(key) as any;if(old)return old.id;return saveRecord(name,{title,slug:key,status:'published',sort_order:name==='pages'?Math.max(0,['tentang','sejarah','visi-misi','struktur-organisasi'].indexOf(key)):0,...data},'seed').id;}
const address='Jl. Tan Malaka, Km14 Danguang-Danguang, Kec. Guguak, Kab. Lima Puluh Kota, Sumatera Barat.';
const description='Ma’had Al-Qur’an Darul Huda memadukan pendidikan Al-Qur’an, ilmu keislaman, bahasa Arab, serta pendidikan umum dengan biaya yang terjangkau.';
seed('site_settings','Identitas Darul Huda',{name:'Ma’had Al-Qur’an Darul Huda',shortName:'DARUL HUDA',motto:'إيمان - علم - عمل - دعوة – جهاد',description,address,phone:'(0752)97601',email:'mahadalqurandarulhuda@gmail.com',logo:'/media/image1.png',favicon:'/media/image1.png',ogImage:'/media/image2.webp',donationAdmin:'Dewi Novita',founded:'2014',footer:description,seoTitle:'Ma’had Al-Qur’an Darul Huda',seoDescription:description},'utama');
seed('pages','Tentang Ma’had',{summary:description,body:html(segment('Deskripsi singkat Ma’had','Foto utama')),image:'/media/image2.webp',alt:'Gedung Ma’had Al-Qur’an Darul Huda'},'tentang');
seed('pages','Sejarah Darul Huda',{body:html(segment('Narasi','Tahun berdiri'))},'sejarah');
seed('pages','Visi, Misi & Tujuan',{body:'<h2>Visi</h2>'+html(segment('Visi','Misi'))+'<h2>Misi</h2>'+html(segment('Misi','Tujuan'))+'<h2>Tujuan</h2>'+html(segment('Tujuan','A.2. Struktur Organisasi'))},'visi-misi');
seed('pages','Struktur Organisasi',{image:'/media/image3.webp',alt:'Struktur organisasi Ma’had Al-Qur’an Darul Huda'},'struktur-organisasi');
const units=[
 ['RTQ Darul Huda','RTQ','2014','','','image4.jpeg','',address,''],
 ['SD Islam Al-Kuttab','SD','23 November 2015','69948967','B','image5.webp','sdi.alkuttab@gmail.com',address,'369/HO/BPMPPT-LK/XI/2015'],
 ['SD Islam Al-Kuttab Batang Kariang','SD','2021','70038089','','image6.jpeg','alkuttab.batangkariang@gmail.com','Jl. Lintas Kiliran Jao-Teluk Kuantan KM. 17 Batang Kariang, Kec. Kamang Baru, Kab. Sijunjung, Prov. Sumatera Barat, Kode Pos 27572','188.45/037/VIII/DPMPTSP/2022'],
 ['SD Islam Al Kuttab 1 Mangorut','SD','01 Juni 2018','70039562','C','image7.jpeg','','Dusun Mangorut Desa Madobag, Kec. Siberut Selatan, Kab. Kepulauan Mentawai, Prov. Sumatera Barat','004/Y-MDK/01/0/2018'],
 ['SMP Islam Al Aqsha','SMP','2021','70037411','B','image8.jpeg','smp.islam.al.aqsha@gmail.com',address,''],
 ['SMA Islam Al Aqsha','SMA','2025','70057037','Belum Terakreditasi','image9.jpeg','smaislamalaqsha@gmail.com',address,''],
 ['Pesantren Ma’had Al-Qur’an Darul Huda','Pesantren','','510213070018','','image10.jpeg','mahadalqurandarulhuda@gmail.com',address,'']
];
units.forEach(([title,level,founded,npsn,accreditation,image,email,address,foundingDecree],i)=>seed('education_units',title,{level,founded,npsn,accreditation,image:'/media/'+image,alt:title,email,address,foundingDecree,sort_order:i,...(i===1?{operatingDecree:'420/127/3/DPK-LK/I-2020',accreditationDecree:'260/BAN-PROV/SK/X/2018'}:{})}));
['Koperasi Pesantren','Depot Air Minum','Penggilingan Padi','DH Store'].forEach((title,i)=>seed('business_units',title,{image:`/media/image${i+11}.jpeg`,alt:title,sort_order:i}));
const academicStart=lines.indexOf('A.9. Akademik & Kurikulum');const end=lines.indexOf('F.1. Galeri Kegiatan Santri');const academic=lines.slice(academicStart,end);
['SD','SMP','SMA'].forEach((level,i,all)=>{const start=academic.indexOf(level);const stop=i<2?academic.indexOf(all[i+1]):academic.lastIndexOf('GALERI');seed('academics','Kurikulum '+level,{level,body:html(academic.slice(start+1,stop).filter(Boolean)),sort_order:i});});
['Berita','Artikel','Dunia Islam','Tokoh Kita','Urang Awak','Ulama Muslimin','Sejarah','Minangkabau'].forEach((title,i)=>seed('post_categories',title,{sort_order:i}));
[['BSI','9005559930'],['BNI','738384760'],['BRI','0256 01002137309']].forEach(([bank,number],i)=>seed('donation_accounts',bank,{bank,number,holder:"Ma'had Alquran Darul Huda",sort_order:i}));
['Pembangunan Asrama','Pembangunan Perpustakaan','Program Anak Asuh','Pembebasan Lahan','Pembangunan Masjid','Dakwah Mentawai','Santri Yatim dan Duafa','Penyaluran Zakat Mal, Fitrah, Fidyah','Operasional Pesantren'].forEach((title,i)=>seed('donation_programs',title,{status:'active',sort_order:i,adminName:'Dewi Novita',priority:i<3,target:null}));
seed('hero_slides','Ma’had Al-Qur’an Darul Huda',{summary:description,image:'/media/image2.webp',alt:'Gedung Ma’had dengan latar perbukitan Sumatera Barat',focus:'center',mobileImage:'/media/hero-mobile.webp',primaryText:'Kenali Darul Huda',primaryUrl:'/profil/tentang',secondaryText:'Unit Pendidikan',secondaryUrl:'/pendidikan',kind:'Umum'},'selamat-datang');
['tentang','pendidikan','program','donasi','berita','galeri','informasi','pendaftaran','statistik','kontak'].forEach((section,i)=>seed('home_sections',section,{section,sort_order:i}));
[['Beranda','/'],['Profil','/profil/tentang'],['Pendidikan','/pendidikan'],['Berita & Wawasan','/berita'],['Galeri','/galeri'],['Informasi','/informasi'],['Pustaka','/pustaka']].forEach(([title,url],i)=>seed('menu_items',title,{url,sort_order:i}));
[['Sejarah','/profil/sejarah','Profil'],['Visi, Misi & Tujuan','/profil/visi-misi','Profil'],['Struktur Organisasi','/profil/struktur-organisasi','Profil'],['Usaha Ma’had','/usaha','Profil'],['Akademik & Kurikulum','/akademik','Profil'],['Hubungi Kami','/kontak','Profil'],['Akademik & Kurikulum','/akademik','Pendidikan']].forEach(([title,url,parent],i)=>seed('menu_items',title,{url,parent,sort_order:i},`${parent.toLowerCase()}-${i}`));
[['Profil Ma’had','/profil/tentang'],['Unit Pendidikan','/pendidikan'],['Donasi','/donasi'],['Hubungi Kami','/kontak']].forEach(([title,url],i)=>seed('footer_links',title,{url,sort_order:i}));
for(const file of readdirSync('public/media')){const url='/media/'+file;if(!db.prepare('SELECT id FROM media WHERE url=?').get(url))db.prepare('INSERT INTO media(id,title,url,mime,size,private,created_at) VALUES(?,?,?,?,?,?,?)').run(crypto.randomUUID(),file,url,file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg',statSync('public/media/'+file).size,0,new Date().toISOString());}
const email=process.env.ADMIN_EMAIL||'admin@darulhuda.local';
if(!db.prepare('SELECT id FROM users WHERE email=?').get(email)){
 const password=process.env.ADMIN_PASSWORD||('Dh!'+randomBytes(15).toString('base64url')+'9a');
 await createUser({email,password,name:'Admin Darul Huda',role_id:'Super Admin'},'setup');
 console.log('Akun development dibuat. Email: '+email+' | Password: '+password);
}else console.log('Akun sudah ada; password tidak diubah.');
console.log('Seeder selesai. Data yang sudah ada dipertahankan.');

[['Al-Qur’an','Mencintai, menghafal, memahami, dan mengamalkan Al-Qur’an.'],['Ilmu & Bahasa','Memadukan ilmu keislaman, bahasa Arab, dan pendidikan umum.'],['Akhlak & Pengabdian','Membangun kemandirian, kepedulian sosial, serta semangat berdakwah.']].forEach(([title,summary],i)=>seed('program_highlights',title,{summary,sort_order:i}));

seed('galleries','Unit Pendidikan Darul Huda',{category:'Unit Pendidikan',image:'/media/image4.jpeg',alt:'RTQ Darul Huda',summary:'Dokumentasi unit pendidikan dari profil Ma’had Al-Qur’an Darul Huda.',photos:units.map(([title,,,,,file])=>({url:'/media/'+file,caption:title}))},'unit-pendidikan-darul-huda');
