import React, { useState } from 'react';
import { 
  Zap, 
  Settings, 
  Keyboard, 
  Brackets, 
  Maximize2, 
  Minimize2, 
  Search,
  Globe,
  StickyNote,
  History,
  HardDrive,
  RefreshCw,
  MoreVertical,
  Sparkles
} from 'lucide-react';
import { GuiSettings, ActiveTab } from '../types';
import { getThemeClasses, getAccentClasses, getDensityPadding } from '../utils/theme';
import { soundService } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';
import { updateManager, CURRENT_APP_VERSION } from '../utils/updateManager';

interface DesktopHeaderProps {
  settings: GuiSettings;
  onUpdateSettings: (partial: Partial<GuiSettings>) => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
  onOpenHistory?: () => void;
  onOpenBackupModal?: () => void;
  onOpenUpdateModal?: () => void;
  hasUpdateAvailable?: boolean;
  isMiniMode: boolean;
  onToggleMiniMode: () => void;
  snippetCount: number;
  placeholderCount: number;
  resourceCount: number;
  noteCount: number;
  historyCount?: number;
  onLogoClick?: () => void;
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
  onOpenUpdateModal,
  hasUpdateAvailable = false,
  isMiniMode,
  onToggleMiniMode,
  snippetCount,
  placeholderCount,
  resourceCount,
  noteCount,
  historyCount = 0,
  onLogoClick,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isLight = settings.theme === 'light-minimal';
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor, isLight);
  const density = getDensityPadding(settings.density);

  const handleLogoAction = () => {
    soundService.playClick(settings.soundEffects);
    if (onLogoClick) {
      onLogoClick();
    } else {
      onSelectTab('snippets');
    }
  };

  const secondaryBtnClass = isLight
    ? 'border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-xs transition-colors shrink-0 cursor-pointer'
    : 'border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 cursor-pointer';

  return (
    <header className={`min-h-[46px] h-auto py-1 px-2.5 sm:px-3 border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between gap-2 shrink-0 select-none w-full min-w-0 z-30`}>
      {/* Brand & Navigation Tabs Container */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
        {/* App Logo & Home trigger */}
        <button
          type="button"
          onClick={handleLogoAction}
          className={`flex items-center gap-2 shrink-0 text-left rounded-lg p-1 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 transition-all ${
            isLight ? 'hover:bg-slate-200/70' : 'hover:bg-slate-800/60'
          } active:scale-95`}
          title="На главную: Шаблоны ответов (Ctrl+1)"
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-105 ${accent.primary}`}>
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div className="hidden lg:block shrink-0">
            <h1 className={`font-bold text-xs leading-tight transition-colors ${
              isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-100 group-hover:text-white'
            }`}>
              WorkWiki 3
            </h1>
            <span className={`text-[9px] font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              v{updateManager.getCurrentVersion() || CURRENT_APP_VERSION} • Рабочее место
            </span>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className={`flex items-center gap-0.5 sm:gap-1 p-0.5 rounded-lg border overflow-x-auto no-scrollbar min-w-0 flex-1 sm:flex-initial ${
          isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <button
            type="button"
            onClick={() => onSelectTab('snippets')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === 'snippets'
                ? `${accent.primary} shadow-xs font-bold`
                : isLight
                ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
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
            onClick={() => onSelectTab('placeholders')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === 'placeholders'
                ? `${accent.primary} shadow-xs font-bold`
                : isLight
                ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="База плейсхолдеров и конструктор условий (Ctrl+2)"
          >
            <Brackets className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            <span>Плейсхолдеры</span>
            <span className="hidden sm:inline font-mono text-[9.5px] opacity-75">({placeholderCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('resources')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === 'resources'
                ? `${accent.primary} shadow-xs font-bold`
                : isLight
                ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="База ссылок и виджетов (Ctrl+3)"
          >
            <Globe className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            <span>Ссылки</span>
            <span className="hidden sm:inline font-mono text-[9.5px] opacity-75">({resourceCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('notes')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === 'notes'
                ? `${accent.primary} shadow-xs font-bold`
                : isLight
                ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Заметки смены и чек-листы (Ctrl+4)"
          >
            <StickyNote className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
            <span>Заметки</span>
            <span className="hidden sm:inline font-mono text-[9.5px] opacity-75">({noteCount})</span>
          </button>
        </nav>
      </div>

      {/* Right Tools & Actions (Responsive & Never cut off) */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto z-30">
        {/* Quick Search Palette */}
        <button
          type="button"
          onClick={onOpenPalette}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs ${secondaryBtnClass}`}
          title="Быстрый поиск шаблонов (Ctrl+K или /)"
        >
          <Search className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
          <span className="hidden md:inline">Поиск</span>
          <kbd className={`hidden xl:inline-block font-mono text-[9.5px] px-1 py-0.2 rounded border ${
            isLight ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-black/40 border-slate-700 text-slate-400'
          }`}>
            Ctrl+K
          </kbd>
        </button>

        {/* Update Center Button */}
        {onOpenUpdateModal && (
          <button
            type="button"
            onClick={onOpenUpdateModal}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              hasUpdateAvailable
                ? isLight
                  ? 'bg-sky-100 text-sky-800 border-sky-400 animate-pulse shadow-xs ring-1 ring-sky-300'
                  : 'bg-sky-500/20 text-sky-300 border-sky-400 animate-pulse shadow-md ring-1 ring-sky-400/40'
                : secondaryBtnClass
            }`}
            title={hasUpdateAvailable ? 'Доступно обновление WorkWiki 3!' : 'Проверка обновлений (без переустановки)'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${hasUpdateAvailable ? (isLight ? 'text-sky-700' : 'text-sky-400') : (isLight ? 'text-slate-500' : 'text-slate-400')}`} />
            {hasUpdateAvailable ? (
              <span className={`text-[11px] font-bold ${isLight ? 'text-sky-900' : 'text-sky-200'}`}>Обновить!</span>
            ) : (
              <span className="hidden xl:inline text-[11px]">v{updateManager.getCurrentVersion() || CURRENT_APP_VERSION}</span>
            )}
          </button>
        )}

        {/* Desktop-only secondary action buttons */}
        <div className="hidden md:flex items-center gap-1">
          {/* Shortcuts Cheat Sheet */}
          <button
            type="button"
            onClick={onOpenShortcuts}
            className={`p-1.5 rounded-lg ${secondaryBtnClass}`}
            title="Горячие клавиши (нажмите ?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Copy History Trigger */}
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className={`flex items-center gap-1 p-1.5 rounded-lg ${secondaryBtnClass} relative`}
              title="История скопированных ответов"
            >
              <History className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
              {historyCount > 0 && (
                <span className={`font-mono text-[9px] px-1 py-0.2 rounded-full font-bold border ${
                  isLight
                    ? 'bg-sky-100 text-sky-800 border-sky-200'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                }`}>
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
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 ${
                isLight
                  ? 'border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                  : 'border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300'
              }`}
              title="Резервное копирование и восстановление"
            >
              <HardDrive className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
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
                : secondaryBtnClass
            }`}
            title={isMiniMode ? 'Развернуть полное окно' : 'Компактный мини-HUD режим (Ctrl+B)'}
          >
            {isMiniMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          <PWAInstallButton />
        </div>

        {/* Responsive "More Actions" Dropdown (For compact/small window sizes) */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Дополнительные функции"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMobileMenuOpen && (
            <div className="absolute right-0 top-9 z-50 w-52 p-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl space-y-1 animate-in fade-in duration-100">
              {onOpenBackupModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenBackupModal();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Резервная копия (Бэкап)</span>
                </button>
              )}

              {onOpenHistory && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenHistory();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-sky-400" />
                  <span>История ({historyCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenShortcuts();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                <span>Горячие клавиши (?)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onToggleMiniMode();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Мини-HUD режим</span>
              </button>
            </div>
          )}
        </div>

        {/* GUI Customization Settings (Always accessible) */}
        <button
          type="button"
          id="btn-app-settings"
          onClick={onOpenSettings}
          className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer shadow-xs ${
            isLight
              ? 'border border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
              : 'border border-slate-700/80 hover:bg-slate-800 text-slate-200 bg-slate-800/90 ring-1 ring-slate-700/50'
          }`}
          title="Настройки интерфейса и темы"
        >
          <Settings className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
        </button>
      </div>
    </header>
  );
};
