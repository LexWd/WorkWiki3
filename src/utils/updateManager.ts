import { storage } from './storage';

export const CURRENT_APP_VERSION = '2.3.0';
export const BUILD_DATE = '2026-09-27';

export interface VersionInfo {
  version: string;
  buildDate?: string;
  minCompatibleVersion?: string;
  title?: string;
  features?: string[];
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  buildDate?: string;
  title?: string;
  features: string[];
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

export const updateManager = {
  getCurrentVersion(): string {
    return CURRENT_APP_VERSION;
  },

  getBuildDate(): string {
    return BUILD_DATE;
  },

  async checkForUpdates(): Promise<UpdateCheckResult> {
    // 1. If running in Electron desktop container, use native HTTPS IPC bridge
    if (window.electronAPI?.checkForUpdates) {
      try {
        const electronRes = await window.electronAPI.checkForUpdates();
        if (electronRes && electronRes.latestVersion) {
          const hasUpdate = compareSemver(CURRENT_APP_VERSION, electronRes.latestVersion) > 0;
          return {
            hasUpdate,
            currentVersion: CURRENT_APP_VERSION,
            latestVersion: electronRes.latestVersion,
            buildDate: electronRes.buildDate,
            title: electronRes.title,
            features: electronRes.releaseNotes ? electronRes.releaseNotes.split('\n').filter(Boolean) : [],
            checkFailed: false,
          };
        }
      } catch (err) {
        console.warn('Electron IPC update check failed:', err);
      }
    }

    // 2. Web / Browser / PWA multi-source fetch
    const baseUrl = import.meta.env.BASE_URL || './';
    const localVersionPath = baseUrl.endsWith('/') ? `${baseUrl}version.json` : `${baseUrl}/version.json`;

    // Prioritized list of endpoints to check
    const candidateUrls: string[] = [
      // Primary: raw GitHub repository (always up to date immediately on git push, has CORS *)
      'https://raw.githubusercontent.com/lexwd/WorkWiki3/main/public/version.json',
      // Secondary: GitHub Pages deployment
      'https://lexwd.github.io/WorkWiki3/version.json',
      // Tertiary: local / same-host relative path
      localVersionPath,
    ];

    let lastError: Error | null = null;

    for (const url of candidateUrls) {
      try {
        const fullUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
        const res = await fetch(fullUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const info: VersionInfo = await res.json();
        if (!info || !info.version) {
          throw new Error('Invalid version format received');
        }

        const hasUpdate = compareSemver(CURRENT_APP_VERSION, info.version) > 0;

        return {
          hasUpdate,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: info.version,
          buildDate: info.buildDate,
          title: info.title,
          features: info.features || [],
          checkFailed: false,
        };
      } catch (err: any) {
        lastError = err;
        // Continue trying next candidate
      }
    }

    console.warn('All update sources failed:', lastError);
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      features: [],
      checkFailed: true,
      errorMessage: 'Не удалось связаться с сервером обновлений. Проверьте интернет-соединение.',
    };
  },

  /**
   * Applies update without re-installing:
   * 1. Safely snapshots all user data to storage/auto-backups
   * 2. Clears stale Service Worker caches
   * 3. Triggers Service Worker update
   * 4. Reloads the window seamlessly
   */
  async applyUpdateAndReload(): Promise<void> {
    try {
      // Step 1: Auto safety snapshot
      storage.createAutoBackup(`Резервная копия перед обновлением до актуальной версии`);

      // Step 2: Clear outdated caches if in browser/PWA
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) {
          console.warn('Could not clear caches:', e);
        }
      }

      // Step 3: Service Worker update trigger
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update();
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch (e) {
          console.warn('Could not update service worker:', e);
        }
      }

      // Step 4: If Electron
      if (window.electronAPI?.applyUpdateAndReload) {
        await window.electronAPI.applyUpdateAndReload();
        return;
      }

      // Step 5: Force hard reload
      window.location.reload();
    } catch (err) {
      console.error('Error during update apply:', err);
      window.location.reload();
    }
  },
};

export const checkForUpdate = () => updateManager.checkForUpdates();
export const checkForUpdates = () => updateManager.checkForUpdates();

