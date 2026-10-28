const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const os = require('os');

let mainWindow = null;

// ============================================================================
// OPSI UPDATE INSTAN (HYBRID CLOUD UI):
// Jika Anda mengisi URL Cloudflare Pages Anda di bawah ini (misal: 'https://omnipdf-studio.pages.dev'),
// maka aplikasi .EXE akan otomatis memuat tampilan terbaru dari Cloudflare saat ada internet,
// dan otomatis kembali ke file lokal (offline) jika sedang tidak ada internet!
// ============================================================================
const CLOUDFLARE_LIVE_URL = process.env.OMNIPDF_CLOUD_URL || '';

// Jalankan Local Hardware Bridge otomatis di dalam aplikasi .EXE (Port 17890)
function startEmbeddedHardwareBridge() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    // Endpoint Cek Update Aplikasi dari dalam UI
    if (req.url === '/api/check-update' && req.method === 'GET') {
      try {
        autoUpdater.checkForUpdatesAndNotify();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, currentVersion: app.getVersion(), status: 'Memeriksa pembaruan di GitHub Releases...' }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, currentVersion: app.getVersion(), status: 'Mode lokal aktif' }));
      }
      return;
    }

    if (req.url === '/api/hardware' && req.method === 'GET') {
      try {
        let nativePrinters = [];
        if (mainWindow && mainWindow.webContents) {
          const list = await mainWindow.webContents.getPrintersAsync();
          nativePrinters = list.map((p) => ({
            name: p.displayName || p.name,
            port: p.options?.['printer-location'] || (p.isDefault ? 'Default OS Printer (Wi-Fi / USB)' : 'OS Print Spooler'),
            driver: p.description || 'Native OS Driver',
            status: p.status === 0 ? 'Ready (Terhubung Otomatis)' : 'Online',
            toner: 100
          }));
        }

        if (os.platform() === 'win32') {
          const psCmd = `powershell -NoProfile -Command "$sc = Get-PnpDevice -Class Image -Status OK -ErrorAction SilentlyContinue | Select-Object FriendlyName, Status; $sc | ConvertTo-Json -Compress"`;
          exec(psCmd, { timeout: 3500 }, (err, stdout) => {
            let scanners = [];
            if (!err && stdout && stdout.trim()) {
              try {
                const parsed = JSON.parse(stdout.trim());
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                scanners = arr.map((s) => ({
                  name: s.FriendlyName || 'Scanner Wireless / USB',
                  conn: 'Windows WIA / WSD Wireless Scanner',
                  status: 'Ready (Terhubung Otomatis)'
                }));
              } catch (e) {}
            }
            nativePrinters.forEach((pr) => {
              const lower = pr.name.toLowerCase();
              if (!lower.includes('microsoft') && !lower.includes('pdf') && !lower.includes('onenote') && !lower.includes('fax')) {
                if (!scanners.some((s) => s.name.includes(pr.name))) {
                  scanners.push({
                    name: pr.name + ' (Unit Scanner All-in-One)',
                    conn: 'Wi-Fi / WSD / eSCL Multi-Function Printer',
                    status: 'Ready (Wireless Terhubung)'
                  });
                }
              }
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, appVersion: app.getVersion(), printers: nativePrinters, scanners }));
          });
        } else {
          const scanners = nativePrinters.map((pr) => ({
            name: pr.name + ' (Unit Scanner)',
            conn: 'AirScan / eSCL / SANE',
            status: 'Ready (Terhubung)'
          }));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, appVersion: app.getVersion(), printers: nativePrinters, scanners }));
        }
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, printers: [], scanners: [] }));
      }
      return;
    }

    if (req.url === '/api/print' && req.method === 'POST') {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.print({ silent: false, printBackground: true });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(17890, '127.0.0.1', () => {});
}

// Konfigurasi Auto-Updater Resmi (OTA via GitHub Releases)
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Pembaruan OmniPDF Studio Tersedia!',
      message: `Versi terbaru (v${info.version}) telah selesai diunduh di latar belakang. Apakah Anda ingin me-restart aplikasi sekarang untuk menerapkan update?`,
      buttons: ['Restart & Update Sekarang', 'Nanti Saja']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // Cek update otomatis 3 detik setelah aplikasi dibuka
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 3000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'OmniPDF Studio Desktop',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (CLOUDFLARE_LIVE_URL) {
    // Mode Hybrid: Muat UI terbaru dari Cloudflare Pages, jika gagal/offline otomatis pakai file lokal!
    mainWindow.loadURL(CLOUDFLARE_LIVE_URL).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  startEmbeddedHardwareBridge();
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
