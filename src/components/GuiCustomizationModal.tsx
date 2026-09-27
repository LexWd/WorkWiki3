import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  X, 
  Palette, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Download, 
  Upload, 
  RotateCcw, 
  User, 
  Check, 
  HardDrive,
  Layers,
  FolderDown,
  FolderUp,
  Info,
  ChevronRight,
  FileJson,
  ShieldCheck,
  History,
  RefreshCw,
  Trash,
  Trash2,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  GuiSettings, 
  AppTheme, 
  AccentColor, 
  InterfaceDensity, 
  FontSizeScale, 
  Snippet, 
  ImportSnippetMode, 
  SnippetCollectionExport,
  AutoBackupPoint,
  CustomIcon
} from '../types';
import { storage } from '../utils/storage';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';
import { AVAILABLE_CATEGORY_ICONS, renderCategoryIcon } from '../utils/categoryMeta';
import { SnippetExportModal } from './SnippetExportModal';
import { SnippetImportModal } from './SnippetImportModal';
import { ConfirmDialogModal } from './ConfirmDialogModal';

interface GuiCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GuiSettings;
  onUpdateSettings: (partial: Partial<GuiSettings>) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetData: () => void;
  onRestoreAutoBackup?: (backup: AutoBackupPoint) => void;
  // Snippet Collection Import & Export
  snippets: Snippet[];
  onImportSnippets: (
    imported: Snippet[],
    mode: ImportSnippetMode,
    targetCategory?: string
  ) => void;
  initialSection?: 'gui' | 'icons' | 'collections' | 'backup';
  onNotification?: (msg: string) => void;
  customIcons?: CustomIcon[];
  onUpdateCustomIcons?: (icons: CustomIcon[]) => void;
  hiddenIconIds?: string[];
  onUpdateHiddenIconIds?: (ids: string[]) => void;
}

const THEMES: { id: AppTheme; name: string; desc: string; bg: string }[] = [
  { id: 'dark-slate', name: 'Dark Slate', desc: 'Тёмный сланец (сбалансированный)', bg: 'bg-slate-900 border-slate-700' },
  { id: 'obsidian', name: 'Midnight Obsidian', desc: 'Глубокий чёрный AMOLED', bg: 'bg-black border-zinc-800' },
  { id: 'light-minimal', name: 'Светлый минимализм', desc: 'Высококонтрастная дневная тема', bg: 'bg-slate-100 border-slate-300' },
  { id: 'cyber-espresso', name: 'Тёплое эспрессо', desc: 'Уютные тёплые тона для глаз', bg: 'bg-stone-900 border-stone-700' },
];

const ACCENTS: { id: AccentColor; name: string; color: string }[] = [
  { id: 'sky', name: 'Небесный', color: 'bg-sky-500' },
  { id: 'indigo', name: 'Индиго', color: 'bg-indigo-500' },
  { id: 'emerald', name: 'Изумруд', color: 'bg-emerald-500' },
  { id: 'amber', name: 'Янтарь', color: 'bg-amber-500' },
  { id: 'rose', name: 'Роза', color: 'bg-rose-500' },
  { id: 'violet', name: 'Фиолетовый', color: 'bg-purple-500' },
];

