import { storage } from './storage';

export const CURRENT_APP_VERSION = '2.3.1';
export const BUILD_DATE = '2026-09-27';
export const GITHUB_REPO_URL = 'https://github.com/lexwd/WorkWiki3';
export const GITHUB_PAGE_URL = 'https://lexwd.github.io/WorkWiki3/';
export const GITHUB_ACTIONS_URL = 'https://github.com/lexwd/WorkWiki3/actions';
export const GITHUB_SETUP_DOWNLOAD_URL = 'https://lexwd.github.io/WorkWiki3/WorkWiki-3-Setup.exe';

export interface VersionInfo {
  version: string;
  buildDate?: string;
  minCompatibleVersion?: string;
  title?: string;
  features?: string[];
  downloadUrl?: string;
  exeUrl?: string;
  pageUrl?: string;
  actionsUrl?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  buildDate?: string;
  title?: string;
  features: string[];
  downloadUrl?: string;
  exeUrl?: string;
  pageUrl?: string;
  actionsUrl?: string;
  isElectron: boolean;
  checkFailed?: boolean;
  errorMessage?: string;
}

export function compareSemver(current: string, target: string): number {
  const cParts = current.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const tParts = target.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(cParts.length, tParts.length); i++) {
    const c = cParts[i] || 0;
    const t = tParts[i] || 0;
    if (t > c) return 1; // target is newer
    if (t < c) return -1;
  }
  return 0;
}

/**
 * Fetch with strict timeout using AbortController to prevent hanging UI
 */
