import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  NoteCard
} from './types';
import { storage } from './utils/storage';
import { soundService } from './utils/sound';
import { interpolateSnippet } from './utils/interpolator';
import { getThemeClasses, getFontScaleStyle } from './utils/theme';
import { DesktopHeader } from './components/DesktopHeader';
import { SnippetListPanel } from './components/SnippetListPanel';
import { LiveComposerAndResolver } from './components/LiveComposerAndResolver';
import { ExcelTableDatabasePanel } from './components/ExcelTableDatabasePanel';
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
import { DesktopTitleBar } from './components/DesktopTitleBar';

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
  const [settingsInitialSection, setSettingsInitialSection] = useState<'gui' | 'collections' | 'backup'>('gui');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null | 'NEW'>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Theme & font helpers
  const theme = getThemeClasses(settings.theme);
  const fontScale = getFontScaleStyle(settings.fontSize);

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

  // Mouse drag listeners for sidebar resizing
  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - sidebarStartXRef.current;
      const nextWidth = Math.max(280, Math.min(700, sidebarStartWidthRef.current + delta));
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

  // Toast notification helper
  const showToast = useCallback((title: string, preview: string) => {
    const id = 'toast-' + Date.now();
    setToasts((prev) => [...prev, { id, title, preview }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  // Copy snippet or resolved text
  const handleCopySnippet = useCallback(
    (snippet: Snippet) => {
      const { result } = interpolateSnippet(snippet.content, placeholders, activeRow, settings.agentName);
      navigator.clipboard.writeText(result).catch((err) => {
        console.warn('Clipboard write prevented:', err);
      });

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
    (text: string, title: string = 'Ответ оператора') => {
      navigator.clipboard.writeText(text).catch((err) => {
        console.warn('Clipboard write error:', err);
      });

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

  // Snippet save
  const handleSaveSnippet = useCallback(
    (data: Omit<Snippet, 'id' | 'usageCount' | 'updatedAt'> & { id?: string }) => {
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
      } else {
        const newSnip: Snippet = {
          id: 'snip-' + Date.now(),
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
      }
      soundService.playCopyChime(settings.soundEffects);
    },
    [settings.soundEffects]
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
    (data: Omit<NoteCard, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newNote: NoteCard = {
        ...data,
        id: 'note-' + Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      soundService.playCopyChime(settings.soundEffects);
      showToast('Заметка создана', newNote.title || 'Новая заметка');
    },
    [settings.soundEffects, showToast]
  );

  const handleUpdateNote = useCallback((id: string, partial: Partial<NoteCard>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...partial, updatedAt: Date.now() } : n))
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement;

      // Escape always dismisses modals
      if (e.key === 'Escape') {
        if (isPaletteOpen) setIsPaletteOpen(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isShortcutsOpen) setIsShortcutsOpen(false);
        if (editingSnippet) setEditingSnippet(null);
        return;
      }

      // Cmd+K or Ctrl+K -> Command Palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+B -> Toggle Mini HUD
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setSettings((prev) => ({
          ...prev,
          windowMode: prev.windowMode === 'mini-bar' ? 'full' : 'mini-bar',
        }));
        return;
      }

      // Ctrl+N -> New Snippet
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N') && !e.shiftKey) {
        e.preventDefault();
        setEditingSnippet('NEW');
        return;
      }

      // Ctrl+D -> Switch Tab to Excel or Snippets
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'excel' ? 'snippets' : 'excel'));
        return;
      }

      // Ctrl + 1..5 -> Switch specific Tab
      if ((e.ctrlKey || e.metaKey) && ['1', '2', '3', '4', '5'].includes(e.key) && !e.altKey) {
        e.preventDefault();
        const tabMap: Record<string, ActiveTab> = {
          '1': 'snippets',
          '2': 'excel',
          '3': 'placeholders',
          '4': 'resources',
          '5': 'notes',
        };
        const nextTab = tabMap[e.key];
        if (nextTab) setActiveTab(nextTab);
        return;
      }

      // Alt + 1 through Alt + 9 -> Instant Copy
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const num = parseInt(e.key, 10);
        const explicit = snippets.find((s) => s.hotkey === `Alt+${num}`);
        const target = explicit || snippets[num - 1];
        if (target) {
          handleCopySnippet(target);
        }
        return;
      }

      // Slash when not in input
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setIsPaletteOpen(true);
        return;
      }

      // ? when not in input opens shortcuts cheat sheet
      if (e.key === '?' && !isInput) {
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
      setNotes(storage.loadNotes());
      setSettings(storage.loadSettings());
      showToast('Резервная копия загружена', 'Все шаблоны, таблицы, заметки и настройки успешно обновлены.');
    } else {
      alert('Ошибка при чтении файла резервной копии. Проверьте формат JSON.');
    }
  };

  const handleResetData = () => {
    storage.resetAllData();
    setSnippets(storage.loadSnippets());
    setPlaceholders(storage.loadPlaceholders());
    setTables(storage.loadExcelTables());
    setWidgets(storage.loadResourceWidgets());
    setNotes(storage.loadNotes());
    setSettings(storage.loadSettings());
    setMetrics(storage.loadMetrics());
    setActiveRow(storage.loadExcelTables()[0]?.rows[0] || null);
    showToast('Сброс завершен', 'Восстановлены стандартные шаблоны, Excel-база и заметки.');
  };

  // Total rows count across all tables
  const totalRowsCount = useMemo(() => {
    return tables.reduce((acc, t) => acc + t.rows.length, 0);
  }, [tables]);

  return (
    <div className={`h-screen w-screen flex flex-col ${theme.bgApp} ${fontScale} overflow-hidden font-sans select-none`}>
      {/* Native Desktop Window Controls (Active in Electron) */}
      <DesktopTitleBar />

      {/* Desktop Header Bar */}
      <DesktopHeader
        settings={settings}
        onUpdateSettings={(partial) => setSettings((prev) => ({ ...prev, ...partial }))}
        activeRow={activeRow}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => {
          setSettingsInitialSection('gui');
          setIsSettingsOpen(true);
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenPalette={() => setIsPaletteOpen(true)}
        metrics={metrics}
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
        <div className="flex-1 overflow-hidden flex">
          {/* Tab 1: Snippets & Live Composer with Draggable Resizer */}
          {activeTab === 'snippets' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Snippet Catalog */}
              <div
                style={{ width: `${sidebarWidth}px` }}
                className="w-full sm:w-auto shrink-0 h-full overflow-hidden transition-[width] duration-75"
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
                  onCreateNew={() => setEditingSnippet('NEW')}
                  onOpenSettings={(sec) => {
                    setSettingsInitialSection(sec || 'gui');
                    setIsSettingsOpen(true);
                  }}
                  selectedSnippetId={selectedSnippet?.id || null}
                  onSelectSnippet={(s) => {
                    setSelectedSnippet(s);
                    if (settings.autoCopyOnSelect) {
                      handleCopySnippet(s);
                    }
                  }}
                />
              </div>

              {/* Resizable vertical splitter between Snippet List and Live Composer */}
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
                className={`hidden sm:flex w-1.5 hover:w-2 select-none cursor-col-resize items-center justify-center shrink-0 transition-all group ${
                  isResizingSidebar ? 'bg-sky-500 w-2' : 'bg-slate-800/80 hover:bg-sky-500/60'
                }`}
              >
                <div className="w-0.5 h-8 rounded-full bg-slate-600 group-hover:bg-white transition-colors" />
              </div>

              {/* Right Column: Live Composer and Dynamic Resolver */}
              <div className="hidden sm:flex flex-1 h-full min-w-[320px]">
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

          {/* Tab 2: Excel Database with Tags */}
          {activeTab === 'excel' && (
            <div className="flex-1 h-full overflow-hidden">
              <ExcelTableDatabasePanel
                tables={tables}
                activeTableId={activeTableId}
                onSelectTable={setActiveTableId}
                onUpdateTable={handleUpdateTable}
                onCreateTable={handleCreateTable}
                onDeleteTable={handleDeleteTable}
                activeRow={activeRow}
                onSelectActiveRow={setActiveRow}
                settings={settings}
              />
            </div>
          )}

          {/* Tab 3: Placeholder Customization & Database */}
          {activeTab === 'placeholders' && (
            <div className="flex-1 h-full overflow-hidden">
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
            <div className="flex-1 h-full overflow-hidden">
              <ResourcesAndWidgetsPanel
                widgets={widgets}
                onAddWidget={handleAddWidget}
                onUpdateWidget={handleUpdateWidget}
                onDeleteWidget={handleDeleteWidget}
                settings={settings}
              />
            </div>
          )}

          {/* Tab 5: Shift Notes & Checklist Cards */}
          {activeTab === 'notes' && (
            <div className="flex-1 h-full overflow-hidden">
              <NotesManagerPanel
                notes={notes}
                onCreateNote={handleCreateNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onTogglePin={handleTogglePinNote}
                onToggleChecklistItem={handleToggleChecklistItem}
                settings={settings}
                onCopyText={(text, title) => handleCopyResolvedText(text, title)}
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom Status Bar */}
      <ProductivityStatsBar
        metrics={metrics}
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
        onClose={() => setEditingSnippet(null)}
        onSave={handleSaveSnippet}
        placeholders={placeholders}
        activeRow={activeRow}
        settings={settings}
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
        onNotification={(msg) => showToast('Коллекции', msg)}
      />

      {/* 4. Shortcuts Cheat Sheet Modal */}
      <ShortcutsCheatSheetModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        settings={settings}
      />
    </div>
  );
}
