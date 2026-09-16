import React from 'react';
import { Database } from 'lucide-react';
import { GuiSettings } from '../types';
import { getThemeClasses } from '../utils/theme';

interface ProductivityStatsBarProps {
  settings: GuiSettings;
  snippetCount: number;
  tableRowsCount: number;
  placeholderCount: number;
}

export const ProductivityStatsBar: React.FC<ProductivityStatsBarProps> = ({
  settings,
  snippetCount,
  tableRowsCount,
  placeholderCount,
}) => {
  const theme = getThemeClasses(settings.theme);

  return (
    <div className={`h-7 px-3 border-t flex items-center justify-between text-[11px] select-none shrink-0 ${theme.panelHeader} ${theme.border}`}>
      {/* Left: Storage & counts */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Database className="w-3 h-3 text-sky-400" />
          <span>Локальная база данных</span>
        </span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="text-slate-400 hidden sm:inline">
          <strong className="text-slate-200">{snippetCount}</strong> шаблонов
        </span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="text-slate-400 hidden sm:inline">
          <strong className="text-slate-200">{tableRowsCount}</strong> записей Excel
        </span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="text-slate-400 hidden sm:inline">
          <strong className="text-slate-200">{placeholderCount}</strong> плейсхолдеров
        </span>
      </div>

      {/* Right: Version info */}
      <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-mono">
        <span>QuickReply Desk</span>
        <span className="text-slate-500">v2.0</span>
      </div>
    </div>
  );
};
