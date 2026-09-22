import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderCog, 
  Plus, 
  Trash2, 
  RotateCcw, 
  X, 
  AlertTriangle, 
  FileText, 
  Check, 
  Edit2,
  Palette,
  ChevronDown
} from 'lucide-react';
import { Snippet, GuiSettings, CategoryColor, CategoryMetadata } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { DEFAULT_CATEGORY_LIST } from '../data/defaultData';
import { soundService } from '../utils/sound';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { 
  CATEGORY_COLOR_DEFS, 
  AVAILABLE_CATEGORY_ICONS, 
  getCategoryMeta, 
  renderCategoryIcon 
} from '../utils/categoryMeta';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  snippets: Snippet[];
  onAddCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string, reassignTo?: string) => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onResetCategories: () => void;
  categoryMetadata?: Record<string, CategoryMetadata>;
  onUpdateCategoryMetadata?: (categoryName: string, meta: Partial<CategoryMetadata>) => void;
  settings: GuiSettings;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  snippets,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
  onResetCategories,
  categoryMetadata,
  onUpdateCategoryMetadata,
  settings,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState<CategoryColor>('sky');
  const [newCatIcon, setNewCatIcon] = useState<string>('Folder');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('Общее');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  
  // Customizing existing category color & icon
  const [customizingCat, setCustomizingCat] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setCategoryToDelete(null);
      setEditingCat(null);
      setCustomizingCat(null);
      setNewCatName('');
      setNewCatColor('sky');
      setNewCatIcon('Folder');
      setIsIconPickerOpen(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate snippet count per category
  const getCategoryCount = (catName: string) => {
    return snippets.filter((s) => s.category === catName).length;
  };

  const handleAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMessage('Введите название категории');
      return;
    }

    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage('Категория с таким названием уже существует');
      return;
    }

    onAddCategory(trimmed);
    if (onUpdateCategoryMetadata) {
      onUpdateCategoryMetadata(trimmed, {
        color: newCatColor,
        icon: newCatIcon,
      });
    }

    soundService.playSuccess(settings.soundEffects);
    setNewCatName('');
    setNewCatColor('sky');
    setNewCatIcon('Folder');
    setIsIconPickerOpen(false);
    setErrorMessage(null);
    inputRef.current?.focus();
  };

  const initiateDelete = (catName: string) => {
    const count = getCategoryCount(catName);
    if (count === 0) {
      onDeleteCategory(catName);
      soundService.playClick(settings.soundEffects);
    } else {
      // Pick another category as default reassign target
      const otherCat = categories.find((c) => c !== catName) || 'Общее';
      setReassignTarget(otherCat);
      setCategoryToDelete(catName);
    }
  };

  const confirmDeleteWithReassign = () => {
    if (!categoryToDelete) return;
    onDeleteCategory(categoryToDelete, reassignTarget);
    soundService.playClick(settings.soundEffects);
    setCategoryToDelete(null);
  };

  const startEditing = (cat: string) => {
    setEditingCat(cat);
    setEditingName(cat);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 50);
  };

  const handleSaveRename = (oldName: string) => {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingCat(null);
      return;
    }

    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase() && c !== oldName)) {
      setErrorMessage('Категория с таким названием уже есть');
      return;
    }

    if (onRenameCategory) {
      onRenameCategory(oldName, trimmed);
      soundService.playSuccess(settings.soundEffects);
    }
    setEditingCat(null);
  };

  const availableColors = Object.keys(CATEGORY_COLOR_DEFS) as CategoryColor[];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] ${theme.panel}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b ${theme.border} flex items-center justify-between ${theme.panelHeader}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${accent.primaryMuted}`}>
              <FolderCog className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Управление коллекциями шаблонов
              </h2>
              <p className="text-[11px] text-slate-400">
                Настройка названий, цветового кодирования и иконок для быстрого ориентирования
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add Category Form with Color & Icon Pickers */}
        <div className={`p-3.5 border-b ${theme.border} ${theme.panelSubtle} space-y-2.5`}>
          <form onSubmit={handleAddSubmit} className="space-y-2">
            <div className="flex gap-2 items-center">
              {/* Icon selector button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                    CATEGORY_COLOR_DEFS[newCatColor].pillBg
                  } ${CATEGORY_COLOR_DEFS[newCatColor].pillBorder} ${CATEGORY_COLOR_DEFS[newCatColor].pillText}`}
                  title="Выбрать иконку коллекции"
                >
                  {renderCategoryIcon(newCatIcon, 'w-4 h-4')}
                </button>

                {/* Icon Picker Popover */}
                {isIconPickerOpen && (
                  <div className="absolute top-10 left-0 z-50 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl w-64 grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
                    {AVAILABLE_CATEGORY_ICONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setNewCatIcon(item.id);
                          setIsIconPickerOpen(false);
                        }}
                        className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[9px] hover:bg-slate-800 transition-colors ${
                          newCatIcon === item.id ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-400/40' : 'text-slate-400'
                        }`}
                        title={item.label}
                      >
                        {renderCategoryIcon(item.id, 'w-4 h-4')}
                        <span className="truncate max-w-[48px]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input for name */}
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Название новой коллекции (например: Счета, Логистика, VIP)..."
                  className={`w-full pl-3 pr-3 py-2 rounded-lg border text-xs outline-none select-text ${
                    errorMessage
                      ? 'border-rose-500 bg-rose-950/20 text-rose-200'
                      : theme.input
                  }`}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Escape') {
                      setNewCatName('');
                      setErrorMessage(null);
                    }
                  }}
                />
              </div>

              <button
                type="submit"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-sm transition-opacity hover:opacity-95 ${accent.primary}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать</span>
              </button>
            </div>

            {/* Color Palette Selector */}
            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 pt-0.5">
              <span className="flex items-center gap-1 text-slate-400 text-[10.5px]">
                <Palette className="w-3 h-3 text-slate-500" />
                Цвет коллекции:
              </span>
              <div className="flex items-center gap-1.5">
                {availableColors.map((colorKey) => {
                  const def = CATEGORY_COLOR_DEFS[colorKey];
                  const isSelected = newCatColor === colorKey;
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => setNewCatColor(colorKey)}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${def.dotColor} ${
                        isSelected ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : 'opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                      title={def.label}
                    />
                  );
                })}
              </div>
            </div>
          </form>

          {errorMessage && (
            <p className="text-rose-400 text-[11px] flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {errorMessage}
            </p>
          )}
        </div>

        {/* Delete Confirmation with Reassignment Modal */}
        {categoryToDelete && (
          <div className="p-3.5 bg-rose-950/30 border-b border-rose-800/40 text-rose-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-xs font-semibold">
                  В категории «{categoryToDelete}» находится {getCategoryCount(categoryToDelete)} шаблонов!
                </p>
                <p className="text-[11px] text-rose-300/90 leading-relaxed">
                  Куда переместить существующие шаблоны перед удалением категории?
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                  >
                    {categories
                      .filter((c) => c !== categoryToDelete)
                      .map((c) => (
                        <option key={c} value={c}>
                          Переместить в: {c}
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    onClick={confirmDeleteWithReassign}
                    className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs cursor-pointer shadow-sm"
                  >
                    Переместить и удалить
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(null)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 custom-scrollbar">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-2 mb-1 uppercase tracking-wider">
            <span>Коллекция (Иконка, Цвет, Название)</span>
            <span>Шаблонов / Настройки</span>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              Все категории удалены. Нажмите «Сбросить к стандартным», чтобы восстановить базовый набор.
            </div>
          ) : (
            categories.map((cat) => {
              const count = getCategoryCount(cat);
              const isDefault = DEFAULT_CATEGORY_LIST.includes(cat);
              const isEditing = editingCat === cat;
              const meta = getCategoryMeta(cat, categoryMetadata);
              const isCustomizing = customizingCat === cat;

              return (
                <div
                  key={cat}
                  className={`p-2.5 rounded-lg border transition-all ${theme.panelSubtle} border-slate-800/80 hover:border-slate-700 space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                      {/* Category Icon Badge with Color */}
                      <button
                        type="button"
                        onClick={() => setCustomizingCat(isCustomizing ? null : cat)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-all hover:scale-110 cursor-pointer ${meta.style.pillBg} ${meta.style.pillBorder} ${meta.style.pillText}`}
                        title="Нажмите для смены иконки или цвета коллекции"
                      >
                        {renderCategoryIcon(meta.icon, 'w-3.5 h-3.5')}
                      </button>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') handleSaveRename(cat);
                              if (e.key === 'Escape') setEditingCat(null);
                            }}
                            className="px-2 py-0.5 text-xs bg-slate-950 border border-sky-500 rounded text-slate-100 outline-none w-full max-w-xs select-text"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(cat)}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                            title="Сохранить"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCat(null)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            title="Отмена"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.style.dotColor}`} />
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {cat}
                          </span>
                          {isDefault && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-400 border border-slate-700/50 font-mono">
                              стандартная
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Snippet count badge */}
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${meta.style.subtleBadge} border flex items-center gap-1`}>
                        <FileText className="w-2.5 h-2.5 opacity-60" />
                        {count}
                      </span>

                      {/* Customize Color/Icon Button */}
                      <button
                        type="button"
                        onClick={() => setCustomizingCat(isCustomizing ? null : cat)}
                        className={`p-1 rounded transition-colors ${
                          isCustomizing ? 'text-sky-300 bg-sky-950/60 border border-sky-500/40' : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
                        }`}
                        title="Изменить иконку и цвет"
                      >
                        <Palette className="w-3.5 h-3.5" />
                      </button>

                      {/* Rename button */}
                      {!isEditing && onRenameCategory && (
                        <button
                          type="button"
                          onClick={() => startEditing(cat)}
                          className="p-1 text-slate-400 hover:text-sky-300 rounded hover:bg-slate-800 transition-colors"
                          title="Переименовать категорию"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete button: Works on ALL categories */}
                      <button
                        type="button"
                        onClick={() => initiateDelete(cat)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title={isDefault ? `Удалить категорию «${cat}»` : `Удалить категорию «${cat}»`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Color & Icon Editor Tray */}
                  {isCustomizing && (
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/70 space-y-2 mt-1 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="font-semibold flex items-center gap-1">
                          <Palette className="w-3 h-3 text-sky-400" />
                          Цвет коллекции:
                        </span>
                        <div className="flex items-center gap-1">
                          {availableColors.map((colorKey) => {
                            const def = CATEGORY_COLOR_DEFS[colorKey];
                            const isSelected = meta.color === colorKey;
                            return (
                              <button
                                key={colorKey}
                                type="button"
                                onClick={() => {
                                  if (onUpdateCategoryMetadata) {
                                    onUpdateCategoryMetadata(cat, { color: colorKey });
                                  }
                                }}
                                className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${def.dotColor} ${
                                  isSelected ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : 'opacity-70 hover:opacity-100 hover:scale-110'
                                }`}
                                title={def.label}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1">
                        <span className="font-semibold block">Иконка коллекции:</span>
                        <div className="grid grid-cols-6 gap-1 max-h-24 overflow-y-auto custom-scrollbar p-1 bg-slate-950/60 rounded border border-slate-800">
                          {AVAILABLE_CATEGORY_ICONS.map((item) => {
                            const isSelected = meta.icon === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  if (onUpdateCategoryMetadata) {
                                    onUpdateCategoryMetadata(cat, { icon: item.id });
                                  }
                                }}
                                className={`p-1.5 rounded flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-sky-500/25 text-sky-300 border border-sky-400/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                                title={item.label}
                              >
                                {renderCategoryIcon(item.id, 'w-3.5 h-3.5')}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Reset to Defaults Button */}
        <div className={`p-3 border-t ${theme.border} ${theme.panelHeader} flex items-center justify-between gap-2`}>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Восстановить исходный список стандартных категорий"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить к стандартным</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${accent.primary}`}
          >
            Готово
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialogModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          onResetCategories();
          setIsResetConfirmOpen(false);
          soundService.playSuccess(settings.soundEffects);
        }}
        title="Сбросить категории к стандартным?"
        message="Все пользовательские категории будут удалены, а стандартный набор (7 категорий) восстановится. Шаблоны из удаленных категорий будут переведены в 'Приветствие и начало'."
        confirmText="Сбросить"
        cancelText="Отмена"
        variant="warning"
        settings={settings}
      />
    </div>
  );
};
