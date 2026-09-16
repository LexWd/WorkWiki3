import { Snippet, PlaceholderConfig, ExcelTable, GuiSettings, ProductivityMetrics, ResourceWidget, NoteCard } from '../types';
import { 
  DEFAULT_SNIPPETS, 
  DEFAULT_PLACEHOLDERS, 
  DEFAULT_EXCEL_TABLES, 
  DEFAULT_GUI_SETTINGS, 
  DEFAULT_METRICS,
  DEFAULT_RESOURCE_WIDGETS,
  DEFAULT_NOTE_CARDS
} from '../data/defaultData';

const SNIPPETS_KEY = 'quickreply_ru_snippets_v2';
const PLACEHOLDERS_KEY = 'quickreply_ru_placeholders_v2';
const TABLES_KEY = 'quickreply_ru_tables_v2';
const SETTINGS_KEY = 'quickreply_ru_settings_v2';
const METRICS_KEY = 'quickreply_ru_metrics_v2';
const WIDGETS_KEY = 'quickreply_ru_widgets_v2';
const NOTES_KEY = 'quickreply_ru_notes_v2';

export const storage = {
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

  exportBackupData() {
    const payload = {
      version: '2.0-ru',
      exportedAt: new Date().toISOString(),
      snippets: this.loadSnippets(),
      placeholders: this.loadPlaceholders(),
      tables: this.loadExcelTables(),
      widgets: this.loadResourceWidgets(),
      notes: this.loadNotes(),
      settings: this.loadSettings(),
      metrics: this.loadMetrics(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quickreply-desk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importBackupData(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.snippets && Array.isArray(parsed.snippets)) {
        this.saveSnippets(parsed.snippets);
      }
      if (parsed.placeholders && Array.isArray(parsed.placeholders)) {
        this.savePlaceholders(parsed.placeholders);
      }
      if (parsed.tables && Array.isArray(parsed.tables)) {
        this.saveExcelTables(parsed.tables);
      }
      if (parsed.widgets && Array.isArray(parsed.widgets)) {
        this.saveResourceWidgets(parsed.widgets);
      }
      if (parsed.notes && Array.isArray(parsed.notes)) {
        this.saveNotes(parsed.notes);
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        this.saveSettings(parsed.settings);
      }
      return true;
    } catch (err) {
      console.error('Failed to import backup:', err);
      return false;
    }
  },

  resetAllData() {
    localStorage.removeItem(SNIPPETS_KEY);
    localStorage.removeItem(PLACEHOLDERS_KEY);
    localStorage.removeItem(TABLES_KEY);
    localStorage.removeItem(WIDGETS_KEY);
    localStorage.removeItem(NOTES_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(METRICS_KEY);
  },
};
