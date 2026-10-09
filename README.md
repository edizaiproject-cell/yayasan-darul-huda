# Website Ma’had Al-Qur’an Darul Huda

Website lokal dengan CMS, database SQLite terpisah, dan PWA. Data lembaga serta gambar berasal dari dokumen Word yang diberikan. Proyek lama tetap berada di `D:\Codex\donasi-laili` dan tidak diubah.

## Membuka website

- Website: http://localhost:5174/
- CMS: http://localhost:5174/admin
- Folder proyek: `D:\Dokumen\ChatGPT\Website Darul Huda Pyk`

Akun awal: `admin@darulhuda.local`. Kata sandi development diberikan dalam percakapan, tidak disimpan dalam source. Saat masuk ke build produksi, pengguna diwajibkan mengganti kata sandi awal sebelum mengelola konten.

## Menjalankan

### Otomatis setelah shutdown / restart Windows

Pasang sekali untuk akun Windows yang sedang digunakan:

```powershell
.\scripts\install-local-startup.ps1
```

Shortcut **Darul Huda - Server Lokal** di folder Startup menjalankan server produksi di latar belakang setelah masuk Windows. Tidak memerlukan Apache/MySQL. Komputer harus menyala dan pengguna sudah masuk Windows untuk mengakses website lokal. Tunggu beberapa detik lalu buka http://localhost:5174/ atau http://localhost:5174/admin.

Untuk menyalakan kembali secara manual, jalankan `node scripts/start-local.mjs`. Launcher tidak menjalankan server kedua bila port sudah digunakan. Log tersedia di `data/logs/local-server.log`. Setelah perubahan kode, jalankan `npm run build` sebelum menyalakan ulang server. Untuk menonaktifkan startup, buka `shell:startup` melalui Run Windows dan hapus hanya shortcut **Darul Huda - Server Lokal**. Perbarui instalasi startup jika folder proyek atau lokasi Node.js dipindahkan.

Gunakan Node.js 24 atau lebih baru dan npm. Jalankan perintah dari folder proyek.

```powershell
npm ci
Copy-Item .env.example .env
npm run assets
npm run setup
npm run dev
```

Pada proyek yang sudah disiapkan, cukup `npm run dev`. Jangan menimpa `.env` atau menjalankan development bersamaan dengan produksi pada port yang sama. Setup hanya menambah seed yang belum ada dan tidak menimpa konten admin. Akun baru mendapat password acak yang dicetak sekali ke terminal. Set `ADMIN_EMAIL` dan `ADMIN_PASSWORD` hanya bila ingin menentukan akun awal sendiri.

Build produksi dan PWA:

```powershell
npm run build
npm start
```

Gunakan **npm start**, karena skrip ini menangani kompatibilitas aset Windows pada Vinext 0.0.50. Server dibatasi ke `127.0.0.1`. PWA hanya didaftarkan pada build produksi untuk menghindari cache development. Jangan menjalankan `vinext start` langsung.

Pemeriksaan:

```powershell
npm run typecheck
npm test
npm run build
npm run test:production
```

Pengujian backend memakai database sementara. Uji produksi menjalankan server sementara pada port 5176 dan database terpisah, lalu menghentikannya.

## Stack dan struktur

- React 19, TypeScript, Vinext/Vite dengan konvensi Next App Router.
- Node SQLite (`node:sqlite`), prepared statements, foreign keys, WAL, transaksi database.
- Cookie sesi HttpOnly/SameSite; Secure pada produksi. Hash PBKDF2 untuk password; token sesi disimpan sebagai hash.
- Sanitasi server menggunakan sanitize-html. Gambar publik dikompresi ke WebP menggunakan sharp.
- CSS responsif, tanpa font atau gambar eksternal yang wajib dimuat.

