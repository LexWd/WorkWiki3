import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Command, ArrowRight, Zap, Copy, Check } from 'lucide-react';
import { Snippet, PlaceholderConfig, ExcelRow, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { interpolateSnippet } from '../utils/interpolator';

interface QuickCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: Snippet[];
  placeholders: PlaceholderConfig[];
  activeRow: ExcelRow | null;
  onSelectAndCopy: (snippet: Snippet) => void;
  settings: GuiSettings;
}

export const QuickCommandPalette: React.FC<QuickCommandPaletteProps> = ({
  isOpen,
  onClose,
  snippets,
  placeholders,
  activeRow,
  onSelectAndCopy,
  settings,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Return top 8 most used or pinned
      return [...snippets].sort((a, b) => b.usageCount - a.usageCount).slice(0, 8);
    }
    const q = query.toLowerCase().trim();
    return snippets
      .filter((s) => {
        return (
          s.title.toLowerCase().includes(q) ||
          s.shortcut.toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .slice(0, 10);
  }, [query, snippets]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filtered[selectedIndex];
      if (chosen) {
        onSelectAndCopy(chosen);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const activeSnippet = filtered[selectedIndex] || null;
  const activePreview = activeSnippet
    ? interpolateSnippet(activeSnippet.content, placeholders, activeRow, settings.agentName).result
    : '';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-[10vh] p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-slide-down ${theme.panel} ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className={`p-3.5 border-b flex items-center gap-2.5 ${theme.panelHeader} ${theme.border}`}>
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск шаблона по названию, /команде, тексту (нажмите Enter для копирования)..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none font-sans"
          />
          <kbd className="hidden sm:inline font-mono text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            Esc для закрытия
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-72">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            filtered.map((s, idx) => {
              const isFocused = idx === selectedIndex;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectAndCopy(s);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isFocused
                      ? `${accent.primaryMuted} border border-sky-400/50`
                      : 'hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/60 shrink-0">
                      {s.shortcut}
                    </span>
                    <span className="font-semibold text-xs text-slate-200 truncate">
                      {s.title}
                    </span>
                    {s.hotkey && (
                      <span className="font-mono text-[10px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded border border-slate-700 shrink-0">
                        {s.hotkey}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[11px]">
                    <span className="hidden sm:inline font-mono text-[10px]">Enter для копирования</span>
                    <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Resolved Preview of Selected */}
        {activeSnippet && (
          <div className={`p-3 border-t bg-slate-950/60 ${theme.border} text-xs`}>
            <div className="flex items-center justify-between text-[10.5px] text-slate-400 mb-1">
              <span className="font-bold uppercase tracking-wider text-emerald-400">
                Итоговый текст для буфера обмена:
              </span>
              <span>Категория: {activeSnippet.category}</span>
            </div>
            <p className="text-slate-200 line-clamp-2 text-xs leading-relaxed font-sans">
              {activePreview}
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className={`p-2.5 border-t flex items-center justify-between text-[11px] text-slate-400 ${theme.panelHeader} ${theme.border}`}>
          <div className="flex items-center gap-3">
            <span>↑ ↓ для выбора</span>
            <span>↵ для мгновенного копирования в буфер</span>
          </div>
          <span className="text-emerald-400 font-mono">100% Офлайн</span>
        </div>
      </div>
    </div>
  );
};
