export type SnippetCategory =
  | 'Приветствие и начало'
  | 'Заказы и доставка'
  | 'Возвраты и компенсации'
  | 'Техническая поддержка'
  | 'Оплата и счета'
  | 'Эскалации'
  | 'Завершение диалога'
  | (string & {});

export type CategoryColor = 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo' | 'cyan';

export interface CategoryMetadata {
  name?: string;
  color?: CategoryColor;
  icon?: string;
  description?: string;
}

export interface Snippet {
  id: string;
  title: string;
  shortcut: string; // e.g. "/привет", "/доставка"
  category: string;
  content: string;
  tags: string[];
  hotkey?: string; // e.g. "Alt+1"
  isPinned: boolean;
  usageCount: number;
  updatedAt: number;
}

export type ImportSnippetMode = 'merge' | 'replace_category' | 'replace_all';

export interface SnippetCollectionExport {
  format: 'smart-desk-snippet-collection';
  version: number;
  collectionName: string;
  category: string;
  description?: string;
  exportedAt: string;
  count: number;
  snippets: Snippet[];
}

export type PlaceholderType = 'text' | 'choice';

export interface PlaceholderConfig {
  id: string;
  key: string; // e.g. "имя_клиента", "служба_доставки"
  label: string; // e.g. "Служба доставки"
  description: string;
  type: PlaceholderType; // 'text' or 'choice' (multiple choice)
  options?: string[]; // for multiple choice
  defaultValue: string;
  excelColumnBinding?: string; // linked to Excel column name
}

export interface ExcelColumn {
  id: string;
  name: string;
  key: string;
}

export interface ExcelRow {
  id: string;
  tags: string[]; // теги для быстрого поиска и фильтрации
  data: Record<string, string>;
  notes?: string;
}

export interface ExcelTable {
  id: string;
  name: string;
  description: string;
  columns: ExcelColumn[];
  rows: ExcelRow[];
  updatedAt: number;
}

export type AppTheme = 'dark-slate' | 'obsidian' | 'light-minimal' | 'cyber-espresso';
export type AccentColor = 'indigo' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';
export type InterfaceDensity = 'compact' | 'comfortable' | 'spacious';
export type FontSizeScale = 'sm' | 'base' | 'lg';
export type WindowMode = 'full' | 'mini-bar';
export type ActiveTab = 'snippets' | 'placeholders' | 'resources' | 'notes';

export interface CustomIcon {
  id: string;
  name: string;
  dataUrl: string; // SVG or image data URL or SVG markup
  createdAt: number;
}

export type NoteCardColor = 'slate' | 'amber' | 'blue' | 'emerald' | 'rose' | 'purple';

export interface NoteChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface NoteCard {
  id: string;
  title: string;
  content: string;
  category: string;
  color: NoteCardColor;
  isPinned: boolean;
  tags: string[];
  checklist?: NoteChecklistItem[];
  createdAt: number;
  updatedAt: number;
}

export type WidgetType = 'iframe' | 'link';

export type WidgetIconType = 
  | 'globe' 
  | 'truck' 
  | 'map-pin' 
  | 'book-open' 
  | 'calculator' 
  | 'package' 
  | 'message-square' 
  | 'headphones' 
  | 'file-text' 
  | 'shield-check' 
  | 'sparkles' 
  | 'search' 
  | 'database' 
  | 'layers'
  | (string & {});

export interface ResourceWidget {
  id: string;
  title: string;
  url: string;
  type: WidgetType; // 'iframe' or 'link'
  category: string; // 'Логистика и трекинг' | 'Карты и гео' | 'Базы знаний' | 'Утилиты' | 'CRM и системы';
  description?: string;
  tags: string[];
  isPinned?: boolean;
  notes?: string;
  icon?: WidgetIconType;
  iconColor?: string; // e.g. 'sky' | 'emerald' | 'amber' | 'purple' | 'rose' | 'blue'
  iframeHeight?: number; // Height in pixels for adjustable iframes (e.g. 280, 420, 600)
  iframeWidth?: 'full' | 'half'; // Grid span
  isCollapsed?: boolean;
  createdAt: number;
}

export interface GuiSettings {
  theme: AppTheme;
  accentColor: AccentColor;
  density: InterfaceDensity;
  fontSize: FontSizeScale;
  windowMode: WindowMode;
  soundEffects: boolean;
  autoCopyOnSelect: boolean;
  offlineModeForced: boolean;
  agentName: string;
  sidebarWidth?: number; // Resizable snippet panel width in px
  composerHeight?: number; // Resizable template composer input height in px
  autoCheckUpdates?: boolean;
  resourceColumns?: number; // 1, 2, 3, 4
  resourceSort?: 'custom' | 'name' | 'date' | 'pinned';
  notesColumns?: number; // 1, 2, 3, 4
  notesSort?: 'custom' | 'updated' | 'created' | 'title';
}

export interface ProductivityMetrics {
  snippetsUsedCount: number;
  wordsSaved: number;
  keystrokesSaved: number;
  timeSavedSeconds: number;
  sessionStartTime: number;
}

export interface CopyHistoryItem {
  id: string;
  snippetId?: string;
  title: string;
  category?: string;
  text: string;
  copiedAt: number;
}

export interface LogicBlockInfo {
  raw: string;
  condition: string;
  variableKey: string;
  operator: 'exists' | 'not_exists' | 'equals' | 'not_equals';
  expectedValue?: string;
  ifTrue: string;
  ifFalse?: string;
  isMatched?: boolean;
}

export interface FullBackupPayload {
  format: 'quickreply-desk-full-backup';
  version: string;
  exportedAt: string;
  snippets: Snippet[];
  categories: string[];
  placeholders: PlaceholderConfig[];
  tables: ExcelTable[];
  widgets: ResourceWidget[];
  resourceCategories: string[];
  notes: NoteCard[];
  notesScratchpad?: string;
  categoryMetadata?: Record<string, CategoryMetadata>;
  customIcons?: CustomIcon[];
  hiddenIconIds?: string[];
  settings: GuiSettings;
  metrics: ProductivityMetrics;
  copyHistory?: CopyHistoryItem[];
}

export interface AutoBackupPoint {
  id: string;
  createdAt: number;
  reason: string;
  counts: {
    snippets: number;
    tables: number;
    placeholders: number;
    notes: number;
    widgets: number;
  };
  data: {
    snippets: Snippet[];
    placeholders: PlaceholderConfig[];
    tables: ExcelTable[];
    widgets: ResourceWidget[];
    notes: NoteCard[];
    categories: string[];
    settings?: GuiSettings;
  };
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  toggleAlwaysOnTop: () => Promise<boolean>;
  getAlwaysOnTop: () => Promise<boolean>;
  getAppVersion: () => Promise<string>;
  checkForUpdates?: () => Promise<{
    hasUpdate?: boolean;
    latestVersion?: string;
    releaseNotes?: string;
    buildDate?: string;
    title?: string;
    downloadUrl?: string;
    exeUrl?: string;
  } | null>;
  applyUpdateAndReload?: () => Promise<void>;
  copyToClipboard?: (text: string) => Promise<boolean>;
  openExternalUrl?: (url: string) => Promise<boolean>;
  downloadUpdateExe?: (opts: { url: string; fileName?: string }) => Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }>;
  installUpdateExe?: (filePath: string) => Promise<boolean>;
  installUpdateAndRestart?: (installerPath: string) => Promise<boolean>;
  openDownloadedFolder?: (filePath: string) => Promise<boolean>;
  onDownloadProgress?: (callback: (progress: { received: number; total: number; percent: number }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