| Lokasi | Fungsi |
| --- | --- |
| `app/` | Route publik, admin, API, SEO dan unduhan |
| `components/public-site.tsx` | Halaman publik dan interaksi |
| `components/admin.tsx` | Dashboard, formulir CMS, rich text, media, pengguna |
| `components/pwa.tsx` | Registrasi SW, instalasi, pemberitahuan update |
| `lib/modules.ts` | Definisi field CMS dan permission |
| `lib/database.ts` | Schema, query, validasi, sesi, transaksi dan audit |
| `lib/api.ts` | Endpoint CMS dengan otorisasi server |
| `lib/auth/crypto.ts` | Utilitas kriptografi yang diadaptasi dari fondasi lama |
| `data/darul-huda.sqlite` | Database lokal; tidak dilacak Git |
| `data/private/` | Bukti donasi privat |
| `public/uploads/` | Media publik dengan nama UUID |
| `public/media/` | Gambar sumber dan varian WebP |
| `source-reference/` | Teks dan 14 gambar hasil ekstraksi dokumen asli |
| `migrations/001_initial.sql` | Snapshot schema SQLite |
| `scripts/setup.ts` | Seeder idempotent dan akun awal |
| `tests/` | Pengujian backend, keuangan, otorisasi dan PWA |
| `docs/` | Audit, laporan implementasi, hasil responsif |

Tabel terpisah untuk pengguna/peran/permission/sesi, pengaturan, hero, halaman, unit pendidikan, program unggulan, kurikulum, berita/kategori, album, pustaka, usaha, pendaftaran, agenda/pengumuman/kalender, program/transaksi/update/rekening donasi, menu, footer, media, audit dan versi schema. Field khusus tiap modul berada di kolom JSON pada tabel modul masing-masing; hubungan utama memakai foreign key. Foto album, dokumentasi dan tag disimpan sebagai data terstruktur milik konten, bukan satu tabel konten global. Schema awal diterapkan idempotently saat membuka database. `npm run db:schema` mengekspor ulang snapshot schema.

## Mengelola konten

1. Masuk ke CMS dan pilih modul pada sidebar.
2. Tambah data, isi judul, slug, detail dan foto.
3. Pilih Draft, Terbit, Terjadwal, atau Arsip sesuai modul, lalu simpan.
4. Untuk hero dan album, atur urutan dengan drag atau tombol panah. Hero mendukung gambar desktop/mobile, fokus gambar, periode aktif, serta dua CTA.
5. Pada berita, kategori/tag, penulis, ringkasan, rich text, foto utama, dokumentasi, dan SEO tersedia. Penjadwalan diputuskan server berdasarkan waktu publikasi.
6. Untuk galeri, unggah beberapa foto dan isi caption. Foto dapat dipindahkan, digunakan ulang, dan dibuka melalui lightbox.
7. Pustaka menerima PDF. Unggahan memeriksa tipe, signature, ukuran, dan decoder gambar. Media yang masih dipakai tidak dapat dihapus.
8. Formulir memperingatkan saat ada perubahan belum tersimpan. Autosave latar belakang belum diterapkan.

Peran awal: Super Admin, Admin Website, Editor Berita, Admin Donasi, Admin Galeri. Hak akses berasal dari tabel permission per peran dan diperiksa server. Super Admin dapat mengelola pengguna dan permission. Tindakan penting dicatat dalam audit log.

## Donasi

Program merupakan modul terpisah dari berita. Total dihitung dari transaksi berstatus **Valid**. Draft dan transaksi dibatalkan tidak ikut dihitung. Koreksi wajib memiliki alasan. Transaksi valid tidak dapat ditimpa atau dihapus permanen; gunakan pembatalan beralasan dan catat koreksi. Saldo negatif ditolak. Audit dan perubahan keuangan disimpan dalam satu transaksi database.

Target yang belum diketahui tetap kosong, sehingga persentase tidak direkayasa. Jika target terlampaui, angka persentase boleh lebih dari 100% namun bar dibatasi 100%. Rekening global atau rekening khusus dapat dipilih per program. Konfirmasi WhatsApp muncul setelah nomor valid diisi. Nama donor dan bukti tidak ditampilkan dalam API publik; bukti hanya dapat diakses oleh pengguna dengan permission transaksi donasi.

