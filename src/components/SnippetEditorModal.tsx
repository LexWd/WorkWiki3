import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Eye, Brackets, AlertCircle, Plus, ArrowLeft } from 'lucide-react';
import { Snippet, PlaceholderConfig, ExcelRow, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { interpolateSnippet } from '../utils/interpolator';

interface SnippetEditorModalProps {
  snippet: Snippet | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Snippet, 'id' | 'usageCount' | 'updatedAt'> & { id?: string }) => void;
  placeholders: PlaceholderConfig[];
  activeRow: ExcelRow | null;
  settings: GuiSettings;
  availableCategories?: string[];
  onAddNewCategory?: (newCategory: string) => void;
  initialCategory?: string;
}

const DEFAULT_CATEGORIES = [
  'Приветствие и начало',
  'Заказы и доставка',
  'Возвраты и компенсации',
  'Техническая поддержка',
  'Оплата и счета',
  'Эскалации',
  'Завершение диалога',
];

export const SnippetEditorModal: React.FC<SnippetEditorModalProps> = ({
  snippet,
  isOpen,
  onClose,
  onSave,
  placeholders,
  activeRow,
  settings,
  availableCategories = DEFAULT_CATEGORIES,
  onAddNewCategory,
  initialCategory,
}) => {
  const [title, setTitle] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [category, setCategory] = useState<string>('Заказы и доставка');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [hotkey, setHotkey] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  // Validation errors
  const [validationError, setValidationError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const newCatInputRef = useRef<HTMLInputElement>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  // Combine available categories with defaults & currently selected
  const allCategories = React.useMemo(() => {
    const list = Array.from(new Set([...DEFAULT_CATEGORIES, ...availableCategories]));
    if (snippet && snippet.category && !list.includes(snippet.category)) {
      list.push(snippet.category);
    }
    return list;
  }, [availableCategories, snippet]);

  useEffect(() => {
    if (isOpen) {
      // Clear errors
      setValidationError(null);
      setTitleError(false);
      setContentError(false);
      setCategoryError(false);
      setIsCreatingCategory(false);
      setNewCategoryInput('');

      if (snippet) {
        setTitle(snippet.title);
        setShortcut(snippet.shortcut);
        setCategory(snippet.category || 'Заказы и доставка');
        setContent(snippet.content);
        setTagsInput(snippet.tags.join(', '));
        setHotkey(snippet.hotkey || '');
        setIsPinned(snippet.isPinned);
      } else {
        setTitle('');
        setShortcut('/шаблон');
        const defaultCat = initialCategory && initialCategory !== 'Все' 
          ? initialCategory 
          : 'Заказы и доставка';
        setCategory(defaultCat);
        setContent('Здравствуйте, {{имя_клиента}}! По заказу №{{номер_заказа}}: ...');
        setTagsInput('поддержка, заказ');
        setHotkey('');
        setIsPinned(false);
      }

      // Auto-focus title on modal open
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [snippet, isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleInsertToken = (key: string) => {
    setContent((prev) => prev + ` {{${key}}}`);
    if (contentError) {
      setContentError(false);
      setValidationError(null);
    }
  };

  const handleSave = () => {
    let finalCategory = category;

    if (isCreatingCategory) {
      const trimmedCat = newCategoryInput.trim();
      if (!trimmedCat) {
        setCategoryError(true);
        setValidationError('Пожалуйста, введите название новой категории или вернитесь к выбору существующей.');
        newCatInputRef.current?.focus();
        return;
      }
      finalCategory = trimmedCat;
      if (onAddNewCategory) {
        onAddNewCategory(trimmedCat);
      }
    }

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setTitleError(true);
      setValidationError('Пожалуйста, укажите название шаблона.');
      titleInputRef.current?.focus();
      return;
    }

    const cleanContent = content.trim();
    if (!cleanContent) {
      setContentError(true);
      setValidationError('Пожалуйста, укажите текст шаблона.');
      contentInputRef.current?.focus();
      return;
    }

    const tags = tagsInput
      .split(/[,;\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    let cleanShortcut = shortcut.trim();
    if (!cleanShortcut.startsWith('/')) {
      cleanShortcut = '/' + cleanShortcut;
    }

    onSave({
      id: snippet ? snippet.id : undefined,
      title: cleanTitle,
      shortcut: cleanShortcut,
      category: finalCategory,
      content: cleanContent,
      tags,
      hotkey: hotkey ? hotkey : undefined,
      isPinned,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const { result: previewResolved } = interpolateSnippet(
    content,
    placeholders,
    null,
    settings.agentName
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div 
        className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] select-text ${theme.panel} ${theme.border}`}
      >
        {/* Header */}
        <div className={`p-3.5 border-b flex items-center justify-between ${theme.panelHeader} ${theme.border}`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${accent.primary}`}>
              <Brackets className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-bold text-sm text-slate-100">
              {snippet ? 'Редактирование шаблона' : 'Создание нового шаблона быстрого ответа'}
            </h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Закрыть (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs flex items-center gap-2 shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-medium">{validationError}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1 select-text">
          {/* Row 1: Title & Shortcut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Название шаблона <span className="text-rose-400 font-bold">*</span>
              </label>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) {
                    setTitleError(false);
                    setValidationError(null);
                  }
                }}
                placeholder="Например: Статус доставки и трек"
                className={`w-full p-2 rounded-lg border text-xs outline-none select-text transition-all ${
                  titleError
                    ? 'border-rose-500 bg-rose-950/30 text-slate-100 ring-2 ring-rose-500/50'
                    : theme.input
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Слэш-команда (быстрый ввод) <span className="text-rose-400 font-bold">*</span>
              </label>
              <input
                type="text"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="/статус"
                className={`w-full p-2 rounded-lg border font-mono text-xs outline-none select-text ${theme.input}`}
              />
            </div>
          </div>

          {/* Row 2: Category, Hotkey, Pinned */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Категория <span className="text-rose-400 font-bold">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCategory((prev) => !prev);
                    setCategoryError(false);
                    setValidationError(null);
                    setTimeout(() => {
                      if (!isCreatingCategory) {
                        newCatInputRef.current?.focus();
                      }
                    }, 50);
                  }}
                  className="text-[10px] text-sky-400 hover:text-sky-300 font-medium flex items-center gap-0.5 transition-colors"
                >
                  {isCreatingCategory ? (
                    <>
                      <ArrowLeft className="w-2.5 h-2.5" />
                      <span>Выбрать</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-2.5 h-2.5" />
                      <span>Новая</span>
                    </>
                  )}
                </button>
              </div>

              {isCreatingCategory ? (
                <div className="relative">
                  <input
                    ref={newCatInputRef}
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => {
                      setNewCategoryInput(e.target.value);
                      if (categoryError) {
                        setCategoryError(false);
                        setValidationError(null);
                      }
                    }}
                    placeholder="Название новой категории..."
                    className={`w-full p-2 rounded-lg border text-xs outline-none select-text ring-1 ring-sky-500/60 ${
                      categoryError
                        ? 'border-rose-500 bg-rose-950/30 ring-2 ring-rose-500/50'
                        : theme.input
                    }`}
                  />
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setIsCreatingCategory(true);
                      setNewCategoryInput('');
                      setTimeout(() => newCatInputRef.current?.focus(), 50);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className={`w-full p-2 rounded-lg border text-xs outline-none cursor-pointer select-text ${theme.input}`}
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__CREATE_NEW__" className="text-sky-400 font-bold">
                    + Создать новую категорию...
                  </option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Горячая клавиша (Alt + 1..9)
              </label>
              <select
                value={hotkey}
                onChange={(e) => setHotkey(e.target.value)}
                className={`w-full p-2 rounded-lg border font-mono text-xs outline-none cursor-pointer select-text ${theme.input}`}
              >
                <option value="">Без горячей клавиши</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={`Alt+${n}`}>
                    Alt+{n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-700/60 bg-slate-900/60 w-full cursor-pointer hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-sky-500 cursor-pointer"
                />
                <span className="text-slate-200 font-medium">Закрепить вверху списка</span>
              </label>
            </div>
          </div>

          {/* Token Insertion Chips Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-slate-300">
                Кликните на плейсхолдер для быстрой вставки в текст:
              </label>
              <span className="text-[10px] text-slate-500">Автоматически подставляются при копировании</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg border border-slate-800 bg-slate-950/60">
              {placeholders.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleInsertToken(p.key)}
                  className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-slate-800 hover:bg-sky-900/60 text-sky-300 border border-slate-700/60 hover:border-sky-500 transition-colors cursor-pointer"
                  title={`Вставить {{${p.key}}}`}
                >
                  + {"{{" + p.key + "}}"}
                </button>
              ))}
            </div>
          </div>

          {/* Template Content */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Текст шаблона с переменными <span className="text-rose-400 font-bold">*</span>
            </label>
            <textarea
              ref={contentInputRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (contentError) {
                  setContentError(false);
                  setValidationError(null);
                }
              }}
              rows={4}
              placeholder="Здравствуйте, {{имя_клиента}}! Номер вашего заказа {{номер_заказа}}..."
              className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed outline-none font-sans select-text transition-all ${
                contentError
                  ? 'border-rose-500 bg-rose-950/30 text-slate-100 ring-2 ring-rose-500/50'
                  : theme.input
              }`}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Теги для быстрого поиска (через запятую)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="статус, трек, сдэк, возврат"
              className={`w-full p-2 rounded-lg border text-xs outline-none select-text ${theme.input}`}
            />
          </div>

          {/* Live Preview */}
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px] mb-1">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Предварительный просмотр с подстановкой значений:</span>
            </div>
            <p className="text-[11.5px] text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
              {previewResolved || 'Введите текст выше для просмотра...'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex items-center justify-between ${theme.panelHeader} ${theme.border}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
          >
            Отмена
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10.5px] text-slate-400 font-mono">
              Ctrl+Enter для сохранения
            </span>
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-md cursor-pointer transition-opacity hover:opacity-90 ${accent.primary}`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Сохранить шаблон</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
