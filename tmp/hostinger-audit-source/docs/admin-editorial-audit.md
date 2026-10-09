# Audit dan implementasi dashboard editorial Darul Huda

Tanggal: 1 Oktober 2026

## 1. Audit awal
Dashboard lama sudah memiliki sumber data, sidebar berkelompok, izin per modul, dan alur editor. Hierarki halaman pembuka belum menonjolkan identitas Ma’had; kartu statistik, daftar, form, dan modal perlu disatukan. Pencarian global dan panel perhatian belum tersedia pada topbar. Acuan visual menggunakan dokumentasi beranda yang ada di proyek (`docs/beranda-desktop.jpg`); lampiran permintaan terbaru berupa teks.

## 2. Sistem desain
Hybrid Editorial + Command Center: foto Ma’had, komposisi pembuka asimetris, heading hijau tua, latar off-white, aksen emas lembut, kartu putih, radius 14–20 px, dan bayangan ringan. Susunan dashboard: pembuka, aksi cepat, statistik, tiga program donasi, konten terbaru, agenda/pengumuman, aktivitas.

## 3. Komponen
Komponen bersama: AdminPageHeader, AdminDialog, AdminSkeleton, SectionCard, EmptyState, StatusBadge, DashboardWelcome, StatCard, QuickActionCard, DonationProgress. UserAvatar dan AdminSidebar yang sudah ada digunakan kembali. Model frontend terpisah menghitung pencarian sesuai izin, status pengumuman, agenda, progres, dan statistik publikasi bulan WIB. Aksi Hero Beranda kini langsung membuka editor item baru.

## 4. Cakupan halaman
Tema bersama diterapkan pada shell admin dan halaman Konten, Lembaga, Informasi, Donasi, Tampilan, Sistem, Profil, serta Kata Sandi. Daftar generik mendapatkan mini statistik, filter, menu aksi, pagination, dan empty state. Tema juga menyelaraskan form, editor teks, kontrol unggahan, tabel transaksi, rekening, media, pengguna, izin, dan audit. Struktur backend, endpoint, skema database, permission, dan aturan bisnis tetap digunakan.

## 5. Responsif
Desktop menggunakan sidebar tetap yang bisa diringkas, kartu statistik enam/tiga kolom, aksi cepat lima/tiga kolom. Tablet menggunakan drawer dan dua kolom. Ponsel menggunakan satu kolom dan topbar yang menyesuaikan ruang. Tabel lebar tetap berada dalam area gulirnya. Helper unggahan dapat membungkus teks; dialog media tidak meluap horizontal.

## 6. Ikon
Menggunakan registry SVG outline lokal `AdminIcon`, termasuk tambahan plus, bell, external, dan check. Tidak menambah paket ikon atau font eksternal.

## 7. Token
Terpusat di `app/admin-theme.css`: primary, primary-dark, primary-soft, accent, accent-soft, background, surface, border, text, text-muted, success, warning, danger, radius, shadow, dan motion. Alias warna lama diarahkan ke token agar komponen lama tetap konsisten. Tema dibatasi ke admin dan dialognya.

## 8. Hasil uji mobile
360, 390, 430 px: dashboard tidak meluap horizontal. Form berita 360 px dan form rekening 430 px muat. Drawer dan accordion, profil, pencarian, modal akun, tabel donasi, pemilih media, serta penyimpanan draft galeri diuji pada database salinan. Ditemukan dan diperbaiki overflow input unggahan tersembunyi pada modal media (scrollWidth akhirnya sama dengan clientWidth, 292 px). Fokus pencarian otomatis dan label aksesibel tautan website juga diperbaiki.

## 9. Hasil uji tablet/desktop
768, 1024, 1366, 1920 px: lebar dokumen tidak melebihi viewport. Pemeriksaan visual pada tablet, daftar galeri, dan dashboard desktop; navigasi hasil pencarian ke editor, menu aksi, panel perhatian, serta quick action Galeri/Hero berhasil. Data uji memverifikasi agenda dan badge pengumuman Aktif, Terjadwal, Berakhir. Tidak ada error konsol pada sesi browser. Screenshot desktop/mobile merupakan sesi QA menggunakan database salinan; data uji tidak ditambahkan ke database utama.

## 10. Build dan verifikasi
- `npm test`: 108 lulus, 0 gagal.
- `npm run typecheck`: lulus.
- `npm run build`: lulus. Vinext menampilkan pemberitahuan keterbatasan klasifikasi statis beberapa route, tanpa kegagalan build.
- Portal utama dimuat ulang setelah build akhir.
- HTTP 200: /admin, /, /pendidikan, /profil/tentang, /program, /akademik, /usaha, /donasi, /manifest.webmanifest.
- Seluruh 12 aset yang dirujuk HTML admin merespons 200.
- Pengujian antarmuka menggunakan `test-results/editorial-ui.sqlite`; data operasional tidak dimodifikasi oleh QA.

Bukti: `editorial-dashboard-desktop.png` dan `editorial-dashboard-mobile.png` pada folder ini.
