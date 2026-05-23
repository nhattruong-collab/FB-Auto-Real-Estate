const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startAutomation: (config) => ipcRenderer.invoke('start-automation', config),
  onLog: (callback) => ipcRenderer.on('automation-log', (_event, value) => callback(value)),
  stopAutomation: () => ipcRenderer.send('stop-automation')
});