Belum ada payment gateway atau QRIS otomatis. Donasi awal menggunakan rekening bank dari dokumen. Tidak ada transaksi contoh yang dimasukkan ke database lembaga.

## Route dan API

Publik: `/`, `/profil/{slug}`, `/pendidikan`, `/pendidikan/{slug}`, `/akademik`, `/usaha`, `/berita`, `/berita/{slug}`, `/galeri`, `/galeri/{slug}`, `/pustaka`, `/pustaka/{slug}`, `/informasi`, `/donasi`, `/donasi/{slug}`, `/kontak`.

CMS berada di `/admin`. API:

- `POST /api/login`, `POST /api/logout`, `GET /api/me`, `POST /api/password`
- `GET /api/bootstrap`, `GET /api/public`
- `GET/POST/PUT /api/content/{module}`, `DELETE /api/content/{module}/{id}`
- `GET/POST/DELETE /api/media`, `GET /api/private-media/{id}`
- `GET/POST/PUT /api/users`, `GET/PUT /api/roles`, `GET /api/audit`
- `GET /uploads/{file}`, `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`

Mutation API menolak origin yang berbeda. Endpoint privat memberi `Cache-Control: no-store`. Semua query yang memakai input pengguna menggunakan parameter. Endpoint konten membatasi modul/field/status yang diterima.

## PWA dan deployment

Manifest memiliki ikon PNG 192/512, maskable, scope, start URL, standalone, serta theme color. Service worker memakai cache-first untuk aset, network-first untuk halaman publik yang aman, dan network-only untuk API/admin. Donasi dan informasi penting memakai fallback offline jika jaringan gagal. Salinan halaman memiliki penanda waktu WIB. Update aplikasi harus dipilih pengguna dan ditunda jika formulir belum disimpan.

Instalasi ke sistem operasi tidak dilakukan otomatis. Buka build produksi dengan browser yang mendukung instalasi PWA dan gunakan menu instalasinya. Untuk domain publik, gunakan HTTPS.

Untuk hosting, gunakan server Node 24 dengan disk persisten untuk SQLite dan unggahan, reverse proxy HTTPS, serta backup berkala. Ubah `SITE_URL` sesuai domain. Aplikasi ini belum dideploy ke internet. Jika berpindah ke banyak instance/serverless, pindahkan database/media ke layanan bersama terlebih dahulu; SQLite lokal ditujukan untuk satu instance. Backup database dengan mekanisme SQLite online backup atau hentikan server sebelum menyalin database beserta WAL; jangan menyalin hanya file utama saat proses sedang menulis.

## Data yang perlu dilengkapi

Nomor WhatsApp donasi, sosial media, pin Maps resmi, logo unit, target dan tanggal donasi, rincian pendaftaran (biaya/jadwal/syarat), berita aktual, agenda/pengumuman, dan buku PDF belum lengkap dalam sumber. Field tetap kosong dan CTA terkait ditampilkan hanya jika tersedia. Maps menggunakan pencarian berdasarkan alamat sumber sampai tautan resmi diisi. Album awal hanya berisi dokumentasi unit dari Word, bukan klaim kegiatan baru.

Tahun berdiri Ma’had adalah 2014. Untuk SD Al-Kuttab, narasi sejarah menyebut 2016, sedangkan tanggal pendirian legal di detail adalah 23 November 2015; keduanya dipertahankan sesuai konteks dokumen.

## Konfirmasi donasi dan kwitansi

