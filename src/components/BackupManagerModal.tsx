import React, { useState, useRef } from 'react';
import {
  X,
  HardDrive,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  FileText,
  Brackets,
  Table,
  StickyNote,
  Globe,
  Settings as SettingsIcon,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { 
  Snippet, 
  PlaceholderConfig, 
  ExcelTable, 
  ResourceWidget, 
  NoteCard, 
  GuiSettings, 
  ProductivityMetrics, 
  AutoBackupPoint,
  FullBackupPayload
} from '../types';
import { storage } from '../utils/storage';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';

interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: Snippet[];
  categories: string[];
  placeholders: PlaceholderConfig[];
  tables: ExcelTable[];
  widgets: ResourceWidget[];
  resourceCategories: string[];
  notes: NoteCard[];
  settings: GuiSettings;
  metrics: ProductivityMetrics;
  onDataRestored: () => void;
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  isOpen,
  onClose,
  snippets,
  categories,
  placeholders,
  tables,
  widgets,
  resourceCategories,
  notes,
  settings,
  metrics,
  onDataRestored,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [importedFile, setImportedFile] = useState<{
    file: File;
    payload: any;
    summary: {
      snippets: number;
      categories: number;
      tables: number;
      placeholders: number;
      widgets: number;
      notes: number;
      exportedAt?: string;
      version?: string;
    };
  } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [autoBackups, setAutoBackups] = useState<AutoBackupPoint[]>(() => storage.loadAutoBackups());
  const [manualSnapshotCreated, setManualSnapshotCreated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  if (!isOpen) return null;

  const currentPayload: FullBackupPayload = {
    format: 'quickreply-desk-full-backup',
    version: '2.5-ru',
    exportedAt: new Date().toISOString(),
    snippets,
    categories,
    placeholders,
    tables,
    widgets,
    resourceCategories,
    notes,
    notesScratchpad: storage.loadNotesScratchpad(),
    settings,
    metrics,
    copyHistory: storage.loadCopyHistory(),
  };

  const handleOneClickExport = () => {
    storage.downloadFullBackup(currentPayload);
    setDownloadSuccess(true);
    soundService.playCopy(settings.soundEffects);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setRestoreSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = storage.validateBackupPayload(parsed);

      if (!validation.isValid || !validation.summary) {
        setRestoreError(validation.error || 'Неверный формат резервной копии');
        setImportedFile(null);
        return;
      }

      setImportedFile({
        file,
        payload: parsed,
        summary: validation.summary,
      });
    } catch (err) {
      setRestoreError('Не удалось прочитать JSON файл. Убедитесь, что файл не поврежден.');
      setImportedFile(null);
    }
  };

  const handleExecuteRestore = () => {
    if (!importedFile) return;

    const ok = storage.restoreFullBackup(importedFile.payload, restoreMode);
    if (ok) {
      setRestoreSuccess(true);
      soundService.playShortcutPop(settings.soundEffects);
      setAutoBackups(storage.loadAutoBackups());
      setTimeout(() => {
        onDataRestored();
        onClose();
      }, 1200);
    } else {
      setRestoreError('Ошибка при применении резервной копии. Проверьте структуру данных.');
    }
  };

  const handleRollbackToSnapshot = (snapshot: AutoBackupPoint) => {
    if (window.confirm(`Восстановить данные из точки отката «${snapshot.reason}» от ${new Date(snapshot.createdAt).toLocaleString('ru-RU')}?`)) {
      const payload = {
        snippets: snapshot.data.snippets,
        categories: snapshot.data.categories,
        placeholders: snapshot.data.placeholders,
        tables: snapshot.data.tables,
        widgets: snapshot.data.widgets,
        notes: snapshot.data.notes,
        settings: snapshot.data.settings,
      };
      const ok = storage.restoreFullBackup(payload, 'replace');
      if (ok) {
        soundService.playShortcutPop(settings.soundEffects);
        onDataRestored();
        onClose();
      }
    }
  };

  const handleCreateManualSnapshot = () => {
    const point = storage.createAutoBackup('Ручной снимок рабочего пространства');
    if (point) {
      setAutoBackups(storage.loadAutoBackups());
      setManualSnapshotCreated(true);
      soundService.playClick(settings.soundEffects);
      setTimeout(() => setManualSnapshotCreated(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-xl border ${theme.border} ${theme.panel} shadow-2xl overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${theme.border} ${theme.panelHeader} shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${accent.primary} shadow-xs`}>
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Полный бэкап и восстановление
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  1-Click Backup
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Мгновенное сохранение и перенос всей базы: шаблонов, заметок, таблиц и настроек
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* SECTION 1: ONE-CLICK EXPORT */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-emerald-200 text-sm">Скачать полный бэкап в один клик</span>
                </div>
                <p className="text-slate-300 text-[11.5px] leading-relaxed">
                  Создает полный снимок вашего рабочего места в формате JSON. Включает 100% локальных данных:
                </p>
              </div>

              <button
                type="button"
                onClick={handleOneClickExport}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs text-white shadow-md transition-all shrink-0 cursor-pointer ${
                  downloadSuccess
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:scale-98'
                }`}
              >
                {downloadSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Файл скачан!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Скачать бэкап (.json)</span>
                  </>
                )}
              </button>
            </div>

            {/* Current workspace counters breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2 py-1.5 rounded border border-slate-800">
                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">Шаблоны: <strong className="text-white">{snippets.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2 py-1.5 rounded border border-slate-800">
                <Brackets className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Теги: <strong className="text-white">{placeholders.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2 py-1.5 rounded border border-slate-800">
                <Table className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Таблицы: <strong className="text-white">{tables.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2 py-1.5 rounded border border-slate-800">
                <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Заметки: <strong className="text-white">{notes.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2 py-1.5 rounded border border-slate-800">
                <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Ссылки: <strong className="text-white">{widgets.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2 py-1.5 rounded border border-slate-800">
                <SettingsIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Оформление</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: RESTORE / IMPORT */}
          <div className={`p-4 rounded-xl border ${theme.border} bg-slate-900/40 space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-slate-100 text-sm">Восстановление из файла резервной копии</span>
              </div>
              <span className="text-[11px] text-slate-400">JSON формат</span>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!importedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700/80 hover:border-sky-500/60 hover:bg-slate-850/60 rounded-xl p-5 text-center cursor-pointer transition-all group"
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-sky-400 transition-colors" />
                <div className="font-semibold text-slate-200">
                  Нажмите для выбора файла или перетащите <code className="text-sky-300 font-mono text-xs">.json</code>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Поддерживаются полные бэкапы WorkWiki 3 любой версии
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg border border-sky-500/40 bg-sky-950/20 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-slate-100 text-xs">
                        {importedFile.file.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">
                        v{importedFile.summary.version || '2.5'}
                      </span>
                    </div>
                    {importedFile.summary.exportedAt && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Экспортирован: {new Date(importedFile.summary.exportedAt).toLocaleString('ru-RU')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImportedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-slate-200 p-1 text-xs"
                    title="Выбрать другой файл"
                  >
                    Сменить файл
                  </button>
                </div>

                {/* Inspect found counts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  <div>Шаблонов: <strong className="text-sky-300">{importedFile.summary.snippets}</strong></div>
                  <div>Категорий: <strong className="text-indigo-300">{importedFile.summary.categories}</strong></div>
                  <div>Таблиц: <strong className="text-emerald-300">{importedFile.summary.tables}</strong></div>
                  <div>Заметок: <strong className="text-amber-300">{importedFile.summary.notes}</strong></div>
                  <div>Тегов: <strong className="text-purple-300">{importedFile.summary.placeholders}</strong></div>
                  <div>Виджетов/ссылок: <strong className="text-blue-300">{importedFile.summary.widgets}</strong></div>
                  <div className="col-span-2 text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Файл проверен и готов
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="space-y-1.5 pt-1">
                  <div className="font-medium text-slate-300 text-xs">Режим восстановления:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        restoreMode === 'replace'
                          ? 'border-sky-500 bg-sky-950/40 text-slate-100 ring-1 ring-sky-500/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-200">Заменить всё (чистая перезапись)</div>
                        <div className="text-[10px] text-slate-400">Полная замена базы на копию из файла</div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        restoreMode === 'merge'
                          ? 'border-sky-500 bg-sky-950/40 text-slate-100 ring-1 ring-sky-500/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-200">Объединить с текущими данными</div>
                        <div className="text-[10px] text-slate-400">Добавить новые записи, сохранив имеющиеся</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Перед загрузкой автоматически создается точка отката</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={restoreSuccess}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs text-white shadow-md transition-all cursor-pointer ${
                      restoreSuccess
                        ? 'bg-emerald-600'
                        : 'bg-sky-600 hover:bg-sky-500 active:scale-98'
                    }`}
                  >
                    {restoreSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Восстановлено!</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>Применить восстановление</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {restoreError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}
          </div>

          {/* SECTION 3: RECENT ROLLBACK SNAPSHOTS */}
          <div className={`p-4 rounded-xl border ${theme.border} bg-slate-900/40 space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-slate-100 text-sm">Локальные точки безопасности (Откат изменений)</span>
              </div>
              <button
                type="button"
                onClick={handleCreateManualSnapshot}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors cursor-pointer"
                title="Сохранить текущее состояние прямо сейчас"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{manualSnapshotCreated ? 'Снимок сохранен!' : 'Создать снимок сейчас'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Система автоматически сохраняет снимки перед сбросом или импортом данных. Вы можете мгновенно вернуться к любой точке:
            </p>

            {autoBackups.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs">
                Пока нет сохраненных точек отката
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {autoBackups.map((point) => (
                  <div
                    key={point.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-200 text-xs flex items-center gap-2">
                        <span>{point.reason}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(point.createdAt).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-400 flex items-center gap-2">
                        <span>Шаблонов: {point.counts.snippets}</span>
                        <span>•</span>
                        <span>Таблиц: {point.counts.tables}</span>
                        <span>•</span>
                        <span>Заметок: {point.counts.notes}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRollbackToSnapshot(point)}
                      className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Откатить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-5 py-3 border-t ${theme.border} ${theme.panelHeader} flex items-center justify-between shrink-0`}>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-sky-400" />
            <span>Файлы резервных копий хранятся локально на вашем компьютере</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