async function fetchWithTimeout(url: string, timeoutMs = 3200): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const fullUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const response = await fetch(fullUrl, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Accept: 'application/json',
      },
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export const updateManager = {
  getCurrentVersion(): string {
    return CURRENT_APP_VERSION;
  },

  getBuildDate(): string {
    return BUILD_DATE;
  },

  getPageUrl(): string {
    return GITHUB_PAGE_URL;
  },

  getActionsUrl(): string {
    return GITHUB_ACTIONS_URL;
  },

  getSetupDownloadUrl(): string {
    return GITHUB_SETUP_DOWNLOAD_URL;
  },

  isElectronApp(): boolean {
    return Boolean(typeof window !== 'undefined' && window.electronAPI?.isElectron);
  },

  openExternalUrl(url: string): void {
    if (typeof window !== 'undefined' && window.electronAPI?.openExternalUrl) {
      window.electronAPI.openExternalUrl(url);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  },

  /**
   * Multi-source check for updates across GitHub Pages CDN, Raw GitHub repo and local host:
   * 1. Electron Native IPC bridge
   * 2. GitHub Pages CDN mirror (lexwd.github.io/WorkWiki3/version.json)
   * 3. Raw GitHub repository main branch (raw.githubusercontent.com)
   * 4. Current host's local `/version.json` (for web/PWA deployed instances)
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const isElectron = this.isElectronApp();
    const fetchedResults: VersionInfo[] = [];

    // Source A: Electron native HTTPS check
    const electronPromise = (async (): Promise<VersionInfo | null> => {
      if (typeof window !== 'undefined' && window.electronAPI?.checkForUpdates) {
        try {
          const res = await window.electronAPI.checkForUpdates();
          if (res && res.latestVersion) {
            return {
              version: res.latestVersion,
              buildDate: res.buildDate,
              title: res.title,
              features: res.releaseNotes ? res.releaseNotes.split('\n').filter(Boolean) : [],
              downloadUrl: res.downloadUrl || GITHUB_SETUP_DOWNLOAD_URL,
              exeUrl: res.exeUrl || GITHUB_SETUP_DOWNLOAD_URL,
              pageUrl: GITHUB_PAGE_URL,
              actionsUrl: GITHUB_ACTIONS_URL,
            };
          }
        } catch (err) {
          console.warn('Electron IPC update check warning:', err);
        }
      }
      return null;
    })();

    // Source B: Web candidate mirrors (GitHub Pages CDN first, then Raw GitHub, then local)
    const baseUrl = typeof window !== 'undefined' && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : './';
    const localVersionPath = baseUrl.endsWith('/') ? `${baseUrl}version.json` : `${baseUrl}/version.json`;

    const webCandidates = [
      'https://lexwd.github.io/WorkWiki3/version.json',
      'https://raw.githubusercontent.com/lexwd/WorkWiki3/main/public/version.json',
    ];

    // Only add local host path if running over http/https (skip inside file://)
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      webCandidates.push(localVersionPath);
    }

    const webPromises = webCandidates.map(async (url): Promise<VersionInfo | null> => {
      try {
        const res = await fetchWithTimeout(url, 3200);
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.version) {
          return {
            version: String(data.version).trim(),
            buildDate: data.buildDate,
            title: data.title || `WorkWiki 3 v${data.version}`,
            features: Array.isArray(data.features) ? data.features : [],
            downloadUrl: data.downloadUrl || GITHUB_SETUP_DOWNLOAD_URL,
            exeUrl: data.exeUrl || GITHUB_SETUP_DOWNLOAD_URL,
            pageUrl: data.pageUrl || GITHUB_PAGE_URL,
            actionsUrl: data.actionsUrl || GITHUB_ACTIONS_URL,
          };
        }
      } catch {
        // Silently catch individual mirror timeout or network errors
      }
      return null;
    });

    // Run all checks in parallel
    const allResults = await Promise.allSettled([
      electronPromise,
      ...webPromises,
    ]);

    for (const r of allResults) {
      if (r.status === 'fulfilled' && r.value && r.value.version) {
        fetchedResults.push(r.value);
      }
    }

    if (fetchedResults.length === 0) {
      return {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        features: [],
        downloadUrl: GITHUB_SETUP_DOWNLOAD_URL,
        exeUrl: GITHUB_SETUP_DOWNLOAD_URL,
        pageUrl: GITHUB_PAGE_URL,
        actionsUrl: GITHUB_ACTIONS_URL,
        isElectron,
        checkFailed: true,
        errorMessage: 'Не удалось связаться с серверами обновлений. Проверьте интернет-соединение, страницу GitHub Pages или раздел GitHub Actions.',
      };
    }

    // Sort to pick the absolute highest version found across all mirrors
    fetchedResults.sort((a, b) => compareSemver(a.version, b.version));
    const highest = fetchedResults[fetchedResults.length - 1];

    const hasUpdate = compareSemver(CURRENT_APP_VERSION, highest.version) > 0;

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: highest.version,
      buildDate: highest.buildDate,
      title: highest.title,
      features: highest.features || [],
      downloadUrl: highest.downloadUrl || GITHUB_SETUP_DOWNLOAD_URL,
      exeUrl: highest.exeUrl || GITHUB_SETUP_DOWNLOAD_URL,
      pageUrl: highest.pageUrl || GITHUB_PAGE_URL,
      actionsUrl: highest.actionsUrl || GITHUB_ACTIONS_URL,
      isElectron,
      checkFailed: false,
    };
  },

  /**
   * Applies update without losing user data:
   * 1. Safely snapshots all user data to storage/auto-backups
   * 2. Sets notification flag for next launch
   * 3. Clears outdated CacheStorage
   * 4. Instructs Service Workers to SKIP_WAITING and update
   * 5. Forces a clean cache-busting reload of the app
   */
  async applyUpdateAndReload(targetVersion?: string): Promise<void> {
    try {
      // Step 1: Create automated backup point before applying new version
      try {
        storage.createAutoBackup(`Резервная копия перед обновлением до v${targetVersion || CURRENT_APP_VERSION}`);
      } catch (backupErr) {
        console.warn('Backup before update warning:', backupErr);
      }

      // Step 2: Set flag in sessionStorage to notify user upon reload
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('workwiki_just_updated', targetVersion || CURRENT_APP_VERSION);
      }

      // Step 3: Clear outdated CacheStorage in browser / PWA
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) {
          console.warn('Could not clear CacheStorage:', e);
        }
      }

      // Step 4: Service Worker update trigger & skip waiting
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            if (reg.active) {
              reg.active.postMessage({ type: 'SKIP_WAITING' });
            }
            await reg.update().catch(() => {});
          }
        } catch (e) {
          console.warn('Could not update service worker:', e);
        }
      }

      // Step 5: If in Electron desktop environment
      if (typeof window !== 'undefined' && window.electronAPI?.applyUpdateAndReload) {
        await window.electronAPI.applyUpdateAndReload();
        return;
      }

      // Step 6: Hard reload with cache-buster parameter in Web/PWA
      if (typeof window !== 'undefined') {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.location.href = `${cleanUrl}?_update=${Date.now()}`;
      }
    } catch (err) {
      console.error('Error during applyUpdateAndReload:', err);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  },

  /**
   * Electron-specific .exe downloader with real-time progress
   */
  async downloadExeUpdate(
    url: string,
    fileName?: string
  ): Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }> {
    if (typeof window !== 'undefined' && window.electronAPI?.downloadUpdateExe) {
      return await window.electronAPI.downloadUpdateExe({ url, fileName });
    }
    return { success: false, error: 'Доступно только в настольном приложении Windows' };
  },

  /**
   * Launches newly downloaded .exe and closes the current application
   */
  async installExeUpdate(filePath: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electronAPI?.installUpdateAndRestart) {
      return await window.electronAPI.installUpdateAndRestart(filePath);
    } else if (typeof window !== 'undefined' && window.electronAPI?.installUpdateExe) {
      return await window.electronAPI.installUpdateExe(filePath);
    }
    return false;
  },

  /**
   * 1-Click Update and Restart: closes current app, runs Setup silently (/S), and automatically relaunches new version
   */
  async installUpdateAndRestart(installerPath: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electronAPI?.installUpdateAndRestart) {
      return await window.electronAPI.installUpdateAndRestart(installerPath);
    } else if (typeof window !== 'undefined' && window.electronAPI?.installUpdateExe) {
      return await window.electronAPI.installUpdateExe(installerPath);
    }
    return false;
  },

  /**
   * Opens the download folder in Windows Explorer
   */
  async openDownloadedFolder(filePath?: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electronAPI?.openDownloadedFolder) {
      return await window.electronAPI.openDownloadedFolder(filePath || '');
    }
    return false;
  },
};

export const checkForUpdate = () => updateManager.checkForUpdates();
export const checkForUpdates = () => updateManager.checkForUpdates();
