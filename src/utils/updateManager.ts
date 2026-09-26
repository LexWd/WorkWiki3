import { storage } from './storage';

export const CURRENT_APP_VERSION = '2.1.0';
export const BUILD_DATE = '2026-09-26';

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
}

function compareSemver(current: string, target: string): number {
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
    try {
      // 1. If in Electron and electronAPI provides update check
      if (window.electronAPI?.checkForUpdates) {
        try {
          const electronRes = await window.electronAPI.checkForUpdates();
          if (electronRes && electronRes.latestVersion) {
            const hasUpdate = compareSemver(CURRENT_APP_VERSION, electronRes.latestVersion) > 0;
            return {
              hasUpdate,
              currentVersion: CURRENT_APP_VERSION,
              latestVersion: electronRes.latestVersion,
              features: electronRes.releaseNotes ? [electronRes.releaseNotes] : [],
            };
          }
        } catch {
          // Fallback to fetch
        }
      }

      // 2. Web / PWA version check via version.json with cache buster (supports GitHub Pages subpaths)
      const baseUrl = import.meta.env.BASE_URL || './';
      const versionPath = baseUrl.endsWith('/') ? `${baseUrl}version.json` : `${baseUrl}/version.json`;
      const res = await fetch(`${versionPath}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch version.json: ${res.status}`);
      }

      const info: VersionInfo = await res.json();
      const hasUpdate = compareSemver(CURRENT_APP_VERSION, info.version) > 0;

      return {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: info.version,
        buildDate: info.buildDate,
        title: info.title,
        features: info.features || [],
      };
    } catch (err) {
      console.warn('Update check failed:', err);
      return {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        features: [],
      };
    }
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