Form publik `/donasi` atau halaman program mengirim `POST /api/donation-submit` sebagai multipart. Nomor telepon dinormalisasi ke `08…`, nominal divalidasi, dan bukti transfer PNG/JPEG/WEBP/PDF dibatasi 5 MB. Gambar didekode ulang; PDF diperiksa termasuk objek terkompresi dan ditolak jika terkunci/berisi aksi aktif. Penyimpanan bukti memakai UUID dalam `data/private` (dapat diatur melalui `DARUL_HUDA_PRIVATE_DIR`). Nomor telepon, bukti, dan catatan tidak masuk katalog publik.

Admin → Donasi → Transaksi Donasi menyediakan rekap berhalaman 20 baris, Smart Filter, detail bukti, koreksi data yang belum diverifikasi, serta riwayat. Semua endpoint `/api/donations` dan bukti privat memerlukan `donations.transaction`. Rekap kategori, jumlah transaksi, total terverifikasi, dan ekspor menggunakan filter yang sama. Excel mempertahankan telepon sebagai teks; ekspor dibatasi 25.000 transaksi per permintaan.

Status internal `pending` (termasuk `draft` lama), `valid`, `correction`, `rejected`, `void` ditampilkan sebagai Menunggu Verifikasi, Terverifikasi, Perlu Koreksi, Ditolak, Dibatalkan. Transaksi valid tidak dapat ditimpa: batalkan dengan alasan lalu catat koreksi. Histori dan nomor kwitansi tidak dihapus saat pembatalan. Koreksi pembukuan tidak menerbitkan kwitansi penerimaan baru.

Nomor transaksi harian dialokasikan atomik di `donation_sequences`. Kwitansi diterbitkan dalam transaksi database yang sama saat verifikasi donasi masuk, dengan nomor unik, waktu, snapshot identitas lembaga, dan token acak 256-bit dalam `donation_receipts`. Migrasi versi 4 melengkapi identitas transaksi lama tanpa mengubah nominal/status. Link `/donasi/kwitansi/{token}` dan PDF tidak memuat telepon/bukti/catatan; nama diganti Hamba Allah jika tidak ada persetujuan. PDF menggunakan font Noto berlisensi OFL dalam `assets/fonts`, termasuk pembentukan huruf Arab. Link menggunakan status transaksi terkini sehingga pembatalan terlihat.

Kirim Kwitansi membuka pesan WhatsApp siap kirim; aplikasi tidak mengirim pesan otomatis. URL memakai origin website. Agar penerima bisa membuka tautannya, jalankan website pada domain publik HTTPS. Backup SQLite dan folder `data/private` bersama-sama; sertakan `assets/fonts` pada deployment. Pengujian alur baru tersedia di `tests/donation-workflow.test.ts` dan memakai database terisolasi.

## Master donatur

Menu **Donasi → Daftar Donatur** menggunakan izin backend `donations.transaction`, sama dengan petugas transaksi. Data profil tidak dimasukkan ke API publik, bootstrap publik, maupun kwitansi publik.

Migrasi runtime versi 5 menambahkan tabel `donors`, tabel alias unik `donor_phones`, dan foreign key `donation_transactions.donor_id` dalam satu transaksi SQLite. Transaksi lama dihubungkan berdasarkan nomor Indonesia yang dinormalisasi. Riwayat tanpa nomor valid mendapat record masing-masing, tidak digabung berdasarkan nama; admin dapat meninjau dan menggabungkannya. Migrasi dapat dijalankan ulang tanpa menggandakan data dan tidak mengubah nominal, status, bukti, atau snapshot kwitansi.

Daftar dan ekspor menggunakan filter yang sama, pagination 20 baris di server, dan maksimum ekspor 25.000 donatur per permintaan. Total dan jumlah transaksi menghitung status internal `valid` (Terverifikasi / Telah Diterima), termasuk koreksi nominal bertanda sesuai ledger yang sudah ada. Tanggal donasi terakhir dan daftar program berasal dari seluruh riwayat; nominal per program hanya terverifikasi. Statistik mengikuti filter aktif.

