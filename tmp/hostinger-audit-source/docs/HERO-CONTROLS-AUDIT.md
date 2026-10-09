# Perbaikan kontrol hero slider

## Perubahan

- `components/hero-slider.tsx`: komponen baru `HeroSlider`, `HeroSlide`, `HeroContent`, `HeroControls`, dan ikon SVG lokal. Menggantikan fungsi Hero inline pada `components/public-site.tsx`.
- `app/globals.css`: kontrol terpusat di bawah hero, indikator bulat, animasi gambar/teks, ruang aman CTA, serta reduced motion. Style kontrol bernomor lama dihapus.
- Ikon: chevron kiri/kanan, Play, Pause. Seluruh tombol memiliki aria-label; tidak ada teks Putar atau nomor besar yang terlihat.
- Indikator sesuai jumlah slide. Aktif memakai emas, ukuran lebih besar, ring halus, dan aria-current; nonaktif putih transparan. Area sentuh 44px meskipun bulatan visual kecil.
- Kontrol horizontal ditempatkan 20px dari bawah desktop dan 18px pada mobile, dengan latar hijau transparan dan blur ringan. Banyak indikator dapat digulir secara horizontal di dalam kelompok tanpa membuat halaman overflow; indikator aktif dijaga tetap terlihat.
- Gambar menggunakan crossfade 750ms dan zoom ringan 1.025 → 1 selama 1400ms. Teks fade-up 10px dengan durasi 500–600ms dan jeda bertahap 70–190ms untuk judul, ringkasan, dan CTA.
- Slide berbagi area CSS grid dan tinggi mengikuti konten tertinggi, sehingga perbedaan panjang isi tidak menggeser halaman saat berganti slide. Slide tidak aktif inert dan aria-hidden.
- Autoplay tetap 8 detik. Tombol Pause menghentikan timer sampai Play ditekan. Navigasi manual atau fokus pada konten menghentikan autoplay supaya isi dapat dibaca; Play memulai interval baru penuh. Tidak bergantung pada hover. Tab browser tersembunyi menghentikan timer sementara. Reduced motion menonaktifkan autoplay awal dan animasi; pengguna tetap dapat memilih Play.
- Struktur data, upload, urutan dari server, CTA, dan logika admin tidak diubah. Tidak menambah dependency.

## Verifikasi

- Typecheck dan production build lulus.
- 19 pengujian regresi yang sudah ada lulus; smoke test produksi juga lulus.
- Browser: previous, next, klik indikator, Enter, Play/Pause, dan perpindahan otomatis setelah 8 detik berhasil. Setelah Pause, slide tetap sama setelah lebih dari 16 detik.
- Tiga slide uji: jumlah indikator sesuai dan tinggi hero tetap 622.2px ketika berganti slide pada desktop.
- Lebar 320, 390, 768, 1024, dan 1440px diperiksa. Tidak ada overflow, kontrol berada di tengah, dan posisi atas kontrol berada di bawah CTA. Hasil pengukuran tersimpan di `hero-responsive-results.json`.
- Dua belas slide uji pada 320px: indikator terakhir tetap terlihat setelah previous dari slide pertama; halaman tidak overflow.
- Satu slide menyembunyikan kontrol. Data hero kosong tidak menyebabkan error dan konten halaman lain tetap tampil.
- Dua hero asli juga diverifikasi. Pada mobile, tinggi sebelum dan sesudah perpindahan tetap 560.75px meskipun teks dan CTA berbeda.
- Tidak ada error console pada pengujian browser.
- Kasus tambahan dijalankan di database uji terpisah; server uji dihentikan dan databasenya dibersihkan. Data hero asli tidak diubah.

Build terbaru berjalan di http://localhost:5174 melalui npm start.

Bukti visual: `hero-controls-desktop.jpg` dan `hero-controls-mobile.jpg`, menggunakan data hero asli.
