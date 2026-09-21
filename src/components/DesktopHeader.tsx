import React from 'react';
import { 
  Zap, 
  Settings, 
  Keyboard, 
  Brackets, 
  Maximize2, 
  Minimize2, 
  Search,
  FileSpreadsheet,
  Globe,
  StickyNote,
  History,
  HardDrive
} from 'lucide-react';
import { GuiSettings, ActiveTab } from '../types';
import { getThemeClasses, getAccentClasses, getDensityPadding } from '../utils/theme';
import { soundService } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';

interface DesktopHeaderProps {
  settings: GuiSettings;
  onUpdateSettings: (partial: Partial<GuiSettings>) => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
  onOpenHistory?: () => void;
  isMiniMode: boolean;
  onToggleMiniMode: () => void;
  snippetCount: number;
  tableCount: number;
  placeholderCount: number;
  resourceCount: number;
  noteCount: number;
  historyCount?: number;
  onLogoClick?: () => void;
  onOpenBackupModal?: () => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  settings,
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenShortcuts,
  onOpenPalette,
  onOpenHistory,
  onOpenBackupModal,
  isMiniMode,
  onToggleMiniMode,
  snippetCount,
  tableCount,
  placeholderCount,
  resourceCount,
  noteCount,
  historyCount = 0,
  onLogoClick,
}) => {
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);
  const density = getDensityPadding(settings.density);

  const handleLogoAction = () => {
    soundService.playClick(settings.soundEffects);
    if (onLogoClick) {
      onLogoClick();
    } else {
      onSelectTab('snippets');
    }
  };

  return (
    <header className={`min-h-[46px] h-auto py-1 px-3 border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between gap-2 shrink-0 select-none w-full min-w-0 z-20`}>
      {/* Brand & Navigation Tabs Container */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
        {/* App Logo & Home trigger */}
        <button
          type="button"
          onClick={handleLogoAction}
          className="flex items-center gap-2 shrink-0 text-left rounded-lg p-1 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 transition-all hover:bg-slate-800/60 active:scale-95"
          title="На главную: Шаблоны ответов (Ctrl+1). Кликните для быстрого возврата"
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-105 ${accent.primary}`}>
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div className="hidden md:block shrink-0">
            <h1 className="font-bold text-xs text-slate-100 leading-tight group-hover:text-white transition-colors">QuickReply Desk</h1>
            <span className="text-[9px] font-mono text-slate-400 block">v2.0 • Рабочее место оператора</span>
          </div>
        </button>

        {/* Navigation Tabs (scrollable if viewport/font is large) */}
        <nav className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 overflow-x-auto no-scrollbar min-w-0 flex-1 sm:flex-initial">
          <button
            type="button"
            onClick={() => onSelectTab('snippets')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === 'snippets'
                ? `${accent.primary} shadow-xs font-bold`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Шаблоны быстрых ответов (Ctrl+1)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Шаблоны</span>
            <span className="hidden sm:inline font-mono text-[9.5px] opacity-75">({snippetCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('excel')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === 'excel'
                ? `${accent.primary} shadow-xs font-bold`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Таблицы и аналитика графиков (Ctrl+2)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
            <span className="hidden sm:inline font-mono text-[9.5px] opacity-75">({tableCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('placeholders')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === 'placeholders'
                ? `${accent.primary} shadow-xs font-bold`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="База плейсхолдеров (Ctrl+3)"
          >
            <Brackets className="w-3.5 h-3.5 text-sky-400" />
            <span>Плейсхолдеры</span>
            <span className="hidden sm:inline font-mono text-[9.5px] opacity-75">({placeholderCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('resources')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === 'resources'
                ? `${accent.primary} shadow-xs font-bold`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="База ссылок и виджетов (Ctrl+4)"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Ссылки</span>
            <span className="hidden sm:inline font-mono text-[9.5px] opacity-75">({resourceCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('notes')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === 'notes'
                ? `${accent.primary} shadow-xs font-bold`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Заметки смены и чек-листы (Ctrl+5)"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-400" />
            <span>Заметки</span>
            <span className="hidden sm:inline font-mono text-[9.5px] opacity-75">({noteCount})</span>
          </button>
        </nav>
      </div>

      {/* Right Tools & Actions (Pinned to right, NEVER cut off or pushed out) */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto z-30">
        {/* In-app PWA install trigger (auto-detects installability) */}
        <PWAInstallButton />

        {/* Quick Search / Command Palette trigger */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition-colors shrink-0 cursor-pointer"
          title="Быстрый поиск шаблонов (Ctrl+K или /)"
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden xl:inline">Поиск</span>
          <kbd className="hidden lg:inline-block font-mono text-[9.5px] bg-black/40 px-1 py-0.2 rounded border border-slate-700 text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        {/* Shortcuts Cheat Sheet */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="p-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 transition-colors shrink-0 cursor-pointer"
          title="Горячие клавиши (нажмите ?)"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        {/* Copy History Trigger */}
        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1 p-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 transition-colors shrink-0 cursor-pointer relative"
            title="История скопированных ответов"
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
            {historyCount > 0 && (
              <span className="font-mono text-[9px] px-1 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                {historyCount > 9 ? '9+' : historyCount}
              </span>
            )}
          </button>
        )}

        {/* Full Backup Trigger */}
        {onOpenBackupModal && (
          <button
            type="button"
            onClick={onOpenBackupModal}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
            title="Полный бэкап в один клик (All-in-One JSON сохранение и восстановление)"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Бэкап</span>
          </button>
        )}

        {/* Mini Mode Toggle */}
        <button
          type="button"
          onClick={onToggleMiniMode}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
            isMiniMode
              ? `${accent.primary}`
              : 'border-slate-700/80 hover:bg-slate-800 text-slate-300'
          }`}
          title={isMiniMode ? 'Развернуть полное окно' : 'Компактный мини-HUD режим (Ctrl+B)'}
        >
          {isMiniMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>

        {/* GUI Customization Settings (Always accessible) */}
        <button
          type="button"
          id="btn-app-settings"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-colors shrink-0 cursor-pointer bg-slate-800/90 shadow-xs ring-1 ring-slate-700/50"
          title="Настройки интерфейса, масштаба шрифта и темы"
        >
          <Settings className="w-3.5 h-3.5 text-sky-400" />
        </button>

        {/* Operator Profile Badge (Only on ultra wide screens) */}
        <div className="hidden 2xl:flex items-center gap-1.5 pl-2 border-l border-slate-800 text-xs text-slate-300 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="truncate max-w-[110px] font-medium">{settings.agentName}</span>
        </div>
      </div>
    </header>
  );
};
