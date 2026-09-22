import { 
  Snippet, 
  PlaceholderConfig, 
  ExcelTable, 
  GuiSettings, 
  ProductivityMetrics, 
  ResourceWidget, 
  NoteCard, 
  CopyHistoryItem, 
  AutoBackupPoint,
  FullBackupPayload,
  CategoryMetadata,
} from '../types';
import { 
  DEFAULT_SNIPPETS, 
  DEFAULT_PLACEHOLDERS, 
  DEFAULT_EXCEL_TABLES, 
  DEFAULT_GUI_SETTINGS, 
  DEFAULT_METRICS,
  DEFAULT_RESOURCE_WIDGETS,
  DEFAULT_NOTE_CARDS,
  DEFAULT_CATEGORY_LIST,
  DEFAULT_RESOURCE_CATEGORIES,
} from '../data/defaultData';

const SNIPPETS_KEY = 'quickreply_ru_snippets_v2';
const PLACEHOLDERS_KEY = 'quickreply_ru_placeholders_v2';
const TABLES_KEY = 'quickreply_ru_tables_v2';
const SETTINGS_KEY = 'quickreply_ru_settings_v2';
const METRICS_KEY = 'quickreply_ru_metrics_v2';
const WIDGETS_KEY = 'quickreply_ru_widgets_v2';
const NOTES_KEY = 'quickreply_ru_notes_v2';
const NOTES_SCRATCHPAD_KEY = 'quickreply_ru_notes_scratchpad_v1';
const NOTE_DRAFT_KEY = 'quickreply_ru_note_new_draft_v1';
const RESOURCE_CATEGORIES_KEY = 'quickreply_ru_resource_categories_v2';
const ALL_CATEGORIES_KEY = 'quickreply_ru_all_categories_v3';
const CATEGORY_META_KEY = 'quickreply_ru_category_metadata_v1';
const LEGACY_CUSTOM_CATEGORIES_KEY = 'quickreply_ru_custom_categories_v2';
const COPY_HISTORY_KEY = 'quickreply_ru_copy_history_v1';
const AUTO_BACKUPS_KEY = 'quickreply_ru_auto_backups_v1';

