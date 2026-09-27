import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  DownloadCloud, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  HardDrive,
  ExternalLink,
  Laptop,
  Globe,
  FolderOpen,
  Play,
  FileDown
} from 'lucide-react';
import { GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { updateManager, CURRENT_APP_VERSION, BUILD_DATE, UpdateCheckResult } from '../utils/updateManager';
import { soundService } from '../utils/sound';

interface UpdateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GuiSettings;
  onUpdateSettings?: (partial: Partial<GuiSettings>) => void;
  onOpenBackupModal?: () => void;
  initialCheckResult?: UpdateCheckResult | null;
  onToast?: (title: string, message: string) => void;
}

export const UpdateManagerModal: React.FC<UpdateManagerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenBackupModal,
  initialCheckResult,
  onToast,
}) => {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(initialCheckResult || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatePhase, setUpdatePhase] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Desktop .exe download state
  const [isDownloadingExe, setIsDownloadingExe] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadProgressText, setDownloadProgressText] = useState<string>('');
  const [downloadedExePath, setDownloadedExePath] = useState<string | null>(null);
  const [downloadedExeName, setDownloadedExeName] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isElectron = updateManager.isElectronApp();

  // Listen to download progress from Electron IPC if available
  useEffect(() => {
    if (!isOpen || !window.electronAPI?.onDownloadProgress) return;

    const cleanup = window.electronAPI.onDownloadProgress((prog) => {
      setDownloadProgress(prog.percent);
      const receivedMB = (prog.received / (1024 * 1024)).toFixed(1);
      const totalMB = prog.total > 0 ? (prog.total / (1024 * 1024)).toFixed(1) : '?';
      setDownloadProgressText(`${receivedMB} МБ из ${totalMB} МБ (${prog.percent}%)`);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    setStatusMessage(null);
    setDownloadError(null);
    soundService.playClick(settings.soundEffects);

    try {
      const res = await updateManager.checkForUpdates();
      setCheckResult(res);
      if (res.checkFailed) {
        setStatusMessage(res.errorMessage || 'Не удалось связаться с серверами обновлений.');
      } else if (!res.hasUpdate) {
        setStatusMessage(`У вас установлена самая актуальная версия WorkWiki 3 (v${CURRENT_APP_VERSION}).`);
      }
    } catch {
      setStatusMessage('Не удалось связаться с сервером обновлений. Проверьте соединение.');
    } finally {
      setChecking(false);
    }
  };

  // Web / PWA instant update without re-installing
  const handleApplyWebUpdate = async () => {
    setIsUpdating(true);
    soundService.playSuccess(settings.soundEffects);

    setUpdatePhase('Создание резервной точки восстановления...');
    await new Promise((r) => setTimeout(r, 450));

    setUpdatePhase('Очистка кэша и синхронизация сервисов...');
    await new Promise((r) => setTimeout(r, 450));

    setUpdatePhase('Перезагрузка с актуальными файлами...');
    await new Promise((r) => setTimeout(r, 350));

    await updateManager.applyUpdateAndReload(checkResult?.latestVersion);
  };

  // Desktop .exe direct download inside the app or browser
  const handleDownloadExe = async () => {
    if (!checkResult) return;
    soundService.playClick(settings.soundEffects);
    setDownloadError(null);

    // If running inside desktop Electron app
    if (isElectron && window.electronAPI?.downloadUpdateExe) {
      setIsDownloadingExe(true);
      setDownloadProgress(0);
      setDownloadProgressText('Подготовка к загрузке...');

      const targetFileName = `WorkWiki-3-Portable-${checkResult.latestVersion}.exe`;
      // Determine download URL (direct exeUrl from GitHub Release, or construct raw/releases asset)
      const downloadTargetUrl =
        checkResult.exeUrl ||
        `https://github.com/lexwd/WorkWiki3/releases/download/v${checkResult.latestVersion}/${targetFileName}`;

      const res = await updateManager.downloadExeUpdate(downloadTargetUrl, targetFileName);

      setIsDownloadingExe(false);

      if (res.success && res.filePath) {
        soundService.playSuccess(settings.soundEffects);
        setDownloadedExePath(res.filePath);
        setDownloadedExeName(res.fileName || targetFileName);
        if (onToast) {
          onToast('Файл скачан', `Файл ${res.fileName} готов к запуску в папке Загрузки.`);
        }
      } else {
        setDownloadError(res.error || 'Не удалось скачать файл напрямую. Открываем страницу загрузки...');
        // Fallback to opening external link
        updateManager.openExternalUrl(checkResult.downloadUrl || updateManager.getReleasesUrl());
      }
    } else {
      // In web browser: open direct exe download or GitHub Releases page
      const url = checkResult.exeUrl || checkResult.downloadUrl || updateManager.getReleasesUrl();
      updateManager.openExternalUrl(url);
      if (onToast) {
        onToast('Загрузка EXE', 'Начато скачивание файла через браузер.');
      }
    }
  };

  const handleLaunchDownloadedExe = async () => {
    if (!downloadedExePath) return;
    soundService.playSuccess(settings.soundEffects);
    const launched = await updateManager.installExeUpdate(downloadedExePath);
    if (!launched) {
      await updateManager.openDownloadedFolder(downloadedExePath);
    }
  };

  const handleOpenDownloadedFolder = async () => {
    soundService.playClick(settings.soundEffects);
    await updateManager.openDownloadedFolder(downloadedExePath || undefined);
  };

  const handleOpenReleases = () => {
    soundService.playClick(settings.soundEffects);
    updateManager.openExternalUrl(checkResult?.downloadUrl || updateManager.getReleasesUrl());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-lg rounded-2xl border ${theme.border} ${theme.panel} shadow-2xl flex flex-col max-h-[92vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent.primary} shadow-md`}>
              <RefreshCw className={`w-5 h-5 ${checking ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Центр обновлений WorkWiki 3</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                  v{CURRENT_APP_VERSION}
                </span>
                <span className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-semibold border flex items-center gap-1 ${
                  isElectron 
                    ? 'bg-purple-950/40 text-purple-300 border-purple-800/60' 
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                }`}>
                  {isElectron ? <Laptop className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  {isElectron ? 'Windows EXE' : 'Веб / PWA'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Безопасное обновление с сохранением всех шаблонов и настроек
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Current Version Card */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-200">Текущая версия:</span>
                <span className="font-mono text-sky-300 font-bold text-xs">v{CURRENT_APP_VERSION}</span>
                <span className="text-[10px] text-slate-500">•</span>
                <span className="text-[11px] text-slate-400 font-mono">{BUILD_DATE}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isElectron 
                  ? 'Запущено десктопное приложение Windows (.exe)' 
                  : 'Запущена веб-версия (синхронизация с браузером)'}
              </p>
            </div>

            <button
              type="button"
              disabled={checking || isUpdating || isDownloadingExe}
              onClick={handleCheckForUpdates}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer disabled:opacity-50 shrink-0`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-sky-400' : ''}`} />
              <span>{checking ? 'Поиск...' : 'Проверить'}</span>
            </button>
          </div>

          {/* Update Available Box */}
          {checkResult?.hasUpdate ? (
            <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sky-200 text-sm">
                      Доступна новая версия: v{checkResult.latestVersion}!
                    </h4>
                    {checkResult.buildDate && (
                      <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-sky-900/60 text-sky-300 border border-sky-800">
                        {checkResult.buildDate}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-sky-300/80 mt-1">
                    {isElectron
                      ? 'Для Windows доступен обновленный исполняемый файл (.exe).'
                      : 'Обновление веб-версии применяется мгновенно в один клик без потери данных.'}
                  </p>
                </div>
              </div>

              {/* What's new */}
              {checkResult.features && checkResult.features.length > 0 && (
                <div className="bg-slate-950/70 p-3 rounded-lg border border-sky-900/50 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Что нового в v{checkResult.latestVersion}:
                  </span>
                  <ul className="space-y-1.5 text-slate-300 text-xs">
                    {checkResult.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Download Progress Bar (When downloading .exe) */}
              {isDownloadingExe && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-500/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-sky-300 flex items-center gap-1.5">
                      <DownloadCloud className="w-4 h-4 animate-bounce text-sky-400" />
                      Загрузка Windows EXE...
                    </span>
                    <span className="font-mono text-sky-200">{downloadProgressText}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-150"
                      style={{ width: `${downloadProgress || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Download Error Banner */}
              {downloadError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{downloadError}</span>
                </div>
              )}

              {/* Downloaded Successfully Card */}
              {downloadedExePath && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Файл обновления успешно скачан!</span>
                  </div>
                  <p className="text-[11.5px] text-slate-300 font-mono break-all bg-black/40 p-2 rounded border border-emerald-900/60">
                    {downloadedExeName}
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={handleLaunchDownloadedExe}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Запустить новую версию сейчас</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenDownloadedFolder}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                      <span>Показать в Загрузках</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Web updating in-progress phase */}
              {isUpdating && updatePhase && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-500/50 flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
                  <span className="text-sky-200 font-medium text-xs">{updatePhase}</span>
                </div>
              )}

              {/* Action buttons */}
              {!downloadedExePath && (
                <div className="space-y-2 pt-1">
                  {/* Primary Action Button */}
                  {isElectron ? (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        disabled={isDownloadingExe}
                        onClick={handleDownloadExe}
                        className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all cursor-pointer ${accent.primary} hover:opacity-95 disabled:opacity-60`}
                      >
                        <FileDown className={`w-4 h-4 ${isDownloadingExe ? 'animate-bounce' : ''}`} />
                        <span>
                          {isDownloadingExe ? 'Скачивание обновления...' : `Скачать обновление Windows EXE (.exe)`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenReleases}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                        <span>GitHub Релизы</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={handleApplyWebUpdate}
                        className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all cursor-pointer ${accent.primary} hover:opacity-95 disabled:opacity-60`}
                      >
                        <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                        <span>{isUpdating ? 'Применение обновления...' : 'Обновить сейчас (без переустановки)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadExe}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer shrink-0"
                        title="Скачать нативную версию для Windows"
                      >
                        <Laptop className="w-3.5 h-3.5 text-purple-400" />
                        <span>Скачать .EXE</span>
                      </button>
                    </div>
                  )}

                  {/* Secondary option to hard reload desktop cache */}
                  {isElectron && (
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={handleApplyWebUpdate}
                        className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2 cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Перезагрузить окно с очисткой кэша</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : checkResult?.checkFailed ? (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2 text-amber-300">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {checkResult.errorMessage || 'Не удалось связаться с сервером обновлений. Проверьте соединение с интернетом.'}
                </span>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleOpenReleases}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-300 bg-slate-900 border border-slate-700 hover:border-sky-500 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>Открыть страницу релизов на GitHub</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-emerald-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {statusMessage || `У вас установлена последняя версия WorkWiki 3 (v${CURRENT_APP_VERSION}). Программа работает в оптимальном режиме.`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenReleases}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
              >
                Релизы на GitHub
              </button>
            </div>
          )}

          {/* Safe update guarantee notice */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2 text-slate-400 text-[11.5px]">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Безопасное обновление без потери данных</span>
            </div>
            <p>
              Ваши шаблоны, заметки, ссылки, категории, пользовательские иконки и персональные настройки хранятся в защищенном локальном хранилище. Перед каждым обновлением автоматически создается точка восстановления.
            </p>
            {onOpenBackupModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackupModal();
                }}
                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2 cursor-pointer pt-0.5"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Открыть управление резервными копиями (Бэкап)</span>
              </button>
            )}
          </div>

          {/* Automatic checking preference */}
          {onUpdateSettings && (
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 cursor-pointer hover:bg-slate-900/60 transition-colors">
              <input
                type="checkbox"
                checked={settings.autoCheckUpdates !== false}
                onChange={(e) => onUpdateSettings({ autoCheckUpdates: e.target.checked })}
                className="rounded border-slate-700 text-sky-500 focus:ring-sky-400/40"
              />
              <div className="flex-1">
                <span className="font-semibold text-slate-200 block text-xs">
                  Автоматически проверять обновления при запуске
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Уведомлять в шапке при появлении новых версий
                </span>
              </div>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t ${theme.border} ${theme.panelHeader} flex items-center justify-end shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
