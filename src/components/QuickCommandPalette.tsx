import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  ArrowRight, 
  Zap, 
  Copy, 
  Check, 
  Brackets, 
  StickyNote, 
  Globe, 
  SlidersHorizontal,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Snippet, PlaceholderConfig, NoteCard, ResourceWidget, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { interpolateSnippet } from '../utils/interpolator';
import { performGlobalSearch, GlobalSearchResult, GlobalSearchResultType } from '../utils/searchEngine';
import { soundService } from '../utils/sound';

interface QuickCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: Snippet[];
  placeholders: PlaceholderConfig[];
  notes?: NoteCard[];
  widgets?: ResourceWidget[];
  activeRow?: any;
  onSelectAndCopy: (snippet: Snippet) => void;
  onSelectPlaceholder?: (placeholder: PlaceholderConfig) => void;
  onSelectNote?: (note: NoteCard) => void;
  onSelectResource?: (resource: ResourceWidget) => void;
  settings: GuiSettings;
}

export const QuickCommandPalette: React.FC<QuickCommandPaletteProps> = ({
  isOpen,
  onClose,
  snippets,
  placeholders,
  notes = [],
  widgets = [],
  onSelectAndCopy,
  onSelectPlaceholder,
  onSelectNote,
  onSelectResource,
  settings,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<GlobalSearchResultType | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFilterType('all');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    return performGlobalSearch(
      query,
      {
        snippets,
        placeholders,
        notes,
        widgets,
      },
      filterType
    );
  }, [query, snippets, placeholders, notes, widgets, filterType]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  const handleAction = (item: GlobalSearchResult) => {
    if (item.type === 'snippet' && item.snippet) {
      onSelectAndCopy(item.snippet);
      onClose();
    } else if (item.type === 'placeholder' && item.placeholder) {
      if (onSelectPlaceholder) {
        onSelectPlaceholder(item.placeholder);
      } else {
        // Copy placeholder tag to clipboard
        navigator.clipboard?.writeText(`{{${item.placeholder.key}}}`);
        soundService.playCopyChime(settings.soundEffects);
      }
      onClose();
    } else if (item.type === 'note' && item.note) {
      if (onSelectNote) {
        onSelectNote(item.note);
      } else if (item.note.content) {
        navigator.clipboard?.writeText(item.note.content);
        soundService.playCopyChime(settings.soundEffects);
      }
      onClose();
    } else if (item.type === 'resource' && item.resource) {
      if (onSelectResource) {
        onSelectResource(item.resource);
      } else if (item.resource.url) {
        window.open(item.resource.url, '_blank');
      }
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = searchResults[selectedIndex];
      if (chosen) {
        handleAction(chosen);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const activeItem = searchResults[selectedIndex] || null;
  const activeSnippetPreview = activeItem?.snippet
    ? interpolateSnippet(activeItem.snippet.content, placeholders, null, settings.agentName).result
    : '';

  const renderTypeIcon = (type: GlobalSearchResultType) => {
    switch (type) {
      case 'snippet':
        return <Zap className="w-3.5 h-3.5 text-sky-400" />;
      case 'placeholder':
        return <Brackets className="w-3.5 h-3.5 text-purple-400" />;
      case 'note':
        return <StickyNote className="w-3.5 h-3.5 text-amber-400" />;
      case 'resource':
        return <Globe className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-[8vh] p-3 sm:p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-slide-down ${theme.panel} ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className={`p-3.5 border-b flex items-center gap-2.5 ${theme.panelHeader} ${theme.border}`}>
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Глобальный поиск: шаблоны, теги, заметки, ссылки (с авто-исправлением раскладки)..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none font-sans"
          />
          <kbd className="hidden sm:inline font-mono text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            Esc
          </kbd>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800/80 bg-slate-950/60 overflow-x-auto text-[11px]">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === 'all'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Все сущности
          </button>
          <button
            type="button"
            onClick={() => setFilterType('snippet')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === 'snippet'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3 text-sky-400" />
            <span>Шаблоны ({snippets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('placeholder')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === 'placeholder'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brackets className="w-3 h-3 text-purple-400" />
            <span>Теги ({placeholders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('note')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === 'note'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <StickyNote className="w-3 h-3 text-amber-400" />
            <span>Заметки ({notes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('resource')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === 'resource'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3 h-3 text-blue-400" />
            <span>Ссылки ({widgets.length})</span>
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-80">
          {searchResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Ничего не найдено по запросу «{query}». Попробуйте другое ключевое слово или проверьте фильтр.
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const isFocused = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleAction(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isFocused
                      ? `${accent.primaryMuted} border border-sky-400/50 shadow-sm`
                      : 'hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 shrink-0">
                      {renderTypeIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-100 truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 border border-slate-700 shrink-0">
                            {item.badge}
                          </span>
                        )}
                        {item.category && (
                          <span className="hidden sm:inline text-[10px] text-slate-400 font-sans truncate">
                            • {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[11px] ml-2">
                    <span className="hidden sm:inline font-mono text-[10px]">Enter</span>
                    <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Resolved Preview for Snippets */}
        {activeItem?.snippet && (
          <div className={`p-3 border-t bg-slate-950/70 ${theme.border} text-xs`}>
            <div className="flex items-center justify-between text-[10.5px] text-slate-400 mb-1">
              <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Предпросмотр ответа для копирования:
              </span>
              <span>Категория: {activeItem.snippet.category}</span>
            </div>
            <p className="text-slate-200 line-clamp-2 text-xs leading-relaxed font-sans">
              {activeSnippetPreview}
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className={`p-2.5 border-t flex items-center justify-between text-[11px] text-slate-400 ${theme.panelHeader} ${theme.border}`}>
          <div className="flex items-center gap-3">
            <span>↑ ↓ для выбора</span>
            <span>↵ для перехода / копирования</span>
          </div>
          <span className="font-mono text-slate-400">Esc для выхода</span>
        </div>
      </div>
    </div>
  );
};
