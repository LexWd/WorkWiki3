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
  FolderTree, 
  Globe,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Snippet, PlaceholderConfig, GuiSettings, CategoryMetadata, CustomIcon } from '../types';
import { getThemeClasses, getAccentClasses, getDensityPadding } from '../utils/theme';
import { interpolateSnippet } from '../utils/interpolator';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { CategoryTreeDropdown } from './CategoryTreeDropdown';
import { getCategoryMeta, renderCategoryIcon } from '../utils/categoryMeta';

interface SnippetListPanelProps {
  snippets: Snippet[];
  placeholders: PlaceholderConfig[];
  activeRow?: any;
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

  // Dedicated independent Tree & Search subwindow pane
  const [treePaneWidth, setTreePaneWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('workwiki_tree_subwindow_width');
      return saved ? Math.max(140, Math.min(360, parseInt(saved, 10))) : 215;
    } catch {
      return 215;
    }
  });

  const [isTreeCollapsed, setIsTreeCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('workwiki_tree_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isResizingTree, setIsResizingTree] = useState(false);
  const treeStartXRef = useRef<number>(0);
  const treeStartWidthRef = useRef<number>(215);

  const isLight = settings.theme === 'light-minimal';
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor, isLight);
  const density = getDensityPadding(settings.density);

  // Drag handler for the Tree sub-pane vertical splitter
  useEffect(() => {
    if (!isResizingTree) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - treeStartXRef.current;
      const newWidth = Math.max(150, Math.min(360, treeStartWidthRef.current + deltaX));
      setTreePaneWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingTree(false);
      try {
        localStorage.setItem('workwiki_tree_subwindow_width', treePaneWidth.toString());
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTree, treePaneWidth]);

  const handleToggleTreeCollapse = () => {
    const nextState = !isTreeCollapsed;
    setIsTreeCollapsed(nextState);
    try {
      localStorage.setItem('workwiki_tree_collapsed', nextState ? 'true' : 'false');
    } catch {}
  };

  // Derive dynamic list of categories from categories prop
  const availableCategories = useMemo(() => {
    return ['Все', '⭐ Избранные', ...categories];
  }, [categories]);

  const pinnedCount = useMemo(() => {
    return snippets.filter((s) => s.isPinned).length;
  }, [snippets]);

  // Check scroll position for horizontal arrow buttons
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
    return getCategoryMeta(selectedCategory, categoryMetadata, isLight);
  }, [selectedCategory, categoryMetadata, isLight]);

  // Per-category counts for the tree
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of categories) {
      map[cat] = 0;
    }
    for (const s of snippets) {
      if (s.category) {
        map[s.category] = (map[s.category] || 0) + 1;
      }
    }
    return map;
  }, [categories, snippets]);

  return (
    <div className={`relative flex h-full border-r ${theme.border} ${theme.panel} overflow-hidden text-xs select-none w-full min-w-0`}>
      {/* Category Tree / Dropdown Popover */}
      <CategoryTreeDropdown
        isOpen={isTreeDropdownOpen}
        onClose={() => setIsTreeDropdownOpen(false)}
        categories={categories}
        snippets={snippets}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
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

      {/* Subwindow 1: Search & Category Tree Pane (Independent width & collapsible) */}
      <div 
        style={{ width: isTreeCollapsed ? '44px' : `${treePaneWidth}px` }}
        className={`flex flex-col h-full border-r ${theme.border} shrink-0 transition-[width] duration-75 overflow-hidden ${
          isLight ? 'bg-slate-50/80' : 'bg-slate-950/40'
        }`}
      >
        {isTreeCollapsed ? (
          /* Collapsed Rail (44px) */
          <div className="flex flex-col items-center py-2 gap-1.5 h-full overflow-y-auto no-scrollbar">
            <button
              type="button"
              onClick={handleToggleTreeCollapse}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Развернуть боковое дерево коллекций и поиск"
            >
              <PanelLeftOpen className="w-4 h-4 text-sky-500" />
            </button>

            <div className={`w-6 h-px my-1 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

            {/* Icon for All */}
            <button
              type="button"
              onClick={() => setSelectedCategory('Все')}
              className={`p-2 rounded-lg transition-all cursor-pointer relative ${
                selectedCategory === 'Все'
                  ? isLight ? 'bg-sky-100 text-sky-800 shadow-xs' : 'bg-sky-500/20 text-sky-300'
                  : isLight ? 'text-slate-600 hover:bg-slate-200/70' : 'text-slate-400 hover:bg-slate-800'
              }`}
              title={`Все шаблоны (${snippets.length})`}
            >
              <Layers className="w-4 h-4" />
              {selectedCategory === 'Все' && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 absolute right-1 top-1" />
              )}
            </button>

            {/* Icon for Star */}
            <button
              type="button"
              onClick={() => setSelectedCategory('⭐ Избранные')}
              className={`p-2 rounded-lg transition-all cursor-pointer relative ${
                selectedCategory === '⭐ Избранные'
                  ? isLight ? 'bg-amber-100 text-amber-800 shadow-xs' : 'bg-amber-500/20 text-amber-300'
                  : isLight ? 'text-amber-600 hover:bg-amber-50' : 'text-amber-400/80 hover:bg-slate-800'
              }`}
              title={`Избранные (${pinnedCount})`}
            >
              <Star className="w-4 h-4 fill-current" />
              {selectedCategory === '⭐ Избранные' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute right-1 top-1" />
              )}
            </button>

            <div className={`w-6 h-px my-1 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

            {/* Icons for custom categories */}
            {categories.map((cat) => {
              const meta = getCategoryMeta(cat, categoryMetadata, isLight);
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-2 rounded-lg transition-all cursor-pointer relative ${
                    isSelected
                      ? `${meta.style.activeBg} ${meta.style.activeText} shadow-xs ring-1 ${meta.style.ringColor}`
                      : isLight ? 'hover:bg-slate-200/70 text-slate-700' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                  title={`${cat} (${categoryCounts[cat] || 0})`}
                >
                  {renderCategoryIcon(meta.icon, 'w-4 h-4', customIcons)}
                  {isSelected && (
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.style.dotColor} absolute right-1 top-1`} />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Expanded Tree Subwindow */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Tree Top Bar with Search & Collapse */}
            <div className={`p-2 border-b ${theme.border} space-y-2 shrink-0 ${isLight ? 'bg-white' : 'bg-slate-900/60'}`}>
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  <FolderTree className="w-3.5 h-3.5 text-sky-500" />
                  <span>Поиск и дерево</span>
                </span>

                <button
                  type="button"
                  onClick={handleToggleTreeCollapse}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Свернуть панель дерева в компактную колонку"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search input in Tree */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск шаблона..."
                  className={`w-full pl-7 pr-6 py-1 rounded-md border text-xs outline-none transition-colors select-text ${theme.input}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Search Scope Switcher */}
              {selectedCategory !== 'Все' && (
                <div className={`flex items-center gap-0.5 p-0.5 rounded border text-[10px] ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <button
                    type="button"
                    onClick={() => setSearchScope('current')}
                    className={`flex-1 py-0.5 px-1 rounded text-center truncate transition-colors ${
                      searchScope === 'current'
                        ? isLight ? 'bg-white text-sky-800 font-bold shadow-xs' : 'bg-slate-800 text-sky-300 font-bold'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={`Искать только в «${selectedCategory}»`}
                  >
                    В «{selectedCategory}»
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchScope('all')}
                    className={`flex-1 py-0.5 px-1 rounded text-center truncate transition-colors ${
                      searchScope === 'all'
                        ? isLight ? 'bg-sky-100 text-sky-900 font-bold shadow-xs' : 'bg-sky-500/20 text-sky-300 font-bold'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Искать по всем коллекциям"
                  >
                    Везде
                  </button>
                </div>
              )}
            </div>

            {/* Tree Navigation Items */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar text-xs">
              {/* All snippets */}
              <button
                type="button"
                onClick={() => setSelectedCategory('Все')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                  selectedCategory === 'Все'
                    ? isLight
                      ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold shadow-xs'
                      : 'bg-sky-500/15 border-sky-400/50 text-sky-200 font-bold shadow-xs'
                    : isLight
                    ? 'border-transparent hover:bg-white hover:border-slate-200 text-slate-700'
                    : 'border-transparent hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'Все' ? (isLight ? 'text-sky-700' : 'text-sky-300') : (isLight ? 'text-slate-500' : 'text-slate-400')}`} />
                  <span className="truncate">Все шаблоны</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                  isLight ? 'bg-white text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {snippets.length}
                </span>
              </button>

              {/* Favorites */}
              <button
                type="button"
                onClick={() => setSelectedCategory('⭐ Избранные')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                  selectedCategory === '⭐ Избранные'
                    ? isLight
                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-xs'
                      : 'bg-amber-500/15 border-amber-400/50 text-amber-200 font-bold shadow-xs'
                    : isLight
                    ? 'border-transparent hover:bg-white hover:border-slate-200 text-slate-700'
                    : 'border-transparent hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Star className={`w-3.5 h-3.5 fill-current shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <span className="truncate">Избранные</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                  isLight ? 'bg-white text-amber-800 border-amber-200' : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                }`}>
                  {pinnedCount}
                </span>
              </button>

              <div className={`px-2 pt-2 pb-0.5 text-[9.5px] font-bold uppercase tracking-wider flex items-center justify-between ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span>Коллекции ({categories.length})</span>
                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className={`hover:opacity-100 opacity-60 p-0.5 rounded transition-opacity ${
                      isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                    title="Настроить цвета и иконки коллекций"
                  >
                    <FolderCog className="w-3 h-3 text-purple-400" />
                  </button>
                )}
              </div>

              {/* Dynamic categories tree list */}
              {categories.map((cat) => {
                const meta = getCategoryMeta(cat, categoryMetadata, isLight);
                const isSelected = selectedCategory === cat;
                const count = categoryCounts[cat] || 0;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                      isSelected
                        ? `${meta.style.activeBg} ${meta.style.activeBorder} ${meta.style.activeText} font-bold shadow-xs ring-1 ${meta.style.ringColor}`
                        : isLight
                        ? `border-transparent hover:bg-white hover:border-slate-200 text-slate-700 ${meta.style.hoverBorder}`
                        : `border-transparent hover:bg-slate-800/60 text-slate-300 ${meta.style.hoverBorder}`
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isSelected ? `${meta.style.pillBg} ${meta.style.pillText}` : isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        {renderCategoryIcon(meta.icon, 'w-3.5 h-3.5', customIcons)}
                      </div>
                      <span className="truncate">{cat}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                        isSelected
                          ? `${meta.style.subtleBadge} font-bold`
                          : isLight
                          ? 'bg-white text-slate-600 border-slate-200'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {count}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Add Category in Tree */}
              <div className="pt-1">
                {isAddingCategory ? (
                  <form onSubmit={handleConfirmAddCategory} className="p-1 rounded-md border flex items-center gap-1 bg-white border-sky-400">
                    <input
                      ref={addCategoryInputRef}
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Имя..."
                      className="w-full text-xs outline-none bg-transparent text-slate-800 px-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsAddingCategory(false);
                          setNewCategoryName('');
                        }
                      }}
                    />
                    <button type="submit" className="px-1 py-0.5 rounded bg-sky-600 text-white text-[10px] font-bold">
                      <Check className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => setIsAddingCategory(false)} className="px-1 py-0.5 text-slate-400 hover:text-slate-700">
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
                    className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-dashed transition-colors cursor-pointer text-[10.5px] font-medium ${
                      isLight
                        ? 'border-slate-300 text-sky-700 hover:bg-sky-50 hover:border-sky-400'
                        : 'border-slate-800 text-sky-400 hover:bg-slate-800 hover:border-sky-500'
                    }`}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ Категория</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Internal Resizable Divider between Tree Subwindow and Cards List */}
      {!isTreeCollapsed && (
        <div
          onMouseDown={(e) => {
            treeStartXRef.current = e.clientX;
            treeStartWidthRef.current = treePaneWidth;
            setIsResizingTree(true);
          }}
          onDoubleClick={() => {
            setTreePaneWidth(215);
            try { localStorage.setItem('workwiki_tree_subwindow_width', '215'); } catch {}
          }}
          title="Потяните для независимого изменения ширины окна дерева (двойной клик — сброс к 215px)"
          className={`w-1 hover:w-1.5 select-none cursor-col-resize items-center justify-center shrink-0 transition-all flex group ${
            isResizingTree ? 'bg-sky-500 w-1.5' : isLight ? 'bg-slate-200 hover:bg-sky-400/60' : 'bg-slate-800/80 hover:bg-sky-500/50'
          }`}
        >
          <div className={`w-0.5 h-6 rounded-full transition-colors ${
            isLight ? 'bg-slate-400 group-hover:bg-slate-700' : 'bg-slate-600 group-hover:bg-white'
          }`} />
        </div>
      )}

      {/* Subwindow 2: Snippet Cards List & Top Control Bar */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header of Cards Subwindow */}
        <div className={`p-2 border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between gap-2 shrink-0`}>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Active Collection Badge with Color */}
            <div className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 truncate max-w-[240px] shadow-xs ${activeCategoryMeta.style.pillBg} ${activeCategoryMeta.style.pillBorder}`}>
              <div className={`w-3.5 h-3.5 shrink-0 ${activeCategoryMeta.style.pillText}`}>
                {renderCategoryIcon(activeCategoryMeta.icon, 'w-3.5 h-3.5', customIcons)}
              </div>
              <span className={`font-bold truncate text-[11px] ${activeCategoryMeta.style.pillText}`}>
                {selectedCategory}
              </span>
              <span className={`text-[10px] font-mono shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                ({filteredSnippets.length})
              </span>
            </div>

            {/* Quick dropdown trigger */}
            <button
              type="button"
              onClick={() => setIsTreeDropdownOpen(!isTreeDropdownOpen)}
              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Выбрать категорию из выпадающего дерева"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* New Snippet Button */}
            <button
              type="button"
              onClick={() => onCreateNew(selectedCategory !== 'Все' && selectedCategory !== '⭐ Избранные' ? selectedCategory : undefined)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 cursor-pointer ${accent.primary}`}
              title="Создать новый шаблон (Ctrl+N)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Новый шаблон</span>
            </button>
          </div>
        </div>

        {/* Suggestion prompt if 0 results in current category but found in others */}
        {Boolean(searchQuery && searchScope === 'current' && currentCategoryMatchesCount === 0 && allCategoryMatchesCount > 0) && (
          <div className={`p-2 border-b flex items-center justify-between gap-2 text-[11px] animate-in fade-in ${
            isLight
              ? 'bg-sky-50 border-sky-200 text-sky-900'
              : 'bg-sky-950/50 border-sky-500/40 text-slate-300'
          }`}>
            <span>
              В этой папке нет, но есть <strong>{allCategoryMatchesCount}</strong> в других!
            </span>
            <button
              type="button"
              onClick={() => setSearchScope('all')}
              className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[10px] whitespace-nowrap cursor-pointer shadow-xs transition-colors"
            >
              Искать везде →
            </button>
          </div>
        )}

        {/* Snippet Card List */}
        <div className={`flex-1 overflow-y-auto ${density.container} ${density.spaceY} divide-y-0 select-text`}>
          {filteredSnippets.length === 0 ? (
            <div className={`p-8 text-center ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {selectedCategory !== 'Все' ? (
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center border ${activeCategoryMeta.style.pillBg} ${activeCategoryMeta.style.pillBorder} ${activeCategoryMeta.style.pillText}`}>
                    {renderCategoryIcon(activeCategoryMeta.icon, 'w-5 h-5', customIcons)}
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
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
                      className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${
                        isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
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

              const snippetCatMeta = getCategoryMeta(snippet.category, categoryMetadata, isLight);

              return (
                <div
                  key={snippet.id}
                  onClick={() => onSelectSnippet(snippet)}
                  className={`group relative rounded-lg border transition-all cursor-pointer ${
                    density.card
                  } ${
                    isSelected
                      ? `${theme.cardActive} shadow-md`
                      : `${theme.card} ${isLight ? 'hover:border-slate-300 hover:shadow-xs' : 'hover:border-slate-600'}`
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
                            ? 'text-amber-500 hover:text-amber-600 scale-105'
                            : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-amber-500'
                        }`}
                        title={snippet.isPinned ? 'Убрать из избранного (открепить)' : 'Добавить в избранное (закрепить наверху)'}
                      >
                        <Star className={`w-3.5 h-3.5 ${snippet.isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
                      </button>

                      <h3 className={`font-semibold truncate text-[12.5px] ${
                        isLight ? 'text-slate-900' : 'text-slate-100'
                      }`}>
                        {snippet.title}
                      </h3>
                    </div>

                    {/* Hotkey or Shortcut pill */}
                    <div className="flex items-center gap-1 shrink-0">
                      {snippet.hotkey && (
                        <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded border ${
                          isLight
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-black/40 text-sky-400 border-slate-700'
                        }`}>
                          {snippet.hotkey}
                        </span>
                      )}
                      <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded border ${
                        isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {snippet.shortcut}
                      </span>
                    </div>
                  </div>

                  {/* Interpolated Preview Text */}
                  <p className={`text-[11.5px] line-clamp-2 mb-2 leading-relaxed font-sans select-text ${
                    isLight ? 'text-slate-600' : 'text-slate-300/90'
                  }`}>
                    {previewText}
                  </p>

                  {/* Footer Meta: Category Badge with Color and Icon, Tags, Actions */}
                  <div className={`flex items-center justify-between text-[10.5px] pt-1 border-t ${
                    isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-800/60'
                  }`}>
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
                          <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>•</span>
                          <span className={`truncate max-w-[130px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
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
                        className={`p-1 rounded opacity-40 group-hover:opacity-100 transition-opacity ${
                          isLight ? 'hover:text-sky-700 hover:bg-slate-200' : 'hover:text-sky-400 hover:bg-slate-800'
                        }`}
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
                        className={`p-1 rounded opacity-40 group-hover:opacity-100 transition-opacity ${
                          isLight ? 'hover:text-rose-700 hover:bg-slate-200' : 'hover:text-rose-400 hover:bg-slate-800'
                        }`}
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
                            : isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-xs'
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
                            <Copy className={`w-3 h-3 ${isLight ? 'text-sky-700' : 'text-sky-400'}`} />
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
        <div className={`p-2 border-t ${theme.border} ${theme.panelHeader} flex items-center justify-between text-[11px] shrink-0 ${
          isLight ? 'text-slate-600' : 'text-slate-400'
        }`}>
          <span>
            Показано: <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{filteredSnippets.length}</strong> из {snippets.length}
          </span>
          <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Alt+1..9 быстрый выбор</span>
        </div>
      </div>

      {/* Confirmation: Delete Category */}
      <ConfirmDialogModal
        isOpen={categoryToDelete !== null}
        title="Удалить категорию?"
        description={
          categoryToDelete ? (
            <div>
              В категории <strong className="text-rose-400">«{categoryToDelete}»</strong> находится {snippets.filter(s => s.category === categoryToDelete).length} шаблонов. Они будут перемещены в категорию «Общее». Удалить категорию?
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
