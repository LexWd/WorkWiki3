import { storage } from './storage';

export const CURRENT_APP_VERSION = '2.3.1';
export const BUILD_DATE = '2026-09-27';
export const GITHUB_REPO_URL = 'https://github.com/lexwd/WorkWiki3';
export const GITHUB_PAGE_URL = 'https://lexwd.github.io/WorkWiki3/';
export const GITHUB_ACTIONS_URL = 'https://github.com/lexwd/WorkWiki3/actions';
export const GITHUB_SETUP_DOWNLOAD_URL = 'https://lexwd.github.io/WorkWiki3/WorkWiki-3-Setup.exe';

export interface ParsedVersion {
  parts: number[];
  build: number;
  prerelease: string | null;
  raw: string;
}

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
  source?: string;
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
  cached?: boolean;
}

/**
 * Robust semver parser:
 * Handles: "2.3.1", "v2.3.1", "2.3.1+1", "2.3.1.1", "v2.3.2-beta", etc.
 */
export function parseVersion(v: string): ParsedVersion {
  if (!v) return { parts: [0], build: 0, prerelease: null, raw: '' };
  const raw = String(v).trim();
  let cleaned = raw.replace(/^v/i, '').trim();

  // Extract build metadata e.g. "+1", "+build23"
  let build = 0;
  if (cleaned.includes('+')) {
    const [base, b] = cleaned.split('+');
    cleaned = base;
    build = parseInt(b, 10) || 0;
  }

  // Extract prerelease e.g. "-alpha", "-beta.1"
  let prerelease: string | null = null;
  if (cleaned.includes('-')) {
    const [base, pre] = cleaned.split('-');
    cleaned = base;
    prerelease = pre;
  }

  // Extract all numeric segments (e.g. 2.3.1 or 2.3.1.1)
  const parts = cleaned.split('.').map((p) => parseInt(p, 10) || 0);

  return { parts, build, prerelease, raw };
}

/**
 * Compares two semantic versions.
 * Returns:
 *   1 if target > current (target is strictly newer -> update available)
 *  -1 if target < current (target is older)
 *   0 if target == current (identical -> no update needed)
 */
