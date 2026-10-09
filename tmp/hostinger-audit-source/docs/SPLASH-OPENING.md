# Splash pembuka Yayasan Darul Huda

Komponen `components/opening-splash.tsx` membungkus halaman publik tanpa mengubah data atau fungsi halaman. Pembuka berjalan saat beranda pertama kali dibuka dalam sesi tab. Penanda sessionStorage menghindari pengulangan saat reload/navigasi; tidak menyimpan informasi akun. Admin tidak memakai splash.

Logo memakai `site_settings.logo`, dengan fallback aset asli `/media/image1.png`. Referensi localhost:4321 saat pemeriksaan ternyata berisi ZTA Project, sehingga logo ZTA tidak digunakan untuk identitas Darul Huda.

Animasi CSS empat detik: fade/scale/blur/naik pada detik 0–1; pulse sangat ringan pada 1–3; mengecil/fade-out pada 3–4. Latar gradasi krem–hijau tetap menutupi halaman hingga selesai, dengan halo tipis. Setelah empat detik komponen dilepas dari DOM, konten ditampilkan dengan fade 300ms tanpa navigasi atau reload. Reduced motion menampilkan logo statis selama empat detik dan menonaktifkan transisi.

`app/layout.tsx` memeriksa penanda sesi sebelum paint agar sesi yang sudah selesai tidak memunculkan splash sesaat. Fallback noscript membiarkan halaman publik tetap dapat dibaca. CSS ada di `app/globals.css`; tidak ada dependency animasi tambahan.

Verifikasi: typecheck, 19 tes regresi, production build, dan smoke test produksi lulus. Browser memastikan konten tersembunyi selama splash, splash terhapus, inert dilepas, dan reload dalam sesi yang sama tidak mengulang splash. Ukuran overlay cocok dengan viewport desktop 1440×900, tablet 768×1024, serta mobile 320×700 tanpa overflow. Logo mobile tidak terpotong. Reduced motion disediakan melalui media query CSS; preferensi OS tidak diubah selama pengujian.

Bukti visual: `splash-desktop.jpg` dan `splash-mobile.jpg`. Untuk melihat pembuka lagi, buka beranda dalam tab baru dengan sesi baru.

## Pembaruan logo dan audio

Logo splash kini memakai berkas gambar yang diberikan pengguna, disalin utuh ke public/media/splash-darul-huda.png. Logo navbar tidak diubah. Durasi menjadi lima detik: muncul 0–1, stabil 1–4, keluar 4–5. Suara fanfare pendek orisinal dibuat secara sintetis dalam public/media/splash-semangat.wav (4,6 detik, volume 65%). Browser mencoba autoplay; jika diblokir, tombol Aktifkan suara memulai pemutaran. Tombol juga dapat mematikan suara. Audio dijeda saat tab disembunyikan atau splash dilepas. Session key versi baru memungkinkan pembuka baru tampil sekali lagi.

Typecheck dan build lulus. Browser memverifikasi animasi 5s, logo baru, file audio dapat didekode, dan tombol mengubah audio dari paused menjadi playing.

## Logo transparan
Splash menggunakan /media/splash-darul-huda-transparent.png (PNG RGBA 1254 x 1254, alpha 0–255), hasil edit image_gen dengan transparent_background=true. Prompt: hapus latar putih dan ruang negatif putih; pertahankan bentuk, warna, teks, dan huruf Arab putih pada lingkaran teal. CSS memakai blend normal. Durasi tetap 5 detik. Build berhasil; tampilan diverifikasi di browser, screenshot splash-transparent.jpg.


## Bacaan Bismillah (pengganti nada instrumental)
- Rekaman: Mishary Rashid Alafasy, Al-Fatihah ayat 1, teks diverifikasi melalui https://api.alquran.cloud/v1/ayah/1/ar.alafasy.
- Sumber audio: https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3. Dokumentasi CDN untuk integrasi aplikasi: https://alquran.cloud/cdn.
- Salinan lokal: public/media/splash-bismillah.mp3. Durasi browser 6.031111 detik. Rekaman tidak dipotong atau dipercepat.
- Akhir audio (ended) memicu transisi keluar 600 ms, lalu splash dilepas dari DOM. Total normal sekitar 6.63 detik sejak pemutaran dimulai.
- Jika autoplay diblokir, durasi diam mengikuti metadata rekaman; tombol Aktifkan suara memulai bacaan dan membatalkan timer diam. Tombol mute tidak memotong jalannya rekaman. Error audio dan watchdog mencegah splash macet.
- Animasi masuk 1 detik, pulse selama bacaan, keluar setelah bacaan selesai. Reduced motion tetap dihormati. Session key v3 memungkinkan pembuka baru tampil satu kali lagi.
- Typecheck dan production build berhasil. Browser memverifikasi aset MP3, durasi, dan pemutaran melalui tombol suara.
