# KAZE99 ID

Website untuk mengunggah video atau gambar dan mendapatkan tautan berbentuk `/{codeMedia}` secara otomatis. Kode baru terdiri dari enam karakter acak (huruf dan angka). URL membuka player KAZE99 ID dengan kontrol kembali dan salin link; nama file tidak ditampilkan.

Preview tautan Open Graph/Twitter menggunakan banner `src/hjk.png`, yang disajikan melalui `/preview-banner.png`.

## Menjalankan

```sh
npm install
npm run dev
```

Buka `http://localhost:5173`. Server upload berjalan pada port `3001` dan diproxy oleh Vite. File disimpan di folder `uploads/`; metadata kode disimpan di `data/media.json`.

Untuk mode produksi:

```sh
npm run build
npm start
```

## Deploy ke Railway

Hubungkan repository ke Railway. Konfigurasi `railway.json` menjalankan build dengan `npm run build` dan aplikasi memakai port dari environment `PORT`.

Tambahkan Railway Volume dengan mount path `/app/storage`, lalu set variable `STORAGE_DIR=/app/storage` agar file dan metadata tetap tersimpan setelah deploy ulang. Tanpa Volume, penyimpanan lokal bersifat sementara.

Batas unggahan saat ini 400 MB. Format yang diterima: MP4, WebM, MOV, JPEG, PNG, GIF, dan WebP. Untuk hosting publik, pindahkan penyimpanan file ke object storage dan tambahkan pemindaian/retensi sesuai kebutuhan.

## Keamanan

- Upload dibatasi lima permintaan per alamat IP setiap 15 menit dan ukuran maksimal 400 MB.
- Server memeriksa signature file, bukan hanya ekstensi atau `Content-Type` yang dikirim browser.
- File menggunakan nama internal acak dan disimpan di luar folder publik; respons tidak mengungkap nama file asli.
- Kode URL media baru memakai enam karakter alfanumerik acak dan rute publik memakai MIME yang terdeteksi.
- Header keamanan dasar aktif. Upload publik tetap berisiko disalahgunakan; untuk produksi, tambahkan moderasi/pelaporan, retensi otomatis, dan pemantauan biaya penyimpanan.