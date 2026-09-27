import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Layers,
  FileEdit,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FilePlus,
  Send,
  CheckCheck,
  ArrowUpDown,
  ArrowLeft,
  ArrowRight,
  GripVertical
} from 'lucide-react';
import { NoteCard, NoteCardColor, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';
import { storage } from '../utils/storage';
import { copyToClipboard } from '../utils/clipboard';
import { NoteEditorModal } from './NoteEditorModal';
import { ConfirmDialogModal } from './ConfirmDialogModal';

const DEFAULT_NOTE_CATEGORIES = ['Текущая смена', 'Памятка', 'Эскалации', 'Черновики'];

interface NotesManagerPanelProps {
  notes: NoteCard[];
  onAddNote?: (note: NoteCard) => void;
  onCreateNote?: (note: NoteCard) => void;
  onUpdateNote: (note: NoteCard) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin?: (note: NoteCard) => void;
  onToggleChecklistItem?: (noteId: string, itemId: string) => void;
  settings: GuiSettings;
  onNotification?: (msg: string) => void;
  onCopyText?: (text: string, title?: string) => void;
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
  onCreateNote,
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

  // Customization & Ordering State
  const [notesOrder, setNotesOrder] = useState<string[]>(() => storage.loadNotesOrder());
  const [sortMode, setSortMode] = useState<'custom' | 'pinned' | 'updated' | 'title' | 'color'>('custom');
  const [gridCols, setGridCols] = useState<1 | 2 | 3 | 4>(() => {
    try {
      const saved = localStorage.getItem('quickreply_notes_grid_cols');
      if (saved) return Number(saved) as 1 | 2 | 3 | 4;
    } catch (_) {}
    return 3;
  });
  const [cardDensity, setCardDensity] = useState<'normal' | 'compact'>('normal');
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const [recentMovedNoteId, setRecentMovedNoteId] = useState<string | null>(null);

  const [editingNote, setEditingNote] = useState<NoteCard | null | 'NEW'>(null);
  const [noteToDelete, setNoteToDelete] = useState<NoteCard | null>(null);

  // Quick scratchpad state with instant auto-save to local storage
  const [scratchpadText, setScratchpadText] = useState(() => storage.loadNotesScratchpad());
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(true);
  const [scratchpadStatus, setScratchpadStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastScratchpadTime, setLastScratchpadTime] = useState<string | null>(null);
  const scratchpadDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Inline card editing with instant auto-save to local storage
  const [inlineEditingNoteId, setInlineEditingNoteId] = useState<string | null>(null);
  const [inlineSaveStatus, setInlineSaveStatus] = useState<Record<string, { status: 'idle' | 'saving' | 'saved'; time?: string }>>({});
  const inlineDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});

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

  // Sorted and custom-ordered notes
  const sortedNotes = useMemo(() => {
    const list = [...filteredNotes];
    if (sortMode === 'pinned') {
      return list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    }
    if (sortMode === 'updated') {
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    if (sortMode === 'title') {
      return list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    }
    if (sortMode === 'color') {
      return list.sort((a, b) => a.color.localeCompare(b.color));
    }
    // 'custom' order
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const indexA = notesOrder.indexOf(a.id);
      const indexB = notesOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [filteredNotes, sortMode, notesOrder]);

  const handleMoveNote = (noteId: string, direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIds = sortedNotes.map((n) => n.id);
    const idx = currentIds.indexOf(noteId);
    if (idx === -1) return;
    const targetIdx = direction === 'prev' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentIds.length) return;

    const newOrder = [...currentIds];
    const [removed] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, removed);

    const allOtherIds = notes.map((n) => n.id).filter((id) => !currentIds.includes(id));
    const fullOrder = [...newOrder, ...allOtherIds];

    setNotesOrder(fullOrder);
    storage.saveNotesOrder(fullOrder);
    setRecentMovedNoteId(noteId);
    setTimeout(() => setRecentMovedNoteId(null), 1800);
    soundService.playClick(settings.soundEffects);
  };

  const handleDragStart = (noteId: string, e: React.DragEvent) => {
    setDraggingNoteId(noteId);
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverNote = (targetNoteId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggingNoteId || draggingNoteId === targetNoteId) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const position = e.clientX < midX ? 'before' : 'after';
    if (!dropTarget || dropTarget.id !== targetNoteId || dropTarget.position !== position) {
      setDropTarget({ id: targetNoteId, position });
    }
  };

  const handleDragLeaveNote = (targetNoteId: string, e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      if (dropTarget?.id === targetNoteId) {
        setDropTarget(null);
      }
    }
  };

  const handleDropOnNote = (targetNoteId: string, e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = draggingNoteId || e.dataTransfer.getData('text/plain');
    const pos = dropTarget?.id === targetNoteId ? dropTarget.position : 'before';
    setDraggingNoteId(null);
    setDropTarget(null);
    if (!sourceId || sourceId === targetNoteId) return;

    const currentIds = sortedNotes.map((n) => n.id);
    const sourceIdx = currentIds.indexOf(sourceId);
    if (sourceIdx === -1) return;

    const newOrder = [...currentIds];
    const [removed] = newOrder.splice(sourceIdx, 1);
    const targetIdx = newOrder.indexOf(targetNoteId);
    if (targetIdx === -1) return;

    const insertIndex = pos === 'after' ? targetIdx + 1 : targetIdx;
    newOrder.splice(insertIndex, 0, removed);

    const allOtherIds = notes.map((n) => n.id).filter((id) => !currentIds.includes(id));
    const fullOrder = [...newOrder, ...allOtherIds];

    setNotesOrder(fullOrder);
    storage.saveNotesOrder(fullOrder);
    setRecentMovedNoteId(sourceId);
    setTimeout(() => setRecentMovedNoteId(null), 1800);
    soundService.playSuccess(settings.soundEffects);
  };

  // Separate pinned and unpinned notes
  const pinnedNotes = useMemo(() => sortedNotes.filter((n) => n.isPinned), [sortedNotes]);
  const otherNotes = useMemo(() => sortedNotes.filter((n) => !n.isPinned), [sortedNotes]);

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
  const handleCopyNote = async (n: NoteCard) => {
    let textToCopy = n.title ? `${n.title}\n${n.content}` : n.content;
    if (n.checklist && n.checklist.length > 0) {
      const checklistText = n.checklist
        .map((c) => `${c.completed ? '[x]' : '[ ]'} ${c.text}`)
        .join('\n');
      textToCopy += `\n\nЧек-лист:\n${checklistText}`;
    }

    await copyToClipboard(textToCopy);
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

  // Autosave handlers for scratchpad
  const handleScratchpadChange = (newText: string) => {
    setScratchpadText(newText);
    setScratchpadStatus('saving');

    // Instant local storage persist
    storage.saveNotesScratchpad(newText);

    if (scratchpadDebounceRef.current) {
      clearTimeout(scratchpadDebounceRef.current);
    }
    scratchpadDebounceRef.current = setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setScratchpadStatus('saved');
      setLastScratchpadTime(timeStr);
    }, 200);
  };

  const handleCreateCardFromScratchpad = () => {
    const trimmed = scratchpadText.trim();
    if (!trimmed) return;

    const lines = trimmed.split('\n');
    const title = lines[0].slice(0, 80) || 'Заметка из блокнота';
    const content = lines.length > 1 ? lines.slice(1).join('\n').trim() : lines[0];

    const newNote: NoteCard = {
      id: `note-${Date.now()}`,
      title,
      content,
      category: categories[0] || 'Текущая смена',
      color: 'amber',
      isPinned: false,
      tags: ['блокнот'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const createFn = onAddNote || onCreateNote;
    if (createFn) {
      createFn(newNote);
    }
    const currentNotes = storage.loadNotes();
    storage.saveNotes([newNote, ...currentNotes]);

    setScratchpadText('');
    storage.saveNotesScratchpad('');
    setScratchpadStatus('idle');
    setLastScratchpadTime(null);
    onNotification?.('Заметка создана из оперативного блокнота!');
    soundService.playSuccess(settings.soundEffects);
  };

  const handleCopyScratchpad = async () => {
    if (!scratchpadText) return;
    await copyToClipboard(scratchpadText);
    soundService.playCopyChime(settings.soundEffects);
    onNotification?.('Текст оперативного блокнота скопирован!');
  };

  const handleClearScratchpad = () => {
    if (!scratchpadText) return;
    setScratchpadText('');
    storage.saveNotesScratchpad('');
    setScratchpadStatus('idle');
    setLastScratchpadTime(null);
    onNotification?.('Оперативный блокнот очищен');
  };

  // Inline editing handlers for note cards
  const toggleInlineEdit = (noteId: string) => {
    setInlineEditingNoteId((prev) => (prev === noteId ? null : noteId));
  };

  const handleInlineTitleChange = (note: NoteCard, newTitle: string) => {
    const noteId = note.id;
    setInlineSaveStatus((prev) => ({ ...prev, [noteId]: { status: 'saving' } }));

    const updatedNote: NoteCard = {
      ...note,
      title: newTitle,
      updatedAt: Date.now(),
    };
    onUpdateNote(updatedNote);

    const currentNotes = storage.loadNotes();
    const nextNotes = currentNotes.map((n) => (n.id === noteId ? updatedNote : n));
    storage.saveNotes(nextNotes);

    if (inlineDebounceRef.current[noteId]) {
      clearTimeout(inlineDebounceRef.current[noteId]);
    }
    inlineDebounceRef.current[noteId] = setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setInlineSaveStatus((prev) => ({ ...prev, [noteId]: { status: 'saved', time: timeStr } }));
    }, 200);
  };

  const handleInlineContentChange = (note: NoteCard, newContent: string) => {
    const noteId = note.id;
    setInlineSaveStatus((prev) => ({ ...prev, [noteId]: { status: 'saving' } }));

    const updatedNote: NoteCard = {
      ...note,
      content: newContent,
      updatedAt: Date.now(),
    };
    onUpdateNote(updatedNote);

    const currentNotes = storage.loadNotes();
    const nextNotes = currentNotes.map((n) => (n.id === noteId ? updatedNote : n));
    storage.saveNotes(nextNotes);

    if (inlineDebounceRef.current[noteId]) {
      clearTimeout(inlineDebounceRef.current[noteId]);
    }
    inlineDebounceRef.current[noteId] = setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setInlineSaveStatus((prev) => ({ ...prev, [noteId]: { status: 'saved', time: timeStr } }));
    }, 200);
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
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-[11px]">
              <ArrowUpDown className="w-3 h-3 text-slate-400 ml-1" />
              <button
                type="button"
                onClick={() => setSortMode('custom')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  sortMode === 'custom'
                    ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-400/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ручной порядок: перемещайте заметки стрелками или перетаскиванием"
              >
                Ручной
              </button>
              <button
                type="button"
                onClick={() => setSortMode('pinned')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  sortMode === 'pinned'
                    ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-400/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Сначала закрепленные звездочкой"
              >
                ⭐ Важные
              </button>
              <button
                type="button"
                onClick={() => setSortMode('updated')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  sortMode === 'updated'
                    ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-400/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="По дате изменения"
              >
                Дата
              </button>
              <button
                type="button"
                onClick={() => setSortMode('title')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  sortMode === 'title'
                    ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-400/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="По названию (А-Я)"
              >
                А-Я
              </button>
            </div>

            {/* Grid Columns Selector (active in grid view) */}
            {viewMode === 'grid' && (
              <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-[11px]">
                <span className="text-[10px] text-slate-500 px-1 font-mono">Колонки:</span>
                {[1, 2, 3, 4].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      setGridCols(col as 1 | 2 | 3 | 4);
                      try {
                        localStorage.setItem('quickreply_notes_grid_cols', String(col));
                      } catch (_) {}
                    }}
                    className={`px-1.5 py-0.5 rounded font-mono text-[10.5px] transition-all cursor-pointer ${
                      gridCols === col
                        ? `${accent.primary} shadow-xs font-bold`
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={`Отображение в ${col} колонк${col === 1 ? 'у' : col < 5 ? 'и' : 'ок'}`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            )}

            {/* Density Switcher */}
            <button
              type="button"
              onClick={() => setCardDensity(cardDensity === 'normal' ? 'compact' : 'normal')}
              className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                cardDensity === 'compact'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              title={cardDensity === 'compact' ? 'Переключить на подробный вид' : 'Переключить на компактный вид'}
            >
              {cardDensity === 'compact' ? 'Компактно' : 'Подробно'}
            </button>

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Shift Scratchpad with Instant Auto-save to LocalStorage */}
        <div className={`rounded-xl border shadow-sm transition-all overflow-hidden ${theme.panelHeader} ${theme.border}`}>
          <div className="p-2.5 sm:p-3 flex items-center justify-between gap-3 bg-slate-900/70 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${accent.primary}`}>
                <FileEdit className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-xs text-slate-100">
                    Оперативный блокнот смены
                  </h3>
                  {/* Status Indicator */}
                  {scratchpadStatus === 'saving' ? (
                    <span className="text-[10px] text-amber-300 flex items-center gap-1 font-medium bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80 animate-pulse">
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Сохранение...</span>
                    </span>
                  ) : scratchpadStatus === 'saved' || lastScratchpadTime ? (
                    <span className="text-[10px] text-emerald-300 flex items-center gap-1 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Автосохранено {lastScratchpadTime ? `(${lastScratchpadTime})` : ''}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-sky-400 flex items-center gap-1 font-medium bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/60">
                      <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>Мгновенное автосохранение</span>
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-slate-400 hidden sm:block truncate">
                  Любой введённый текст сразу фиксируется в локальном хранилище браузера без нажатия кнопок
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {scratchpadText.trim() && (
                <>
                  <button
                    type="button"
                    onClick={handleCreateCardFromScratchpad}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${accent.primary}`}
                    title="Создать постоянную карточку из текста блокнота"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">В карточки</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyScratchpad}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    title="Скопировать весь текст блокнота"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Копировать</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearScratchpad}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title="Очистить блокнот"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={isScratchpadOpen ? 'Свернуть блокнот' : 'Развернуть блокнот'}
              >
                {isScratchpadOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isScratchpadOpen && (
            <div className="p-3 bg-slate-950/40 space-y-2">
              <textarea
                value={scratchpadText}
                onChange={(e) => handleScratchpadChange(e.target.value)}
                placeholder="Оперативные заметки, телефоны, номера заказов, черновики ответов... Печатайте здесь — каждый символ сохраняется моментально!"
                rows={3}
                className={`w-full p-2.5 rounded-lg border text-xs font-sans leading-relaxed outline-none transition-all resize-y min-h-[75px] max-h-[220px] ${theme.input} focus:border-sky-500`}
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Символов: {scratchpadText.length} | Строк: {scratchpadText ? scratchpadText.split('\n').length : 0}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Локальное хранилище: данные защищены от случайного закрытия вкладки
                </span>
              </div>
            </div>
          )}
        </div>

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
            {sortMode === 'pinned' ? (
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
                          ? `grid gap-3.5 ${
                              gridCols === 1
                                ? 'grid-cols-1'
                                : gridCols === 2
                                ? 'grid-cols-1 md:grid-cols-2'
                                : gridCols === 4
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                            }`
                          : 'space-y-2'
                      }
                    >
                      <AnimatePresence mode="popLayout">
                        {pinnedNotes.map((note) => renderNoteCard(note))}
                      </AnimatePresence>
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
                          ? `grid gap-3.5 ${
                              gridCols === 1
                                ? 'grid-cols-1'
                                : gridCols === 2
                                ? 'grid-cols-1 md:grid-cols-2'
                                : gridCols === 4
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                            }`
                          : 'space-y-2'
                      }
                    >
                      <AnimatePresence mode="popLayout">
                        {otherNotes.map((note) => renderNoteCard(note))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Custom / Date / Title / Color sort: Fluid responsive grid */
              <div>
                <div
                  className={
                    viewMode === 'grid'
                      ? `grid gap-3.5 ${
                          gridCols === 1
                            ? 'grid-cols-1'
                            : gridCols === 2
                            ? 'grid-cols-1 md:grid-cols-2'
                            : gridCols === 4
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                        }`
                      : 'space-y-2'
                  }
                >
                  <AnimatePresence mode="popLayout">
                    {sortedNotes.map((note) => renderNoteCard(note))}
                  </AnimatePresence>
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
          onDelete={(id) => {
            onDeleteNote(id);
            onNotification?.('Заметка удалена');
            setEditingNote(null);
          }}
          onSave={(savedNote) => {
            if (editingNote === 'NEW') {
              const createFn = onAddNote || onCreateNote;
              if (createFn) {
                createFn(savedNote);
              }
              onNotification?.(`Заметка «${savedNote.title}» успешно создана`);
            } else {
              onUpdateNote(savedNote);
              onNotification?.(`Заметка «${savedNote.title}» обновлена`);
            }
          }}
          settings={settings}
          availableCategories={categories.length > 0 ? categories : DEFAULT_NOTE_CATEGORIES}
        />
      )}

      {/* Confirmation Modal for Note Deletion */}
      <ConfirmDialogModal
        isOpen={noteToDelete !== null}
        title="Удалить карточку-заметку?"
        description={
          noteToDelete ? (
            <div className="space-y-1.5">
              <div>
                Вы действительно хотите удалить заметку <strong className="text-rose-300">«{noteToDelete.title || 'Без названия'}»</strong>?
              </div>
              {noteToDelete.checklist && noteToDelete.checklist.length > 0 && (
                <div className="text-[11px] text-slate-400">
                  В карточке также содержится чек-лист из {noteToDelete.checklist.length} пунктов.
                </div>
              )}
            </div>
          ) : null
        }
        confirmText="Удалить заметку"
        cancelText="Отмена"
        variant="danger"
        icon="trash"
        onConfirm={() => {
          if (noteToDelete) {
            onDeleteNote(noteToDelete.id);
            onNotification?.(`Заметка «${noteToDelete.title}» удалена`);
            setNoteToDelete(null);
          }
        }}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  );

  // Helper to render an individual note card
  function renderNoteCard(note: NoteCard) {
    const style = COLOR_STYLES[note.color] || COLOR_STYLES.amber;
    const isCopied = copiedNoteId === note.id;
    const checklistItems = note.checklist || [];
    const completedCount = checklistItems.filter((i) => i.completed).length;
    const isInlineEditing = inlineEditingNoteId === note.id;
    const cardSaveState = inlineSaveStatus[note.id];

    const cardIndex = sortedNotes.findIndex((n) => n.id === note.id);
    const isFirst = cardIndex === 0;
    const isLast = cardIndex === sortedNotes.length - 1;
    const isHoveredTarget = dropTarget?.id === note.id;
    const isJustMoved = recentMovedNoteId === note.id;

    if (viewMode === 'list') {
      if (isInlineEditing) {
        return (
          <div
            key={note.id}
            className={`p-3 rounded-xl border transition-all flex flex-col gap-2.5 ${style.cardBg} ${style.cardBorder} ring-1 ring-sky-500/50 shadow-md`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dotColor}`}></span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${style.badgeBg} ${style.badgeText}`}>
                  {note.category}
                </span>
                {/* Auto-save status */}
                {cardSaveState?.status === 'saving' ? (
                  <span className="text-[10px] text-amber-300 flex items-center gap-1 font-medium bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80 animate-pulse">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Сохранение...</span>
                  </span>
                ) : cardSaveState?.status === 'saved' || cardSaveState?.time ? (
                  <span className="text-[10px] text-emerald-300 flex items-center gap-1 font-medium bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/80">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Автосохранено {cardSaveState?.time ? `(${cardSaveState.time})` : ''}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-sky-400 flex items-center gap-1 font-medium bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/60">
                    <Sparkles className="w-3 h-3 text-sky-400" />
                    <span>Мгновенное автосохранение</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleInlineEdit(note.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer"
                  title="Завершить быстрое редактирование"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Готово</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={note.title}
                onChange={(e) => handleInlineTitleChange(note, e.target.value)}
                placeholder="Заголовок заметки..."
                className={`w-full p-2 rounded-lg border text-xs font-bold outline-none ${theme.input} focus:border-sky-500 font-sans`}
              />
              <textarea
                value={note.content}
                onChange={(e) => handleInlineContentChange(note, e.target.value)}
                placeholder="Текст заметки (сохраняется при каждом вводе)..."
                rows={3}
                className={`w-full p-2 rounded-lg border text-xs leading-relaxed outline-none ${theme.input} focus:border-sky-500 resize-y font-sans`}
              />
            </div>
          </div>
        );
      }

      return (
        <motion.div
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          whileHover={{ y: -1.5, transition: { duration: 0.15 } }}
          key={note.id}
          draggable={sortMode === 'custom' && !isInlineEditing}
          onDragStart={(e) => handleDragStart(note.id, e as unknown as React.DragEvent)}
          onDragOver={(e) => handleDragOverNote(note.id, e as unknown as React.DragEvent)}
          onDragLeave={(e) => handleDragLeaveNote(note.id, e as unknown as React.DragEvent)}
          onDrop={(e) => handleDropOnNote(note.id, e as unknown as React.DragEvent)}
          className={`p-3 rounded-xl border relative transition-colors duration-150 flex items-start justify-between gap-3 ${style.cardBg} ${style.cardBorder} ${
            draggingNoteId === note.id
              ? 'opacity-35 border-sky-400 border-dashed bg-sky-950/20'
              : isJustMoved
              ? 'border-emerald-400 ring-2 ring-emerald-400/80 bg-emerald-500/10'
              : isHoveredTarget
              ? 'border-sky-400 ring-2 ring-sky-400/50'
              : ''
          }`}
        >
          {isHoveredTarget && (
            <>
              {dropTarget.position === 'before' ? (
                <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_#38bdf8] animate-pulse z-30 pointer-events-none" />
              ) : (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_#38bdf8] animate-pulse z-30 pointer-events-none" />
              )}
            </>
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${style.dotColor}`}></span>
              <h4 
                onClick={() => toggleInlineEdit(note.id)}
                className="font-bold text-xs text-slate-100 truncate cursor-pointer hover:text-sky-300 transition-colors"
                title="Нажмите для быстрой правки с автосохранением"
              >
                {note.title}
              </h4>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${style.badgeBg} ${style.badgeText}`}>
                {note.category}
              </span>
              {note.isPinned && (
                <Pin className="w-3 h-3 text-amber-400 fill-current shrink-0" />
              )}
            </div>

            {note.content && (
              <p 
                onClick={() => toggleInlineEdit(note.id)}
                className="text-[11.5px] text-slate-300 line-clamp-2 leading-relaxed cursor-pointer hover:text-slate-100 transition-colors"
                title="Нажмите для быстрой правки с автосохранением"
              >
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
              onClick={() => toggleInlineEdit(note.id)}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-emerald-400 transition-colors"
              title="Быстрая правка текста на месте (автосохранение)"
            >
              <FileEdit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditingNote(note)}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-sky-400 transition-colors"
              title="Редактировать в окне"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNoteToDelete(note);
              }}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      );
    }

    // Grid / Bento Card View
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        whileHover={{ y: -2.5, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.985 }}
        key={note.id}
        draggable={sortMode === 'custom' && !isInlineEditing}
        onDragStart={(e) => handleDragStart(note.id, e as unknown as React.DragEvent)}
        onDragOver={(e) => handleDragOverNote(note.id, e as unknown as React.DragEvent)}
        onDragLeave={(e) => handleDragLeaveNote(note.id, e as unknown as React.DragEvent)}
        onDrop={(e) => handleDropOnNote(note.id, e as unknown as React.DragEvent)}
        className={`rounded-xl border relative flex flex-col justify-between transition-colors duration-150 shadow-md group ${
          cardDensity === 'compact' ? 'p-2.5' : 'p-3.5'
        } ${style.cardBg} ${style.cardBorder} ${
          isInlineEditing ? 'ring-1 ring-sky-500/50' : ''
        } ${
          draggingNoteId === note.id
            ? 'opacity-35 border-sky-400 border-dashed scale-[0.98] bg-sky-950/20 shadow-none'
            : isJustMoved
            ? 'border-emerald-400 ring-2 ring-emerald-400/80 bg-emerald-500/10 shadow-lg scale-[1.01]'
            : isHoveredTarget
            ? 'border-sky-400 ring-2 ring-sky-400/50 shadow-xl'
            : ''
        }`}
      >
        {/* Visual future placement indicator */}
        {isHoveredTarget && (
          <>
            {dropTarget.position === 'before' ? (
              <div className="absolute -left-1.5 top-0 bottom-0 w-1.5 bg-gradient-to-b from-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_#38bdf8] animate-pulse z-30 pointer-events-none" />
            ) : (
              <div className="absolute -right-1.5 top-0 bottom-0 w-1.5 bg-gradient-to-b from-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_#38bdf8] animate-pulse z-30 pointer-events-none" />
            )}
            <div
              className={`absolute -top-3.5 ${
                dropTarget.position === 'before' ? 'left-1' : 'right-1'
              } px-2 py-0.5 rounded-full bg-sky-500 text-white text-[9px] font-bold shadow-lg z-40 pointer-events-none flex items-center gap-1 animate-bounce`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{dropTarget.position === 'before' ? 'Вставить перед' : 'Вставить после'}</span>
            </div>
          </>
        )}

        {/* Card Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
              {sortMode === 'custom' && !isInlineEditing && (
                <div
                  className="text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing p-0.5 -ml-1 shrink-0"
                  title="Перетащите для изменения порядка"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              )}
              <span className={`w-2 h-2 rounded-full shrink-0 ${style.dotColor}`}></span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold truncate ${style.badgeBg} ${style.badgeText}`}>
                {note.category}
              </span>
              {/* Auto-save status in grid */}
              {isInlineEditing && (
                cardSaveState?.status === 'saving' ? (
                  <span className="text-[9.5px] text-amber-300 flex items-center gap-1 font-medium bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80 animate-pulse">
                    <Clock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Сохранение...</span>
                  </span>
                ) : cardSaveState?.status === 'saved' || cardSaveState?.time ? (
                  <span className="text-[9.5px] text-emerald-300 flex items-center gap-1 font-medium bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/80">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Сохранено {cardSaveState?.time ? `(${cardSaveState.time})` : ''}</span>
                  </span>
                ) : (
                  <span className="text-[9.5px] text-sky-400 flex items-center gap-1 font-medium bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/60">
                    <Sparkles className="w-2.5 h-2.5 text-sky-400" />
                    <span>Автосохранение</span>
                  </span>
                )
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Move buttons in custom sort mode */}
              {sortMode === 'custom' && !isInlineEditing && (
                <div className="flex items-center bg-slate-900/90 rounded border border-slate-700/60 p-0.2 mr-1">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={(e) => handleMoveNote(note.id, 'prev', e)}
                    className={`p-1 rounded transition-colors ${
                      isFirst ? 'opacity-25 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
                    }`}
                    title="Переместить левее / выше"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={(e) => handleMoveNote(note.id, 'next', e)}
                    className={`p-1 rounded transition-colors ${
                      isLast ? 'opacity-25 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
                    }`}
                    title="Переместить правее / ниже"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {isInlineEditing ? (
                <button
                  type="button"
                  onClick={() => toggleInlineEdit(note.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                  title="Завершить правку"
                >
                  <Check className="w-3 h-3" />
                  <span>Готово</span>
                </button>
              ) : (
                <>
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
                    onClick={() => toggleInlineEdit(note.id)}
                    className="p-1 text-slate-500 hover:text-emerald-300 rounded opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Быстрая правка текста на месте (автосохранение)"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingNote(note)}
                    className="p-1 text-slate-500 hover:text-sky-300 rounded opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Редактировать в окне"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteToDelete(note);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Title - Static or Editable */}
          {isInlineEditing ? (
            <input
              type="text"
              value={note.title}
              onChange={(e) => handleInlineTitleChange(note, e.target.value)}
              placeholder="Заголовок заметки..."
              className={`w-full p-1.5 mb-2 rounded border text-xs font-bold outline-none ${theme.input} focus:border-sky-500 font-sans`}
            />
          ) : (
            <h4 
              onClick={() => toggleInlineEdit(note.id)}
              className="font-bold text-xs text-slate-100 mb-1.5 leading-snug cursor-pointer hover:text-sky-300 transition-colors"
              title="Нажмите для быстрой правки с автосохранением"
            >
              {note.title}
            </h4>
          )}

          {/* Text Content - Static or Editable */}
          {isInlineEditing ? (
            <textarea
              value={note.content}
              onChange={(e) => handleInlineContentChange(note, e.target.value)}
              placeholder="Текст заметки (сохраняется при вводе)..."
              rows={4}
              className={`w-full p-2 mb-3 rounded border text-xs leading-relaxed outline-none ${theme.input} focus:border-sky-500 resize-y font-sans`}
            />
          ) : (
            note.content && (
              <p 
                onClick={() => toggleInlineEdit(note.id)}
                className="text-[11.5px] text-slate-300 whitespace-pre-wrap leading-relaxed mb-3 line-clamp-6 cursor-pointer hover:text-slate-100 transition-colors"
                title="Нажмите для быстрой правки с автосохранением"
              >
                {note.content}
              </p>
            )
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
      </motion.div>
    );
  }
};
