import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Plus, 
  Trash2, 
  Pin, 
  Tag, 
  Folder, 
  ListChecks, 
  FileText 
} from 'lucide-react';
import { NoteCard, NoteCardColor, NoteChecklistItem, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: NoteCard) => void;
  note: NoteCard | null;
  settings: GuiSettings;
  availableCategories: string[];
}

const COLOR_OPTIONS: { id: NoteCardColor; label: string; bgClass: string; borderClass: string; dotClass: string }[] = [
  { id: 'amber', label: 'Янтарный', bgClass: 'bg-amber-950/40', borderClass: 'border-amber-500/50', dotClass: 'bg-amber-500' },
  { id: 'blue', label: 'Синий', bgClass: 'bg-sky-950/40', borderClass: 'border-sky-500/50', dotClass: 'bg-sky-500' },
  { id: 'emerald', label: 'Изумрудный', bgClass: 'bg-emerald-950/40', borderClass: 'border-emerald-500/50', dotClass: 'bg-emerald-500' },
  { id: 'purple', label: 'Фиолетовый', bgClass: 'bg-purple-950/40', borderClass: 'border-purple-500/50', dotClass: 'bg-purple-500' },
  { id: 'rose', label: 'Коралловый', bgClass: 'bg-rose-950/40', borderClass: 'border-rose-500/50', dotClass: 'bg-rose-500' },
  { id: 'slate', label: 'Графитовый', bgClass: 'bg-slate-900', borderClass: 'border-slate-700', dotClass: 'bg-slate-400' },
];

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  note,
  settings,
  availableCategories,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Текущая смена');
  const [color, setColor] = useState<NoteCardColor>('amber');
  const [isPinned, setIsPinned] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<NoteChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setCategory(note.category || 'Текущая смена');
      setColor(note.color || 'amber');
      setIsPinned(Boolean(note.isPinned));
      setTags(note.tags || []);
      setChecklist(note.checklist ? [...note.checklist] : []);
    } else {
      setTitle('');
      setContent('');
      setCategory(availableCategories[0] || 'Текущая смена');
      setColor('amber');
      setIsPinned(false);
      setTags([]);
      setChecklist([]);
    }
    setTagInput('');
    setNewChecklistText('');
  }, [note, isOpen, availableCategories]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistText.trim();
    if (!trimmed) return;
    const newItem: NoteChecklistItem = {
      id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: trimmed,
      completed: false,
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistText('');
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    const savedNote: NoteCard = {
      id: note ? note.id : `note-${Date.now()}`,
      title: title.trim() || 'Без названия',
      content: content.trim(),
      category: category.trim() || 'Разное',
      color,
      isPinned,
      tags,
      checklist: checklist.length > 0 ? checklist : undefined,
      createdAt: note ? note.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    onSave(savedNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${theme.panel} ${theme.border}`}>
        {/* Header */}
        <div className={`p-3.5 border-b flex items-center justify-between ${theme.panelHeader} ${theme.border}`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${accent.primary}`}>
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                {note ? 'Редактирование карточки-заметки' : 'Новая карточка-заметка'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Создание памятки, чек-листа или черновика для текущей смены
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Title and Pin */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10.5px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Заголовок заметки
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Чек-лист передачи смены или Контакты склада..."
                className={`w-full p-2.5 rounded-lg border text-sm font-semibold outline-none ${theme.input}`}
                autoFocus
              />
            </div>

            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`mt-4 px-3 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isPinned
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-xs'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Закрепить вверху"
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              <span>{isPinned ? 'Закреплено' : 'Закрепить'}</span>
            </button>
          </div>

          {/* Color & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category selection */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-300 mb-1 uppercase tracking-wider flex items-center gap-1">
                <Folder className="w-3 h-3 text-sky-400" />
                Категория
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Текущая смена, Памятка, Черновик..."
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                />
                <div className="flex flex-wrap gap-1">
                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        category === cat
                          ? 'border-sky-500 text-sky-300 bg-sky-950/60 font-semibold'
                          : 'border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-900/60'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Color selection */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Цвет карточки
              </label>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-left ${
                      color === c.id
                        ? `${c.borderClass} ${c.bgClass} ring-1 ring-white/40`
                        : 'border-slate-800 bg-slate-900/60 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${c.dotClass}`}></span>
                    <span className="text-[10.5px] text-slate-200 font-medium truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content / Text Note */}
          <div>
            <label className="block text-[10.5px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
              Текст заметки / инструкции
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите важную информацию, контакты, памятку или шаблон..."
              rows={4}
              className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed outline-none resize-y font-sans ${theme.input}`}
            />
          </div>

          {/* Checklist Section (Optional tasks/steps) */}
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
                Интерактивный чек-лист (задачи карточки)
              </span>
              <span className="text-[10px] text-slate-400">
                {checklist.filter((i) => i.completed).length} из {checklist.length} выполнено
              </span>
            </div>

            {/* Existing Checklist Items */}
            {checklist.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-1.5 rounded bg-slate-800/60 border border-slate-700/60 group"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        item.completed
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'border-slate-600 hover:border-slate-400 bg-slate-900'
                      }`}
                    >
                      {item.completed && <Check className="w-3 h-3" />}
                    </button>
                    <span
                      className={`flex-1 text-xs select-none ${
                        item.completed ? 'line-through text-slate-400' : 'text-slate-200'
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Checklist Item */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Добавить пункт чек-листа (нажмите Enter)..."
                className={`flex-1 p-2 rounded-lg border text-xs outline-none ${theme.input}`}
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                disabled={!newChecklistText.trim()}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 ${
                  newChecklistText.trim()
                    ? `${accent.primary}`
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить</span>
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10.5px] font-bold text-slate-300 mb-1 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3 text-sky-400" />
              Теги для быстрого поиска
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Введите тег и нажмите Enter..."
                className={`flex-1 p-2 rounded-lg border text-xs outline-none ${theme.input}`}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs"
              >
                + Тег
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10.5px]"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-400"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className={`p-3 border-t flex items-center justify-end gap-2 ${theme.panelHeader} ${theme.border}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() && !content.trim()}
            className={`px-5 py-1.5 rounded-lg font-bold text-xs shadow-md ${accent.primary} ${
              !title.trim() && !content.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Сохранить карточку
          </button>
        </div>
      </div>
    </div>
  );
};