export const storage = {
  loadCategories(): string[] {
    try {
      const data = localStorage.getItem(ALL_CATEGORIES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Check legacy custom categories and merge if first time
      const legacyData = localStorage.getItem(LEGACY_CUSTOM_CATEGORIES_KEY);
      if (legacyData) {
        const legacyParsed = JSON.parse(legacyData);
        if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
          const merged = Array.from(new Set([...DEFAULT_CATEGORY_LIST, ...legacyParsed]));
          this.saveCategories(merged);
          return merged;
        }
      }
    } catch (e) {
      console.warn('Failed to load categories:', e);
    }
    return [...DEFAULT_CATEGORY_LIST];
  },

  saveCategories(categories: string[]) {
    try {
      localStorage.setItem(ALL_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories:', e);
    }
  },

  resetCategories(): string[] {
    try {
      localStorage.setItem(ALL_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORY_LIST));
    } catch (e) {
      console.error('Failed to reset categories:', e);
    }
    return [...DEFAULT_CATEGORY_LIST];
  },

  loadCustomCategories(): string[] {
    return this.loadCategories();
  },

  saveCustomCategories(categories: string[]) {
    this.saveCategories(categories);
  },

  loadCategoryMetadata(): Record<string, CategoryMetadata> {
    try {
      const data = localStorage.getItem(CATEGORY_META_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Failed to load category metadata:', e);
    }
    return {};
  },

  saveCategoryMetadata(metaMap: Record<string, CategoryMetadata>) {
    try {
      localStorage.setItem(CATEGORY_META_KEY, JSON.stringify(metaMap));
    } catch (e) {
      console.error('Failed to save category metadata:', e);
    }
  },
  loadSnippets(): Snippet[] {
    try {
      const data = localStorage.getItem(SNIPPETS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load snippets from storage:', e);
    }
    return DEFAULT_SNIPPETS;
  },

  saveSnippets(snippets: Snippet[]) {
    try {
      localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
    } catch (e) {
      console.error('Failed to save snippets:', e);
    }
  },

  loadPlaceholders(): PlaceholderConfig[] {
    try {
      const data = localStorage.getItem(PLACEHOLDERS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load placeholders from storage:', e);
    }
    return DEFAULT_PLACEHOLDERS;
  },

  savePlaceholders(placeholders: PlaceholderConfig[]) {
    try {
      localStorage.setItem(PLACEHOLDERS_KEY, JSON.stringify(placeholders));
    } catch (e) {
      console.error('Failed to save placeholders:', e);
    }
  },

  loadExcelTables(): ExcelTable[] {
    try {
      const data = localStorage.getItem(TABLES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load excel tables from storage:', e);
    }
    return DEFAULT_EXCEL_TABLES;
  },

  saveExcelTables(tables: ExcelTable[]) {
    try {
      localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
    } catch (e) {
      console.error('Failed to save tables:', e);
    }
  },

  loadResourceWidgets(): ResourceWidget[] {
    try {
      const data = localStorage.getItem(WIDGETS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((w: ResourceWidget) => ({
            ...w,
            icon: w.icon || (w.type === 'iframe' ? 'map-pin' : 'globe'),
            iconColor: w.iconColor || 'sky',
            iframeHeight: w.iframeHeight || 420,
            iframeWidth: w.iframeWidth || 'full',
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load widgets from storage:', e);
    }
    return DEFAULT_RESOURCE_WIDGETS;
  },

  saveResourceWidgets(widgets: ResourceWidget[]) {
    try {
      localStorage.setItem(WIDGETS_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.error('Failed to save widgets:', e);
    }
  },

  loadResourceCategories(): string[] {
    try {
      const data = localStorage.getItem(RESOURCE_CATEGORIES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load resource categories from storage:', e);
    }
    return [...DEFAULT_RESOURCE_CATEGORIES];
  },

  saveResourceCategories(categories: string[]) {
    try {
      localStorage.setItem(RESOURCE_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save resource categories:', e);
    }
  },

  resetResourceCategories(): string[] {
    try {
      localStorage.removeItem(RESOURCE_CATEGORIES_KEY);
    } catch (e) {
      console.error('Failed to reset resource categories:', e);
    }
    return [...DEFAULT_RESOURCE_CATEGORIES];
  },

  loadNotes(): NoteCard[] {
    try {
      const data = localStorage.getItem(NOTES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load notes from storage:', e);
    }
    return DEFAULT_NOTE_CARDS;
  },

  saveNotes(notes: NoteCard[]) {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save notes:', e);
    }
  },

  loadNotesScratchpad(): string {
    try {
      return localStorage.getItem(NOTES_SCRATCHPAD_KEY) || '';
    } catch (e) {
      console.warn('Failed to load notes scratchpad:', e);
      return '';
    }
  },

  saveNotesScratchpad(text: string) {
    try {
      localStorage.setItem(NOTES_SCRATCHPAD_KEY, text);
    } catch (e) {
      console.error('Failed to save notes scratchpad:', e);
    }
  },

  loadNoteDraft(): Partial<NoteCard> | null {
    try {
      const data = localStorage.getItem(NOTE_DRAFT_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load note draft:', e);
    }
    return null;
  },

  saveNoteDraft(draft: Partial<NoteCard>) {
    try {
      localStorage.setItem(NOTE_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save note draft:', e);
    }
  },

  clearNoteDraft() {
    try {
      localStorage.removeItem(NOTE_DRAFT_KEY);
    } catch (e) {
      console.error('Failed to clear note draft:', e);
    }
  },

  loadSettings(): GuiSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_GUI_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to load settings from storage:', e);
    }
    return DEFAULT_GUI_SETTINGS;
  },

  saveSettings(settings: GuiSettings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  loadMetrics(): ProductivityMetrics {
    try {
      const data = localStorage.getItem(METRICS_KEY);
      if (data) {
        return { ...DEFAULT_METRICS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to load metrics:', e);
    }
    return DEFAULT_METRICS;
  },

  saveMetrics(metrics: ProductivityMetrics) {
    try {
      localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    } catch (e) {
      console.error('Failed to save metrics:', e);
    }
  },

  getFullBackupPayload(): FullBackupPayload {
    return {
      format: 'quickreply-desk-full-backup',
      version: '2.5-ru',
      exportedAt: new Date().toISOString(),
      snippets: this.loadSnippets(),
      categories: this.loadCategories(),
      placeholders: this.loadPlaceholders(),
      tables: this.loadExcelTables(),
      widgets: this.loadResourceWidgets(),
      resourceCategories: this.loadResourceCategories(),
      notes: this.loadNotes(),
      notesScratchpad: this.loadNotesScratchpad(),
      categoryMetadata: this.loadCategoryMetadata(),
      settings: this.loadSettings(),
      metrics: this.loadMetrics(),
      copyHistory: this.loadCopyHistory(),
    };
  },

  downloadFullBackup(customPayload?: FullBackupPayload): FullBackupPayload {
    const payload = customPayload || this.getFullBackupPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    a.href = url;
    a.download = `quickreply-desk-backup-${datePart}-${timePart}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return payload;
  },

  exportBackupData() {
    this.downloadFullBackup();
  },

  validateBackupPayload(parsed: any): {
    isValid: boolean;
    error?: string;
    summary?: {
      snippets: number;
      categories: number;
      tables: number;
      placeholders: number;
      widgets: number;
      notes: number;
      exportedAt?: string;
      version?: string;
    };
  } {
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'Файл поврежден или не содержит JSON-объект' };
    }

    const hasSnippets = Array.isArray(parsed.snippets);
    const hasTables = Array.isArray(parsed.tables);
    const hasPlaceholders = Array.isArray(parsed.placeholders);
    const hasNotes = Array.isArray(parsed.notes);
    const hasWidgets = Array.isArray(parsed.widgets);

    if (!hasSnippets && !hasTables && !hasPlaceholders && !hasNotes && !hasWidgets) {
      return {
        isValid: false,
        error: 'В файле не обнаружены данные QuickReply Desk (нет шаблонов, заметок или таблиц)',
      };
    }

    return {
      isValid: true,
      summary: {
        snippets: hasSnippets ? parsed.snippets.length : 0,
        categories: Array.isArray(parsed.categories) ? parsed.categories.length : 0,
        tables: hasTables ? parsed.tables.length : 0,
        placeholders: hasPlaceholders ? parsed.placeholders.length : 0,
        widgets: hasWidgets ? parsed.widgets.length : 0,
        notes: hasNotes ? parsed.notes.length : 0,
        exportedAt: parsed.exportedAt,
        version: parsed.version || '1.0',
      },
    };
  },

  restoreFullBackup(parsed: any, mode: 'replace' | 'merge' = 'replace'): boolean {
    try {
      const validation = this.validateBackupPayload(parsed);
      if (!validation.isValid) return false;

      // Always create an automatic rollback safety snapshot before modifying state!
      this.createAutoBackup(
        `Автоснимок перед восстановлением бэкапа (${mode === 'replace' ? 'Замена' : 'Объединение'})`
      );

      if (mode === 'replace') {
        if (Array.isArray(parsed.snippets)) this.saveSnippets(parsed.snippets);
        if (Array.isArray(parsed.categories)) this.saveCategories(parsed.categories);
        if (Array.isArray(parsed.placeholders)) this.savePlaceholders(parsed.placeholders);
        if (Array.isArray(parsed.tables)) this.saveExcelTables(parsed.tables);
        if (Array.isArray(parsed.widgets)) this.saveResourceWidgets(parsed.widgets);
        if (Array.isArray(parsed.resourceCategories)) this.saveResourceCategories(parsed.resourceCategories);
        if (Array.isArray(parsed.notes)) this.saveNotes(parsed.notes);
        if (typeof parsed.notesScratchpad === 'string') this.saveNotesScratchpad(parsed.notesScratchpad);
        if (parsed.categoryMetadata && typeof parsed.categoryMetadata === 'object') {
          this.saveCategoryMetadata(parsed.categoryMetadata);
        }
        if (parsed.settings && typeof parsed.settings === 'object') this.saveSettings(parsed.settings);
        if (parsed.metrics && typeof parsed.metrics === 'object') this.saveMetrics(parsed.metrics);
        if (Array.isArray(parsed.copyHistory)) this.saveCopyHistory(parsed.copyHistory);
      } else {
        // Merge mode: blend existing and incoming items without duplicating IDs
        if (Array.isArray(parsed.snippets)) {
          const current = this.loadSnippets();
          const existingIds = new Set(current.map((s) => s.id));
          const toAdd = parsed.snippets.filter((s: Snippet) => !existingIds.has(s.id));
          this.saveSnippets([...current, ...toAdd]);
        }
        if (Array.isArray(parsed.categories)) {
          const currentCats = this.loadCategories();
          const mergedCats = Array.from(new Set([...currentCats, ...parsed.categories]));
          this.saveCategories(mergedCats);
        }
        if (Array.isArray(parsed.placeholders)) {
          const currentPh = this.loadPlaceholders();
          const existingPhKeys = new Set(currentPh.map((p) => p.key.toLowerCase()));
          const toAddPh = parsed.placeholders.filter(
            (p: PlaceholderConfig) => !existingPhKeys.has(p.key.toLowerCase())
          );
          this.savePlaceholders([...currentPh, ...toAddPh]);
        }
        if (Array.isArray(parsed.tables)) {
          const currentTables = this.loadExcelTables();
          const existingTableIds = new Set(currentTables.map((t) => t.id));
          const toAddTables = parsed.tables.filter((t: ExcelTable) => !existingTableIds.has(t.id));
          this.saveExcelTables([...currentTables, ...toAddTables]);
        }
        if (Array.isArray(parsed.widgets)) {
          const currentWidgets = this.loadResourceWidgets();
          const existingWidgetIds = new Set(currentWidgets.map((w) => w.id));
          const toAddWidgets = parsed.widgets.filter((w: ResourceWidget) => !existingWidgetIds.has(w.id));
          this.saveResourceWidgets([...currentWidgets, ...toAddWidgets]);
        }
        if (Array.isArray(parsed.resourceCategories)) {
          const currentRCats = this.loadResourceCategories();
          const mergedRCats = Array.from(new Set([...currentRCats, ...parsed.resourceCategories]));
          this.saveResourceCategories(mergedRCats);
        }
        if (Array.isArray(parsed.notes)) {
          const currentNotes = this.loadNotes();
          const existingNoteIds = new Set(currentNotes.map((n) => n.id));
          const toAddNotes = parsed.notes.filter((n: NoteCard) => !existingNoteIds.has(n.id));
          this.saveNotes([...currentNotes, ...toAddNotes]);
        }
        if (typeof parsed.notesScratchpad === 'string' && parsed.notesScratchpad.trim() !== '') {
          const currentScratchpad = this.loadNotesScratchpad();
          if (!currentScratchpad.trim()) {
            this.saveNotesScratchpad(parsed.notesScratchpad);
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to restore backup:', err);
      return false;
    }
  },

  async importBackupData(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      return this.restoreFullBackup(parsed, 'replace');
    } catch (err) {
      console.error('Failed to import backup:', err);
      return false;
    }
  },

  loadCopyHistory(): CopyHistoryItem[] {
    try {
      const data = localStorage.getItem(COPY_HISTORY_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load copy history:', e);
    }
    return [];
  },

  saveCopyHistory(history: CopyHistoryItem[]) {
    try {
      localStorage.setItem(COPY_HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    } catch (e) {
      console.error('Failed to save copy history:', e);
    }
  },

  clearCopyHistory() {
    localStorage.removeItem(COPY_HISTORY_KEY);
  },

  loadAutoBackups(): AutoBackupPoint[] {
    try {
      const data = localStorage.getItem(AUTO_BACKUPS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load auto-backups:', e);
    }
    return [];
  },

  saveAutoBackups(backups: AutoBackupPoint[]) {
    try {
      localStorage.setItem(AUTO_BACKUPS_KEY, JSON.stringify(backups.slice(0, 10)));
    } catch (e) {
      console.error('Failed to save auto-backups:', e);
    }
  },

  createAutoBackup(reason: string): AutoBackupPoint | null {
    try {
      const existing = this.loadAutoBackups();
      const snippets = this.loadSnippets();
      const placeholders = this.loadPlaceholders();
      const tables = this.loadExcelTables();
      const widgets = this.loadResourceWidgets();
      const notes = this.loadNotes();
      const categories = this.loadCategories();
      const settings = this.loadSettings();

      const newPoint: AutoBackupPoint = {
        id: `ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
        reason,
        counts: {
          snippets: snippets.length,
          tables: tables.length,
          placeholders: placeholders.length,
          notes: notes.length,
          widgets: widgets.length,
        },
        data: {
          snippets,
          placeholders,
          tables,
          widgets,
          notes,
          categories,
          settings,
        },
      };

      const updated = [newPoint, ...existing].slice(0, 10);
      this.saveAutoBackups(updated);
      return newPoint;
    } catch (e) {
      console.error('Failed to create auto backup:', e);
      return null;
    }
  },

  resetAllData() {
    // Before wiping, save a safety rollback snapshot
    this.createAutoBackup('Снимок перед сбросом к начальным данным');

    localStorage.removeItem(SNIPPETS_KEY);
    localStorage.removeItem(PLACEHOLDERS_KEY);
    localStorage.removeItem(TABLES_KEY);
    localStorage.removeItem(WIDGETS_KEY);
    localStorage.removeItem(NOTES_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(METRICS_KEY);
    localStorage.removeItem(ALL_CATEGORIES_KEY);
    localStorage.removeItem(LEGACY_CUSTOM_CATEGORIES_KEY);
    localStorage.removeItem(COPY_HISTORY_KEY);
  },
};
