import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderCog, 
  Plus, 
  Trash2, 
  RotateCcw, 
  X, 
  AlertTriangle, 
  Folder, 
  ExternalLink, 
  Check, 
  Edit2
} from 'lucide-react';
import { ResourceWidget, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { DEFAULT_RESOURCE_CATEGORIES } from '../data/defaultData';
import { soundService } from '../utils/sound';
import { ConfirmDialogModal } from './ConfirmDialogModal';

interface ResourceCategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  widgets: ResourceWidget[];
  onAddCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string, reassignTo?: string) => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onResetCategories: () => void;
  settings: GuiSettings;
}

export const ResourceCategoryManagerModal: React.FC<ResourceCategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  widgets,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
  onResetCategories,
  settings,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('Утилиты');
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

  // Calculate widget count per category
  const getCategoryCount = (catName: string) => {
    return widgets.filter((w) => w.category === catName).length;
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
      const otherCat = categories.find((c) => c !== catName) || 'Утилиты';
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
    if (!trimmed) {
      setEditingCat(null);
      return;
    }
    if (trimmed === oldName) {
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
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${theme.panel} ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${theme.border} ${theme.panelHeader}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${accent.primary}`}>
              <FolderCog className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Категории ссылок и виджетов</h2>
              <p className="text-[11px] text-slate-400">
                Создание, переименование и организация закладок
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Add New Category Input */}
          <form onSubmit={handleAddSubmit} className="space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-300">
              Новая категория
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Например: Документация или Склад..."
                className={`flex-1 p-2 rounded-lg border text-xs outline-none ${theme.input}`}
              />
              <button
                type="submit"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs shadow-sm shrink-0 ${accent.primary}`}
              >
                <Plus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </div>
            {errorMessage && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{errorMessage}</span>
              </p>
            )}
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Список категорий ({categories.length})</span>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="text-[10.5px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                title="Восстановить исходные категории"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Сброс</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {categories.length === 0 ? (
                <div className="p-4 text-center text-slate-500 rounded-lg border border-dashed border-slate-800">
                  Нет категорий. Добавьте новую категорию выше.
                </div>
              ) : (
                categories.map((cat) => {
                  const count = getCategoryCount(cat);
                  const isEditing = editingCat === cat;

                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Folder className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(cat);
                                if (e.key === 'Escape') setEditingCat(null);
                              }}
                              className={`p-1 text-xs rounded border outline-none w-full ${theme.input}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(cat)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="Сохранить"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCat(null)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400"
                              title="Отмена"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-200 truncate">
                            {cat}
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span 
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60 flex items-center gap-1"
                            title={`Закладок в категории: ${count}`}
                          >
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            {count}
                          </span>

                          <button
                            type="button"
                            onClick={() => startEditing(cat)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            title="Переименовать категорию"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => initiateDelete(cat)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Удалить категорию"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Delete confirmation with reassignment */}
          {categoryToDelete && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2">
              <div className="flex items-start gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs">
                    В категории «{categoryToDelete}» находится {getCategoryCount(categoryToDelete)} закладок
                  </p>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    Выберите категорию, в которую будут перемещены эти закладки:
                  </p>
                </div>
              </div>

              <select
                value={reassignTarget}
                onChange={(e) => setReassignTarget(e.target.value)}
                className={`w-full p-1.5 rounded border text-xs outline-none ${theme.input}`}
              >
                {categories
                  .filter((c) => c !== categoryToDelete)
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteWithReassign}
                  className="px-3 py-1 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Переместить и удалить
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex justify-end ${theme.border} ${theme.panelHeader}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 font-medium text-xs transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Confirmation: Reset categories */}
      <ConfirmDialogModal
        isOpen={isResetConfirmOpen}
        title="Сбросить категории ссылок?"
        message="Все категории ссылок будут сброшены к стандартному списку. Закладки с нестандартными категориями останутся сохранены."
        confirmLabel="Сбросить к стандарту"
        confirmVariant="danger"
        onConfirm={() => {
          onResetCategories();
          setIsResetConfirmOpen(false);
          soundService.playSuccess(settings.soundEffects);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
        settings={settings}
      />
    </div>
  );
};
