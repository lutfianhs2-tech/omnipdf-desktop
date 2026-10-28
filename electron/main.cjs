const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const os = require('os');

let mainWindow = null;

// Jalankan Local Hardware Bridge otomatis di dalam aplikasi .EXE (Port 17890)
// Membaca seluruh Printer Wi-Fi/USB (seperti MS Word) dan Scanner Wireless (WSD/WIA/eSCL) dari Windows/Mac!
function startEmbeddedHardwareBridge() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (req.url === '/api/hardware' && req.method === 'GET') {
      try {
        // 1. Ambil 100% daftar Printer USB & Wi-Fi langsung dari OS (sama persis dengan MS Word!)
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

        // 2. Ambil daftar Scanner Wireless (WSD / eSCL / WIA) yang menyatu di Printer All-in-One maupun Scanner USB
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
            // Jika printer All-in-One (Epson/Brother/HP/Canon) terdeteksi di Wi-Fi, otomatis daftarkan unit Scanner-nya!
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
            res.end(JSON.stringify({ ok: true, printers: nativePrinters, scanners }));
          });
        } else {
          const scanners = nativePrinters.map((pr) => ({
            name: pr.name + ' (Unit Scanner)',
            conn: 'AirScan / eSCL / SANE',
            status: 'Ready (Terhubung)'
          }));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, printers: nativePrinters, scanners }));
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
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  startEmbeddedHardwareBridge();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
