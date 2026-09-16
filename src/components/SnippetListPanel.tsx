import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Pin, 
  Copy, 
  Check, 
  Tag, 
  Zap, 
  Edit3, 
  Trash2,
  FileJson,
  FolderPlus,
  X
} from 'lucide-react';
import { Snippet, PlaceholderConfig, ExcelRow, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses, getDensityPadding } from '../utils/theme';
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
  onCreateNew: (initialCategory?: string) => void;
  onOpenSettings?: (section?: 'gui' | 'collections' | 'backup') => void;
  selectedSnippetId: string | null;
  onSelectSnippet: (snippet: Snippet) => void;
  customCategories?: string[];
  onAddCategory?: (category: string) => void;
  onDeleteCategory?: (category: string) => void;
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
  customCategories = [],
  onAddCategory,
  onDeleteCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Adding category inline form
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const addCategoryInputRef = useRef<HTMLInputElement>(null);

  // Derive dynamic list of categories from existing snippets + defaults + custom categories
  const availableCategories = useMemo(() => {
    const fromSnippets = snippets
      .map((s) => s.category)
      .filter((c) => Boolean(c) && !DEFAULT_CATEGORIES.includes(c));
    const allCustom = Array.from(new Set([...customCategories, ...fromSnippets]));
    return [...DEFAULT_CATEGORIES, ...allCustom];
  }, [snippets, customCategories]);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);
  const density = getDensityPadding(settings.density);

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

  const handleConfirmAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setIsAddingCategory(false);
      return;
    }

    if (onAddCategory) {
      onAddCategory(trimmed);
    }
    setSelectedCategory(trimmed);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const isCurrentCategoryCustom = useMemo(() => {
    return (
      selectedCategory !== 'Все' &&
      !DEFAULT_CATEGORIES.includes(selectedCategory)
    );
  }, [selectedCategory]);

  const currentCategorySnippetCount = useMemo(() => {
    if (selectedCategory === 'Все') return snippets.length;
    return snippets.filter((s) => s.category === selectedCategory).length;
  }, [snippets, selectedCategory]);

  return (
    <div className={`flex flex-col h-full border-r ${theme.border} ${theme.panel} overflow-hidden text-xs select-none`}>
      {/* Search and Quick Add Bar */}
      <div className={`${density.card} border-b ${theme.border} ${theme.panelHeader} ${density.spaceY} shrink-0`}>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, /команде, тегу..."
              className={`w-full pl-8 pr-7 py-1.5 rounded-lg border outline-none text-xs transition-colors select-text ${theme.input}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* New Snippet Button */}
          <button
            type="button"
            onClick={() => onCreateNew(selectedCategory !== 'Все' ? selectedCategory : undefined)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm shrink-0 cursor-pointer transition-opacity hover:opacity-90 ${accent.primary}`}
            title="Создать новый быстрый ответ (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый</span>
          </button>
        </div>

        {/* Category Filter Pills & Add Category Button */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? `${accent.primaryMuted} font-bold ring-1 ring-sky-400/40`
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50'
                }`}
              >
                {cat}
              </button>
            ))}

            {/* Inline Add Category Form / Button */}
            {isAddingCategory ? (
              <form
                onSubmit={handleConfirmAddCategory}
                className="flex items-center gap-1 shrink-0 bg-slate-900 border border-sky-500/80 rounded-md p-0.5 shadow-sm"
              >
                <input
                  ref={addCategoryInputRef}
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Новая категория..."
                  className="px-1.5 py-0.5 rounded text-[10.5px] bg-slate-950 text-slate-100 outline-none w-32 select-text"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }
                  }}
                />
                <button
                  type="submit"
                  className="px-1.5 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10.5px] font-bold cursor-pointer"
                  title="Добавить категорию (Enter)"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }}
                  className="px-1 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Отмена (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory(true);
                  setTimeout(() => addCategoryInputRef.current?.focus(), 50);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 border border-dashed border-sky-500/50 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
                title="Добавить новую категорию вручную"
              >
                <FolderPlus className="w-3 h-3" />
                <span>+ Категория</span>
              </button>
            )}
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => onOpenSettings('collections')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-sky-400 hover:text-sky-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 shrink-0 whitespace-nowrap ml-1 transition-colors cursor-pointer"
              title="Импорт и экспорт коллекций JSON в настройках"
            >
              <FileJson className="w-3 h-3 text-sky-400" />
              <span className="hidden md:inline">Коллекции</span>
            </button>
          )}
        </div>

        {/* Action bar for custom category (e.g. Delete empty category) */}
        {isCurrentCategoryCustom && (
          <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800 text-[10.5px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="font-semibold text-sky-300">{selectedCategory}</span>
              <span className="text-slate-500 font-mono">({currentCategorySnippetCount} шаблонов)</span>
            </div>
            {currentCategorySnippetCount === 0 && onDeleteCategory && (
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(selectedCategory);
                  setSelectedCategory('Все');
                }}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                title="Удалить пустую категорию"
              >
                <Trash2 className="w-3 h-3" />
                <span>Удалить категорию</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Snippet Card List */}
      <div className={`flex-1 overflow-y-auto ${density.container} ${density.spaceY} divide-y-0 select-text`}>
        {filteredSnippets.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {selectedCategory !== 'Все' ? (
              <div className="space-y-3">
                <p className="text-slate-300 text-xs">
                  В категории «<strong className="text-white">{selectedCategory}</strong>» пока нет сохраненных шаблонов.
                </p>
                <button
                  type="button"
                  onClick={() => onCreateNew(selectedCategory)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md cursor-pointer transition-opacity hover:opacity-90 ${accent.primary}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Создать первый шаблон в «{selectedCategory}»</span>
                </button>
              </div>
            ) : (
              <p className="italic">
                Шаблоны не найдены. Попробуйте изменить поисковый запрос или создайте новый шаблон.
              </p>
            )}
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
                className={`${density.card} rounded-lg border transition-all cursor-pointer group select-text ${
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

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(snippet.id);
                      }}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        snippet.isPinned
                          ? 'text-amber-400 bg-amber-950/50'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title={snippet.isPinned ? 'Открепить' : 'Закрепить вверху'}
                    >
                      <Pin className="w-3 h-3 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSnippet(snippet);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                      title="Редактировать шаблон"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Удалить шаблон «${snippet.title}»?`)) {
                          onDeleteSnippet(snippet.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Удалить шаблон"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyClick(e, snippet)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
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
                <p className="text-[11px] text-slate-300 line-clamp-2 mt-1.5 leading-relaxed font-sans select-text">
                  {previewText}
                </p>

                {/* Footer: Category, Tags & Usage Stats */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5 overflow-hidden truncate">
                    <span className="text-sky-400/90 font-medium truncate max-w-[120px]">
                      {snippet.category}
                    </span>
                    {snippet.tags.length > 0 && <span className="text-slate-600">•</span>}
                    {snippet.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-slate-400 font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <span className="shrink-0 text-slate-500">
                    {snippet.usageCount} исп.
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
            type="button"
            onClick={() => onOpenSettings('collections')}
            className="text-[10.5px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors hover:underline cursor-pointer"
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
