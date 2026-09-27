const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Path to save window bounds
function getWindowStatePath() {
  const newPath = path.join(app.getPath('userData'), 'workwiki-window-state.json');
  const oldPath = path.join(app.getPath('userData'), 'quickreply-window-state.json');
  if (!fs.existsSync(newPath) && fs.existsSync(oldPath)) {
    try {
      fs.copyFileSync(oldPath, newPath);
    } catch {
      // Ignore migration error
    }
  }
  return newPath;
}

function loadWindowState() {
  try {
    const data = fs.readFileSync(getWindowStatePath(), 'utf8');
    return JSON.parse(data);
  } catch {
    return { width: 1280, height: 820, isMaximized: false };
  }
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const isMaximized = mainWindow.isMaximized();
    if (!isMaximized) {
      const bounds = mainWindow.getBounds();
      fs.writeFileSync(
        getWindowStatePath(),
        JSON.stringify({ ...bounds, isMaximized: false }),
        'utf8'
      );
    } else {
      fs.writeFileSync(
        getWindowStatePath(),
        JSON.stringify({ isMaximized: true }),
        'utf8'
      );
    }
  } catch (err) {
    console.error('Failed to save window state:', err);
  }
}

function createWindow() {
  const state = loadWindowState();

  // Validate bounds against current displays to avoid opening off-screen
  let { width = 1280, height = 820, x, y } = state;
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;

  if (x === undefined || y === undefined || x < workArea.x || x > workArea.x + workArea.width - 100) {
    x = Math.max(workArea.x, Math.floor(workArea.x + (workArea.width - width) / 2));
    y = Math.max(workArea.y, Math.floor(workArea.y + (workArea.height - height) / 2));
  }

  const iconPath = path.join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    title: 'WorkWiki 3',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  // Load the built SPA or local dev server
  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Intercept navigation & open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!isDev || !url.startsWith('http://localhost:3000')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    }
  });

  // Track window resizing and state
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      // If operator closes, minimize to tray for quick background access
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    saveWindowState();
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  createTray();
}

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, '../public/icon.png');
  // If icon exists use it, or fallback
  try {
    tray = new Tray(iconPath);
  } catch {
    // If PNG is missing or fails on some Linux runners, fallback gracefully
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Показать WorkWiki 3',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Закрепить поверх всех окон',
      type: 'checkbox',
      checked: mainWindow ? mainWindow.isAlwaysOnTop() : false,
      click: (item) => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(item.checked);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('WorkWiki 3 — Панель быстрых ответов и заметок');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

// Second instance focus
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Register Global Hotkey to summon / hide WorkWiki 3 anywhere in Windows
  try {
    globalShortcut.register('CommandOrControl+Alt+Q', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('Could not register global shortcut:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  saveWindowState();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Communications
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('window-toggle-always-on-top', () => {
  if (!mainWindow) return false;
  const current = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!current);
  return !current;
});

ipcMain.handle('window-get-always-on-top', () => {
  return mainWindow ? mainWindow.isAlwaysOnTop() : false;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  const https = require('https');
  const urls = [
    'https://lexwd.github.io/WorkWiki3/version.json',
    'https://raw.githubusercontent.com/lexwd/WorkWiki3/main/public/version.json',
  ];

  const fetchJson = (url) =>
    new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent': `WorkWiki3/${app.getVersion() || '2.3.1'}`,
            'Cache-Control': 'no-cache',
            Accept: 'application/json',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            fetchJson(res.headers.location).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(4000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });

  // Try mirrors in parallel
  const attempts = await Promise.allSettled(urls.map((u) => fetchJson(u)));
  for (const attempt of attempts) {
    if (attempt.status === 'fulfilled' && attempt.value) {
      const data = attempt.value;
      if (data && data.version) {
        return {
          latestVersion: data.version,
          buildDate: data.buildDate,
          title: data.title || `WorkWiki 3 v${data.version}`,
          releaseNotes: Array.isArray(data.features) ? data.features.join('\n') : (data.releaseNotes || ''),
          downloadUrl: data.downloadUrl || 'https://lexwd.github.io/WorkWiki3/WorkWiki-3-Setup.exe',
          exeUrl: data.exeUrl || 'https://lexwd.github.io/WorkWiki3/WorkWiki-3-Setup.exe',
          pageUrl: data.pageUrl || 'https://lexwd.github.io/WorkWiki3/',
          actionsUrl: data.actionsUrl || 'https://github.com/lexwd/WorkWiki3/actions',
        };
      }
    }
  }

  return null;
});

// Download updated .exe file directly to Downloads directory
ipcMain.handle('download-update-exe', async (_event, { url, fileName }) => {
  const https = require('https');
  const http = require('http');
  const targetFileName = fileName || `WorkWiki-3-Setup-${Date.now()}.exe`;
  const downloadsDir = app.getPath('downloads');
  const destPath = path.join(downloadsDir, targetFileName);

  const downloadWithRedirect = (targetUrl, redirectCount = 0) =>
    new Promise((resolve, reject) => {
      if (redirectCount > 6) {
        return reject(new Error('Слишком много перенаправлений (redirect loop)'));
      }

      const client = targetUrl.startsWith('https:') ? https : http;
      const req = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent': `WorkWiki3/${app.getVersion() || '2.3.1'}`,
            Accept: '*/*',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return resolve(downloadWithRedirect(res.headers.location, redirectCount + 1));
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`Сервер вернул статус HTTP ${res.statusCode}`));
          }

          const total = parseInt(res.headers['content-length'] || '0', 10);
          let received = 0;
          const fileStream = fs.createWriteStream(destPath);

          res.on('data', (chunk) => {
            received += chunk.length;
            fileStream.write(chunk);
            if (total > 0 && mainWindow) {
              const percent = Math.min(100, Math.round((received / total) * 100));
              mainWindow.webContents.send('update-download-progress', { received, total, percent });
            }
          });

          res.on('end', () => {
            fileStream.end(() => {
              resolve({ success: true, filePath: destPath, fileName: targetFileName });
            });
          });

          res.on('error', (err) => {
            fileStream.close();
            try { fs.unlinkSync(destPath); } catch {}
            reject(err);
          });
        }
      );

      req.on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch {}
        reject(err);
      });

      req.setTimeout(60000, () => {
        req.destroy();
        try { fs.unlinkSync(destPath); } catch {}
        reject(new Error('Превышено время ожидания скачивания'));
      });
    });

  try {
    return await downloadWithRedirect(url);
  } catch (err) {
    console.error('Download update failed:', err);
    return { success: false, error: err.message };
  }
});