Penggabungan memindahkan relasi transaksi serta semua alias nomor ke record tujuan. Profil tujuan dipertahankan; profil kosong dilengkapi dan nilai berbeda disimpan sebagai catatan internal, disertai audit sebelum penggabungan. Nomor lama tetap menjadi alias saat nomor utama diedit. Identitas dan pilihan anonim pada transaksi/kwitansi tidak ditimpa oleh profil master. Catatan internal tidak disertakan dalam ekspor daftar.

Validasi: `npm test` mencakup `tests/donor-master.test.ts` untuk migrasi, deduplikasi, agregasi, pembatalan, penggabungan, filter, pagination, privasi, authorization dan Excel/PDF.

## Penggunaan rekening donasi

Kartu Penggunaan Rekening memakai relasi program `accountId` / `account_id` yang sudah ada. Mode khusus ditentukan oleh adanya program yang memakai rekening tersebut; pilihan mode dan konfirmasi hanya merupakan input tindakan, bukan field atau tabel baru. Program yang berpindah rekening harus menyertakan konfirmasi atas rekening asal yang masih berlaku saat penyimpanan. Perubahan disimpan atomik dan diaudit.

Rekening Utama memakai konvensi prioritas lama pada `sort_order` (dinormalisasi menjadi `-1`). Hanya satu Rekening Umum aktif yang dapat memiliki prioritas ini. Mengganti utama memerlukan konfirmasi terhadap rekening utama saat ini; rekening sebelumnya dikembalikan ke urutan biasa. Menonaktifkan rekening atau menjadikannya khusus menghapus prioritasnya. QRIS utama tetap merupakan pengaturan QR yang berbeda.

Migrasi runtime versi 6 mempertahankan rekening umum yang sebelumnya menjadi pilihan pertama, menormalkan prioritas lain, dan mempertahankan seluruh relasi program. Mode dan status utama pada respons API dihitung dari struktur yang sama. Form donasi dan backend hanya menerima rekening khusus untuk program pemiliknya; rekening umum tersedia bagi donasi umum dan program tanpa rekening khusus, dengan rekening utama di depan. Relasi program yang belum dipublikasikan juga diperhitungkan sehingga rekening khusus tidak bocor sebagai pilihan umum.

## Petunjuk dan penyesuaian media

Konfigurasi berada di `lib/media-presets.ts`. Seluruh formulir memakai rekomendasi berdasarkan fungsi, bukan satu ukuran generik.

| Lokasi | Rekomendasi | Batas |
| --- | --- | --- |
| Hero desktop/mobile | 1920 × 840, 16:7 | 10 MB |
| Foto utama berita, program, perkembangan, profil halaman, pendidikan, akademik, pendaftaran, pengumuman | 1600 × 900, 16:9 | 10 MB |
| Thumbnail / OpenGraph | 1200 × 675, 16:9 | 5 MB |
| Galeri dan dokumentasi | 1600 × 1200, 4:3 | 10 MB |
| Foto akun admin | 1200 × 1200, 1:1 | 5 MB |
| Logo lembaga, bank, unit dan favicon | 1200 × 1200, transparan | 2 MB, PNG/WebP |
| Poster agenda | 1080 × 1350, 4:5 | 10 MB |
| QR/QRIS rekening dan pengaturan situs | 1000 × 1000, 1:1 | 5 MB |
| Gambar dalam artikel | Minimal lebar 1200 | 10 MB |
| Brosur, kurikulum, dokumen mapel, lampiran, rundown | PDF terpisah | 10 MB |
| Bukti transfer privat | Gambar/PDF utuh, tanpa crop | 5 MB |

Preset foto profil juga tersedia untuk narasumber/pengurus jika modul khusus tersebut ditambahkan; saat audit belum ada modul upload foto pengurus/narasumber tersendiri. Media Library umum tidak memaksakan rasio: rekomendasi diterapkan saat gambar dipilih untuk suatu field.

