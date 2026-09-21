import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Save, 
  Eye, 
  Brackets, 
  AlertCircle, 
  Plus, 
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Check,
  Split
} from 'lucide-react';
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
  const backdropRef = useRef<HTMLDivElement>(null);

  const [isSyntaxHighlighting, setIsSyntaxHighlighting] = useState(true);
  const [showLogicCheatSheet, setShowLogicCheatSheet] = useState(false);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  // Sync scroll between textarea and syntax highlight backdrop
  const handleTextareaScroll = () => {
    if (contentInputRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = contentInputRef.current.scrollTop;
      backdropRef.current.scrollLeft = contentInputRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    if (contentInputRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = contentInputRef.current.scrollTop;
      backdropRef.current.scrollLeft = contentInputRef.current.scrollLeft;
    }
  }, [content]);

  // Check token validity against system placeholders, configured placeholders, or active table columns
  const checkTokenStatus = (key: string): { 
    status: 'valid' | 'unknown' | 'empty'; 
    typeLabel: string;
    config?: PlaceholderConfig;
  } => {
    const clean = key.trim();
    if (!clean) {
      return { status: 'empty', typeLabel: 'Пустой тег' };
    }
    const lower = clean.toLowerCase();
    const norm = lower.replace(/ё/g, 'е');

    // Built-in system tokens
    if (lower === 'имя_оператора' || lower === 'agent_name' || norm === 'имя_оператора') {
      return { status: 'valid', typeLabel: 'Имя оператора (системный)' };
    }
    if (lower === 'дата' || lower === 'date') {
      return { status: 'valid', typeLabel: 'Текущая дата' };
    }
    if (lower === 'время' || lower === 'time') {
      return { status: 'valid', typeLabel: 'Текущее время' };
    }

    // Configured placeholders
    let found = placeholders.find((p) => p.key === clean);
    if (!found) found = placeholders.find((p) => p.key.toLowerCase() === lower);
    if (!found) found = placeholders.find((p) => p.key.toLowerCase().replace(/ё/g, 'е') === norm);
    if (!found) found = placeholders.find((p) => p.label.toLowerCase() === lower || p.label.toLowerCase().replace(/ё/g, 'е') === norm);

    if (found) {
      let typeDesc = 'Текстовый';
      if (found.type === 'choice') {
        typeDesc = `Выбор (${found.options?.length || 0} вар.)`;
      } else if (found.type === 'date') {
        typeDesc = 'Дата';
      }
      return { status: 'valid', typeLabel: typeDesc, config: found };
    }

    // Active Excel row keys
    if (activeRow && (clean in activeRow || lower in activeRow)) {
      return { status: 'valid', typeLabel: 'Колонка таблицы' };
    }

    return { status: 'unknown', typeLabel: 'Не найден в справочнике' };
  };

  interface SyntaxSegment {
    type: 'text' | 'token-valid' | 'token-unknown' | 'token-empty' | 'token-logic' | 'unclosed' | 'stray-close';
    text: string;
    key?: string;
    typeLabel?: string;
    error?: string;
    condition?: string;
  }

  // Parse snippet content into syntax highlight segments with full logic block support
  const parsedSegments = useMemo<SyntaxSegment[]>(() => {
    const segments: SyntaxSegment[] = [];
    let i = 0;
    let textBuffer = '';

    const flushText = () => {
      if (textBuffer.length > 0) {
        segments.push({ type: 'text', text: textBuffer });
        textBuffer = '';
      }
    };

    while (i < content.length) {
      // Check for opening '{{'
      if (content[i] === '{' && content[i + 1] === '{') {
        flushText();
        const startIndex = i;

        // Check if this is a logic block '{{?'
        if (content[i + 2] === '?') {
          let depth = 1;
          let j = i + 3;
          let colonIndex = -1;

          while (j < content.length && depth > 0) {
            if (content[j] === '{' && content[j + 1] === '{') {
              depth++;
              j += 2;
            } else if (content[j] === '}' && content[j + 1] === '}') {
              depth--;
              if (depth === 0) break;
              j += 2;
            } else {
              if (depth === 1 && content[j] === ':' && colonIndex === -1) {
                colonIndex = j;
              }
              j++;
            }
          }

          if (depth === 0) {
            const raw = content.slice(startIndex, j + 2);
            const conditionPart = colonIndex !== -1 ? content.slice(startIndex + 3, colonIndex).trim() : 'условие';
            segments.push({
              type: 'token-logic',
              text: raw,
              key: conditionPart,
              condition: conditionPart,
              typeLabel: `Логический блок: ${conditionPart}`,
            });
            i = j + 2;
            continue;
          } else {
            // Unclosed logic block
            segments.push({
              type: 'unclosed',
              text: content.slice(startIndex),
              error: 'Незакрытый логический блок {{?...}}',
            });
            i = content.length;
            break;
          }
        }

        // Standard token {{...}}
        const closeIndex = content.indexOf('}}', startIndex + 2);
        if (closeIndex === -1) {
          segments.push({
            type: 'unclosed',
            text: content.slice(startIndex),
            error: 'Незакрытый плейсхолдер {{',
          });
          i = content.length;
          break;
        }

        const raw = content.slice(startIndex, closeIndex + 2);
        const innerKey = content.slice(startIndex + 2, closeIndex).trim();

        if (!innerKey) {
          segments.push({
            type: 'token-empty',
            text: raw,
            key: '',
            error: 'Пустой плейсхолдер {{}}',
          });
        } else {
          const check = checkTokenStatus(innerKey);
          if (check.status === 'valid') {
            segments.push({
              type: 'token-valid',
              text: raw,
              key: innerKey,
              typeLabel: check.typeLabel,
            });
          } else {
            segments.push({
              type: 'token-unknown',
              text: raw,
              key: innerKey,
              typeLabel: check.typeLabel,
              error: `Плейсхолдер {{${innerKey}}} не найден в справочнике`,
            });
          }
        }

        i = closeIndex + 2;
        continue;
      }

      // Check for stray closing '}}'
      if (content[i] === '}' && content[i + 1] === '}') {
        flushText();
        segments.push({
          type: 'stray-close',
          text: '}}',
          error: 'Лишняя закрывающая скобка }}',
        });
        i += 2;
        continue;
      }

      textBuffer += content[i];
      i++;
    }

    flushText();
    return segments;
  }, [content, placeholders, activeRow]);

  // Aggregate statistics on found tokens, logic blocks and errors
  const syntaxStats = useMemo(() => {
    let validCount = 0;
    let unknownCount = 0;
    let errorsCount = 0;
    let logicCount = 0;
    const uniqueTokens = new Map<string, { key: string; status: 'valid' | 'unknown' | 'logic'; typeLabel?: string; count: number }>();

    parsedSegments.forEach((seg) => {
      if (seg.type === 'token-valid' && seg.key) {
        validCount++;
        const ex = uniqueTokens.get(seg.key);
        if (ex) ex.count++;
        else uniqueTokens.set(seg.key, { key: seg.key, status: 'valid', typeLabel: seg.typeLabel, count: 1 });
      } else if (seg.type === 'token-unknown' && seg.key) {
        unknownCount++;
        const ex = uniqueTokens.get(seg.key);
        if (ex) ex.count++;
        else uniqueTokens.set(seg.key, { key: seg.key, status: 'unknown', typeLabel: seg.typeLabel, count: 1 });
      } else if (seg.type === 'token-logic' && seg.key) {
        logicCount++;
        const ex = uniqueTokens.get(`logic-${seg.key}`);
        if (ex) ex.count++;
        else uniqueTokens.set(`logic-${seg.key}`, { key: seg.key, status: 'logic', typeLabel: seg.typeLabel, count: 1 });
      } else if (seg.type === 'token-empty' || seg.type === 'unclosed' || seg.type === 'stray-close') {
        errorsCount++;
      }
    });

    return {
      validCount,
      unknownCount,
      errorsCount,
      logicCount,
      tokensList: Array.from(uniqueTokens.values()),
    };
  }, [parsedSegments]);

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
    const token = `{{${key}}}`;
    const textarea = contentInputRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? content.length;
      const end = textarea.selectionEnd ?? content.length;
      const before = content.slice(0, start);
      const after = content.slice(end);
      const updated = `${before}${token}${after}`;
      setContent(updated);

      // Restore cursor position immediately after the inserted token
      const nextPos = start + token.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
    } else {
      setContent((prev) => prev + ` ${token}`);
    }

    if (contentError) {
      setContentError(false);
      setValidationError(null);
    }
  };

  const handleInsertRawToken = (rawToken: string) => {
    const textarea = contentInputRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? content.length;
      const end = textarea.selectionEnd ?? content.length;
      const before = content.slice(0, start);
      const after = content.slice(end);
      const updated = `${before}${rawToken}${after}`;
      setContent(updated);

      const nextPos = start + rawToken.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
    } else {
      setContent((prev) => prev + ` ${rawToken}`);
    }

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

            {/* Quick Logic Blocks (Условные конструкции) */}
            <div className="mt-2.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-medium text-purple-300">
                    Условные конструкции (Logic Blocks):
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                    {"{{?условие:да|нет}}"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogicCheatSheet(!showLogicCheatSheet)}
                  className="text-[10.5px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>{showLogicCheatSheet ? 'Скрыть подсказку' : 'Как работают условия?'}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInsertRawToken('{{?пол=м:Уважаемый|Уважаемая}}')}
                  className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/70 hover:border-purple-500 transition-colors cursor-pointer"
                  title="Вставить условие по полу: Уважаемый / Уважаемая"
                >
                  + {"{{?пол=м:Уважаемый|Уважаемая}}"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertRawToken('{{?трек_номер:Трек: {{трек_номер}}|}}')}
                  className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/70 hover:border-purple-500 transition-colors cursor-pointer"
                  title="Вставить блок, только если указан трек-номер"
                >
                  + {"{{?трек_номер:Трек: {{трек_номер}}|}}"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertRawToken('{{?тип_доставки=курьер:Курьер свяжется за 1 час|Самовывоз из ПВЗ}}')}
                  className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/70 hover:border-purple-500 transition-colors cursor-pointer"
                  title="Вставить ветвление по значению: курьер или самовывоз"
                >
                  + {"{{?тип_доставки=курьер:...|...}}"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertRawToken('{{?!комментарий:Без комментариев}}')}
                  className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/70 hover:border-purple-500 transition-colors cursor-pointer"
                  title="Вставить ветку, если переменная пуста или не указана"
                >
                  + {"{{?!комментарий:Без комментариев}}"}
                </button>
              </div>

              {showLogicCheatSheet && (
                <div className="mt-2 p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/50 text-[11px] text-purple-200 space-y-1.5 leading-relaxed">
                  <div className="font-bold text-xs text-purple-300">Синтаксис логических блоков:</div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    <li><code className="text-purple-300 font-mono">{"{{?переменная:значение_если_есть|значение_если_нет}}"}</code> — проверка заполненности поля.</li>
                    <li><code className="text-purple-300 font-mono">{"{{?переменная=значение:если_совпало|иначе}}"}</code> — точное равенство строки (регистронезависимо).</li>
                    <li><code className="text-purple-300 font-mono">{"{{?переменная!=значение:если_не_совпало|иначе}}"}</code> — отрицание равенства.</li>
                    <li><code className="text-purple-300 font-mono">{"{{?!переменная:если_пусто}}"}</code> — условие, если значение не задано или пусто.</li>
                    <li>Внутри веток можно использовать любые плейсхолдеры, например: <code className="text-purple-300 font-mono">{"{{?трек:Трек: {{трек}}|}}"}</code>.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Template Content with Syntax Highlighting */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                <span>Текст шаблона с переменными</span>
                <span className="text-rose-400 font-bold">*</span>
              </label>

              {/* Status badge & Highlighting toggle */}
              <div className="flex items-center gap-2">
                {/* Syntax Diagnostics Indicator */}
                {syntaxStats.errorsCount > 0 ? (
                  <span className="text-[10px] text-rose-300 flex items-center gap-1 font-medium bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/80 shadow-xs">
                    <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>Ошибка синтаксиса ({syntaxStats.errorsCount})</span>
                  </span>
                ) : syntaxStats.unknownCount > 0 ? (
                  <span className="text-[10px] text-amber-300 flex items-center gap-1 font-medium bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80 shadow-xs">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Неизвестный тег ({syntaxStats.unknownCount})</span>
                  </span>
                ) : syntaxStats.validCount > 0 ? (
                  <span className="text-[10px] text-emerald-300 flex items-center gap-1 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80 shadow-xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Все теги корректны ({syntaxStats.validCount})</span>
                  </span>
                ) : null}

                {syntaxStats.logicCount > 0 && (
                  <span className="text-[10px] text-purple-300 flex items-center gap-1 font-medium bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/80 shadow-xs">
                    <Split className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>Условия ({syntaxStats.logicCount})</span>
                  </span>
                )}

                {/* Highlight Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsSyntaxHighlighting(!isSyntaxHighlighting)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer border ${
                    isSyntaxHighlighting
                      ? 'bg-sky-950/80 text-sky-300 border-sky-600/70 hover:bg-sky-900/80'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title={isSyntaxHighlighting ? 'Выключить подсветку тегов' : 'Включить подсветку тегов'}
                >
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>Подсветка {isSyntaxHighlighting ? 'ВКЛ' : 'ВЫКЛ'}</span>
                </button>
              </div>
            </div>

            {/* Editor Canvas with synchronized backdrop */}
            <div
              className={`relative rounded-lg border text-xs leading-relaxed transition-all overflow-hidden focus-within:ring-2 focus-within:ring-sky-500/50 ${
                contentError
                  ? 'border-rose-500 bg-rose-950/30 ring-2 ring-rose-500/50'
                  : theme.input
              }`}
            >
              {/* Highlight backdrop overlay */}
              {isSyntaxHighlighting && (
                <div
                  ref={backdropRef}
                  aria-hidden="true"
                  className="absolute inset-0 p-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words overflow-hidden pointer-events-none select-none text-slate-100"
                >
                  {parsedSegments.map((seg, idx) => {
                    if (seg.type === 'token-valid') {
                      return (
                        <span
                          key={idx}
                          className="text-sky-300 font-bold bg-sky-500/25 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.45)] rounded-[2px]"
                        >
                          {seg.text}
                        </span>
                      );
                    }
                    if (seg.type === 'token-logic') {
                      return (
                        <span
                          key={idx}
                          className="text-purple-300 font-bold bg-purple-500/25 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.5)] rounded-[2px]"
                          title={seg.typeLabel}
                        >
                          {seg.text}
                        </span>
                      );
                    }
                    if (seg.type === 'token-unknown') {
                      return (
                        <span
                          key={idx}
                          className="text-amber-300 font-bold bg-amber-500/25 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.5)] rounded-[2px]"
                        >
                          {seg.text}
                        </span>
                      );
                    }
                    if (seg.type === 'token-empty' || seg.type === 'unclosed' || seg.type === 'stray-close') {
                      return (
                        <span
                          key={idx}
                          className="text-rose-300 font-bold bg-rose-500/30 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.6)] rounded-[2px]"
                        >
                          {seg.text}
                        </span>
                      );
                    }
                    return <span key={idx}>{seg.text}</span>;
                  })}
                  {content.endsWith('\n') && '\n '}
                </div>
              )}

              {/* Textarea */}
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
                onScroll={handleTextareaScroll}
                rows={4}
                placeholder="Здравствуйте, {{имя_клиента}}! Номер вашего заказа {{номер_заказа}}..."
                className={`relative w-full p-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words outline-none resize-y border-0 bg-transparent block ${
                  isSyntaxHighlighting
                    ? 'text-transparent caret-sky-400 selection:bg-sky-500/35 selection:text-transparent'
                    : 'text-slate-100 caret-sky-400 selection:bg-sky-500/35'
                }`}
              />
            </div>

            {/* Error or Warning message if syntax issues detected */}
            {syntaxStats.errorsCount > 0 && (
              <div className="mt-1.5 p-2 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>
                  Обнаружен незакрытый плейсхолдер <code>{"{{"}</code> или пустые фигурные скобки <code>{"{{}}"}</code>. Завершите тег закрывающими скобками <code>{"}}"}</code>.
                </span>
              </div>
            )}

            {/* Detected Tokens Inspector Strip */}
            {syntaxStats.tokensList.length > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Brackets className="w-3 h-3 text-sky-400" />
                  Теги и условия:
                </span>
                {syntaxStats.tokensList.map((tok) => {
                  const isValid = tok.status === 'valid';
                  const isLogic = tok.status === 'logic';
                  return (
                    <div
                      key={tok.key}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-mono flex items-center gap-1 border ${
                        isLogic
                          ? 'bg-purple-950/60 text-purple-200 border-purple-800/70'
                          : isValid
                          ? 'bg-sky-950/60 text-sky-300 border-sky-800/70'
                          : 'bg-amber-950/60 text-amber-300 border-amber-800/70'
                      }`}
                      title={
                        isLogic
                          ? `Логический блок: ${tok.key}`
                          : isValid
                          ? `Корректный тег: {{${tok.key}}} (${tok.typeLabel}). Встречается: ${tok.count}`
                          : `Внимание: {{${tok.key}}} не найден в справочнике плейсхолдеров.`
                      }
                    >
                      {isLogic ? (
                        <Split className="w-3 h-3 text-purple-400" />
                      ) : isValid ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                      )}
                      <span>{isLogic ? `{{?${tok.key}:...}}` : `{{${tok.key}}}`}</span>
                      {tok.count > 1 && (
                        <span className="text-[9px] px-1 rounded-full bg-slate-800 text-slate-400 font-sans">
                          x{tok.count}
                        </span>
                      )}
                      <span className="text-[9.5px] opacity-75 font-sans">
                        • {tok.typeLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
