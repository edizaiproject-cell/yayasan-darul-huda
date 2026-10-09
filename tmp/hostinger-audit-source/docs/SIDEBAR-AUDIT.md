# Audit sidebar, profil, dan WhatsApp — 30 September 2026

## Hasil perubahan

- `components/admin.tsx`: mengintegrasikan sidebar baru dan profil, menjaga navigasi modul yang sebelumnya berupa React state pada `/admin`, konfirmasi perubahan belum tersimpan, serta pemeriksaan permission yang sama.
- `components/admin-sidebar.tsx`: `AdminSidebar`, `SidebarSection`, dan `UserAvatar`. Dashboard langsung; enam kelompok accordion sesuai permintaan. Satu kelompok terbuka, induk submenu otomatis terbuka saat modul dipilih. Submenu tanpa ikon. Penanda aktif memakai garis, font, background, dan `aria-current`.
- Accordion memakai CSS grid 0fr/1fr, 350ms ease-in-out dan chevron berputar. Tombol menyediakan `aria-expanded`/`aria-controls`; submenu tertutup inert. Reduced motion dihormati.
- Desktop dapat diringkas menjadi ikon. Ikon memiliki tooltip native melalui title. Navigasi scroll sendiri, profil selalu di bawah. Mobile/tablet memakai drawer dengan backdrop, Escape, penahanan fokus, pengembalian fokus, dan penutupan setelah memilih halaman.
- `components/admin-icons.tsx`: SVG outline lokal 20px untuk dashboard, konten/dokumen, lembaga/gedung, informasi, donasi/hati, tampilan/palet, sistem/perisai. Tidak ada library ikon pada proyek sebelumnya; tidak menambah dependency atau emoji produksi.
- `app/globals.css`: styling sidebar, accordion, profil, WhatsApp, responsivitas, dan penempatan pemberitahuan PWA admin agar tidak menutup tombol simpan bawah.

## Profil dan akun

- Route baru: `/admin/profil`, di `app/admin/profil/page.tsx`. Tidak ada route profil lama yang diduplikasi. Route publik dan modul admin lain tetap.
- `components/admin-profile.tsx`: nama, email, WhatsApp, foto, role/status read-only, waktu login terakhir, dan akses penggantian kata sandi yang sudah tersedia.
- Sumber identitas: session aktif melalui `/api/me` dan `/api/bootstrap`; nama/email/role/status dari `users`. WhatsApp dan foto dari tabel tambahan `user_profiles`; waktu login dari audit login yang sudah tercatat.
- Migration `migrations/002_user_profiles.sql` bersifat tambahan; runtime membuat tabel secara idempotent dan mencatat versi 2. Tidak mengubah data konten, role atau permission lama.
- API `/api/profile` hanya mengubah nama/email/WhatsApp akun yang sedang login. ID, role, dan status yang dikirim klien tidak dapat mengubah otorisasi atau akun lain. Validasi nama, format/keunikan email, dan nomor dijalankan di server.
- Foto: JPG/JPEG, PNG, WebP, maksimal 10 MB; diperiksa dengan decoder dan batas 40 juta piksel, orientasi diperbaiki, dijadikan WebP persegi 256px. Pratinjau sebelum simpan, ganti dan hapus tersedia. Tidak menambah library crop.
- Foto disimpan privat sebagai BLOB di `user_profiles`, disajikan hanya untuk pemilik melalui `/api/profile/photo` dengan no-store. Tidak masuk media publik. Tanpa foto, avatar memakai dua inisial nama.
- Dropdown akun: Profil Saya, Ganti Foto, Ganti Kata Sandi, Pengaturan Akun, Keluar. Pengaturan Akun menuju profil yang sama.
- Logout tetap memakai `POST /api/logout`, mencabut session dan membersihkan cookie, lalu kembali ke login `/admin`. Penggantian kata sandi tetap meminta kata sandi saat ini dan mencabut session setelah berhasil.

## WhatsApp publik

- `components/floating-whatsapp.tsx` dipasang hanya di `components/public-site.tsx`, tidak di dashboard.
- Sumber konfigurasi: **Sistem → Pengaturan Website → Edit Identitas Darul Huda**: Nomor WhatsApp (`whatsapp`), WhatsApp mengambang aktif (`whatsappEnabled`), Pesan awal WhatsApp (`whatsappMessage`).
- `lib/whatsapp.ts`: normalisasi 08/8 menjadi 628, membuang tanda +, spasi, kurung dan strip; validasi panjang; pesan menggunakan encodeURIComponent.
- Nomor tidak hardcoded. Pesan bawaan dapat diedit; pesan kosong dapat digunakan tanpa teks awal. Tombol tidak muncul jika nonaktif atau nomor kosong/tidak valid.
- Tombol bulat memakai SVG WhatsApp, label aksesibilitas yang diminta, tooltip desktop, hover ringan, safe-area mobile dan jarak tambahan saat banner PWA muncul.
- Nomor uji hanya digunakan di database uji. Nomor resmi belum diberikan; pengaturan asli tidak diisi dengan nomor contoh.

## Verifikasi

- `npm run typecheck`: lulus.
- `npm test`: **19/19 lulus**, mencakup RBAC yang lama, perlindungan publikasi, privasi donasi, CSRF, validasi profil, penolakan eskalasi role, foto privat/ganti/hapus, perubahan kata sandi dan pencabutan session, serta WhatsApp ON/OFF/normalisasi/encoding.
- `npm run build`: lulus. Vinext menampilkan informasi klasifikasi statis route admin sebagai Unknown; bukan error build.
- `npm run test:production`: lulus, termasuk aset, unggahan setelah build, cookie Secure, kewajiban ganti password awal, no-store API/admin dan 404.
- Browser memakai database uji terpisah: keenam accordion buka/tutup, active submenu, collapse desktop, menu akun, edit nama/WhatsApp, upload dan hapus foto, route profil langsung, logout lewat menu akun, login Editor Berita dan visibilitas menu terbatas.
- Enter/Space mengoperasikan accordion; Escape menutup drawer. Konten di belakang drawer dibuat inert.
- Lebar 320, 390, 768, 1024 dan 1440px diperiksa. Setelah layout stabil tidak ada overflow horizontal. Pada 320px navigasi dapat scroll sementara profil tetap terlihat. Perubahan ukuran viewport saat animasi sempat menghasilkan pengukuran transisi; pengukuran stabil dilakukan ulang.
- WhatsApp ON dan OFF disimpan melalui UI pengaturan, tautan dan encoding diverifikasi, posisi mobile diperiksa. Tidak mengirim pesan ke nomor uji.
- Kata sandi diuji melalui API pada akun uji; kata sandi pengguna asli tidak diubah.
- Bukti visual: `docs/sidebar-desktop.jpg` dan `docs/sidebar-mobile.jpg`, menggunakan akun uji.

Build terbaru dijalankan melalui `npm start` di `http://localhost:5174`. Server uji dihentikan setelah verifikasi.
