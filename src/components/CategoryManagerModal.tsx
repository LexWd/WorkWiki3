import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderCog, 
  Plus, 
  Trash2, 
  RotateCcw, 
  X, 
  AlertTriangle, 
  Folder, 
  FileText, 
  Check, 
  Edit2
} from 'lucide-react';
import { Snippet, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { DEFAULT_CATEGORY_LIST } from '../data/defaultData';
import { soundService } from '../utils/sound';
import { ConfirmDialogModal } from './ConfirmDialogModal';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  snippets: Snippet[];
  onAddCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string, reassignTo?: string) => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onResetCategories: () => void;
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
  settings,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('Общее');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setCategoryToDelete(null);
      setEditingCat(null);
      setNewCatName('');
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
    soundService.playSuccess(settings.soundEffects);
    setNewCatName('');
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${theme.panel}`}
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
                Управление категориями шаблонов
              </h2>
              <p className="text-[11px] text-slate-400">
                Создание, переименование и удаление стандартных и пользовательских категорий
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

        {/* Add Category Form */}
        <div className={`p-3.5 border-b ${theme.border} ${theme.panelSubtle}`}>
          <form onSubmit={handleAddSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Название новой категории (например: Логистика, Гарантия)..."
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
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-sm transition-opacity hover:opacity-95 ${accent.primary}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить</span>
            </button>
          </form>

          {errorMessage && (
            <p className="text-rose-400 text-[11px] mt-1.5 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {errorMessage}
            </p>
          )}
        </div>

        {/* Deletion Warning Confirmation Box (if category has snippets) */}
        {categoryToDelete && (
          <div className="p-3 bg-amber-950/40 border-b border-amber-800/60 text-amber-200 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-300">
                  В категории «{categoryToDelete}» находится {getCategoryCount(categoryToDelete)} шаблонов
                </p>
                <p className="text-[11px] text-amber-300/80 mt-1">
                  Выберите категорию, в которую будут безопасно перемещены эти шаблоны перед удалением:
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <select
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    className="bg-slate-900 border border-amber-700/80 text-slate-100 rounded px-2.5 py-1 text-xs outline-none"
                  >
                    <option value="Общее">Общее (создать при необходимости)</option>
                    {categories
                      .filter((c) => c !== categoryToDelete)
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
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
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-2 mb-1 uppercase tracking-wider">
            <span>Категория</span>
            <span>Шаблонов / Действия</span>
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

              return (
                <div
                  key={cat}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${theme.panelSubtle} border-slate-800/80 hover:border-slate-700`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                    <Folder className={`w-3.5 h-3.5 shrink-0 ${isDefault ? 'text-sky-400' : 'text-emerald-400'}`} />
                    
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
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-medium text-slate-200 truncate">
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

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50 flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5 opacity-60" />
                      {count}
                    </span>

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

                    {/* Delete button: Works on ALL categories (standard & custom) */}
                    <button
                      type="button"
                      onClick={() => initiateDelete(cat)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title={isDefault ? `Удалить стандартную категорию «${cat}»` : `Удалить категорию «${cat}»`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-slate-800/60"
            title="Восстановить исходный список стандартных категорий"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Сбросить к стандартным</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer shadow-sm"
          >
            Готово
          </button>
        </div>
      </div>

      {/* Confirmation: Reset categories */}
      <ConfirmDialogModal
        isOpen={isResetConfirmOpen}
        title="Сбросить список категорий?"
        description="Сбросить список категорий к исходным стандартным? Пользовательские категории будут удалены, а стандартные восстановлены."
        confirmText="Сбросить категории"
        cancelText="Отмена"
        variant="warning"
        icon="reset"
        onConfirm={() => {
          onResetCategories();
          soundService.playSuccess(settings.soundEffects);
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
