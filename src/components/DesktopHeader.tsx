import React from 'react';
import { 
  Zap, 
  Settings, 
  Keyboard, 
  Brackets, 
  Maximize2, 
  Minimize2, 
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  StickyNote
} from 'lucide-react';
import { GuiSettings, ExcelRow, ActiveTab } from '../types';
import { getThemeClasses, getAccentClasses, getDensityPadding } from '../utils/theme';

interface DesktopHeaderProps {
  settings: GuiSettings;
  onUpdateSettings: (partial: Partial<GuiSettings>) => void;
  activeRow: ExcelRow | null;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
  isMiniMode: boolean;
  onToggleMiniMode: () => void;
  snippetCount: number;
  tableCount: number;
  placeholderCount: number;
  resourceCount: number;
  noteCount: number;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  settings,
  activeRow,
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenShortcuts,
  onOpenPalette,
  isMiniMode,
  onToggleMiniMode,
  snippetCount,
  tableCount,
  placeholderCount,
  resourceCount,
  noteCount,
}) => {
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);
  const density = getDensityPadding(settings.density);

  return (
    <header className={`${density.headerHeight} px-3 border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between gap-2 shrink-0 select-none min-w-0 overflow-hidden`}>
      {/* Brand & Tabs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
        {/* App Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm ${accent.primary}`}>
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div className="hidden md:block shrink-0">
            <h1 className="font-bold text-xs text-slate-100 leading-tight">QuickReply Desk</h1>
            <span className="text-[9.5px] font-mono text-slate-400 block">v2.0</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 overflow-x-auto no-scrollbar min-w-0">
          <button
            onClick={() => onSelectTab('snippets')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'snippets'
                ? `${accent.primary} shadow-xs`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Шаблоны быстрых ответов (Ctrl+1)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Шаблоны</span>
            <span className="font-mono text-[10px] opacity-70">({snippetCount})</span>
          </button>

          <button
            onClick={() => onSelectTab('excel')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'excel'
                ? `${accent.primary} shadow-xs`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Таблицы Excel и база данных (Ctrl+2)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
            <span className="font-mono text-[10px] opacity-70">({tableCount})</span>
          </button>

          <button
            onClick={() => onSelectTab('placeholders')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'placeholders'
                ? `${accent.primary} shadow-xs`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="База плейсхолдеров (Ctrl+3)"
          >
            <Brackets className="w-3.5 h-3.5 text-sky-400" />
            <span>Плейсхолдеры</span>
            <span className="font-mono text-[10px] opacity-70">({placeholderCount})</span>
          </button>

          <button
            onClick={() => onSelectTab('resources')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'resources'
                ? `${accent.primary} shadow-xs`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="База полезных ссылок и виджетов (Ctrl+4)"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Ссылки</span>
            <span className="font-mono text-[10px] opacity-70">({resourceCount})</span>
          </button>

          <button
            onClick={() => onSelectTab('notes')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === 'notes'
                ? `${accent.primary} shadow-xs`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Заметки смены и чек-листы (Ctrl+5)"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-400" />
            <span>Заметки</span>
            <span className="font-mono text-[10px] opacity-70">({noteCount})</span>
          </button>
        </nav>
      </div>

      {/* Middle: Active Excel Row Indicator (visible on very wide screens) */}
      <div className="hidden 2xl:flex items-center gap-2 min-w-0 shrink">
        {activeRow ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium truncate max-w-[200px]">
              {Object.values(activeRow.data)[0] || 'Строка'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right: Quick Tools & Settings */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Quick Search / Command Palette trigger */}
        <button
          onClick={onOpenPalette}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          title="Быстрый поиск шаблонов (Ctrl+K или /)"
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Поиск</span>
          <kbd className="hidden md:inline-block font-mono text-[10px] bg-black/30 px-1 py-0.2 rounded border border-slate-700 text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        {/* Shortcuts Cheat Sheet */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 transition-colors"
          title="Горячие клавиши (нажмите ?)"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        {/* Mini Mode Toggle */}
        <button
          onClick={onToggleMiniMode}
          className={`p-1.5 rounded-lg border transition-colors ${
            isMiniMode
              ? `${accent.primary}`
              : 'border-slate-700/80 hover:bg-slate-800 text-slate-300'
          }`}
          title={isMiniMode ? 'Развернуть полное окно' : 'Компактный мини-HUD режим (Ctrl+B)'}
        >
          {isMiniMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>

        {/* GUI Customization Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 transition-colors"
          title="Настройки интерфейса и темы"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Operator Profile */}
        <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="truncate max-w-[110px] font-medium">{settings.agentName}</span>
        </div>
      </div>
    </header>
  );
};
