import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Pin, 
  Copy, 
  Check, 
  Tag, 
  Zap, 
  MoreVertical, 
  Edit3, 
  Trash2,
  Bookmark,
  ChevronRight,
  FileJson,
  Sliders
} from 'lucide-react';
import { Snippet, SnippetCategory, PlaceholderConfig, ExcelRow, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { interpolateSnippet } from '../utils/interpolator';

interface SnippetListPanelProps {
  snippets: Snippet[];
  placeholders: PlaceholderConfig[];
  activeRow: ExcelRow | null;
  settings: GuiSettings;
  onCopySnippet: (snippet: Snippet) => void;
  onEditSnippet: (snippet: Snippet) => void;
  onDeleteSnippet: (id: string) => void;
  onTogglePin: (id: string) => void;
  onCreateNew: () => void;
  onOpenSettings?: (section?: 'gui' | 'collections' | 'backup') => void;
  selectedSnippetId: string | null;
  onSelectSnippet: (snippet: Snippet) => void;
}

const DEFAULT_CATEGORIES = [
  'Все',
  'Приветствие и начало',
  'Заказы и доставка',
  'Возвраты и компенсации',
  'Техническая поддержка',
  'Оплата и счета',
  'Эскалации',
  'Завершение диалога',
];

export const SnippetListPanel: React.FC<SnippetListPanelProps> = ({
  snippets,
  placeholders,
  activeRow,
  settings,
  onCopySnippet,
  onEditSnippet,
  onDeleteSnippet,
  onTogglePin,
  onCreateNew,
  onOpenSettings,
  selectedSnippetId,
  onSelectSnippet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Derive dynamic list of categories from existing snippets + defaults
  const availableCategories = useMemo(() => {
    const custom = snippets
      .map((s) => s.category)
      .filter((c) => Boolean(c) && !DEFAULT_CATEGORIES.includes(c));
    return [...DEFAULT_CATEGORIES, ...Array.from(new Set(custom))];
  }, [snippets]);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  // Filtered & sorted snippets
  const filteredSnippets = useMemo(() => {
    return snippets
      .filter((s) => {
        const matchesCategory = selectedCategory === 'Все' || s.category === selectedCategory;
        if (!matchesCategory) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesShortcut = s.shortcut.toLowerCase().includes(q);
        const matchesContent = s.content.toLowerCase().includes(q);
        const matchesTags = s.tags.some((t) => t.toLowerCase().includes(q));

        return matchesTitle || matchesShortcut || matchesContent || matchesTags;
      })
      .sort((a, b) => {
        // Pinned first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then by usage count
        return b.usageCount - a.usageCount;
      });
  }, [snippets, selectedCategory, searchQuery]);

  const handleCopyClick = (e: React.MouseEvent, snippet: Snippet) => {
    e.stopPropagation();
    onCopySnippet(snippet);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className={`flex flex-col h-full border-r ${theme.border} ${theme.panel} overflow-hidden text-xs select-none`}>
      {/* Search and Quick Add Bar */}
      <div className={`p-2.5 border-b ${theme.border} ${theme.panelHeader} space-y-2 shrink-0`}>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, /команде, тегу..."
              className={`w-full pl-8 pr-7 py-1.5 rounded-lg border outline-none text-xs transition-colors ${theme.input}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* New Snippet */}
          <button
            onClick={onCreateNew}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm shrink-0 ${accent.primary}`}
            title="Создать новый быстрый ответ (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый</span>
          </button>
        </div>

        {/* Category Filter Pills & Settings Collection Shortcut */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-colors shrink-0 whitespace-nowrap ${
                  selectedCategory === cat
                    ? `${accent.primaryMuted} font-bold ring-1 ring-sky-400/40`
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {onOpenSettings && (
            <button
              onClick={() => onOpenSettings('collections')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-sky-400 hover:text-sky-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 shrink-0 whitespace-nowrap ml-1 transition-colors"
              title="Импорт и экспорт коллекций JSON в настройках"
            >
              <FileJson className="w-3 h-3 text-sky-400" />
              <span className="hidden md:inline">Коллекции</span>
            </button>
          )}
        </div>
      </div>

      {/* Snippet Card List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 divide-y-0">
        {filteredSnippets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic">
            Шаблоны не найдены. Попробуйте изменить поисковый запрос или создайте новый.
          </div>
        ) : (
          filteredSnippets.map((snippet) => {
            const isSelected = selectedSnippetId === snippet.id;
            const isCopied = copiedId === snippet.id;
            const { result: previewText } = interpolateSnippet(
              snippet.content,
              placeholders,
              activeRow,
              settings.agentName
            );

            return (
              <div
                key={snippet.id}
                onClick={() => onSelectSnippet(snippet)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer group ${
                  isSelected
                    ? `${accent.primaryMuted} border-sky-400/80 ring-1 ring-sky-400/30`
                    : `${theme.card} hover:border-slate-600`
                }`}
              >
                {/* Header: Title, Shortcut, Hotkey, Pin */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-100 text-xs truncate">
                        {snippet.title}
                      </span>
                      <span className="font-mono text-[10px] text-sky-400 bg-sky-950/70 border border-sky-800/80 px-1.5 py-0.2 rounded font-semibold">
                        {snippet.shortcut}
                      </span>
                      {snippet.hotkey && (
                        <span className="font-mono text-[9.5px] bg-slate-800 text-slate-300 border border-slate-700 px-1 py-0.2 rounded font-bold shadow-xs">
                          {snippet.hotkey}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(snippet.id);
                      }}
                      className={`p-1 rounded hover:bg-slate-700/60 ${
                        snippet.isPinned ? 'text-amber-400' : 'text-slate-500 opacity-40 group-hover:opacity-100'
                      }`}
                      title={snippet.isPinned ? 'Открепить' : 'Закрепить вверху'}
                    >
                      <Pin className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSnippet(snippet);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 opacity-40 group-hover:opacity-100"
                      title="Редактировать шаблон"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Удалить шаблон «${snippet.title}»?`)) {
                          onDeleteSnippet(snippet.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 opacity-40 group-hover:opacity-100 transition-colors"
                      title="Удалить шаблон"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => handleCopyClick(e, snippet)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title="Скопировать подставленный текст в буфер обмена"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Копия!' : 'Копировать'}</span>
                    </button>
                  </div>
                </div>

                {/* Content Preview */}
                <p className="text-[11px] text-slate-300 line-clamp-2 mt-1.5 leading-relaxed font-sans">
                  {previewText}
                </p>

                {/* Footer: Tags & Usage Stats */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1 overflow-hidden truncate">
                    {snippet.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-slate-400 font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <span className="shrink-0 text-slate-500">
                    Использован: {snippet.usageCount} раз
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar with link to settings collections */}
      <div className={`p-2 border-t ${theme.border} ${theme.panelHeader} flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400 shrink-0`}>
        <div className="flex items-center gap-1.5">
          <span>Всего шаблонов: <strong className="text-slate-200">{filteredSnippets.length}</strong></span>
          {selectedCategory !== 'Все' && (
            <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
              (в «{selectedCategory}»)
            </span>
          )}
        </div>

        {onOpenSettings && (
          <button
            onClick={() => onOpenSettings('collections')}
            className="text-[10.5px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors hover:underline"
            title="Импортировать или экспортировать коллекции JSON в настройках"
          >
            <FileJson className="w-3 h-3 text-sky-400" />
            <span>Импорт/Экспорт JSON</span>
          </button>
        )}
      </div>
    </div>
  );
};
