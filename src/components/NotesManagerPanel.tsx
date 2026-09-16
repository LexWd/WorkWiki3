import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Pin, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Tag, 
  Folder, 
  ListChecks, 
  LayoutGrid, 
  List, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Filter,
  Layers
} from 'lucide-react';
import { NoteCard, NoteCardColor, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';
import { NoteEditorModal } from './NoteEditorModal';

interface NotesManagerPanelProps {
  notes: NoteCard[];
  onAddNote: (note: NoteCard) => void;
  onUpdateNote: (note: NoteCard) => void;
  onDeleteNote: (id: string) => void;
  settings: GuiSettings;
  onNotification?: (msg: string) => void;
}

const COLOR_STYLES: Record<
  NoteCardColor,
  {
    cardBg: string;
    cardBorder: string;
    badgeBg: string;
    badgeText: string;
    dotColor: string;
  }
> = {
  amber: {
    cardBg: 'bg-amber-950/25 hover:bg-amber-950/35',
    cardBorder: 'border-amber-500/35 hover:border-amber-500/60',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    dotColor: 'bg-amber-400',
  },
  blue: {
    cardBg: 'bg-sky-950/25 hover:bg-sky-950/35',
    cardBorder: 'border-sky-500/35 hover:border-sky-500/60',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300',
    dotColor: 'bg-sky-400',
  },
  emerald: {
    cardBg: 'bg-emerald-950/25 hover:bg-emerald-950/35',
    cardBorder: 'border-emerald-500/35 hover:border-emerald-500/60',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    dotColor: 'bg-emerald-400',
  },
  purple: {
    cardBg: 'bg-purple-950/25 hover:bg-purple-950/35',
    cardBorder: 'border-purple-500/35 hover:border-purple-500/60',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
    dotColor: 'bg-purple-400',
  },
  rose: {
    cardBg: 'bg-rose-950/25 hover:bg-rose-950/35',
    cardBorder: 'border-rose-500/35 hover:border-rose-500/60',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    dotColor: 'bg-rose-400',
  },
  slate: {
    cardBg: 'bg-slate-900/60 hover:bg-slate-900/80',
    cardBorder: 'border-slate-700/60 hover:border-slate-600',
    badgeBg: 'bg-slate-800',
    badgeText: 'text-slate-300',
    dotColor: 'bg-slate-400',
  },
};

export const NotesManagerPanel: React.FC<NotesManagerPanelProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  settings,
  onNotification,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedColor, setSelectedColor] = useState<NoteCardColor | 'ALL'>('ALL');
  const [filterChecklistOnly, setFilterChecklistOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  const [editingNote, setEditingNote] = useState<NoteCard | null | 'NEW'>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.category) set.add(n.category);
    });
    return Array.from(set);
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Category filter
      if (selectedCategory !== 'ALL' && n.category !== selectedCategory) {
        return false;
      }
      // Color filter
      if (selectedColor !== 'ALL' && n.color !== selectedColor) {
        return false;
      }
      // Checklist only filter
      if (filterChecklistOnly && (!n.checklist || n.checklist.length === 0)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesContent = n.content.toLowerCase().includes(q);
        const matchesTags = n.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesChecklist = n.checklist?.some((c) => c.text.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTags && !matchesChecklist) {
          return false;
        }
      }
      return true;
    });
  }, [notes, selectedCategory, selectedColor, filterChecklistOnly, searchQuery]);

  // Separate pinned and unpinned notes
  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  // Checklist statistics
  const checklistStats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    notes.forEach((n) => {
      n.checklist?.forEach((c) => {
        totalItems++;
        if (c.completed) completedItems++;
      });
    });
    return { totalItems, completedItems };
  }, [notes]);

  // Handle copying note content to clipboard
  const handleCopyNote = (n: NoteCard) => {
    let textToCopy = n.title ? `${n.title}\n${n.content}` : n.content;
    if (n.checklist && n.checklist.length > 0) {
      const checklistText = n.checklist
        .map((c) => `${c.completed ? '[x]' : '[ ]'} ${c.text}`)
        .join('\n');
      textToCopy += `\n\nЧек-лист:\n${checklistText}`;
    }

    navigator.clipboard.writeText(textToCopy);
    soundService.playCopyChime(settings.soundEffects);
    setCopiedNoteId(n.id);
    setTimeout(() => setCopiedNoteId(null), 1800);
    onNotification?.(`Заметка «${n.title}» скопирована в буфер!`);
  };

  // Toggle checklist item status directly from card
  const handleToggleChecklist = (noteId: string, itemId: string) => {
    const targetNote = notes.find((n) => n.id === noteId);
    if (!targetNote || !targetNote.checklist) return;

    const updatedChecklist = targetNote.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    onUpdateNote({
      ...targetNote,
      checklist: updatedChecklist,
      updatedAt: Date.now(),
    });

    soundService.playClick(settings.soundEffects);
  };

  // Toggle pin
  const handleTogglePin = (note: NoteCard) => {
    onUpdateNote({
      ...note,
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden ${theme.panel}`}>
      {/* Top Header & Toolbar */}
      <div className={`p-3 border-b shrink-0 flex flex-col gap-2.5 ${theme.panelHeader} ${theme.border}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Title & Stats */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm ${accent.primary}`}>
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-100">Карточки-заметки и чек-листы смены</h2>
                <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {notes.length} карточек
                </span>
                {checklistStats.totalItems > 0 && (
                  <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono">
                    Задачи: {checklistStats.completedItems}/{checklistStats.totalItems}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Памятки, списки задач, важные регламенты и оперативные черновики
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View Mode */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-slate-700 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Сетка карточек"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'list'
                    ? 'bg-slate-700 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Компактный список"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Create Note Button */}
            <button
              onClick={() => setEditingNote('NEW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-transform active:scale-95 ${accent.primary}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать карточку</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по заметкам, чек-листам и тегам..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none ${theme.input}`}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                selectedCategory === 'ALL'
                  ? `${accent.primary} shadow-xs font-bold`
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Все ({notes.length})
            </button>
            {categories.map((cat) => {
              const count = notes.filter((n) => n.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? `${accent.primary} shadow-xs font-bold`
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Checklist toggle filter */}
          <button
            onClick={() => setFilterChecklistOnly(!filterChecklistOnly)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors shrink-0 ${
              filterChecklistOnly
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListChecks className="w-3 h-3 text-emerald-400" />
            <span>Только задачи</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {filteredNotes.length === 0 ? (
          /* Empty State */
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-200 mb-1">Заметки не найдены</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              {searchQuery
                ? 'По вашему поисковому запросу ничего не найдено. Попробуйте изменить фильтр.'
                : 'Создайте свою первую карточку-заметку или чек-лист для удобной работы в смене.'}
            </p>
            <button
              onClick={() => setEditingNote('NEW')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs ${accent.primary}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать первую заметку</span>
            </button>
          </div>
        ) : (
          <>
            {/* Section 1: Pinned Notes */}
            {pinnedNotes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Pin className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Закреплённые карточки ({pinnedNotes.length})
                  </h3>
                </div>

                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'
                      : 'space-y-2'
                  }
                >
                  {pinnedNotes.map((note) => renderNoteCard(note))}
                </div>
              </div>
            )}

            {/* Section 2: Other Notes */}
            {otherNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <div className="flex items-center gap-2 mb-2.5 pt-2">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Все заметки ({otherNotes.length})
                    </h3>
                  </div>
                )}

                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'
                      : 'space-y-2'
                  }
                >
                  {otherNotes.map((note) => renderNoteCard(note))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Note Editor Modal */}
      {editingNote !== null && (
        <NoteEditorModal
          isOpen={true}
          note={editingNote === 'NEW' ? null : editingNote}
          onClose={() => setEditingNote(null)}
          onSave={(savedNote) => {
            if (editingNote === 'NEW') {
              onAddNote(savedNote);
              onNotification?.(`Заметка «${savedNote.title}» успешно создана`);
            } else {
              onUpdateNote(savedNote);
              onNotification?.(`Заметка «${savedNote.title}» обновлена`);
            }
          }}
          settings={settings}
          availableCategories={categories.length > 0 ? categories : ['Текущая смена', 'Памятка', 'Эскалации', 'Черновики']}
        />
      )}
    </div>
  );

  // Helper to render an individual note card
  function renderNoteCard(note: NoteCard) {
    const style = COLOR_STYLES[note.color] || COLOR_STYLES.amber;
    const isCopied = copiedNoteId === note.id;
    const checklistItems = note.checklist || [];
    const completedCount = checklistItems.filter((i) => i.completed).length;

    if (viewMode === 'list') {
      return (
        <div
          key={note.id}
          className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${style.cardBg} ${style.cardBorder}`}
        >
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${style.dotColor}`}></span>
              <h4 className="font-bold text-xs text-slate-100 truncate">{note.title}</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${style.badgeBg} ${style.badgeText}`}>
                {note.category}
              </span>
              {note.isPinned && (
                <Pin className="w-3 h-3 text-amber-400 fill-current shrink-0" />
              )}
            </div>

            {note.content && (
              <p className="text-[11.5px] text-slate-300 line-clamp-2 leading-relaxed">
                {note.content}
              </p>
            )}

            {/* Checklist items preview */}
            {checklistItems.length > 0 && (
              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-mono">
                <ListChecks className="w-3 h-3" />
                <span>
                  Задачи: {completedCount}/{checklistItems.length}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleCopyNote(note)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                isCopied
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Скопировать в буфер"
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => handleTogglePin(note)}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
              title={note.isPinned ? 'Открепить' : 'Закрепить'}
            >
              <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current text-amber-400' : ''}`} />
            </button>
            <button
              onClick={() => setEditingNote(note)}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-sky-400 transition-colors"
              title="Редактировать"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Удалить заметку «${note.title}»?`)) {
                  onDeleteNote(note.id);
                  onNotification?.(`Заметка «${note.title}» удалена`);
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    // Grid / Bento Card View
    return (
      <div
        key={note.id}
        className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all shadow-md group ${style.cardBg} ${style.cardBorder}`}
      >
        {/* Card Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${style.dotColor}`}></span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold truncate ${style.badgeBg} ${style.badgeText}`}>
                {note.category}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleTogglePin(note)}
                className={`p-1 rounded transition-colors ${
                  note.isPinned
                    ? 'text-amber-400'
                    : 'text-slate-500 hover:text-slate-300 opacity-60 group-hover:opacity-100'
                }`}
                title={note.isPinned ? 'Открепить' : 'Закрепить'}
              >
                <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setEditingNote(note)}
                className="p-1 text-slate-500 hover:text-sky-300 rounded opacity-60 group-hover:opacity-100 transition-opacity"
                title="Редактировать"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm(`Удалить карточку «${note.title}»?`)) {
                    onDeleteNote(note.id);
                    onNotification?.(`Заметка «${note.title}» удалена`);
                  }
                }}
                className="p-1 text-slate-500 hover:text-rose-400 rounded opacity-60 group-hover:opacity-100 transition-opacity"
                title="Удалить"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h4 className="font-bold text-xs text-slate-100 mb-1.5 leading-snug">
            {note.title}
          </h4>

          {/* Text Content */}
          {note.content && (
            <p className="text-[11.5px] text-slate-300 whitespace-pre-wrap leading-relaxed mb-3 line-clamp-6">
              {note.content}
            </p>
          )}

          {/* Checklist Items if present */}
          {checklistItems.length > 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-black/25 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono mb-1">
                <span className="flex items-center gap-1 text-slate-300">
                  <ListChecks className="w-3 h-3 text-emerald-400" />
                  Чек-лист:
                </span>
                <span>
                  {completedCount}/{checklistItems.length}
                </span>
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                {checklistItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2 text-[11px] cursor-pointer select-none group/item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleChecklist(note.id, item.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 w-3.5 h-3.5 shrink-0"
                    />
                    <span
                      className={`leading-tight ${
                        item.completed ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer: Tags, Date & Copy Button */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 mt-1">
          {/* Tags */}
          <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
            {note.tags?.slice(0, 3).map((t) => (
              <button
                key={t}
                onClick={() => setSearchQuery(t)}
                className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-slate-300 hover:text-white border border-white/5 truncate max-w-[100px]"
                title={`Фильтр по #${t}`}
              >
                #{t}
              </button>
            ))}
          </div>

          {/* Copy Button */}
          <button
            onClick={() => handleCopyNote(note)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
              isCopied
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-black/30 hover:bg-black/50 text-slate-200 border border-white/10'
            }`}
            title="Скопировать заметку в буфер"
          >
            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span className="text-[10.5px]">{isCopied ? 'Скопировано' : 'Копировать'}</span>
          </button>
        </div>
      </div>
    );
  }
};
