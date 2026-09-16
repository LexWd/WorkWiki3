import React from 'react';
import { Zap, HardDrive, Keyboard, Award } from 'lucide-react';
import { ProductivityMetrics, GuiSettings } from '../types';
import { getThemeClasses } from '../utils/theme';

interface ProductivityStatsBarProps {
  metrics: ProductivityMetrics;
  settings: GuiSettings;
  snippetCount: number;
  tableRowsCount: number;
  placeholderCount: number;
}

export const ProductivityStatsBar: React.FC<ProductivityStatsBarProps> = ({
  metrics,
  settings,
  snippetCount,
  tableRowsCount,
  placeholderCount,
}) => {
  const theme = getThemeClasses(settings.theme);
  const minutesSaved = Math.round(metrics.timeSavedSeconds / 60);

  return (
    <div className={`h-8 px-3 border-t flex items-center justify-between text-[11px] select-none shrink-0 ${theme.panelHeader} ${theme.border}`}>
      {/* Left: Storage & Offline health */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <HardDrive className="w-3 h-3" />
          <span>Локальная база данных (Офлайн)</span>
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

      {/* Right: Real-time Productivity Achievements */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-300" title="Всего шаблонов скопировано или использовано">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="font-mono font-semibold">{metrics.snippetsUsedCount}</span>
          <span className="text-slate-400 text-[10px]">ответов отправлено</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-slate-300" title="Сэкономлено нажатий клавиш">
          <Keyboard className="w-3 h-3 text-sky-400" />
          <span className="font-mono font-semibold">{metrics.keystrokesSaved.toLocaleString()}</span>
          <span className="text-slate-400 text-[10px]">символов сэкономлено</span>
        </div>

        <div className="flex items-center gap-1.5 text-amber-300 font-medium" title="Расчетное сэкономленное рабочее время">
          <Award className="w-3 h-3 text-amber-400" />
          <span className="font-mono font-bold">~{minutesSaved} мин</span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">сэкономлено за смену</span>
        </div>
      </div>
    </div>
  );
};
