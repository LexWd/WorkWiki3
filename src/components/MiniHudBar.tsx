import React, { useState, useMemo } from 'react';
import { Zap, Copy, Check, Search, Maximize2, FileSpreadsheet, Keyboard } from 'lucide-react';
import { Snippet, PlaceholderConfig, ExcelRow, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { interpolateSnippet } from '../utils/interpolator';

interface MiniHudBarProps {
  snippets: Snippet[];
  placeholders: PlaceholderConfig[];
  activeRow: ExcelRow | null;
  onCopySnippet: (snippet: Snippet) => void;
  onToggleMiniMode: () => void;
  settings: GuiSettings;
}

export const MiniHudBar: React.FC<MiniHudBarProps> = ({
  snippets,
  placeholders,
  activeRow,
  onCopySnippet,
  onToggleMiniMode,
  settings,
}) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  const topSnippets = useMemo(() => {
    if (!search.trim()) {
      return [...snippets].slice(0, 8);
    }
    const q = search.toLowerCase();
    return snippets
      .filter((s) => s.title.toLowerCase().includes(q) || s.shortcut.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, snippets]);

  const handleCopy = (snippet: Snippet) => {
    onCopySnippet(snippet);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className={`p-3 rounded-xl border shadow-2xl ${theme.panel} ${theme.border} text-xs select-none backdrop-blur-md`}>
      {/* Top Header of Mini HUD */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${accent.primary}`}>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs text-slate-100">Компактный мини-HUD для оператора</span>
        </div>

        <div className="flex items-center gap-2">
          {activeRow && (
            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-mono">
              Excel: {Object.values(activeRow.data)[0]}
            </span>
          )}

          <button
            onClick={onToggleMiniMode}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
            title="Развернуть полный интерфейс (Ctrl+B)"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Развернуть</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-2.5">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Быстрый поиск шаблона..."
          className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none ${theme.input}`}
        />
      </div>

      {/* Quick Snippet Buttons Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {topSnippets.map((s, idx) => {
          const isCopied = copiedId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleCopy(s)}
              className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                isCopied
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700'
              }`}
              title={s.content}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="font-mono text-[10px] text-sky-400 font-bold truncate">
                  {s.shortcut}
                </span>
                <span className="font-mono text-[9px] bg-slate-800 px-1 rounded text-slate-400">
                  Alt+{idx + 1}
                </span>
              </div>
              <span className="font-medium text-[11px] truncate mt-1 text-slate-100">
                {s.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