export function compareSemver(current: string, target: string): number {
  const c = parseVersion(current);
  const t = parseVersion(target);

  const maxLen = Math.max(c.parts.length, t.parts.length);
  for (let i = 0; i < maxLen; i++) {
    const cp = c.parts[i] || 0;
    const tp = t.parts[i] || 0;
    if (tp !== cp) {
      return tp > cp ? 1 : -1;
    }
  }

  // If major.minor.patch are equal, compare build number (e.g. 2.3.1+2 > 2.3.1+1 > 2.3.1)
  if (t.build !== c.build) {
    return t.build > c.build ? 1 : -1;
  }

  // If numeric parts and build are equal, a release is newer than a prerelease (2.3.1 > 2.3.1-beta)
  if (c.prerelease && !t.prerelease) return 1;
  if (!c.prerelease && t.prerelease) return -1;

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

// In-flight promise deduplication and cooldown cache to prevent loop-fetching
let inFlightCheckPromise: Promise<UpdateCheckResult> | null = null;
let lastCheckTime = 0;
let lastCheckResult: UpdateCheckResult | null = null;
const CACHE_TTL_MS = 10000; // 10-second deduplication cache

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
   * Resilient, loop-protected check for updates:
   * 1. Returns cached result if called repeatedly within 10 seconds (unless forced)
   * 2. Deduplicates concurrent in-flight requests to a single Promise
   * 3. Queries repository actions, GitHub Pages manifest, raw repo branch and repository tags
   * 4. Accurately compares against CURRENT_APP_VERSION (2.3.1)
   */
  async checkForUpdates(force = false): Promise<UpdateCheckResult> {
    const now = Date.now();

    // Loop prevention 1: Return fresh cache if within TTL and not explicitly forced
    if (!force && lastCheckResult && now - lastCheckTime < CACHE_TTL_MS) {
      return { ...lastCheckResult, cached: true };
    }

    // Loop prevention 2: In-flight deduplication (join existing network request)
    if (inFlightCheckPromise) {
      return inFlightCheckPromise;
    }

    inFlightCheckPromise = (async () => {
      try {
        const result = await this.executeMultiSourceCheck();
        lastCheckResult = result;
        lastCheckTime = Date.now();
        return result;
      } finally {
        inFlightCheckPromise = null;
      }
    })();

    return inFlightCheckPromise;
  },

  async executeMultiSourceCheck(): Promise<UpdateCheckResult> {
    const isElectron = this.isElectronApp();
    const fetchedResults: VersionInfo[] = [];

    // Source A: Electron native HTTPS bridge
    const electronPromise = (async (): Promise<VersionInfo | null> => {
      if (typeof window !== 'undefined' && window.electronAPI?.checkForUpdates) {
        try {
          const res = await window.electronAPI.checkForUpdates();
          if (res && res.latestVersion) {
            return {
              version: String(res.latestVersion).trim(),
              buildDate: res.buildDate,
              title: res.title,
              features: res.releaseNotes ? res.releaseNotes.split('\n').filter(Boolean) : [],
              downloadUrl: res.downloadUrl || GITHUB_SETUP_DOWNLOAD_URL,
              exeUrl: res.exeUrl || GITHUB_SETUP_DOWNLOAD_URL,
              pageUrl: GITHUB_PAGE_URL,
              actionsUrl: GITHUB_ACTIONS_URL,
              source: 'electron-ipc',
            };
          }
        } catch (err) {
          console.warn('Electron IPC update check warning:', err);
        }
      }
      return null;
    })();

    // Source B: GitHub Pages CDN & Raw GitHub Repository
    const baseUrl = typeof window !== 'undefined' && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : './';
    const localVersionPath = baseUrl.endsWith('/') ? `${baseUrl}version.json` : `${baseUrl}/version.json`;

    const webCandidates = [
      { url: 'https://lexwd.github.io/WorkWiki3/version.json', source: 'github-pages' },
      { url: 'https://raw.githubusercontent.com/lexwd/WorkWiki3/main/public/version.json', source: 'github-raw' },
    ];

    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      webCandidates.push({ url: localVersionPath, source: 'local-host' });
    }

    const webPromises = webCandidates.map(async (item): Promise<VersionInfo | null> => {
      try {
        const res = await fetchWithTimeout(item.url, 3200);
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
            source: item.source,
          };
        }
      } catch {
        // Silently ignore individual mirror timeout
      }
      return null;
    });

    // Source C: Repository Tags from GitHub API (identifies tags like v2.3.2, 2.3.1.1, etc.)
    const tagsPromise = (async (): Promise<VersionInfo | null> => {
      try {
        const res = await fetchWithTimeout('https://api.github.com/repos/lexwd/WorkWiki3/tags', 3000);
        if (!res.ok) return null;
        const tags = await res.json();
        if (Array.isArray(tags) && tags.length > 0) {
          // Sort tags by semver descending
          const sortedTags = tags
            .filter((t) => t && t.name)
            .sort((a, b) => compareSemver(a.name, b.name));

          const latestTag = sortedTags[sortedTags.length - 1];
          if (latestTag && latestTag.name) {
            const cleanTag = latestTag.name.replace(/^v/i, '').trim();
            return {
              version: cleanTag,
              title: `WorkWiki 3 v${cleanTag}`,
              downloadUrl: GITHUB_SETUP_DOWNLOAD_URL,
              exeUrl: GITHUB_SETUP_DOWNLOAD_URL,
              pageUrl: GITHUB_PAGE_URL,
              actionsUrl: GITHUB_ACTIONS_URL,
              source: 'github-tags',
            };
          }
        }
      } catch {
        // API rate-limit or network errors silently handled
      }
      return null;
    })();

    // Run all checks in parallel with Promise.allSettled
    const allResults = await Promise.allSettled([
      electronPromise,
      ...webPromises,
      tagsPromise,
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

    // Sort to identify the absolute highest version among all mirrors and tags
    fetchedResults.sort((a, b) => compareSemver(a.version, b.version));
    const highest = fetchedResults[fetchedResults.length - 1];

    // Compare with CURRENT_APP_VERSION (2.3.1)
    // Only true if highest.version is strictly newer than CURRENT_APP_VERSION
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
      try {
        storage.createAutoBackup(`Резервная копия перед обновлением до v${targetVersion || CURRENT_APP_VERSION}`);
      } catch (backupErr) {
        console.warn('Backup before update warning:', backupErr);
      }

      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('workwiki_just_updated', targetVersion || CURRENT_APP_VERSION);
      }

      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) {
          console.warn('Could not clear CacheStorage:', e);
        }
      }

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

      if (typeof window !== 'undefined' && window.electronAPI?.applyUpdateAndReload) {
        await window.electronAPI.applyUpdateAndReload();
        return;
      }

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

  async downloadExeUpdate(
    url: string,
    fileName?: string
  ): Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }> {
    if (typeof window !== 'undefined' && window.electronAPI?.downloadUpdateExe) {
      return await window.electronAPI.downloadUpdateExe({ url, fileName });
    }
    return { success: false, error: 'Доступно только в настольном приложении Windows' };
  },

  async installExeUpdate(filePath: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electronAPI?.installUpdateAndRestart) {
      return await window.electronAPI.installUpdateAndRestart(filePath);
    } else if (typeof window !== 'undefined' && window.electronAPI?.installUpdateExe) {
      return await window.electronAPI.installUpdateExe(filePath);
    }
    return false;
  },

  async installUpdateAndRestart(installerPath: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electronAPI?.installUpdateAndRestart) {
      return await window.electronAPI.installUpdateAndRestart(installerPath);
    } else if (typeof window !== 'undefined' && window.electronAPI?.installUpdateExe) {
      return await window.electronAPI.installUpdateExe(installerPath);
    }
    return false;
  },

  async openDownloadedFolder(filePath?: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electronAPI?.openDownloadedFolder) {
      return await window.electronAPI.openDownloadedFolder(filePath || '');
    }
    return false;
  },
};

export const checkForUpdate = (force = false) => updateManager.checkForUpdates(force);
export const checkForUpdates = (force = false) => updateManager.checkForUpdates(force);
