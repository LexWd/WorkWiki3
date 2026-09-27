const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window-toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('window-get-always-on-top'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  applyUpdateAndReload: () => ipcRenderer.invoke('apply-update-and-reload'),
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard-write-text', text),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  downloadUpdateExe: (opts) => ipcRenderer.invoke('download-update-exe', opts),
  installUpdateExe: (filePath) => ipcRenderer.invoke('install-update-exe', filePath),
  openDownloadedFolder: (filePath) => ipcRenderer.invoke('open-downloaded-folder', filePath),
  onDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
});
