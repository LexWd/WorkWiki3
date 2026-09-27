import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Star,
  Copy, 
  Check, 
  Edit3, 
  Trash2,
  FileJson,
  FolderPlus,
  FolderCog,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Layers,
  Folder,
  SlidersHorizontal,
  FolderTree,
  Globe
} from 'lucide-react';
import { Snippet, PlaceholderConfig, ExcelRow, GuiSettings, CategoryMetadata, CustomIcon } from '../types';
import { getThemeClasses, getAccentClasses, getDensityPadding } from '../utils/theme';
import { interpolateSnippet } from '../utils/interpolator';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { CategoryTreeDropdown } from './CategoryTreeDropdown';
import { getCategoryMeta, renderCategoryIcon } from '../utils/categoryMeta';

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
  categoryMetadata?: Record<string, CategoryMetadata>;
  customIcons?: CustomIcon[];
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
  categoryMetadata,
  customIcons,
  onAddCategory,
  onDeleteCategory,
  onOpenCategoryManager,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'current' | 'all'>('current');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Category Tree / Dropdown Popover
  const [isTreeDropdownOpen, setIsTreeDropdownOpen] = useState(false);

  // Category navigation view mode: 'scroll' (horizontal bar with arrows) or 'grid' (all wrapped)
  const [categoryViewMode, setCategoryViewMode] = useState<'scroll' | 'grid'>('scroll');
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Adding category inline form
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const addCategoryInputRef = useRef<HTMLInputElement>(null);

  // Derive dynamic list of categories from categories prop
  const availableCategories = useMemo(() => {
    return ['Все', '⭐ Избранные', ...categories];
  }, [categories]);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);
  const density = getDensityPadding(settings.density);

  const pinnedCount = useMemo(() => {
    return snippets.filter((s) => s.isPinned).length;
  }, [snippets]);

  // Check scroll position for arrow buttons
  const checkScroll = () => {
    if (!categoriesScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = categoriesScrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = categoriesScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [availableCategories, categoryViewMode]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!categoriesScrollRef.current) return;
    const distance = 160;
    categoriesScrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  // Count matches across all categories
  const allCategoryMatchesCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase().trim();
    return snippets.filter((s) => {
      return (
        s.title.toLowerCase().includes(q) ||
        s.shortcut.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }).length;
  }, [snippets, searchQuery]);

  // Count matches in current category
  const currentCategoryMatchesCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase().trim();
    return snippets.filter((s) => {
      if (selectedCategory === '⭐ Избранные') {
        if (!s.isPinned) return false;
      } else if (selectedCategory !== 'Все') {
        if (s.category !== selectedCategory) return false;
      }
      return (
        s.title.toLowerCase().includes(q) ||
        s.shortcut.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }).length;
  }, [snippets, selectedCategory, searchQuery]);

  // Filtered & sorted snippets
  const filteredSnippets = useMemo(() => {
    const effectiveScope = (selectedCategory === 'Все' || !searchQuery.trim()) ? 'all' : searchScope;

    return snippets
      .filter((s) => {
        if (effectiveScope === 'current') {
          if (selectedCategory === '⭐ Избранные') {
            if (!s.isPinned) return false;
          } else if (selectedCategory !== 'Все') {
            if (s.category !== selectedCategory) return false;
          }
        } else if (effectiveScope === 'all' && !searchQuery.trim()) {
          // If not actively searching, respect category selection
          if (selectedCategory === '⭐ Избранные') {
            if (!s.isPinned) return false;
          } else if (selectedCategory !== 'Все') {
            if (s.category !== selectedCategory) return false;
          }
        }

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
  }, [snippets, selectedCategory, searchQuery, searchScope]);

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
    if (selectedCategory === '⭐ Избранные') return pinnedCount;
    return snippets.filter((s) => s.category === selectedCategory).length;
  }, [snippets, selectedCategory, pinnedCount]);

  const activeCategoryMeta = useMemo(() => {
    return getCategoryMeta(selectedCategory, categoryMetadata);
  }, [selectedCategory, categoryMetadata]);

  return (
    <div className={`relative flex flex-col h-full border-r ${theme.border} ${theme.panel} overflow-hidden text-xs select-none`}>
      {/* Category Tree / Dropdown Popover */}
      <CategoryTreeDropdown
        isOpen={isTreeDropdownOpen}
        onClose={() => setIsTreeDropdownOpen(false)}
        categories={categories}
        snippets={snippets}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          // scroll pill into view if in scroll mode
          setTimeout(() => checkScroll(), 100);
        }}
        onCreateNewSnippet={(cat) => onCreateNew(cat)}
        categoryMetadata={categoryMetadata}
        onOpenCategoryManager={onOpenCategoryManager}
        onStartAddCategory={() => {
          setIsAddingCategory(true);
          setTimeout(() => addCategoryInputRef.current?.focus(), 50);
        }}
        settings={settings}
      />

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
            onClick={() => onCreateNew(selectedCategory !== 'Все' && selectedCategory !== '⭐ Избранные' ? selectedCategory : undefined)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-opacity hover:opacity-90 shrink-0 cursor-pointer ${accent.primary}`}
            title="Создать новый шаблон (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый</span>
          </button>
        </div>

        {/* Search Scope Switcher (Category vs All) */}
        {selectedCategory !== 'Все' && (
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-[10.5px]">
            <button
              type="button"
              onClick={() => setSearchScope('current')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium transition-all cursor-pointer truncate ${
                searchScope === 'current'
                  ? 'bg-slate-800 text-sky-300 font-bold border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Искать только внутри коллекции «${selectedCategory}»`}
            >
              <Folder className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">В «{selectedCategory}»</span>
              {searchQuery && (
                <span className="font-mono text-[9.5px] opacity-80">({currentCategoryMatchesCount})</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSearchScope('all')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium transition-all cursor-pointer ${
                searchScope === 'all'
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Искать по всем категориям и коллекциям"
            >
              <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>По всем папкам</span>
              {searchQuery && (
                <span className="font-mono text-[9.5px] opacity-80">({allCategoryMatchesCount})</span>
              )}
            </button>
          </div>
        )}

        {/* Helpful suggestion prompt if 0 results in current category but found in others */}
        {Boolean(searchQuery && searchScope === 'current' && currentCategoryMatchesCount === 0 && allCategoryMatchesCount > 0) && (
          <div className="p-2 rounded-lg bg-sky-950/50 border border-sky-500/40 flex items-center justify-between gap-2 text-[11px] animate-in fade-in">
            <span className="text-slate-300">
              В этой папке нет, но есть <strong>{allCategoryMatchesCount}</strong> в других!
            </span>
            <button
              type="button"
              onClick={() => setSearchScope('all')}
              className="px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[10px] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
            >
              Искать везде →
            </button>
          </div>
        )}

        {/* Tree / Dropdown Trigger & View Mode Switcher Header */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          {/* Main Dropdown / Tree Selector Button */}
          <button
            type="button"
            onClick={() => setIsTreeDropdownOpen(!isTreeDropdownOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs max-w-[240px] truncate ${
              isTreeDropdownOpen
                ? `${activeCategoryMeta.style.activeBg} ${activeCategoryMeta.style.activeBorder} ${activeCategoryMeta.style.activeText}`
                : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700/70 hover:border-slate-600'
            }`}
            title="Открыть выпадающее древовидное меню всех коллекций с поиском"
          >
            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${activeCategoryMeta.style.pillBg} ${activeCategoryMeta.style.pillText}`}>
              {renderCategoryIcon(activeCategoryMeta.icon, 'w-3 h-3')}
            </div>
            <span className="truncate">{selectedCategory}</span>
            <span className="text-[10px] font-mono opacity-60">({currentCategorySnippetCount})</span>
            <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ml-0.5 shrink-0 ${isTreeDropdownOpen ? 'rotate-180 text-sky-400' : ''}`} />
          </button>

          {/* Quick controls: View Mode toggle & Management */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Toggle scroll vs wrapped grid */}
            <button
              type="button"
              onClick={() => setCategoryViewMode(categoryViewMode === 'scroll' ? 'grid' : 'scroll')}
              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                categoryViewMode === 'grid'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700/60'
              }`}
              title={categoryViewMode === 'scroll' ? 'Развернуть все категории сеткой' : 'Свернуть в компактную прокручиваемую ленту'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>

            {/* Tree Dropdown direct button */}
            <button
              type="button"
              onClick={() => setIsTreeDropdownOpen(!isTreeDropdownOpen)}
              className="p-1 rounded-md text-slate-400 hover:text-sky-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors cursor-pointer"
              title="Открыть меню коллекций (Дерево папок)"
            >
              <FolderTree className="w-3.5 h-3.5 text-sky-400" />
            </button>

            {/* Categories manager modal */}
            {onOpenCategoryManager && (
              <button
                type="button"
                onClick={onOpenCategoryManager}
                className="p-1 rounded-md text-slate-400 hover:text-sky-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors cursor-pointer"
                title="Управление категориями (цвета, иконки, переименование)"
              >
                <FolderCog className="w-3.5 h-3.5 text-purple-400" />
              </button>
            )}

            {/* JSON Collections in Settings */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => onOpenSettings('collections')}
                className="p-1 rounded-md text-slate-400 hover:text-sky-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors cursor-pointer"
                title="Экспорт и импорт коллекций"
              >
                <FileJson className="w-3.5 h-3.5 text-sky-400" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Bar: Scroll Mode with Left/Right arrows or Grid Mode */}
        <div className="relative group/pills">
          {categoryViewMode === 'scroll' ? (
            <div className="flex items-center gap-1">
              {/* Left Scroll Button */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => handleScroll('left')}
                  className="absolute left-0 z-10 p-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-200 shadow-md cursor-pointer transition-all"
                  title="Прокрутить влево"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
              )}

              {/* Scrollable container with mouse wheel support */}
              <div 
                ref={categoriesScrollRef}
                onWheel={(e) => {
                  if (e.deltaY !== 0 && categoriesScrollRef.current) {
                    e.preventDefault();
                    categoriesScrollRef.current.scrollLeft += e.deltaY;
                    checkScroll();
                  }
                }}
                className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth flex-1"
              >
                {availableCategories.map((cat) => {
                  const meta = getCategoryMeta(cat, categoryMetadata);
                  const isSelected = selectedCategory === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer border ${
                        isSelected
                          ? `${meta.style.activeBg} ${meta.style.activeBorder} ${meta.style.activeText} font-bold ring-1 ${meta.style.ringColor} shadow-xs`
                          : `bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/50 ${meta.style.hoverBorder}`
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${isSelected ? meta.style.pillText : 'text-slate-400'}`}>
                        {renderCategoryIcon(meta.icon, 'w-3 h-3')}
                      </div>
                      <span>{cat}</span>
                      {isSelected && (
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.style.dotColor} shrink-0 animate-pulse`} />
                      )}
                    </button>
                  );
                })}

                {/* Inline Add Category Form */}
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
                      className="px-2 py-0.5 rounded text-[11px] bg-slate-950 text-slate-100 outline-none w-32 select-text"
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
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(true);
                      setTimeout(() => {
                        addCategoryInputRef.current?.focus();
                      }, 50);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 border border-dashed border-sky-500/50 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
                    title="Добавить новую категорию"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>+ Категория</span>
                  </button>
                )}
              </div>

              {/* Right Scroll Button */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => handleScroll('right')}
                  className="absolute right-0 z-10 p-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-200 shadow-md cursor-pointer transition-all"
                  title="Прокрутить вправо"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            /* Wrapped Grid Mode: All categories visible without scrolling */
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto custom-scrollbar p-1 bg-slate-950/40 rounded-lg border border-slate-800/80">
              {availableCategories.map((cat) => {
                const meta = getCategoryMeta(cat, categoryMetadata);
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10.5px] font-medium transition-all shrink-0 cursor-pointer border ${
                      isSelected
                        ? `${meta.style.activeBg} ${meta.style.activeBorder} ${meta.style.activeText} font-bold ring-1 ${meta.style.ringColor} shadow-xs`
                        : `bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/50 ${meta.style.hoverBorder}`
                    }`}
                  >
                    {renderCategoryIcon(meta.icon, 'w-3 h-3')}
                    <span>{cat}</span>
                    {isSelected && (
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.style.dotColor} shrink-0 animate-pulse`} />
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory(true);
                  setCategoryViewMode('scroll');
                  setTimeout(() => addCategoryInputRef.current?.focus(), 50);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 border border-dashed border-sky-500/50 cursor-pointer"
              >
                <FolderPlus className="w-3 h-3" />
                <span>+ Категория</span>
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Active Collection Indicator Banner */}
        <div 
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] transition-all ${activeCategoryMeta.style.pillBg} ${activeCategoryMeta.style.pillBorder}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            {/* Category Icon Badge with Color */}
            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${activeCategoryMeta.style.pillBorder} ${activeCategoryMeta.style.pillText} bg-slate-900/60`}>
              {renderCategoryIcon(activeCategoryMeta.icon, 'w-3.5 h-3.5')}
            </div>

            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${activeCategoryMeta.style.dotColor} animate-pulse shrink-0`} />
              <span className={`font-bold truncate ${activeCategoryMeta.style.pillText}`}>
                {selectedCategory}
              </span>
              <span className="text-slate-400 font-mono text-[10.5px] shrink-0">
                ({currentCategorySnippetCount} {currentCategorySnippetCount === 1 ? 'шаблон' : 'шаблонов'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick add snippet into this collection */}
            {selectedCategory !== 'Все' && selectedCategory !== '⭐ Избранные' && (
              <button
                type="button"
                onClick={() => onCreateNew(selectedCategory)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900/80 hover:bg-slate-800 text-sky-300 border border-slate-700 transition-colors cursor-pointer"
                title={`Создать новый шаблон в категории «${selectedCategory}»`}
              >
                <Plus className="w-3 h-3" />
                <span>В эту коллекцию</span>
              </button>
            )}

            {/* Reset to All */}
            {selectedCategory !== 'Все' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('Все')}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
                title="Сбросить фильтр и показать все шаблоны"
              >
                <X className="w-3 h-3" />
                <span>Все</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Snippet Card List */}
      <div className={`flex-1 overflow-y-auto ${density.container} ${density.spaceY} divide-y-0 select-text`}>
        {filteredSnippets.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {selectedCategory !== 'Все' ? (
              <div className="space-y-3">
                <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center border ${activeCategoryMeta.style.pillBg} ${activeCategoryMeta.style.pillBorder} ${activeCategoryMeta.style.pillText}`}>
                  {renderCategoryIcon(activeCategoryMeta.icon, 'w-5 h-5')}
                </div>
                <p className="text-slate-300 text-xs">
                  В коллекции <strong className={activeCategoryMeta.style.pillText}>«{selectedCategory}»</strong> пока нет шаблонов
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onCreateNew(selectedCategory !== '⭐ Избранные' ? selectedCategory : undefined)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-sm ${accent.primary}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Создать первый шаблон</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Все')}
                    className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    Показать все
                  </button>
                </div>
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
              null,
              settings.agentName
            );

            const snippetCatMeta = getCategoryMeta(snippet.category, categoryMetadata);

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
                    {/* Pin / Favorite button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(snippet.id);
                      }}
                      className={`p-0.5 rounded transition-colors shrink-0 cursor-pointer ${
                        snippet.isPinned
                          ? 'text-amber-400 hover:text-amber-300 scale-105'
                          : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                      }`}
                      title={snippet.isPinned ? 'Убрать из избранного (открепить)' : 'Добавить в избранное (закрепить наверху)'}
                    >
                      {snippet.isPinned ? (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ) : (
                        <Star className="w-3.5 h-3.5" />
                      )}
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

                {/* Footer Meta: Category Badge with Color and Icon, Tags, Actions */}
                <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {/* Category Badge with Color & Icon */}
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(snippet.category);
                      }}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-transform hover:scale-105 cursor-pointer ${snippetCatMeta.style.pillBg} ${snippetCatMeta.style.pillBorder} ${snippetCatMeta.style.pillText}`}
                      title={`Фильтровать по категории «${snippet.category}»`}
                    >
                      {renderCategoryIcon(snippetCatMeta.icon, 'w-3 h-3', customIcons)}
                      <span className="truncate max-w-[120px]">{snippet.category}</span>
                    </span>

                    {snippet.tags.length > 0 && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="truncate text-slate-500 max-w-[130px]">
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
