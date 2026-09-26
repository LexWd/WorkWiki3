import React, { useState } from 'react';
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
  Laptop
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
}

export const UpdateManagerModal: React.FC<UpdateManagerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenBackupModal,
  initialCheckResult,
}) => {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(initialCheckResult || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    setStatusMessage(null);
    soundService.playClick(settings.soundEffects);

    try {
      const res = await updateManager.checkForUpdates();
      setCheckResult(res);
      if (!res.hasUpdate) {
        setStatusMessage('У вас установлена самая актуальная версия QuickReply Desk.');
      }
    } catch {
      setStatusMessage('Не удалось связаться с сервером обновлений. Проверьте соединение.');
    } finally {
      setChecking(false);
    }
  };

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    soundService.playSuccess(settings.soundEffects);
    setStatusMessage('Создание резервной копии и применение обновления...');

    setTimeout(async () => {
      await updateManager.applyUpdateAndReload();
    }, 700);
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
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Центр обновлений
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                  v{CURRENT_APP_VERSION}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Обновление без полной переустановки программы
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
          {/* Version status card */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-200">Текущая версия:</span>
                <span className="font-mono text-sky-300 font-bold text-xs">v{CURRENT_APP_VERSION}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Дата сборки: <span className="font-mono text-slate-300">{BUILD_DATE}</span> • Все шаблоны и настройки сохраняются
              </p>
            </div>

            <button
              type="button"
              disabled={checking || isUpdating}
              onClick={handleCheckForUpdates}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer disabled:opacity-50 shrink-0`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-sky-400' : ''}`} />
              <span>{checking ? 'Проверка...' : 'Проверить'}</span>
            </button>
          </div>

          {/* Status Alert or Update Available */}
          {checkResult?.hasUpdate ? (
            <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-sky-200 text-sm">
                    Доступна новая версия: v{checkResult.latestVersion}!
                  </h4>
                  <p className="text-xs text-sky-300/80 mt-0.5">
                    Обновление применяется мгновенно в один клик. Переустанавливать приложение не требуется.
                  </p>
                </div>
              </div>

              {checkResult.features && checkResult.features.length > 0 && (
                <div className="bg-slate-950/60 p-3 rounded-lg border border-sky-900/50 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Что нового:</span>
                  <ul className="space-y-1 text-slate-300 text-xs">
                    {checkResult.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleApplyUpdate}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all cursor-pointer ${accent.primary} hover:opacity-95 disabled:opacity-60`}
                >
                  <DownloadCloud className={`w-4 h-4 ${isUpdating ? 'animate-bounce' : ''}`} />
                  <span>{isUpdating ? 'Применение обновления...' : 'Обновить сейчас (без переустановки)'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {statusMessage || 'У вас установлена последняя версия программы. Приложение работает в оптимальном режиме.'}
              </span>
            </div>
          )}

          {/* Safe update guarantee notice */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2 text-slate-400 text-[11.5px]">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Безопасное обновление без потери данных</span>
            </div>
            <p>
              При обновлении через систему автоматической синхронизации ваши шаблоны, заметки, ссылки, пользовательские иконки и настройки сохраняются в локальном хранилище. Перед каждым обновлением автоматически создается резервная точка восстановления.
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
                  Уведомлять в панели при появлении новых функций
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
