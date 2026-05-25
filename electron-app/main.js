const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { runAutomation, stopAutomation } = require('./automation');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow;
let nextServerProcess;
const PORT = Math.floor(Math.random() * 10000) + 10000;

function startNextServer() {
  return new Promise((resolve) => {
    const serverPath = path.join(__dirname, '..', 'server.js');
    if (!fs.existsSync(serverPath)) {
      // Dev mode: assume Next.js is running externally on 3000
      resolve();
      return;
    }

    console.log('Khởi chạy Next.js Server nội bộ tại cổng:', PORT);
    nextServerProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: PORT,
        NODE_ENV: 'production'
      }
    });

    nextServerProcess.stdout.on('data', (d) => console.log('Next:', d.toString()));
    nextServerProcess.stderr.on('data', (d) => console.error('Next Error:', d.toString()));

    const checkServer = () => {
      http.get(`http://127.0.0.1:${PORT}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) resolve();
        else setTimeout(checkServer, 200);
      }).on('error', () => setTimeout(checkServer, 200));
    };
    checkServer();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const url = fs.existsSync(path.join(__dirname, '..', 'server.js')) 
    ? `http://127.0.0.1:${PORT}` 
    : 'http://localhost:3000';

  mainWindow.loadURL(url);
}

app.whenReady().then(async () => {
  await startNextServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
  }
});

// Xử lý lệnh từ Giao diện Next.js (Frontend) gọi xuống System (Backend)
ipcMain.handle('start-automation', async (event, config) => {
  try {
    await runAutomation(config, (logMessage) => {
      // Gửi log ngược lại về giao diện
      if(mainWindow) {
        mainWindow.webContents.send('automation-log', logMessage);
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('stop-automation', () => {
  stopAutomation();
});
