const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { runAutomation } = require('./automation');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Tải giao diện Next.js chạy ở localhost:3000 thay vì file html
  mainWindow.loadURL('http://localhost:3000');
  
  // Mở DevTools để bạn dễ debug nếu cần
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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
