# Audit pencarian dan filter Darul Huda

Tanggal: 1 Oktober 2026

## Kebijakan publik
Kontrol mengikuti jumlah seluruh data yang diterbitkan, bukan jumlah hasil filter. Sampai 12 item ditampilkan langsung; 13–30 memakai kategori/status ringkas bila relevan; di atas 30 memakai pencarian, filter dan pagination 12 item. Berita dan pustaka tetap menggunakan pencarian karena merupakan arsip yang bertumbuh. Galeri memakai chip jika ada lebih dari satu kategori, termasuk ketika jumlah album kecil. Satu kategori tidak menghasilkan kontrol yang tidak berguna.

| Halaman | Hasil audit dan penerapan |
| --- | --- |
| Unit Pendidikan | Tujuh unit langsung tampil setelah header. Pencarian hanya saat koleksi besar; jenjang compact untuk koleksi menengah. |
| Program Unggulan | Tiga program langsung tampil; tidak ada search card. |
| Usaha Ma’had, Profil/Lembaga | Sudah tanpa pencarian daftar; dipertahankan. |
| Galeri | Chip kategori horizontal; pencarian teks hanya >30 album. |
| Donasi | Sembilan program langsung tampil. >12 program memperoleh chip status dan kategori yang relevan; >30 memperoleh pencarian. Form konfirmasi donasi tidak diubah. |
| Berita & Wawasan | Pencarian dan kategori dipertahankan dalam toolbar tanpa kartu besar. |
| Pustaka | Pencarian tetap tersedia; kategori ditampilkan jika lebih dari satu. |
| Pengumuman | Judul Pengumuman Terbaru, langsung ke konten saat sedikit. Kategori >12, pencarian dan pagination >30. Tidak membuka data arsip tersembunyi dari backend. |
| Agenda | Pengelompokan Akan Datang/Selesai dipertahankan; pencarian dan pagination untuk >30 kegiatan. |
| Kalender pendidikan | Navigasi bulan tetap tersedia; filter kategori hanya ketika >12 kegiatan dan lebih dari satu kategori nyata. |
| Akademik | Pemilihan jenjang tetap tersedia. Pencarian mata pelajaran >30 per jenjang; chip kategori >12 bila kategori beragam. Reset saat ganti jenjang dipertahankan. |
| Beranda, kontak, detail | Tidak ditambahkan pencarian atau ruang penggantinya. Hero/pengenalan terbaru tetap dipertahankan. |

## Kebijakan admin
| Area | Hasil audit dan penerapan |
| --- | --- |
| Daftar generik Konten/Lembaga/Informasi/Donasi | Search, status, urutan tetap tersedia; padding dan kartu filter besar dihilangkan. |
| Album Galeri | Search + kategori album + status; kombinasi filter dan reset diuji. |
| Pengguna | Pencarian ringkas berdasarkan nama/email/peran, dengan empty state dan reset. |
| Audit Log | Pencarian dipertahankan, toolbar ringkas, empty state dan reset. |
| Media Library | Search/jenis/penggunaan/urutan tetap lengkap; ukuran dipadatkan, reset hasil kosong ditambahkan. |
| Transaksi Donasi dan Daftar Donatur | Filter backend, filter tambahan, ekspor dan reset dipertahankan; tampilan toolbar dipadatkan. |
| Rekening Donasi | Sudah progresif: toolbar muncul bila >5 rekening atau filter aktif. Tetap digunakan karena kebutuhan operasional admin. |
| Pencarian global dan pemilih relasi dalam editor | Tetap tersedia: membantu memilih program, penulis, kategori, tujuan, mata pelajaran, dan media. Ini bukan search card daftar publik. |
| Profil, password, hak akses, tampilan | Tidak ditambahkan pencarian generik yang tidak diperlukan. |

## Implementasi dan verifikasi
- `lib/public-search-policy.ts`: kebijakan progresif berdasarkan modul dan jumlah data.
- `components/public-collection.tsx`: toolbar, chips, reset, hasil kosong dan pagination bersama.
- API, database dan aturan publikasi tidak diubah.
- Pengujian batas 12/13/30/31 serta pengecualian berita, pustaka dan galeri: lulus.
- Seluruh 111 pengujian lulus; typecheck dan production build berhasil.
- Desktop 1366, tablet 768, mobile 390: tidak ada overflow halaman pada tampilan yang diuji. Chips bergulir di dalam area sendiri.
- Galeri salinan database: 32 album mengaktifkan search/pagination; kategori menghasilkan 16 hasil, pencarian kosong/reset bekerja, halaman 3 bisa dipilih. Setelah koleksi uji menjadi 6 album, pencarian hilang dan chips tetap bekerja (kategori Prestasi menghasilkan 2 album).
- Admin: kombinasi kategori + pencarian album menghasilkan item yang benar; reset kategori/pencarian dan pencarian pengguna diuji.
- Data uji hanya pada `test-results/search-ui.sqlite`.
- Bukti visual: `search-unit-desktop.png` dan `search-gallery-mobile.png`.
