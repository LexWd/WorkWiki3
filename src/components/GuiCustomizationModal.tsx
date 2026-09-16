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
  FileJson
} from 'lucide-react';
import { 
  GuiSettings, 
  AppTheme, 
  AccentColor, 
  InterfaceDensity, 
  FontSizeScale, 
  Snippet, 
  ImportSnippetMode, 
  SnippetCollectionExport 
} from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { SnippetExportModal } from './SnippetExportModal';
import { SnippetImportModal } from './SnippetImportModal';

interface GuiCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GuiSettings;
  onUpdateSettings: (partial: Partial<GuiSettings>) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetData: () => void;
  // Snippet Collection Import & Export
  snippets: Snippet[];
  onImportSnippets: (
    imported: Snippet[],
    mode: ImportSnippetMode,
    targetCategory?: string
  ) => void;
  initialSection?: 'gui' | 'collections' | 'backup';
  onNotification?: (msg: string) => void;
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
  snippets,
  onImportSnippets,
  initialSection = 'gui',
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'gui' | 'collections' | 'backup'>('gui');
  const [isExportCollectionOpen, setIsExportCollectionOpen] = useState(false);
  const [isImportCollectionOpen, setIsImportCollectionOpen] = useState(false);
  const [selectedCategoryForExport, setSelectedCategoryForExport] = useState<string>('Все');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

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
                <h2 className="font-bold text-sm text-slate-100">Центр настроек системы и коллекций</h2>
                <p className="text-[11px] text-slate-400">
                  Внешний вид (GUI), импорт/экспорт коллекций JSON и резервные копии
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section Tabs Navigation */}
          <div className="px-4 pt-3 pb-2 border-b border-slate-800 flex items-center gap-2 bg-slate-950/60 shrink-0">
            <button
              onClick={() => setActiveTab('gui')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'gui'
                  ? `${accent.primary} shadow-xs`
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Оформление и GUI</span>
            </button>

            <button
              onClick={() => setActiveTab('collections')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                      onClick={() => {
                        if (confirm('Сбросить все шаблоны, заметки, таблицы и настройки к начальному состоянию?')) {
                          onResetData();
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-800/60 bg-rose-900/40 hover:bg-rose-900/80 text-rose-200 text-xs font-semibold shrink-0"
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
              {activeTab === 'collections' ? (
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
    </>
  );
};