export const GuiCustomizationModal: React.FC<GuiCustomizationModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportData,
  onImportData,
  onResetData,
  onRestoreAutoBackup,
  snippets,
  onImportSnippets,
  initialSection = 'gui',
  onNotification,
  customIcons = [],
  onUpdateCustomIcons = (_icons: CustomIcon[]) => {},
  hiddenIconIds = [],
  onUpdateHiddenIconIds = (_ids: string[]) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'gui' | 'icons' | 'collections' | 'backup'>('gui');
  const [isExportCollectionOpen, setIsExportCollectionOpen] = useState(false);
  const [isImportCollectionOpen, setIsImportCollectionOpen] = useState(false);
  const [selectedCategoryForExport, setSelectedCategoryForExport] = useState<string>('Все');
  const [isResetAllConfirmOpen, setIsResetAllConfirmOpen] = useState(false);
  const [autoBackups, setAutoBackups] = useState<AutoBackupPoint[]>([]);
  const [backupToRestore, setBackupToRestore] = useState<AutoBackupPoint | null>(null);

  // Icon Management State
  const [iconUploadMode, setIconUploadMode] = useState<'file' | 'svg'>('file');
  const [newIconName, setNewIconName] = useState('');
  const [newIconDataUrl, setNewIconDataUrl] = useState<string | null>(null);
  const [svgCodeInput, setSvgCodeInput] = useState('');
  const [iconErrorMsg, setIconErrorMsg] = useState<string | null>(null);
  const [iconSuccessMsg, setIconSuccessMsg] = useState<string | null>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  useEffect(() => {
    if (isOpen) {
      setAutoBackups(storage.loadAutoBackups());
      setIconErrorMsg(null);
      setIconSuccessMsg(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialSection) {
      setActiveTab(initialSection);
    }
  }, [isOpen, initialSection]);

  // Dynamic list of categories from snippets
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    snippets.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [snippets]);

  // Built-in icons with visibility state
  const builtinIcons = useMemo(() => {
    return AVAILABLE_CATEGORY_ICONS;
  }, []);

  // Icon handlers
  const handleIconFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIconErrorMsg(null);
    setIconSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('svg') && !file.type.includes('image')) {
      setIconErrorMsg('Выберите файл изображения (SVG, PNG, WebP, JPG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setIconErrorMsg('Размер файла не должен превышать 2 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setNewIconDataUrl(result);
      if (!newIconName) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setNewIconName(cleanName);
      }
    };
    reader.onerror = () => {
      setIconErrorMsg('Ошибка чтения файла изображения');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNewIcon = () => {
    setIconErrorMsg(null);
    setIconSuccessMsg(null);
    const rawData = iconUploadMode === 'file' ? newIconDataUrl : svgCodeInput.trim();
    if (!rawData) {
      setIconErrorMsg('Загрузите изображение или вставьте SVG-код');
      return;
    }

    const name = newIconName.trim() || 'Пользовательская иконка';
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const newIcon: CustomIcon = {
      id,
      name,
      dataUrl: rawData,
      createdAt: Date.now(),
    };

    const updated = [newIcon, ...customIcons];
    onUpdateCustomIcons(updated);
    storage.saveCustomIcons(updated);
    soundService.playSuccess(settings.soundEffects);
    setIconSuccessMsg(`Иконка «${name}» успешно добавлена!`);

    // Reset form
    setNewIconName('');
    setNewIconDataUrl(null);
    setSvgCodeInput('');
    if (iconFileInputRef.current) iconFileInputRef.current.value = '';
    onNotification?.(`Иконка «${name}» добавлена в систему`);
  };

  const handleDeleteCustomIcon = (id: string, name: string) => {
    const updated = customIcons.filter((i) => i.id !== id);
    onUpdateCustomIcons(updated);
    storage.saveCustomIcons(updated);
    soundService.playClick(settings.soundEffects);
    setIconSuccessMsg(`Иконка «${name}» удалена`);
    onNotification?.(`Иконка «${name}» удалена`);
  };

  const handleToggleHideBuiltin = (id: string) => {
    let updated: string[];
    if (hiddenIconIds.includes(id)) {
      updated = hiddenIconIds.filter((h) => h !== id);
    } else {
      updated = [...hiddenIconIds, id];
    }
    onUpdateHiddenIconIds(updated);
    storage.saveHiddenIcons(updated);
    soundService.playClick(settings.soundEffects);
  };

  const handleRestoreAllBuiltin = () => {
    onUpdateHiddenIconIds([]);
    storage.saveHiddenIcons([]);
    soundService.playSuccess(settings.soundEffects);
    setIconSuccessMsg('Все системные иконки восстановлены');
    onNotification?.('Все стандартные иконки теперь видимы');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <div className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${theme.panel} ${theme.border}`}>
          {/* Header */}
          <div className={`p-3.5 border-b flex items-center justify-between ${theme.panelHeader} ${theme.border}`}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm ${accent.primary}`}>
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-100">Центр настроек системы и интерфейса</h2>
                <p className="text-[11px] text-slate-400">
                  Внешний вид, управление иконками, коллекции шаблонов JSON и бэкапы
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section Tabs Navigation */}
          <div className="px-4 pt-3 pb-2 border-b border-slate-800 flex items-center gap-2 bg-slate-950/60 shrink-0 flex-wrap">
            <button
              onClick={() => setActiveTab('gui')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'gui'
                  ? `${accent.primary} shadow-xs`
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Оформление и GUI</span>
            </button>

            <button
              onClick={() => setActiveTab('icons')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'icons'
                  ? `${accent.primary} shadow-xs`
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Иконки</span>
              {customIcons.length > 0 && (
                <span className="font-mono text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-full border border-purple-500/30">
                  +{customIcons.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('collections')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'collections'
                  ? `${accent.primary} shadow-xs`
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileJson className="w-3.5 h-3.5 text-sky-400" />
              <span>Коллекции шаблонов (JSON)</span>
              <span className="text-[10px] opacity-75 font-mono">({availableCategories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'backup'
                  ? `${accent.primary} shadow-xs`
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Резервные копии</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
            {/* TAB 1: GUI Settings */}
            {activeTab === 'gui' && (
              <div className="space-y-4">
                {/* Theme selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Цветовая тема оформления
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEMES.map((t) => {
                      const isSelected = settings.theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => onUpdateSettings({ theme: t.id })}
                          className={`p-2.5 rounded-lg border text-left transition-all ${t.bg} ${
                            isSelected
                              ? 'ring-2 ring-sky-400 border-transparent font-bold'
                              : 'hover:border-slate-500 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs">{t.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                          </div>
                          <span className="text-[10px] opacity-70 block mt-0.5">{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Акцентный цвет кнопок и индикаторов
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {ACCENTS.map((a) => {
                      const isSelected = settings.accentColor === a.id;
                      return (
                        <button
                          key={a.id}
                          onClick={() => onUpdateSettings({ accentColor: a.id })}
                          className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'border-white ring-1 ring-white/60 bg-slate-800'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full ${a.color} shadow-xs`}></span>
                          <span className="text-[10px] text-slate-300 font-medium">{a.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Density & Font Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Плотность интерфейса
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['compact', 'comfortable', 'spacious'] as InterfaceDensity[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => onUpdateSettings({ density: d })}
                          className={`py-1.5 px-2 rounded-lg border text-center text-[10.5px] font-medium transition-all ${
                            settings.density === d
                              ? `${accent.primary} shadow-xs`
                              : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {d === 'compact' ? 'Плотная' : d === 'comfortable' ? 'Обычная' : 'Простор'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Масштаб шрифта
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['sm', 'base', 'lg'] as FontSizeScale[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => onUpdateSettings({ fontSize: f })}
                          className={`py-1.5 px-2 rounded-lg border text-center text-[10.5px] font-medium transition-all ${
                            settings.fontSize === f
                              ? `${accent.primary} shadow-xs`
                              : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {f === 'sm' ? '13px' : f === 'base' ? '14px' : '15.5px'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Operator Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-400" />
                    Имя оператора (для автоматической подстановки в {"{{имя_оператора}}"})
                  </label>
                  <input
                    type="text"
                    value={settings.agentName}
                    onChange={(e) => onUpdateSettings({ agentName: e.target.value })}
                    placeholder="Александр (Поддержка)"
                    className={`w-full p-2.5 rounded-lg border text-xs outline-none ${theme.input}`}
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="flex items-center justify-between p-2 rounded-lg border border-slate-800 bg-slate-900/40 cursor-pointer">
                    <div className="flex items-center gap-2">
                      {settings.soundEffects ? (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      )}
                      <div>
                        <div className="font-semibold text-slate-200">Тактильные звуковые эффекты</div>
                        <div className="text-[10px] text-slate-400">Синтез аудио-щелчков Web Audio при копировании</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.soundEffects}
                      onChange={(e) => onUpdateSettings({ soundEffects: e.target.checked })}
                      className="rounded text-sky-500 w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg border border-slate-800 bg-slate-900/40 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-sky-400" />
                      <div>
                        <div className="font-semibold text-slate-200">Автокопирование при клике на карточку</div>
                        <div className="text-[10px] text-slate-400">Мгновенно отправлять текст в буфер при выборе</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoCopyOnSelect}
                      onChange={(e) => onUpdateSettings({ autoCopyOnSelect: e.target.checked })}
                      className="rounded text-sky-500 w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB: Icon Management (Add and Delete Custom & Built-in Icons) */}
            {activeTab === 'icons' && (
              <div className="space-y-4">
                {/* Info message banner */}
                <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-950/20 flex items-start gap-2.5 text-slate-300">
                  <ImageIcon className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[11.5px] leading-relaxed">
                    <p className="font-semibold text-purple-200">
                      Управление иконками системы (Категории и Быстрые ссылки)
                    </p>
                    <p className="text-slate-400">
                      Здесь вы можете добавлять собственные иконки (SVG, PNG, WebP) или напрямую вставлять SVG-код, удалять пользовательские иконки и скрывать ненужные системные иконки.
                    </p>
                  </div>
                </div>

                {/* Status alerts */}
                {iconErrorMsg && (
                  <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
                    <span>{iconErrorMsg}</span>
                    <button onClick={() => setIconErrorMsg(null)} className="text-rose-400 hover:text-rose-200 p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {iconSuccessMsg && (
                  <div className="p-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
                    <span>{iconSuccessMsg}</span>
                    <button onClick={() => setIconSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* SECTION 1: Add New Icon */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-slate-100">Добавить новую иконку</h3>
                        <p className="text-[10.5px] text-slate-400">Загрузите файл или вставьте код SVG</p>
                      </div>
                    </div>

                    <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIconUploadMode('file')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                          iconUploadMode === 'file'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Файл (SVG/PNG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIconUploadMode('svg')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                          iconUploadMode === 'svg'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Код SVG
                      </button>
                    </div>
                  </div>

                  {iconUploadMode === 'file' ? (
                    <div className="space-y-3">
                      <div
                        onClick={() => iconFileInputRef.current?.click()}
                        className="p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-purple-400 bg-slate-950/40 hover:bg-purple-950/10 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                      >
                        <input
                          ref={iconFileInputRef}
                          type="file"
                          accept=".svg,image/svg+xml,.png,image/png,.webp,image/webp,.jpg,.jpeg,image/jpeg"
                          onChange={handleIconFileUpload}
                          className="hidden"
                        />
                        {newIconDataUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-2 shadow-inner">
                              <img src={newIconDataUrl} alt="Preview" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Файл успешно выбран (кликните для замены)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-slate-400 group-hover:text-slate-200">
                            <Upload className="w-6 h-6 text-purple-400 mb-1" />
                            <span className="font-semibold text-xs text-slate-200">
                              Нажмите для выбора файла изображения
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Поддерживаются SVG, PNG, WebP, JPG (до 2 МБ)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={svgCodeInput}
                        onChange={(e) => setSvgCodeInput(e.target.value)}
                        placeholder="<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'> ... </svg>"
                        rows={3}
                        className={`w-full p-2.5 rounded-lg border text-xs font-mono outline-none ${theme.input} focus:border-purple-500`}
                      />
                      {svgCodeInput && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[11px] text-slate-400">Предпросмотр SVG:</span>
                          <div
                            className="w-6 h-6 flex items-center justify-center text-purple-400"
                            dangerouslySetInnerHTML={{ __html: svgCodeInput }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Icon Name & Submit */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newIconName}
                      onChange={(e) => setNewIconName(e.target.value)}
                      placeholder="Название иконки (например: Мой Банк, Яндекс, Поддержка)..."
                      className={`flex-1 p-2 rounded-lg border text-xs outline-none ${theme.input} focus:border-purple-500`}
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewIcon}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Сохранить иконку</span>
                    </button>
                  </div>
                </div>

                {/* SECTION 2: Custom Icons List (View & Delete) */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <h3 className="font-bold text-xs text-slate-100">
                        Пользовательские иконки ({customIcons.length})
                      </h3>
                    </div>
                    {customIcons.length > 0 && (
                      <span className="text-[10px] text-slate-400">
                        Доступны во всех меню категорий и виджетов
                      </span>
                    )}
                  </div>

                  {customIcons.length === 0 ? (
                    <div className="p-5 text-center rounded-lg border border-dashed border-slate-800 text-slate-400 text-xs">
                      Пользовательских иконок пока нет. Загрузите свои SVG или PNG выше.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {customIcons.map((icon) => (
                        <div
                          key={icon.id}
                          className="flex items-center justify-between p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-950 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center p-1.5 shrink-0">
                              {icon.dataUrl.startsWith('<svg') ? (
                                <div
                                  className="w-full h-full flex items-center justify-center text-purple-300"
                                  dangerouslySetInnerHTML={{ __html: icon.dataUrl }}
                                />
                              ) : (
                                <img
                                  src={icon.dataUrl}
                                  alt={icon.name}
                                  className="w-full h-full object-contain"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-slate-200 truncate">
                                {icon.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {icon.createdAt ? new Date(icon.createdAt).toLocaleDateString('ru-RU') : 'Пользовательская'}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteCustomIcon(icon.id, icon.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                            title="Удалить иконку"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 3: Standard Built-in Icons (Hide / Show) */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-sky-400" />
                      <h3 className="font-bold text-xs text-slate-100">
                        Стандартные системные иконки ({builtinIcons.length})
                      </h3>
                    </div>
                    {hiddenIconIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRestoreAllBuiltin}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10.5px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Восстановить все скрытые ({hiddenIconIds.length})</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    Вы можете скрыть стандартные иконки, если хотите оставить только минималистичный набор для категорий.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {builtinIcons.map((item) => {
                      const isHidden = hiddenIconIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                            isHidden
                              ? 'border-slate-800/50 bg-slate-950/30 opacity-50'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center shrink-0">
                              {renderCategoryIcon(item.id, 'w-3.5 h-3.5 text-slate-300')}
                            </div>
                            <span className="text-[11px] text-slate-200 truncate">
                              {item.name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleHideBuiltin(item.id)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isHidden
                                ? 'text-slate-400 hover:text-emerald-400'
                                : 'text-slate-400 hover:text-amber-400'
                            }`}
                            title={isHidden ? 'Показать иконку' : 'Скрыть иконку'}
                          >
                            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Snippet Collections (JSON Import / Export) */}
            {activeTab === 'collections' && (
              <div className="space-y-4">
                {/* Description info box */}
                <div className="p-3 rounded-lg border border-sky-500/30 bg-sky-950/20 flex items-start gap-2.5 text-slate-300">
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[11.5px] leading-relaxed">
                    <p className="font-semibold text-sky-200">
                      Управление отдельными коллекциями шаблонов быстрых ответов
                    </p>
                    <p className="text-slate-400">
                      Вы можете экспортировать отдельную категорию ответов (например, «Заказы и доставка» или «Возвраты»)
                      в отдельный файл JSON, чтобы поделиться с коллегами, либо импортировать готовые наборы с объединением
                      или заменой только выбранной категории.
                    </p>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Export Box */}
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                        <FolderDown className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-slate-100">Экспорт коллекции</h3>
                        <p className="text-[10.5px] text-slate-400">Сохранить шаблоны в файл .json</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Выберите категорию и сохраните её в файл JSON или скопируйте в буфер обмена.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsExportCollectionOpen(true)}
                      className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 ${accent.primary}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Открыть мастер экспорта...</span>
                    </button>
                  </div>

                  {/* Import Box */}
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <FolderUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-slate-100">Импорт коллекции</h3>
                        <p className="text-[10.5px] text-slate-400">Загрузить набор из файла .json</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Загрузите файл с предпросмотром шаблонов и выбором режима (Merge / Replace).
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsImportCollectionOpen(true)}
                      className="w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 shadow-sm transition-transform active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Открыть мастер импорта...</span>
                    </button>
                  </div>
                </div>

                {/* Available Collections List with Quick Export */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      Текущие категории шаблонов в базе ({availableCategories.length})
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Всего {snippets.length} ответов
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {availableCategories.map((cat) => {
                      const count = snippets.filter((s) => s.category === cat).length;
                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                            <span className="font-semibold text-slate-200 text-xs truncate">{cat}</span>
                            <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-slate-800">
                              {count} шаблонов
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategoryForExport(cat);
                              setIsExportCollectionOpen(true);
                            }}
                            className="text-[10.5px] text-sky-400 hover:text-sky-300 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1 shrink-0"
                            title={`Экспортировать категорию «${cat}»`}
                          >
                            <Download className="w-3 h-3" />
                            <span>Экспорт</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Full System Backup */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 text-[11.5px] leading-relaxed text-slate-300">
                  <p className="font-semibold text-slate-100 mb-1 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    Полная резервная копия системы (All-in-One JSON)
                  </p>
                  <p className="text-slate-400">
                    Включает все сущности рабочего пространства: все шаблоны быстрых ответов, базы данных строк Excel,
                    плейсхолдеры, полезные ссылки и виджеты, карточки-заметки, метрики и персональные настройки интерфейса.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={onExportData}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Скачать полный бэкап (.json)</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onImportData(file);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Восстановить из файла .json</span>
                  </button>
                </div>

                {/* Auto-backups local snapshots manager */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Локальные снимки безопасности (Auto-Backups)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Автоматические точки отката при опасных действиях и сбросе. Хранятся локально в браузере (до 10 снимков).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newPt = storage.createAutoBackup('Ручной снимок из настроек');
                        if (newPt) {
                          setAutoBackups(storage.loadAutoBackups());
                          onNotification?.('Создан снимок безопасности рабочего пространства');
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                      <span>Создать снимок</span>
                    </button>
                  </div>

                  {autoBackups.length === 0 ? (
                    <div className="p-3 rounded-lg border border-slate-800/60 bg-slate-900/30 text-center text-slate-500 text-xs">
                      Нет сохранённых снимков. Нажмите «Создать снимок», чтобы зафиксировать текущее состояние.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {autoBackups.map((b) => {
                        const dateStr = new Date(b.createdAt).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        return (
                          <div
                            key={b.id}
                            className="flex items-center justify-between p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs transition-colors"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-200 truncate">{b.reason}</span>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">{dateStr}</span>
                              </div>
                              <div className="text-[10.5px] text-slate-400 mt-0.5">
                                Шаблонов: {b.counts.snippets} • Таблиц: {b.counts.tables} • Плейсхолдеров: {b.counts.placeholders}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setBackupToRestore(b)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 text-[11px] font-semibold shrink-0 cursor-pointer"
                            >
                              <History className="w-3 h-3" />
                              <span>Откатить</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reset Section */}
                <div className="pt-4 border-t border-slate-800/80">
                  <div className="p-3 rounded-lg border border-rose-900/40 bg-rose-950/20 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-rose-300">Сброс к заводским настройкам</div>
                      <div className="text-[10.5px] text-slate-400">
                        Очистить локальное хранилище и восстановить исходные базы шаблонов и таблиц
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsResetAllConfirmOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-800/60 bg-rose-900/40 hover:bg-rose-900/80 text-rose-200 text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Сбросить всё</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-3 border-t flex items-center justify-between ${theme.panelHeader} ${theme.border}`}>
            <div className="text-[11px] text-slate-400">
              {activeTab === 'icons' ? (
                <span>Пользовательских иконок: {customIcons.length} • Системных: {builtinIcons.length - hiddenIconIds.length}</span>
              ) : activeTab === 'collections' ? (
                <span>Коллекций: {availableCategories.length} • Шаблонов: {snippets.length}</span>
              ) : activeTab === 'gui' ? (
                <span>Плотность: {settings.density} • Тема: {settings.theme}</span>
              ) : (
                <span>Полный архив JSON</span>
              )}
            </div>
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs ${accent.primary}`}
            >
              Готово
            </button>
          </div>
        </div>
      </div>

      {/* Snippet Export Modal launched from Collections tab */}
      {isExportCollectionOpen && (
        <SnippetExportModal
          isOpen={true}
          onClose={() => setIsExportCollectionOpen(false)}
          snippets={snippets}
          initialCategory={selectedCategoryForExport}
          availableCategories={['Все', ...availableCategories]}
          settings={settings}
          onNotify={(title, msg) => onNotification?.(`${title}: ${msg}`)}
        />
      )}

      {/* Snippet Import Modal launched from Collections tab */}
      {isImportCollectionOpen && (
        <SnippetImportModal
          isOpen={true}
          onClose={() => setIsImportCollectionOpen(false)}
          currentCategory={selectedCategoryForExport}
          availableCategories={['Все', ...availableCategories]}
          onImport={(imported, mode, targetCat) => {
            onImportSnippets(imported, mode, targetCat);
            setIsImportCollectionOpen(false);
            onNotification?.(`Импортировано шаблонов: ${imported.length}`);
          }}
          settings={settings}
          onNotify={(title, msg) => onNotification?.(`${title}: ${msg}`)}
        />
      )}

      {/* Confirmation: Reset All Data */}
      <ConfirmDialogModal
        isOpen={isResetAllConfirmOpen}
        title="Сбросить все данные приложения?"
        description="Сбросить все шаблоны, заметки, таблицы и настройки к начальному состоянию? Текущие данные будут стёрты и восстановлены начальные базы."
        confirmText="Сбросить всё к начальным"
        cancelText="Отмена"
        variant="danger"
        icon="reset"
        onConfirm={() => {
          onResetData();
          setIsResetAllConfirmOpen(false);
        }}
        onCancel={() => setIsResetAllConfirmOpen(false)}
      />

      {/* Confirmation: Restore Auto-Backup Point */}
      <ConfirmDialogModal
        isOpen={backupToRestore !== null}
        title="Восстановить снимок безопасности?"
        description={
          backupToRestore
            ? `Откатить систему до состояния снимка от ${new Date(
                backupToRestore.createdAt
              ).toLocaleString('ru-RU')} («${backupToRestore.reason}»)? Текущие несохраненные изменения будут заменены содержимым снимка.`
            : ''
        }
        confirmText="Восстановить снимок"
        cancelText="Отмена"
        variant="warning"
        icon="reset"
        onConfirm={() => {
          if (backupToRestore && onRestoreAutoBackup) {
            onRestoreAutoBackup(backupToRestore);
            setBackupToRestore(null);
            onNotification?.('Состояние системы восстановлено из снимка');
          }
        }}
        onCancel={() => setBackupToRestore(null)}
      />
    </>
  );
};
