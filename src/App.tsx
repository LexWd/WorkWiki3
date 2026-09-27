import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Zap, FileText } from 'lucide-react';
import { 
  Snippet, 
  PlaceholderConfig, 
  ExcelTable, 
  ExcelRow, 
  GuiSettings, 
  ProductivityMetrics, 
  ActiveTab,
  ResourceWidget,
  ImportSnippetMode,
  NoteCard,
  CategoryMetadata,
  CustomIcon
} from './types';
import { storage } from './utils/storage';
import { soundService } from './utils/sound';
import { interpolateSnippet } from './utils/interpolator';
import { copyToClipboard } from './utils/clipboard';
import { getThemeClasses, getAccentClasses, getFontScaleStyle } from './utils/theme';
import { checkForUpdate, CURRENT_APP_VERSION } from './utils/updateManager';
import { DesktopHeader } from './components/DesktopHeader';
import { SnippetListPanel } from './components/SnippetListPanel';
import { LiveComposerAndResolver } from './components/LiveComposerAndResolver';
import { PlaceholderManagerPanel } from './components/PlaceholderManagerPanel';
import { ResourcesAndWidgetsPanel } from './components/ResourcesAndWidgetsPanel';
import { NotesManagerPanel } from './components/NotesManagerPanel';
import { MiniHudBar } from './components/MiniHudBar';
import { SnippetEditorModal } from './components/SnippetEditorModal';
import { QuickCommandPalette } from './components/QuickCommandPalette';
import { GuiCustomizationModal } from './components/GuiCustomizationModal';
import { ShortcutsCheatSheetModal } from './components/ShortcutsCheatSheetModal';
import { ProductivityStatsBar } from './components/ProductivityStatsBar';
import { ToastNotice, ToastItem } from './components/ToastNotice';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { BackupManagerModal } from './components/BackupManagerModal';
import { UpdateManagerModal } from './components/UpdateManagerModal';

