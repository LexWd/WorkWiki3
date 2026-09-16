import React, { useState, useEffect } from 'react';
import { X, Sparkles, Pin, Tag, Save, Eye, Brackets } from 'lucide-react';
import { Snippet, SnippetCategory, PlaceholderConfig, ExcelRow, GuiSettings } from '../types';
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
}

const CATEGORIES: SnippetCategory[] = [
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
}) => {
  const [title, setTitle] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [category, setCategory] = useState<SnippetCategory>('Заказы и доставка');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [hotkey, setHotkey] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  useEffect(() => {
    if (snippet) {
      setTitle(snippet.title);
      setShortcut(snippet.shortcut);
      setCategory((snippet.category as SnippetCategory) || 'Заказы и доставка');
      setContent(snippet.content);
      setTagsInput(snippet.tags.join(', '));
      setHotkey(snippet.hotkey || '');
      setIsPinned(snippet.isPinned);
    } else {
      setTitle('');
      setShortcut('/шаблон');
      setCategory('Заказы и доставка');
      setContent('Здравствуйте, {{имя_клиента}}! По заказу №{{номер_заказа}}: ...');
      setTagsInput('поддержка, заказ');
      setHotkey('');
      setIsPinned(false);
    }
  }, [snippet, isOpen]);

  if (!isOpen) return null;

  const handleInsertToken = (key: string) => {
    setContent((prev) => prev + ` {{${key}}}`);
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      alert('Пожалуйста, заполните название и текст шаблона.');
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
      title: title.trim(),
      shortcut: cleanShortcut,
      category,
      content: content.trim(),
      tags,
      hotkey: hotkey ? hotkey : undefined,
      isPinned,
    });
    onClose();
  };

  const { result: previewResolved } = interpolateSnippet(
    content,
    placeholders,
    activeRow,
    settings.agentName
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${theme.panel} ${theme.border}`}>
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
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
          {/* Row 1: Title & Shortcut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Название шаблона *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Статус доставки и трек"
                className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Слэш-команда (быстрый ввод) *
              </label>
              <input
                type="text"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="/статус"
                className={`w-full p-2 rounded-lg border font-mono text-xs outline-none ${theme.input}`}
              />
            </div>
          </div>

          {/* Row 2: Category, Hotkey, Pinned */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Категория
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SnippetCategory)}
                className={`w-full p-2 rounded-lg border text-xs outline-none cursor-pointer ${theme.input}`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Горячая клавиша (Alt + 1..9)
              </label>
              <select
                value={hotkey}
                onChange={(e) => setHotkey(e.target.value)}
                className={`w-full p-2 rounded-lg border font-mono text-xs outline-none cursor-pointer ${theme.input}`}
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
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-700/60 bg-slate-900/60 w-full cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-sky-500"
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
                  className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-slate-800 hover:bg-sky-900/60 text-sky-300 border border-slate-700/60 hover:border-sky-500 transition-colors"
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
              Текст шаблона с переменными *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Здравствуйте, {{имя_клиента}}! Номер вашего заказа {{номер_заказа}}..."
              className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed outline-none font-sans ${theme.input}`}
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
              className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
            />
          </div>

          {/* Live Preview */}
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px] mb-1">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Предварительный просмотр с подстановкой значений:</span>
            </div>
            <p className="text-[11.5px] text-slate-200 whitespace-pre-wrap leading-relaxed">
              {previewResolved || 'Введите текст выше для просмотра...'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex items-center justify-between ${theme.panelHeader} ${theme.border}`}>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-md ${accent.primary}`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Сохранить шаблон</span>
          </button>
        </div>
      </div>
    </div>
  );
};