Rasio yang menyimpang lebih dari 15% memunculkan peringatan; resolusi di bawah 75% rekomendasi juga diperingatkan. Keduanya tidak menghalangi penggunaan. Crop menyediakan zoom, geser, reset dan titik fokus untuk hero/foto utama. QR dan logo memakai contain tanpa crop. Bukti transfer tetap privat.

File master dan hash deduplikasi tidak diubah. URL `/api/media-image` menyimpan parameter crop/fokus per penggunaan dan menghasilkan WebP dengan sharp tanpa upscale; logo memakai lossless, QR ditampilkan dari master. Cache derivative dibatasi 32 MB di memori, tanpa baris atau file baru di Media Library. Penghitungan penggunaan, perlindungan penghapusan, dan penggabungan duplikat mengenali referensi derivative. Foto akun tetap memakai penyimpanan privat profil yang sudah ada.

## Halaman Informasi publik

Menu Informasi memakai dropdown desktop dan accordion mobile. Konfigurasi rute dan label berada di `lib/information-public.ts`; menu lama dinormalisasi saat render tanpa mengubah konten database.

- `/informasi`: empat kartu layanan dan maksimal tiga informasi terbaru.
- `/informasi/pendaftaran`: data modul Pendaftaran, termasuk persyaratan, biaya, brosur dan tautan pendaftaran.
- `/informasi/pengumuman`: daftar, pencarian dan filter kategori; isi lengkap di `/informasi/pengumuman/:slug`.
- `/informasi/agenda`: timeline akan datang/selesai dengan waktu WIB; detail di `/informasi/agenda/:slug`.
- `/informasi/kalender`: kalender bulanan, filter kategori dan daftar tanggal penting; mendukung tanggal berulang dan rentang lintas bulan.

Semua subhalaman memakai hasil `publicData()`, sehingga draft, pengumuman di luar periode tayang, dan kalender tanpa izin tampil publik tetap tersembunyi. Breadcrumb, status menu aktif, metadata dan sitemap mengikuti rute baru. Tautan pendaftaran di beranda langsung menuju subhalaman pendaftaran.

## Laporan perkembangan donasi dinamis

Program Donasi memiliki Jenis Program dan Pengaturan Laporan Perkembangan. Jenis menentukan indikator yang tampil; progres fisik hanya tersedia untuk Pembangunan / Fisik. Admin dapat menyembunyikan indikator, menetapkan kolom wajib, dan menambah field teks, teks panjang, angka, atau tanggal dengan satuan sendiri. Field yang disembunyikan tetap disimpan pada laporan lama.

Program lama tanpa jenis memakai Umum tanpa menebak jenis dari kategori atau judul. Tidak ada penghapusan/migrasi destruktif: field lama tetap tersimpan, sedangkan indikator baru disimpan dalam reportValues dan konfigurasi program dalam reportSettings. Nilai progres lama akan tampil kembali bila jenis program diatur menjadi Pembangunan / Fisik.

Dana terkumpul dan progres dana dihitung dari transaksi terverifikasi. Dana digunakan adalah penjumlahan nominal per laporan yang sudah dipublikasikan dan efektif (bukan draft, arsip, terjadwal di masa depan, atau terhapus). Sisa dana = dana terkumpul − dana digunakan. Masukkan nominal untuk kegiatan pada laporan tersebut, bukan total kumulatif; mengedit laporan mengganti nominalnya tanpa menggandakan perhitungan.

Laporan kesehatan hanya mempublikasikan data agregat secara default. Cerita, judul pribadi, field tambahan, lokasi/fasilitas dan dokumentasi memerlukan pernyataan admin bahwa konten aman dan diizinkan untuk publik. Media Library adalah penyimpanan publik: jangan unggah data medis pribadi ke sana. Pembatasan tampilan ini tidak mengubah file publik menjadi file privat.

Pengujian: tests/donation-progress.test.ts mencakup template, custom field, validasi kontekstual, kompatibilitas data lama, penjumlahan penggunaan, dan penyaringan data kesehatan.