export default function App() {
  // Core persistent states
  const [snippets, setSnippets] = useState<Snippet[]>(() => storage.loadSnippets());
  const [placeholders, setPlaceholders] = useState<PlaceholderConfig[]>(() => storage.loadPlaceholders());
  const [tables, setTables] = useState<ExcelTable[]>(() => storage.loadExcelTables());
  const [widgets, setWidgets] = useState<ResourceWidget[]>(() => storage.loadResourceWidgets());
  const [notes, setNotes] = useState<NoteCard[]>(() => storage.loadNotes());
  const [settings, setSettings] = useState<GuiSettings>(() => storage.loadSettings());
  const [metrics, setMetrics] = useState<ProductivityMetrics>(() => storage.loadMetrics());

  // Resizable catalog sidebar width
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    return settings.sidebarWidth || 400;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const sidebarStartXRef = useRef<number>(0);
  const sidebarStartWidthRef = useRef<number>(400);

  // Active selections
  const [activeTab, setActiveTab] = useState<ActiveTab>('snippets');
  const [activeTableId, setActiveTableId] = useState<string>(() => {
    const list = storage.loadExcelTables();
    return list[0]?.id || '';
  });
  const [activeRow, setActiveRow] = useState<ExcelRow | null>(() => {
    const list = storage.loadExcelTables();
    return list[0]?.rows[0] || null;
  });
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(() => {
    const snips = storage.loadSnippets();
    return snips[0] || null;
  });

  // Modals & UI overlays
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<'gui' | 'icons' | 'collections' | 'backup'>('gui');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null | 'NEW'>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [categories, setCategories] = useState<string[]>(() => storage.loadCategories());
  const [categoryMetadata, setCategoryMetadata] = useState<Record<string, CategoryMetadata>>(() => storage.loadCategoryMetadata());
  const [resourceCategories, setResourceCategories] = useState<string[]>(() => storage.loadResourceCategories());
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>(() => storage.loadCustomIcons());
  const [hiddenIconIds, setHiddenIconIds] = useState<string[]>(() => storage.loadHiddenIcons());

  // Update System states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);

  // Responsive mobile/compact mode switcher
  const [snippetMobileView, setSnippetMobileView] = useState<'catalog' | 'composer'>('catalog');

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [newSnippetInitialCategory, setNewSnippetInitialCategory] = useState<string | undefined>(undefined);

  // Theme & font helpers
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);
  const fontScale = getFontScaleStyle(settings.fontSize);

  // Automatic update check on app launch
  useEffect(() => {
    checkForUpdate()
      .then((res) => {
        if (res.hasUpdate) {
          setHasUpdateAvailable(true);
        }
      })
      .catch(() => {});
  }, []);

  // Sync state to local storage
  useEffect(() => {
    storage.saveSnippets(snippets);
  }, [snippets]);

  useEffect(() => {
    storage.savePlaceholders(placeholders);
  }, [placeholders]);

  useEffect(() => {
    storage.saveExcelTables(tables);
  }, [tables]);

  useEffect(() => {
    storage.saveResourceWidgets(widgets);
  }, [widgets]);

  useEffect(() => {
    storage.saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    storage.saveMetrics(metrics);
  }, [metrics]);

  useEffect(() => {
    storage.saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    storage.saveCategoryMetadata(categoryMetadata);
  }, [categoryMetadata]);

  useEffect(() => {
    storage.saveCustomIcons(customIcons);
  }, [customIcons]);

  useEffect(() => {
    storage.saveHiddenIcons(hiddenIconIds);
  }, [hiddenIconIds]);

  // Apply density and font-size to document root so all components scale dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-density', settings.density);
    root.setAttribute('data-font-size', settings.fontSize);
  }, [settings.density, settings.fontSize]);

  // Clamp sidebar width on window resize so it never overflows or breaks layout
  useEffect(() => {
    const handleWindowResize = () => {
      setSidebarWidth((prev) => {
        const maxAllowed = Math.max(260, window.innerWidth - 340);
        return Math.min(prev, maxAllowed);
      });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Mouse drag listeners for sidebar resizing
  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - sidebarStartXRef.current;
      const maxAllowed = Math.max(260, window.innerWidth - 340);
      const nextWidth = Math.max(260, Math.min(maxAllowed, sidebarStartWidthRef.current + delta));
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setSettings((prev) => ({ ...prev, sidebarWidth }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, sidebarWidth]);

  // Toast notification helper with guaranteed uniqueness
  const toastCounterRef = useRef(0);
  const showToast = useCallback((title: string, preview: string) => {
    toastCounterRef.current += 1;
    const id = `toast-${Date.now()}-${toastCounterRef.current}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, title, preview }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  // Copy snippet or resolved text
  const handleCopySnippet = useCallback(
    async (snippet: Snippet) => {
      const { result } = interpolateSnippet(snippet.content, placeholders, activeRow, settings.agentName);
      await copyToClipboard(result);

      soundService.playCopyChime(settings.soundEffects);
      showToast(snippet.title, result);

      // Increment usage count
      setSnippets((prev) =>
        prev.map((s) =>
          s.id === snippet.id ? { ...s, usageCount: s.usageCount + 1, updatedAt: Date.now() } : s
        )
      );

      // Metrics
      const words = result.trim().split(/\s+/).filter(Boolean).length;
      const chars = result.length;
      setMetrics((prev) => ({
        ...prev,
        snippetsUsedCount: prev.snippetsUsedCount + 1,
        wordsSaved: prev.wordsSaved + words,
        keystrokesSaved: prev.keystrokesSaved + chars,
        timeSavedSeconds: prev.timeSavedSeconds + Math.round((words / 35) * 60) + 15,
      }));
    },
    [placeholders, activeRow, settings.agentName, settings.soundEffects, showToast]
  );

  const handleCopyResolvedText = useCallback(
    async (text: string, title: string = 'Ответ оператора') => {
      await copyToClipboard(text);

      soundService.playCopyChime(settings.soundEffects);
      showToast(title, text);

      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      setMetrics((prev) => ({
        ...prev,
        snippetsUsedCount: prev.snippetsUsedCount + 1,
        wordsSaved: prev.wordsSaved + words,
        keystrokesSaved: prev.keystrokesSaved + chars,
        timeSavedSeconds: prev.timeSavedSeconds + Math.round((words / 35) * 60) + 15,
      }));
    },
    [settings.soundEffects, showToast]
  );

  // Table operations
  const handleUpdateTable = useCallback((updated: ExcelTable) => {
    setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const handleCreateTable = useCallback((created: ExcelTable) => {
    setTables((prev) => [created, ...prev]);
    setActiveTableId(created.id);
  }, []);

  const handleDeleteTable = useCallback((id: string) => {
    const tableToDelete = tables.find((t) => t.id === id);
    const tableName = tableToDelete ? tableToDelete.name : 'Таблица';

    setTables((prev) => {
      const rest = prev.filter((t) => t.id !== id);
      if (rest.length > 0) {
        setActiveTableId(rest[0].id);
        setActiveRow(rest[0].rows[0] || null);
      } else {
        setActiveTableId('');
        setActiveRow(null);
      }
      return rest;
    });

    showToast('Таблица удалена', `Таблица «${tableName}» удалена из базы данных`);
  }, [tables, showToast]);

  // Widget operations
  const handleAddWidget = useCallback((widget: ResourceWidget) => {
    setWidgets((prev) => [widget, ...prev]);
    showToast('Ресурс добавлен', widget.title);
  }, [showToast]);

  const handleUpdateWidget = useCallback((updated: ResourceWidget) => {
    setWidgets((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    showToast('Ресурс обновлен', updated.title);
  }, [showToast]);

  const handleDeleteWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    showToast('Ресурс удален', 'Закладка удалена из списка');
  }, [showToast]);

  // Resource / Links categories management
  const handleAddResourceCategory = useCallback((newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    setResourceCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const updated = [...prev, trimmed];
      storage.saveResourceCategories(updated);
      return updated;
    });
    showToast('Категория добавлена', `Категория «${trimmed}» добавлена для ссылок`);
  }, [showToast]);

  const handleRenameResourceCategory = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    setResourceCategories((prev) => {
      const updated = prev.map((c) => (c === oldName ? trimmed : c));
      storage.saveResourceCategories(updated);
      return updated;
    });
    setWidgets((prev) => {
      const updatedWidgets = prev.map((w) => (w.category === oldName ? { ...w, category: trimmed } : w));
      storage.saveResourceWidgets(updatedWidgets);
      return updatedWidgets;
    });
    showToast('Категория переименована', `«${oldName}» → «${trimmed}»`);
  }, [showToast]);

  const handleDeleteResourceCategory = useCallback((catName: string, reassignTo: string = 'Утилиты') => {
    setResourceCategories((prev) => {
      const updated = prev.filter((c) => c !== catName);
      storage.saveResourceCategories(updated);
      return updated;
    });
    setWidgets((prev) => {
      const updatedWidgets = prev.map((w) => (w.category === catName ? { ...w, category: reassignTo } : w));
      storage.saveResourceWidgets(updatedWidgets);
      return updatedWidgets;
    });
    showToast('Категория удалена', `Закладки перемещены в «${reassignTo}»`);
  }, [showToast]);

  const handleResetResourceCategories = useCallback(() => {
    const defaults = storage.resetResourceCategories();
    setResourceCategories(defaults);
    showToast('Категории сброшены', 'Восстановлен стандартный набор категорий ссылок');
  }, [showToast]);

  // Categories management
  const handleAddCategory = useCallback((newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const updated = [...prev, trimmed];
      storage.saveCategories(updated);
      return updated;
    });
    showToast('Категория добавлена', `Категория «${trimmed}» готова для шаблонов`);
  }, [showToast]);

  const handleDeleteCategory = useCallback((catToDelete: string, reassignTo: string = 'Общее') => {
    setCategories((prev) => {
      const updated = prev.filter((c) => c !== catToDelete);
      storage.saveCategories(updated);
      return updated;
    });
    setCategoryMetadata((prev) => {
      if (!prev[catToDelete]) return prev;
      const updated = { ...prev };
      delete updated[catToDelete];
      storage.saveCategoryMetadata(updated);
      return updated;
    });
    // Reassign snippets that belonged to deleted category
    setSnippets((prev) =>
      prev.map((s) => (s.category === catToDelete ? { ...s, category: reassignTo } : s))
    );
    showToast('Категория удалена', `Категория «${catToDelete}» удалена. Шаблоны перемещены в «${reassignTo}».`);
  }, [showToast]);

  const handleRenameCategory = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    setCategories((prev) => {
      const updated = prev.map((c) => (c === oldName ? trimmed : c));
      storage.saveCategories(updated);
      return updated;
    });
    setCategoryMetadata((prev) => {
      if (!prev[oldName]) return prev;
      const updated = { ...prev, [trimmed]: prev[oldName] };
      delete updated[oldName];
      storage.saveCategoryMetadata(updated);
      return updated;
    });
    setSnippets((prev) =>
      prev.map((s) => (s.category === oldName ? { ...s, category: trimmed } : s))
    );
    showToast('Категория переименована', `«${oldName}» → «${trimmed}»`);
  }, [showToast]);

  const handleUpdateCategoryMetadata = useCallback((categoryName: string, meta: Partial<CategoryMetadata>) => {
    setCategoryMetadata((prev) => {
      const existing = prev[categoryName] || { color: 'sky' };
      const updated = {
        ...prev,
        [categoryName]: { ...existing, ...meta },
      };
      storage.saveCategoryMetadata(updated);
      return updated;
    });
  }, []);

  const handleResetCategories = useCallback(() => {
    const defaults = storage.resetCategories();
    setCategories(defaults);
    setCategoryMetadata(storage.loadCategoryMetadata());
    showToast('Категории сброшены', 'Восстановлен стандартный набор категорий');
  }, [showToast]);

  // Snippet save
  const handleSaveSnippet = useCallback(
    (data: Omit<Snippet, 'id' | 'usageCount' | 'updatedAt'> & { id?: string }) => {
      // If user saved snippet with new category, ensure category is tracked
      if (data.category && !categories.includes(data.category)) {
        handleAddCategory(data.category);
      }

      if (data.id) {
        setSnippets((prev) =>
          prev.map((s) =>
            s.id === data.id
              ? {
                  ...s,
                  title: data.title,
                  shortcut: data.shortcut,
                  category: data.category,
                  content: data.content,
                  tags: data.tags,
                  hotkey: data.hotkey,
                  isPinned: data.isPinned,
                  updatedAt: Date.now(),
                }
              : s
          )
        );
        showToast('Шаблон обновлен', `«${data.title}» сохранено`);
      } else {
        const newSnip: Snippet = {
          id: `snip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: data.title,
          shortcut: data.shortcut,
          category: data.category,
          content: data.content,
          tags: data.tags,
          hotkey: data.hotkey,
          isPinned: data.isPinned,
          usageCount: 0,
          updatedAt: Date.now(),
        };
        setSnippets((prev) => [newSnip, ...prev]);
        showToast('Шаблон создан', `«${data.title}» добавлен в список`);
      }
      soundService.playCopyChime(settings.soundEffects);
    },
    [categories, handleAddCategory, settings.soundEffects, showToast]
  );

  const handleDeleteSnippet = useCallback((id: string) => {
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    if (selectedSnippet?.id === id) {
      setSelectedSnippet(null);
    }
  }, [selectedSnippet]);

  const handleTogglePin = useCallback((id: string) => {
    setSnippets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPinned: !s.isPinned } : s))
    );
  }, []);

  const handleImportSnippets = useCallback(
    (
      imported: Snippet[],
      mode: ImportSnippetMode,
      targetCategory?: string
    ) => {
      setSnippets((prev) => {
        if (mode === 'replace_all') {
          return imported;
        }
        if (mode === 'replace_category') {
          const catToRemove = targetCategory || imported[0]?.category;
          const filtered = catToRemove ? prev.filter((s) => s.category !== catToRemove) : prev;
          return [...filtered, ...imported];
        }
        // mode: 'merge' - update by id or add new
        const map = new Map<string, Snippet>();
        // First add existing
        for (const s of prev) {
          map.set(s.id, s);
        }
        // Then merge/overwrite with imported
        for (const item of imported) {
          map.set(item.id, item);
        }
        return Array.from(map.values());
      });
    },
    []
  );

  // Notes CRUD handlers
  const handleCreateNote = useCallback(
    (data: Partial<NoteCard> & { title?: string; content?: string }) => {
      const newNote: NoteCard = {
        title: data.title || 'Новая заметка',
        content: data.content || '',
        category: data.category || 'Текущая смена',
        color: data.color || 'amber',
        isPinned: Boolean(data.isPinned),
        tags: data.tags || [],
        checklist: data.checklist,
        ...data,
        id: data.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      soundService.playCopyChime(settings.soundEffects);
      showToast('Заметка создана', newNote.title || 'Новая заметка');
    },
    [settings.soundEffects, showToast]
  );

  const handleUpdateNote = useCallback((updatedOrId: NoteCard | string, partial?: Partial<NoteCard>) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (typeof updatedOrId === 'string') {
          return n.id === updatedOrId ? { ...n, ...partial, updatedAt: Date.now() } : n;
        } else {
          return n.id === updatedOrId.id ? { ...updatedOrId, updatedAt: Date.now() } : n;
        }
      })
    );
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    showToast('Заметка удалена', 'Карточка убрана из рабочей области.');
  }, [showToast]);

  const handleTogglePinNote = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: Date.now() } : n))
    );
  }, []);

  const handleToggleChecklistItem = useCallback((noteId: string, itemId: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        const updatedChecklist = n.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        return { ...n, checklist: updatedChecklist, updatedAt: Date.now() };
      })
    );
  }, []);

  // Global Keyboard Shortcuts supporting both Latin and Cyrillic (ЙЦУКЕН) layouts
  useEffect(() => {
    const isKey = (e: KeyboardEvent, code: string, enKey: string, ruKey: string) => {
      if (e.code === code) return true;
      const k = e.key.toLowerCase();
      return k === enKey.toLowerCase() || k === ruKey.toLowerCase();
    };

    const getDigit = (e: KeyboardEvent): number | null => {
      if (e.code && e.code.startsWith('Digit')) {
        const d = parseInt(e.code.replace('Digit', ''), 10);
        if (!isNaN(d)) return d;
      }
      if (e.code && e.code.startsWith('Numpad')) {
        const d = parseInt(e.code.replace('Numpad', ''), 10);
        if (!isNaN(d)) return d;
      }
      const parsed = parseInt(e.key, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 9) return parsed;
      return null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement;

      // Escape always dismisses modals
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isPaletteOpen) setIsPaletteOpen(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isShortcutsOpen) setIsShortcutsOpen(false);
        if (isBackupModalOpen) setIsBackupModalOpen(false);
        if (isCategoryManagerOpen) setIsCategoryManagerOpen(false);
        if (editingSnippet) setEditingSnippet(null);
        return;
      }

      // Cmd+K or Ctrl+K -> Command Palette (en: k, ru: л)
      if ((e.ctrlKey || e.metaKey) && isKey(e, 'KeyK', 'k', 'л')) {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+B -> Toggle Mini HUD (en: b, ru: и)
      if ((e.ctrlKey || e.metaKey) && isKey(e, 'KeyB', 'b', 'и')) {
        e.preventDefault();
        setSettings((prev) => ({
          ...prev,
          windowMode: prev.windowMode === 'mini-bar' ? 'full' : 'mini-bar',
        }));
        return;
      }

      // Ctrl+N -> New Snippet (en: n, ru: т)
      if ((e.ctrlKey || e.metaKey) && isKey(e, 'KeyN', 'n', 'т') && !e.shiftKey) {
        e.preventDefault();
        setEditingSnippet('NEW');
        return;
      }

      // Ctrl+D -> Switch Tab to Excel or Snippets (en: d, ru: в)
      if ((e.ctrlKey || e.metaKey) && isKey(e, 'KeyD', 'd', 'в')) {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'excel' ? 'snippets' : 'excel'));
        return;
      }

      const digit = getDigit(e);

      // Ctrl + 1..4 -> Switch specific Tab
      if ((e.ctrlKey || e.metaKey) && !e.altKey && digit !== null && digit >= 1 && digit <= 4) {
        e.preventDefault();
        const tabList: ActiveTab[] = ['snippets', 'placeholders', 'resources', 'notes'];
        const nextTab = tabList[digit - 1];
        if (nextTab) setActiveTab(nextTab);
        return;
      }

      // Alt + 1 through Alt + 9 -> Instant Copy
      if (e.altKey && !e.ctrlKey && !e.metaKey && digit !== null && digit >= 1 && digit <= 9) {
        e.preventDefault();
        const explicit = snippets.find((s) => s.hotkey === `Alt+${digit}`);
        const target = explicit || snippets[digit - 1];
        if (target) {
          handleCopySnippet(target);
        }
        return;
      }

      // Slash when not in input (en / or physical slash / Russian layout)
      if (!isInput && (e.key === '/' || e.code === 'Slash' || e.code === 'NumpadDivide')) {
        e.preventDefault();
        setIsPaletteOpen(true);
        return;
      }

      // ? when not in input opens shortcuts cheat sheet
      if (!isInput && (e.key === '?' || (e.shiftKey && (e.code === 'Slash' || e.code === 'Digit7')))) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPaletteOpen,
    isSettingsOpen,
    isShortcutsOpen,
    editingSnippet,
    snippets,
    handleCopySnippet,
  ]);

  // Export / Import / Reset data
  const handleExportData = () => {
    storage.exportBackupData();
  };

  const handleImportData = async (file: File) => {
    const success = await storage.importBackupData(file);
    if (success) {
      setSnippets(storage.loadSnippets());
      setPlaceholders(storage.loadPlaceholders());
      setTables(storage.loadExcelTables());
      setWidgets(storage.loadResourceWidgets());
      setResourceCategories(storage.loadResourceCategories());
      setNotes(storage.loadNotes());
      setCategoryMetadata(storage.loadCategoryMetadata());
      setSettings(storage.loadSettings());
      showToast('Резервная копия загружена', 'Все шаблоны, таблицы, заметки и настройки успешно обновлены.');
    } else {
      showToast('Ошибка импорта', 'Ошибка при чтении файла резервной копии. Проверьте формат JSON.');
    }
  };

  const handleResetData = () => {
    storage.resetAllData();
    setSnippets(storage.loadSnippets());
    setPlaceholders(storage.loadPlaceholders());
    setTables(storage.loadExcelTables());
    setWidgets(storage.loadResourceWidgets());
    setResourceCategories(storage.resetResourceCategories());
    setNotes(storage.loadNotes());
    setCategoryMetadata(storage.loadCategoryMetadata());
    setSettings(storage.loadSettings());
    setMetrics(storage.loadMetrics());
    setActiveRow(storage.loadExcelTables()[0]?.rows[0] || null);
    showToast('Сброс завершен', 'Восстановлены стандартные шаблоны, Excel-база и заметки.');
  };

  const handleDataRestored = () => {
    setSnippets(storage.loadSnippets());
    setCategories(storage.loadCategories());
    setCategoryMetadata(storage.loadCategoryMetadata());
    setCustomIcons(storage.loadCustomIcons());
    setHiddenIconIds(storage.loadHiddenIcons());
    setPlaceholders(storage.loadPlaceholders());
    setTables(storage.loadExcelTables());
    setWidgets(storage.loadResourceWidgets());
    setResourceCategories(storage.loadResourceCategories());
    setNotes(storage.loadNotes());
    setSettings(storage.loadSettings());
    setMetrics(storage.loadMetrics());
    const reloadedTables = storage.loadExcelTables();
    setActiveRow(reloadedTables[0]?.rows[0] || null);
    showToast('Резервная копия', 'База данных и настройки успешно обновлены!');
  };

  // Total rows count across all tables
  const totalRowsCount = useMemo(() => {
    return tables.reduce((acc, t) => acc + t.rows.length, 0);
  }, [tables]);

  return (
    <div 
      data-density={settings.density}
      data-font-size={settings.fontSize}
      className={`fixed inset-0 h-full w-full flex flex-col ${theme.bgApp} ${fontScale} overflow-hidden font-sans select-none`}
    >
      {/* Desktop Header Bar */}
      <DesktopHeader
        settings={settings}
        onUpdateSettings={(partial) => setSettings((prev) => ({ ...prev, ...partial }))}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogoClick={() => {
          setActiveTab('snippets');
          showToast('Быстрые ответы', 'Вы на главной странице: Шаблоны ответов');
        }}
        onOpenSettings={() => {
          setSettingsInitialSection('gui');
          setIsSettingsOpen(true);
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenPalette={() => setIsPaletteOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        hasUpdateAvailable={hasUpdateAvailable}
        isMiniMode={settings.windowMode === 'mini-bar'}
        onToggleMiniMode={() =>
          setSettings((prev) => ({
            ...prev,
            windowMode: prev.windowMode === 'mini-bar' ? 'full' : 'mini-bar',
          }))
        }
        snippetCount={snippets.length}
        tableCount={tables.length}
        placeholderCount={placeholders.length}
        resourceCount={widgets.length}
        noteCount={notes.length}
      />

      {/* Main Workspace Body */}
      {settings.windowMode === 'mini-bar' ? (
        /* Docked Mini-HUD Companion Mode */
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center bg-slate-950/80">
          <div className="w-full max-w-4xl">
            <MiniHudBar
              snippets={snippets}
              placeholders={placeholders}
              activeRow={activeRow}
              onCopySnippet={handleCopySnippet}
              onToggleMiniMode={() => setSettings((prev) => ({ ...prev, windowMode: 'full' }))}
              settings={settings}
            />
          </div>
        </div>
      ) : (
        /* Full Workspace */
        <div className="flex-1 overflow-hidden flex min-w-0">
          {/* Tab 1: Snippets & Live Composer with Draggable Resizer & Responsive Mobile View */}
          {activeTab === 'snippets' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0 h-full">
              {/* Responsive Sub-header for Mobile/Narrow window sizes (< md) */}
              <div className="md:hidden flex items-center bg-slate-900 border-b border-slate-800 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSnippetMobileView('catalog')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    snippetMobileView === 'catalog'
                      ? `${accent.primary} shadow-xs font-bold`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Каталог ({snippets.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSnippetMobileView('composer')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    snippetMobileView === 'composer'
                      ? `${accent.primary} shadow-xs font-bold`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Редактор & Ответ</span>
                  {selectedSnippet && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5"></span>
                  )}
                </button>
              </div>

              {/* Left Column: Snippet Catalog */}
              <div
                style={{ width: `${sidebarWidth}px` }}
                className={`h-full overflow-hidden transition-[width] duration-75 shrink-0 ${
                  snippetMobileView === 'catalog' ? 'flex flex-1 md:flex-initial' : 'hidden md:flex'
                } w-full md:w-auto md:max-w-[calc(100%-280px)] md:min-w-[260px]`}
              >
                <SnippetListPanel
                  snippets={snippets}
                  placeholders={placeholders}
                  activeRow={activeRow}
                  settings={settings}
                  onCopySnippet={handleCopySnippet}
                  onEditSnippet={(s) => setEditingSnippet(s)}
                  onDeleteSnippet={handleDeleteSnippet}
                  onTogglePin={handleTogglePin}
                  onCreateNew={(initialCat) => {
                    setNewSnippetInitialCategory(initialCat);
                    setEditingSnippet('NEW');
                  }}
                  onOpenSettings={(sec) => {
                    setSettingsInitialSection(sec || 'gui');
                    setIsSettingsOpen(true);
                  }}
                  selectedSnippetId={selectedSnippet?.id || null}
                  onSelectSnippet={(s) => {
                    setSelectedSnippet(s);
                    // On narrow screens, auto-switch to composer when a snippet is clicked
                    if (window.innerWidth < 768) {
                      setSnippetMobileView('composer');
                    }
                  }}
                  categories={categories}
                  categoryMetadata={categoryMetadata}
                  customIcons={customIcons}
                  onAddCategory={handleAddCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                />
              </div>

              {/* Resizable vertical splitter between Snippet List and Live Composer (desktop only) */}
              <div
                onMouseDown={(e) => {
                  sidebarStartXRef.current = e.clientX;
                  sidebarStartWidthRef.current = sidebarWidth;
                  setIsResizingSidebar(true);
                }}
                onDoubleClick={() => {
                  setSidebarWidth(400);
                  setSettings((prev) => ({ ...prev, sidebarWidth: 400 }));
                }}
                title="Потяните для изменения ширины каталога (двойной клик — сброс к 400px)"
                className={`hidden md:flex w-1.5 hover:w-2 select-none cursor-col-resize items-center justify-center shrink-0 transition-all group ${
                  isResizingSidebar ? 'bg-sky-500 w-2' : 'bg-slate-800/80 hover:bg-sky-500/60'
                }`}
              >
                <div className="w-0.5 h-8 rounded-full bg-slate-600 group-hover:bg-white transition-colors" />
              </div>

              {/* Right Column: Live Composer and Dynamic Resolver */}
              <div
                className={`flex-1 h-full min-w-0 overflow-hidden ${
                  snippetMobileView === 'composer' ? 'flex' : 'hidden md:flex'
                }`}
              >
                <LiveComposerAndResolver
                  selectedSnippet={selectedSnippet}
                  snippets={snippets}
                  placeholders={placeholders}
                  activeRow={activeRow}
                  settings={settings}
                  onCopyResolved={(text, title) => handleCopyResolvedText(text, title)}
                  onSelectSnippet={(s) => setSelectedSnippet(s)}
                  onUpdateSettings={(partial) => setSettings((prev) => ({ ...prev, ...partial }))}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Placeholder Customization & Database */}
          {activeTab === 'placeholders' && (
            <div className="flex-1 h-full overflow-hidden min-w-0">
              <PlaceholderManagerPanel
                placeholders={placeholders}
                onUpdatePlaceholders={setPlaceholders}
                tables={tables}
                settings={settings}
              />
            </div>
          )}

          {/* Tab 4: Useful Links & Iframe Widgets */}
          {activeTab === 'resources' && (
            <div className="flex-1 h-full overflow-hidden min-w-0">
              <ResourcesAndWidgetsPanel
                widgets={widgets}
                onAddWidget={handleAddWidget}
                onUpdateWidget={handleUpdateWidget}
                onDeleteWidget={handleDeleteWidget}
                categories={resourceCategories}
                onAddCategory={handleAddResourceCategory}
                onRenameCategory={handleRenameResourceCategory}
                onDeleteCategory={handleDeleteResourceCategory}
                onResetCategories={handleResetResourceCategories}
                customIcons={customIcons}
                settings={settings}
              />
            </div>
          )}

          {/* Tab 5: Shift Notes & Checklist Cards */}
          {activeTab === 'notes' && (
            <div className="flex-1 h-full overflow-hidden min-w-0">
              <NotesManagerPanel
                notes={notes}
                onAddNote={handleCreateNote}
                onCreateNote={handleCreateNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onTogglePin={handleTogglePinNote}
                onToggleChecklistItem={handleToggleChecklistItem}
                settings={settings}
                onCopyText={(text, title) => handleCopyResolvedText(text, title)}
                onNotification={(msg) => showToast('Заметки', msg)}
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom Status Bar */}
      <ProductivityStatsBar
        settings={settings}
        snippetCount={snippets.length}
        tableRowsCount={totalRowsCount}
        placeholderCount={placeholders.length}
      />

      {/* Floating Copy Toasts */}
      <ToastNotice toasts={toasts} settings={settings} />

      {/* Modals & Overlays */}
      {/* 1. Quick Command Palette (Ctrl+K or /) */}
      <QuickCommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        snippets={snippets}
        placeholders={placeholders}
        activeRow={activeRow}
        onSelectAndCopy={handleCopySnippet}
        settings={settings}
      />

      {/* 2. Snippet Editor Modal */}
      <SnippetEditorModal
        snippet={editingSnippet === 'NEW' ? null : editingSnippet}
        isOpen={editingSnippet !== null}
        onClose={() => {
          setEditingSnippet(null);
          setNewSnippetInitialCategory(undefined);
        }}
        onSave={handleSaveSnippet}
        placeholders={placeholders}
        activeRow={activeRow}
        settings={settings}
        availableCategories={categories}
        categoryMetadata={categoryMetadata}
        customIcons={customIcons}
        onAddNewCategory={handleAddCategory}
        initialCategory={newSnippetInitialCategory}
      />

      {/* 3. GUI Customization Modal */}
      <GuiCustomizationModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(partial) => setSettings((prev) => ({ ...prev, ...partial }))}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
        snippets={snippets}
        onImportSnippets={handleImportSnippets}
        initialSection={settingsInitialSection}
        onNotification={(msg) => showToast('Настройки', msg)}
        customIcons={customIcons}
        onUpdateCustomIcons={setCustomIcons}
        hiddenIconIds={hiddenIconIds}
        onUpdateHiddenIconIds={setHiddenIconIds}
      />

      {/* 4. Shortcuts Cheat Sheet Modal */}
      <ShortcutsCheatSheetModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        settings={settings}
      />

      {/* 5. Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        snippets={snippets}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onRenameCategory={handleRenameCategory}
        onReorderCategories={setCategories}
        onResetCategories={handleResetCategories}
        categoryMetadata={categoryMetadata}
        onUpdateCategoryMetadata={handleUpdateCategoryMetadata}
        customIcons={customIcons}
        onUpdateCustomIcons={setCustomIcons}
        hiddenIconIds={hiddenIconIds}
        onUpdateHiddenIconIds={setHiddenIconIds}
        settings={settings}
      />

      {/* 6. Full One-Click Backup & Restore Manager Modal */}
      <BackupManagerModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        snippets={snippets}
        categories={categories}
        placeholders={placeholders}
        tables={tables}
        widgets={widgets}
        resourceCategories={resourceCategories}
        notes={notes}
        settings={settings}
        metrics={metrics}
        onDataRestored={handleDataRestored}
      />

      {/* 7. Instant Update System Modal (Updates without reinstalling) */}
      <UpdateManagerModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        settings={settings}
        onToast={(title, msg) => showToast(title, msg)}
      />
    </div>
  );
}
