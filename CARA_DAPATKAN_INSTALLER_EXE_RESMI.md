# 💻 Cara Mendapatkan Aplikasi `.EXE` Asli Seperti MS Word (Otomatis Deteksi Printer & Scanner Wi-Fi)

## Mengapa versi Web (Cloudflare) tidak bisa otomatis mendeteksi Scanner/Printer Wi-Fi seperti MS Word?
1. **MS Word adalah aplikasi `.EXE` (Native Windows)** yang berjalan di dalam sistem operasi, sehingga memiliki izin langsung ke **Windows Print Spooler (`winspool.drv`)** dan **Windows Wireless Scanner (`WIA / WSD`)**.
2. Sebaliknya, aplikasi yang dibuka dari **Cloudflare Pages** berjalan di dalam **Browser Sandbox**. Demi keamanan internet, semua browser (Chrome/Edge) **memblokir** website agar tidak bisa memindai jaringan Wi-Fi lokal (`192.168.x.x`) atau membaca daftar printer/scanner rumah Anda tanpa izin.

---

## ✅ Solusi Gratis, Aman & Tanpa Install Koding di Laptop Anda: GitHub Actions Cloud Builder!
Di dalam paket ini sudah saya siapkan **GitHub Actions Otomatis (`.github/workflows/build-exe.yml`)** serta modul **`electron/main.cjs`** yang sudah memanggil fungsi asli Windows `webContents.getPrintersAsync()` dan `Get-PnpDevice -Class Image` (persis seperti MS Word!).

Anda **tidak perlu** menjalankan script `.bat` di laptop Anda. Biarkan server resmi **GitHub (Microsoft)** yang merakitkan file **`OmniPDF Studio Setup 2.5.0.exe`** untuk Anda secara gratis:

### Langkah Mudah (3 Menit — Gratis Selamanya):
1. Buka **[github.com](https://github.com/)** dan buat Repository baru (misalnya `omnipdf-desktop`).
2. Ekstrak file **`OmniPDF_Studio_Native_EXE_Builder.zip`** ini, lalu *upload* seluruh isinya (termasuk folder `.github`, `electron`, `src`, `package.json`, dll.) ke repository GitHub tersebut dan klik **Commit changes**.
3. Klik tab **Actions** di bagian atas halaman GitHub Anda.
4. Anda akan melihat proses **"Build Native Windows EXE & Desktop Installer"** sedang berjalan otomatis.
5. Tunggu sekitar 2 menit hingga muncul tanda centang hijau (✅), lalu klik proses tersebut dan unduh file **`OmniPDF-Studio-Windows-Installer-EXE`** di bagian **Artifacts**!

Begitu Anda menginstal file **`.EXE`** tersebut di laptop Anda:
- Semua **Printer Wi-Fi dan USB** yang terbaca di MS Word akan **100% langsung muncul otomatis** di daftar Printer OmniPDF Studio!
- Unit **Scanner Wireless (All-in-One Printer/Scanner)** yang terhubung di Wi-Fi Anda juga langsung muncul otomatis tanpa perlu ketik IP!
