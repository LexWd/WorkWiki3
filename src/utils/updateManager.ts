import { storage } from './storage';

export const CURRENT_APP_VERSION = '2.3.0';
export const BUILD_DATE = '2026-09-27';
export const GITHUB_REPO_URL = 'https://github.com/lexwd/WorkWiki3';
export const GITHUB_RELEASES_URL = 'https://github.com/lexwd/WorkWiki3/releases';

export interface VersionInfo {
  version: string;
  buildDate?: string;
  minCompatibleVersion?: string;
  title?: string;
  features?: string[];
  downloadUrl?: string;
  exeUrl?: string;
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

  getReleasesUrl(): string {
    return GITHUB_RELEASES_URL;
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
   * Performs an ultra-fast, resilient multi-source check for updates across:
   * 1. Electron Native IPC bridge (if running in desktop container)
   * 2. Raw GitHub repository branch manifest
   * 3. GitHub Pages CDN mirror
   * 4. Current host's local `/version.json` (for web/PWA deployed instances)
   * 5. GitHub Releases REST API (extracts direct .exe asset URLs)
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const isElectron = this.isElectronApp();
    const fetchedResults: VersionInfo[] = [];

    // Source A: Electron native HTTPS check (runs in main node process with custom user-agent)
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
              downloadUrl: res.downloadUrl || GITHUB_RELEASES_URL,
              exeUrl: res.exeUrl,
            };
          }
        } catch (err) {
          console.warn('Electron IPC update check warning:', err);
        }
      }
      return null;
    })();

    // Source B: Web candidate mirrors (fetched in parallel with strict 3.2s timeout)
    const baseUrl = typeof window !== 'undefined' && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : './';
    const localVersionPath = baseUrl.endsWith('/') ? `${baseUrl}version.json` : `${baseUrl}/version.json`;

    const webCandidates = [
      'https://raw.githubusercontent.com/lexwd/WorkWiki3/main/public/version.json',
      'https://lexwd.github.io/WorkWiki3/version.json',
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
            downloadUrl: data.downloadUrl || GITHUB_RELEASES_URL,
            exeUrl: data.exeUrl,
          };
        }
      } catch {
        // Silently catch individual mirror timeout or network errors
      }
      return null;
    });

    // Source C: GitHub Releases public API
    const githubReleasePromise = (async (): Promise<VersionInfo | null> => {
      try {
        const res = await fetchWithTimeout('https://api.github.com/repos/lexwd/WorkWiki3/releases/latest', 3200);
        if (!res.ok) return null;
        const release = await res.json();
        if (release && release.tag_name) {
          const ver = release.tag_name.replace(/^v/, '');
          const exeAsset = Array.isArray(release.assets)
            ? release.assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.exe'))
            : null;
          return {
            version: ver,
            buildDate: release.published_at ? release.published_at.slice(0, 10) : undefined,
            title: release.name || `WorkWiki 3 v${ver}`,
            features: release.body
              ? release.body.split('\n').map((s: string) => s.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
              : [],
            downloadUrl: release.html_url || GITHUB_RELEASES_URL,
            exeUrl: exeAsset ? exeAsset.browser_download_url : undefined,
          };
        }
      } catch {
        // Rate-limit or 404 is acceptable
      }
      return null;
    })();

    // Run all checks in parallel
    const allResults = await Promise.allSettled([
      electronPromise,
      ...webPromises,
      githubReleasePromise,
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
        downloadUrl: GITHUB_RELEASES_URL,
        isElectron,
        checkFailed: true,
        errorMessage: 'Не удалось связаться с серверами обновлений. Проверьте интернет-соединение или страницу релизов на GitHub.',
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
      downloadUrl: highest.downloadUrl || GITHUB_RELEASES_URL,
      exeUrl: highest.exeUrl,
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
