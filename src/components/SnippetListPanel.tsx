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
  FolderCog,
  X
} from 'lucide-react';
import { Snippet, PlaceholderConfig, ExcelRow, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses, getDensityPadding } from '../utils/theme';
import { interpolateSnippet } from '../utils/interpolator';
import { ConfirmDialogModal } from './ConfirmDialogModal';

interface SnippetListPanelProps {
  snippets: Snippet[];
  placeholders: PlaceholderConfig[];
  activeRow?: ExcelRow | null;
  settings: GuiSettings;
  onCopySnippet: (snippet: Snippet) => void;
  onEditSnippet: (snippet: Snippet) => void;
  onDeleteSnippet: (id: string) => void;
  onTogglePin: (id: string) => void;
  onCreateNew: (initialCategory?: string) => void;
  onOpenSettings?: (section?: 'gui' | 'collections' | 'backup') => void;
  selectedSnippetId: string | null;
  onSelectSnippet: (snippet: Snippet) => void;
  categories: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string, reassignTo?: string) => void;
  onOpenCategoryManager?: () => void;
}

export const SnippetListPanel: React.FC<SnippetListPanelProps> = ({
  snippets,
  placeholders,
  settings,
  onCopySnippet,
  onEditSnippet,
  onDeleteSnippet,
  onTogglePin,
  onCreateNew,
  onOpenSettings,
  selectedSnippetId,
  onSelectSnippet,
  categories,
  onAddCategory,
  onDeleteCategory,
  onOpenCategoryManager,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Adding category inline form
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const addCategoryInputRef = useRef<HTMLInputElement>(null);

  // Derive dynamic list of categories from categories prop
  const availableCategories = useMemo(() => {
    return ['Все', ...categories];
  }, [categories]);

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
        // Pinned templates stay on top
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Static alphabetical sorting by title ascending (А → Я)
        return a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' });
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

    onAddCategory(trimmed);
    setSelectedCategory(trimmed);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const currentCategorySnippetCount = useMemo(() => {
    if (selectedCategory === 'Все') return snippets.length;
    return snippets.filter((s) => s.category === selectedCategory).length;
  }, [snippets, selectedCategory]);

  return (
    <div className={`flex flex-col h-full border-r ${theme.border} ${theme.panel} overflow-hidden text-xs select-none`}>
      {/* Top Search & Filter Bar */}
      <div className={`p-2 border-b ${theme.border} ${theme.panelHeader} space-y-2 shrink-0`}>
        {/* Search Input & Action Buttons */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, тексту, тегам или /командам..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none transition-colors select-text ${theme.input}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onCreateNew(selectedCategory !== 'Все' ? selectedCategory : undefined)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-opacity hover:opacity-90 shrink-0 cursor-pointer ${accent.primary}`}
            title="Создать новый шаблон (Ctrl+N)"
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
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1 shrink-0 bg-slate-900 border border-sky-500 rounded-md p-0.5 shadow-sm"
              >
                <input
                  ref={addCategoryInputRef}
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Новая категория..."
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-950 text-slate-100 outline-none w-36 select-text"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
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
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(true);
                    setTimeout(() => {
                      addCategoryInputRef.current?.focus();
                      addCategoryInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                    }, 50);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 border border-dashed border-sky-500/50 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
                  title="Добавить новую категорию вручную"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>+ Категория</span>
                </button>

                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className="p-1 rounded-md text-slate-400 hover:text-sky-300 hover:bg-slate-800/80 border border-slate-700/60 transition-colors cursor-pointer shrink-0"
                    title="Управление категориями (создание, удаление, сброс к стандартным)"
                  >
                    <FolderCog className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                )}
              </div>
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

        {/* Action bar for Selected Category: Deletion of ANY category (standard or custom) */}
        {selectedCategory !== 'Все' && (
          <div className="flex items-center justify-between bg-slate-900/70 px-2.5 py-1 rounded border border-slate-800 text-[10.5px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="font-semibold text-sky-300">{selectedCategory}</span>
              <span className="text-slate-500 font-mono">({currentCategorySnippetCount} шаблонов)</span>
            </div>
            <div className="flex items-center gap-2.5">
              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  className="text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Открыть окно управления всеми категориями"
                >
                  <FolderCog className="w-3 h-3" />
                  <span>Управление</span>
                </button>
              )}

              {onDeleteCategory && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentCategorySnippetCount === 0) {
                      onDeleteCategory(selectedCategory);
                      setSelectedCategory('Все');
                    } else {
                      setCategoryToDelete(selectedCategory);
                    }
                  }}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                  title={`Удалить категорию «${selectedCategory}»`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Удалить категорию</span>
                </button>
              )}
            </div>
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
            // Templates decoupled from Excel activeRow
            const { result: previewText } = interpolateSnippet(
              snippet.content,
              placeholders,
              null,
              settings.agentName
            );

            return (
              <div
                key={snippet.id}
                onClick={() => onSelectSnippet(snippet)}
                className={`group relative rounded-lg border transition-all cursor-pointer ${
                  density.card
                } ${
                  isSelected
                    ? `${theme.cardActive} shadow-md`
                    : `${theme.card} hover:border-slate-600`
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Pin button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(snippet.id);
                      }}
                      className={`p-0.5 rounded transition-colors shrink-0 ${
                        snippet.isPinned
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-300'
                      }`}
                      title={snippet.isPinned ? 'Открепить' : 'Закрепить наверху'}
                    >
                      <Pin className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <h3 className="font-semibold text-slate-100 truncate text-[12.5px]">
                      {snippet.title}
                    </h3>
                  </div>

                  {/* Hotkey or Shortcut pill */}
                  <div className="flex items-center gap-1 shrink-0">
                    {snippet.hotkey && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-sky-400 border border-slate-700">
                        {snippet.hotkey}
                      </span>
                    )}
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {snippet.shortcut}
                    </span>
                  </div>
                </div>

                {/* Interpolated Preview Text */}
                <p className="text-[11.5px] text-slate-300/90 line-clamp-2 mb-2 leading-relaxed font-sans select-text">
                  {previewText}
                </p>

                {/* Footer Meta & Quick Action Buttons */}
                <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-slate-500 font-medium truncate max-w-[130px]">
                      {snippet.category}
                    </span>
                    {snippet.tags.length > 0 && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="truncate text-slate-500 max-w-[150px]">
                          #{snippet.tags.join(' #')}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSnippet(snippet);
                      }}
                      className="p-1 rounded opacity-40 group-hover:opacity-100 hover:text-sky-400 hover:bg-slate-800 transition-opacity"
                      title="Редактировать шаблон"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSnippet(snippet.id);
                      }}
                      className="p-1 rounded opacity-40 group-hover:opacity-100 hover:text-rose-400 hover:bg-slate-800 transition-opacity"
                      title="Удалить шаблон"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Instant Copy Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyClick(e, snippet)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title="Скопировать подставленный текст в буфер обмена"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-sky-400" />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info Count */}
      <div className={`p-2 border-t ${theme.border} ${theme.panelHeader} flex items-center justify-between text-[11px] text-slate-400 shrink-0`}>
        <span>
          Показано: <strong className="text-slate-200">{filteredSnippets.length}</strong> из {snippets.length}
        </span>
        <span className="text-slate-500 font-mono">Alt+1..9 быстрый выбор</span>
      </div>

      {/* Confirmation: Delete Category */}
      <ConfirmDialogModal
        isOpen={categoryToDelete !== null}
        title="Удалить категорию?"
        description={
          categoryToDelete ? (
            <div>
              В категории <strong className="text-rose-300">«{categoryToDelete}»</strong> находится {snippets.filter(s => s.category === categoryToDelete).length} шаблонов. Они будут перемещены в категорию «Общее». Удалить категорию?
            </div>
          ) : null
        }
        confirmText="Удалить и переместить шаблоны"
        cancelText="Отмена"
        variant="danger"
        icon="trash"
        onConfirm={() => {
          if (categoryToDelete) {
            onDeleteCategory(categoryToDelete, 'Общее');
            setSelectedCategory('Все');
            setCategoryToDelete(null);
          }
        }}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
};
