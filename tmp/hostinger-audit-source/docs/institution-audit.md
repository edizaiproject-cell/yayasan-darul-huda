# Audit dan restrukturisasi Lembaga

Audit 1 Oktober 2026 menemukan 4 halaman, 7 unit pendidikan, 3 program unggulan, 3 kurikulum dengan 96 mata pelajaran, dan 4 unit usaha. Pengujian UI menggunakan salinan database; konten uji tidak masuk ke database utama.

Kelima menu memiliki susunan form berdasarkan fungsi. Bagian sekunder dapat ditutup. Slug halaman dibuat otomatis untuk data baru; alamat lama dipertahankan. Data rich text lama tetap dapat diakses tanpa memaksakan form artikel pada unit pendidikan dan usaha.

## Penyimpanan

- Metadata menggunakan kolom JSON yang sudah tersedia. ID, slug, isi lama, dan metadata yang tidak dikenal dipertahankan saat pembaruan.
- Unit pendidikan menunjuk kurikulum yang sudah ada melalui `curriculumId`, dengan validasi keberadaan tujuan.
- Mata pelajaran tetap menggunakan array terstruktur pada kurikulum beserta ID lamanya. Tidak dibuat master mata pelajaran kedua. Beban belajar ditambahkan pada struktur yang sama.
- Produk usaha belum memiliki penyimpanan terpisah. Tabel `business_products` ditambahkan secara idempoten, dengan foreign key ke `business_units`. Penyimpanan induk dan produk dilakukan dalam satu transaksi. Produk yang dilepas ditandai dengan `deleted_at`, bukan dihapus permanen. Audit menyimpan daftar sebelum dan sesudah perubahan.
- Pengaturan website, beranda, menu profil, dan prioritas program digunakan pada data publik. Program mendapat URL detail `/program/<slug>` untuk CTA detail.

## Media

Upload, pemilihan, rekomendasi ukuran, preview gambar, dan deduplikasi tetap menggunakan Media Library yang sama. Dokumen kurikulum/pendukung menerima PDF, DOC, DOCX, dan XLSX hingga 10 MB. MIME, ekstensi, dan struktur file diperiksa; unduhan dokumen dikirim sebagai attachment. Brosur dan dokumen mata pelajaran yang sudah ada tetap menggunakan PDF.

## Verifikasi

- TypeScript dan build produksi lulus.
- 104 tes lulus, termasuk pelestarian data lama, kepemilikan produk, penyimpanan sebagian data, soft delete, referensi kurikulum, visibilitas, CTA, format Office, deduplikasi dan unduhan.
- UI: tambah/simpan/buka kembali unit, usaha dengan produk, program dengan CTA WhatsApp, halaman rich text, serta pembaruan beban belajar kurikulum.
- Desktop dan mobile diperiksa; tidak ditemukan overflow horizontal pada form unit dan editor produk.
- Screenshot: `institution-desktop.png`, `institution-mobile.png`, `institution-products.png`.
