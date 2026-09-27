import React from 'react';
import { Database, History } from 'lucide-react';
import { GuiSettings } from '../types';
import { getThemeClasses } from '../utils/theme';
import { CURRENT_APP_VERSION } from '../utils/updateManager';

interface ProductivityStatsBarProps {
  settings: GuiSettings;
  snippetCount: number;
  tableRowsCount?: number;
  placeholderCount: number;
  historyCount?: number;
  onOpenHistory?: () => void;
}

export const ProductivityStatsBar: React.FC<ProductivityStatsBarProps> = ({
  settings,
  snippetCount,
  placeholderCount,
  historyCount = 0,
  onOpenHistory,
}) => {
  const theme = getThemeClasses(settings.theme);

  return (
    <div className={`h-7 px-3 border-t flex items-center justify-between text-[11px] select-none shrink-0 ${theme.panelHeader} ${theme.border} min-w-0 overflow-hidden`}>
      {/* Left: Storage & counts */}
      <div className="flex items-center gap-2 sm:gap-3 truncate">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium shrink-0">
          <Database className="w-3 h-3 text-sky-400" />
          <span className="hidden xs:inline">Локальная база данных</span>
        </span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="text-slate-400 truncate">
          <strong className="text-slate-200">{snippetCount}</strong> шаблонов
        </span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="text-slate-400 hidden sm:inline">
          <strong className="text-slate-200">{placeholderCount}</strong> плейсхолдеров
        </span>
        {onOpenHistory && (
          <>
            <span className="text-slate-600 hidden md:inline">•</span>
            <button
              type="button"
              onClick={onOpenHistory}
              className="hidden md:flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
              title="Открыть историю скопированных ответов"
            >
              <History className="w-3 h-3 text-sky-400" />
              <span>
                История: <strong className="text-slate-200">{historyCount}</strong>
              </span>
            </button>
          </>
        )}
      </div>

      {/* Right: Version info */}
      <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-mono shrink-0 pl-2">
        <span className="hidden sm:inline">WorkWiki 3</span>
        <span className="text-sky-400 font-semibold">v{CURRENT_APP_VERSION}</span>
      </div>
    </div>
  );
};
