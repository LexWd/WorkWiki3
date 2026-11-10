import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  Plus, 
  FolderCog, 
  Check, 
  ChevronRight, 
  Folder, 
  Layers, 
  Star, 
  FolderPlus,
  Sparkles,
  Tag
} from 'lucide-react';
import { Snippet, GuiSettings, CategoryMetadata } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { getCategoryMeta, renderCategoryIcon } from '../utils/categoryMeta';

interface CategoryTreeDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  snippets: Snippet[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onCreateNewSnippet?: (category: string) => void;
  categoryMetadata?: Record<string, CategoryMetadata>;
  onOpenCategoryManager?: () => void;
  onStartAddCategory?: () => void;
  settings: GuiSettings;
}

export const CategoryTreeDropdown: React.FC<CategoryTreeDropdownProps> = ({
  isOpen,
  onClose,
  categories,
  snippets,
  selectedCategory,
  onSelectCategory,
  onCreateNewSnippet,
  categoryMetadata,
  onOpenCategoryManager,
  onStartAddCategory,
  settings,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isLight = settings.theme === 'light-minimal';
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor, isLight);

  useEffect(() => {
    if (isOpen) {
      setSearchFilter('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const totalSnippetsCount = snippets.length;
  const pinnedSnippetsCount = useMemo(() => snippets.filter((s) => s.isPinned).length, [snippets]);

  // Calculate count per category
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

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchFilter.trim()) return categories;
    const q = searchFilter.toLowerCase().trim();
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, searchFilter]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className={`absolute left-2 right-2 top-11 z-50 rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[460px] animate-in fade-in zoom-in-95 duration-150 ${theme.panel} ${theme.border}`}
      style={{ backdropFilter: 'blur(16px)' }}
    >
      {/* Header Search Bar */}
      <div className={`p-2.5 border-b flex items-center gap-2 ${theme.border} ${theme.panelHeader}`}>
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Найти коллекцию шаблонов..."
            className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs outline-none transition-colors select-text ${theme.input}`}
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs p-1 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Закрыть меню (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Collections Tree Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar select-none text-xs">
        {/* Section 1: System Views (Все / Избранные) */}
        {!searchFilter && (
          <div className="space-y-1">
            <div className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span>Системные обзоры</span>
              <span className={`font-mono text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>2 фильтра</span>
            </div>

            {/* All Snippets */}
            <div
              onClick={() => {
                onSelectCategory('Все');
                onClose();
              }}
              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                selectedCategory === 'Все'
                  ? isLight
                    ? 'bg-sky-50 border-sky-300 shadow-xs'
                    : 'bg-sky-500/15 border-sky-400/50 shadow-sm'
                  : isLight
                  ? 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  : 'bg-slate-900/40 border-transparent hover:bg-slate-800/60 hover:border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                  selectedCategory === 'Все'
                    ? isLight ? 'bg-sky-100 text-sky-800' : 'bg-sky-500/25 text-sky-300'
                    : isLight ? 'bg-slate-200 text-slate-600 group-hover:text-sky-700' : 'bg-slate-800 text-slate-400 group-hover:text-sky-300'
                }`}>
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className={`font-semibold block ${
                    selectedCategory === 'Все'
                      ? isLight ? 'text-sky-900' : 'text-sky-200'
                      : isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    Все шаблоны
                  </span>
                  <span className={`text-[10px] block font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Полная база ответов
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-medium border ${
                  isLight
                    ? 'bg-white text-slate-700 border-slate-200 shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700/50'
                }`}>
                  {totalSnippetsCount}
                </span>
                {selectedCategory === 'Все' && (
                  <span className="text-sky-500 font-bold ml-1 text-xs">●</span>
                )}
              </div>
            </div>

            {/* Pinned / Favorites */}
            <div
              onClick={() => {
                onSelectCategory('⭐ Избранные');
                onClose();
              }}
              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                selectedCategory === '⭐ Избранные'
                  ? isLight
                    ? 'bg-amber-50 border-amber-300 shadow-xs'
                    : 'bg-amber-500/15 border-amber-400/50 shadow-sm'
                  : isLight
                  ? 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  : 'bg-slate-900/40 border-transparent hover:bg-slate-800/60 hover:border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                  selectedCategory === '⭐ Избранные'
                    ? isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/25 text-amber-300'
                    : isLight ? 'bg-amber-50 text-amber-600' : 'bg-slate-800 text-amber-400/70 group-hover:text-amber-300'
                }`}>
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
                <div>
                  <span className={`font-semibold block ${
                    selectedCategory === '⭐ Избранные'
                      ? isLight ? 'text-amber-900' : 'text-amber-200'
                      : isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    Избранные шаблоны
                  </span>
                  <span className={`text-[10px] block font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Закрепленные в начале списка
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-medium border ${
                  isLight
                    ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs'
                    : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                }`}>
                  {pinnedSnippetsCount}
                </span>
                {selectedCategory === '⭐ Избранные' && (
                  <span className="text-amber-500 font-bold ml-1 text-xs">●</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Operator Collections Tree */}
        <div className="space-y-1">
          <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Тематические коллекции ({filteredCategories.length})</span>
            {searchFilter && (
              <span className="text-sky-400 text-[10px] lowercase">по запросу «{searchFilter}»</span>
            )}
          </div>

          {filteredCategories.length === 0 ? (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <Folder className="w-8 h-8 opacity-30 mx-auto" />
              <p className="text-xs">Коллекция «{searchFilter}» не найдена</p>
              {onStartAddCategory && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartAddCategory();
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${accent.primary}`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Создать коллекцию «{searchFilter}»</span>
                </button>
              )}
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const meta = getCategoryMeta(cat, categoryMetadata, isLight);
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;

              return (
                <div
                  key={cat}
                  onClick={() => {
                    onSelectCategory(cat);
                    onClose();
                  }}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? `${meta.style.activeBg} ${meta.style.activeBorder} shadow-sm ring-1 ${meta.style.ringColor}`
                      : isLight
                      ? `bg-slate-50/70 border-slate-200 hover:bg-slate-100 ${meta.style.hoverBorder}`
                      : `bg-slate-900/40 border-transparent hover:bg-slate-800/60 ${meta.style.hoverBorder}`
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    {/* Collection Icon with Color Background */}
                    <div 
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isSelected 
                          ? `${meta.style.pillBg} ${meta.style.pillText} border ${meta.style.pillBorder}` 
                          : isLight
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {renderCategoryIcon(meta.icon, 'w-3.5 h-3.5')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.style.dotColor}`} />
                        <span className={`font-semibold truncate text-[12px] ${
                          isSelected ? meta.style.activeText : isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-200 group-hover:text-white'
                        }`}>
                          {cat}
                        </span>
                      </div>
                      <span className={`text-[10px] block font-mono ${isLight ? 'text-slate-500' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        {count === 0 ? 'Пустая коллекция' : `${count} ${count === 1 ? 'ответ' : 'ответов'}`}
                      </span>
                    </div>
                  </div>

                  {/* Actions / Meta */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Snippet count badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                      isSelected
                        ? `${meta.style.subtleBadge} border font-bold`
                        : isLight
                        ? 'bg-white text-slate-700 border border-slate-200 shadow-xs'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}>
                      {count}
                    </span>

                    {/* Quick Add Snippet into this collection button */}
                    {onCreateNewSnippet && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onCreateNewSnippet(cat);
                        }}
                        className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                          isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-sky-700' : 'hover:bg-slate-800 text-slate-400 hover:text-sky-300'
                        }`}
                        title={`Создать шаблон в «${cat}»`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Active indicator dot */}
                    {isSelected && (
                      <span className={`w-2 h-2 rounded-full ${meta.style.dotColor} animate-pulse ml-0.5`} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Quick Actions */}
      <div className={`p-2 border-t flex items-center justify-between gap-2 text-xs ${theme.border} ${theme.panelHeader}`}>
        {onStartAddCategory && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartAddCategory();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed transition-colors cursor-pointer text-[11px] font-medium ${
              isLight
                ? 'text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border-sky-300'
                : 'text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 border-sky-500/40'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Новая коллекция</span>
          </button>
        )}

        {onOpenCategoryManager && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCategoryManager();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer text-[11px] ${
              isLight
                ? 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-300 shadow-xs'
                : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border-slate-700'
            }`}
            title="Управление названиями, цветами и иконками коллекций"
          >
            <FolderCog className={`w-3.5 h-3.5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
            <span>Управление коллекциями</span>
          </button>
        )}
      </div>
    </div>
  );
};
