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
  return path.join(app.getPath('userData'), 'quickreply-window-state.json');
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
    'https://raw.githubusercontent.com/lexwd/WorkWiki3/main/public/version.json',
    'https://lexwd.github.io/WorkWiki3/version.json',
  ];

  for (const url of urls) {
    try {
      const data = await new Promise((resolve, reject) => {
        const req = https.get(
          url,
          {
            headers: {
              'User-Agent': 'WorkWiki3/2.3.0',
              'Cache-Control': 'no-cache',
            },
          },
          (res) => {
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
        req.setTimeout(6000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });

      if (data && data.version) {
        return {
          latestVersion: data.version,
          buildDate: data.buildDate,
          title: data.title,
          releaseNotes: (data.features || []).join('\n'),
        };
      }
    } catch (err) {
      console.warn(`Check update failed from ${url}:`, err.message);
    }
  }
  return null;
});

ipcMain.handle('apply-update-and-reload', () => {
  if (mainWindow) {
    mainWindow.webContents.reloadIgnoringCache();
  }
});