// 1-Click Update and Restart: closes current app, runs Setup silently (/S), and automatically relaunches new version
async function executeSilentInstallAndRestart(installerPath) {
  if (!installerPath || !fs.existsSync(installerPath)) {
    return false;
  }

  const { spawn } = require('child_process');
  try {
    const tempDir = app.getPath('temp');
    const updaterBatPath = path.join(tempDir, `workwiki-update-${Date.now()}.cmd`);

    const defaultInstallExe = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'workwiki-3', 'WorkWiki 3.exe');
    const targetExe = fs.existsSync(defaultInstallExe) ? defaultInstallExe : (app.isPackaged ? process.execPath : defaultInstallExe);

    const batContent = [
      '@echo off',
      'chcp 65001 >nul',
      'timeout /t 2 /nobreak >nul',
      `start /wait "" "${installerPath}" /S`,
      'timeout /t 1 /nobreak >nul',
      `if exist "${defaultInstallExe}" (`,
      `    start "" "${defaultInstallExe}"`,
      ') else (',
      `    start "" "${targetExe}"`,
      ')',
      '(goto) 2>nul & del "%~f0"',
    ].join('\r\n');

    fs.writeFileSync(updaterBatPath, batContent, 'utf8');

    const child = spawn('cmd.exe', ['/c', updaterBatPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    setTimeout(() => {
      isQuitting = true;
      app.quit();
    }, 400);

    return true;
  } catch (err) {
    console.error('Failed to execute 1-click update:', err);
    try {
      shell.openPath(installerPath);
      setTimeout(() => {
        isQuitting = true;
        app.quit();
      }, 500);
      return true;
    } catch {
      return false;
    }
  }
}

ipcMain.handle('install-update-and-restart', async (_event, installerPath) => {
  return await executeSilentInstallAndRestart(installerPath);
});

ipcMain.handle('install-update-exe', async (_event, filePath) => {
  return await executeSilentInstallAndRestart(filePath);
});

ipcMain.handle('open-downloaded-folder', (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  const downloadsDir = app.getPath('downloads');
  shell.openPath(downloadsDir);
  return true;
});

ipcMain.handle('clipboard-write-text', (_event, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(text || '');
  return true;
});

ipcMain.handle('open-external-url', (_event, url) => {
  if (url && typeof url === 'string') {
    shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('apply-update-and-reload', () => {
  if (mainWindow) {
    mainWindow.webContents.reloadIgnoringCache();
  }
});

