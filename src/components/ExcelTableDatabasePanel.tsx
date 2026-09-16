import React, { useState, useMemo, useRef } from 'react';
import { 
  Table as TableIcon, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Plus, 
  Search, 
  Tag, 
  Check, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  ChevronDown,
  Layers,
  ArrowUpDown,
  FileText,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  X
} from 'lucide-react';
import { ExcelTable, ExcelRow, ExcelColumn, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { parseExcelOrCsvFile, exportTableToXlsx, exportTableToCsv } from '../utils/excel';
import { soundService } from '../utils/sound';
import { DEFAULT_EXCEL_TABLES } from '../data/defaultData';

interface ExcelTableDatabasePanelProps {
  tables: ExcelTable[];
  activeTableId: string;
  onSelectTable: (id: string) => void;
  onUpdateTable: (table: ExcelTable) => void;
  onCreateTable: (table: ExcelTable) => void;
  onDeleteTable: (id: string) => void;
  activeRow: ExcelRow | null;
  onSelectActiveRow: (row: ExcelRow | null) => void;
  settings: GuiSettings;
}

export const ExcelTableDatabasePanel: React.FC<ExcelTableDatabasePanelProps> = ({
  tables,
  activeTableId,
  onSelectTable,
  onUpdateTable,
  onCreateTable,
  onDeleteTable,
  activeRow,
  onSelectActiveRow,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [newRowTags, setNewRowTags] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Table deletion & creation modals
  const [isDeleteTableModalOpen, setIsDeleteTableModalOpen] = useState(false);
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [createTableError, setCreateTableError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableColsInput, setNewTableColsInput] = useState('Номер заказа, Клиент, Служба доставки, Статус, Город');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  const currentTable = useMemo(() => {
    return tables.find((t) => t.id === activeTableId) || tables[0] || null;
  }, [tables, activeTableId]);

  // Extract all tags from current table
  const allTableTags = useMemo(() => {
    if (!currentTable) return [];
    const set = new Set<string>();
    currentTable.rows.forEach((r) => r.tags.forEach((t) => set.add(t.toLowerCase())));
    return Array.from(set);
  }, [currentTable]);

  // Filter rows by search and tag
  const filteredRows = useMemo(() => {
    if (!currentTable) return [];
    const q = searchQuery.toLowerCase().trim();

    return currentTable.rows.filter((row) => {
      const matchesTag = !selectedTag || row.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
      if (!matchesTag) return false;

      if (!q) return true;
      // Search in tags
      if (row.tags.some((t) => t.toLowerCase().includes(q))) return true;
      // Search in data values
      for (const val of Object.values(row.data)) {
        if (String(val).toLowerCase().includes(q)) return true;
      }
      if (row.notes && row.notes.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [currentTable, searchQuery, selectedTag]);

  // Handle Excel/CSV file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const parsed = await parseExcelOrCsvFile(file);
      const newTable: ExcelTable = {
        id: 'table-' + Date.now(),
        name: parsed.name,
        description: `Импортировано из файла ${file.name} (${parsed.rows.length} строк)`,
        columns: parsed.columns,
        rows: parsed.rows,
        updatedAt: Date.now(),
      };
      onCreateTable(newTable);
      onSelectTable(newTable.id);
      setImportError(null);
      soundService.playCopyChime(settings.soundEffects);
    } catch (err) {
      setImportError('Ошибка при чтении файла Excel/CSV: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add new row
  const handleSaveNewRow = () => {
    if (!currentTable) return;
    const tags = newRowTags
      .split(/[,;\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const newRow: ExcelRow = {
      id: 'row-' + Date.now(),
      tags,
      data: newRowData,
    };

    const updatedTable: ExcelTable = {
      ...currentTable,
      rows: [newRow, ...currentTable.rows],
      updatedAt: Date.now(),
    };

    onUpdateTable(updatedTable);
    setIsAddingRow(false);
    setNewRowData({});
    setNewRowTags('');
    soundService.playClick(settings.soundEffects);
  };

  const handleDeleteRow = (rowId: string) => {
    if (!currentTable) return;
    const updatedTable: ExcelTable = {
      ...currentTable,
      rows: currentTable.rows.filter((r) => r.id !== rowId),
      updatedAt: Date.now(),
    };
    onUpdateTable(updatedTable);
    if (activeRow?.id === rowId) {
      onSelectActiveRow(null);
    }
  };

  // Delete current table handler
  const handleConfirmDeleteTable = () => {
    if (!currentTable) return;
    onDeleteTable(currentTable.id);
    setIsDeleteTableModalOpen(false);
    soundService.playClick(settings.soundEffects);
  };

  // Create manual table
  const handleCreateCustomTable = () => {
    const name = newTableName.trim() || `Таблица ${tables.length + 1}`;
    const cols = newTableColsInput
      .split(/[,;]+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cols.length === 0) {
      setCreateTableError('Укажите хотя бы одну колонку для таблицы');
      return;
    }

    const columns: ExcelColumn[] = cols.map((col, idx) => ({
      id: `col-${Date.now()}-${idx}`,
      name: col,
      key: col,
    }));

    const newTable: ExcelTable = {
      id: 'table-' + Date.now(),
      name,
      description: 'Пользовательская таблица базы данных',
      columns,
      rows: [],
      updatedAt: Date.now(),
    };

    onCreateTable(newTable);
    onSelectTable(newTable.id);
    setIsCreateTableModalOpen(false);
    setNewTableName('');
    soundService.playCopyChime(settings.soundEffects);
  };

  // Restore default demo tables if empty
  const handleRestoreDefaults = () => {
    DEFAULT_EXCEL_TABLES.forEach((tbl) => onCreateTable(tbl));
    onSelectTable(DEFAULT_EXCEL_TABLES[0].id);
    soundService.playCopyChime(settings.soundEffects);
  };

  if (!currentTable || tables.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-8 text-center ${theme.panel}`}>
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-slate-400">
          <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="font-bold text-base text-slate-100">В базе данных нет таблиц Excel</h3>
        <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
          Все таблицы были удалены. Вы можете загрузить свой файл Excel (.xlsx, .csv), создать новую пустую таблицу с произвольными колонками или восстановить стандартную демонстрационную базу.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm ${accent.primary}`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Импортировать Excel / CSV</span>
          </button>

          <button
            onClick={() => setIsCreateTableModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Создать новую таблицу</span>
          </button>

          <button
            onClick={handleRestoreDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Восстановить демо-таблицу</span>
          </button>
        </div>

        {/* Create Table Modal when empty */}
        {isCreateTableModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden p-4 ${theme.panel} ${theme.border} text-left`}>
              <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-800">
                <span className="font-bold text-sm text-slate-100">Создание новой Excel-таблицы</span>
                <button onClick={() => setIsCreateTableModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Название таблицы *</label>
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="Например: Заказы Wildberries или Клиенты B2B"
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Колонки таблицы (через запятую) *
                  </label>
                  <textarea
                    value={newTableColsInput}
                    onChange={(e) => setNewTableColsInput(e.target.value)}
                    rows={3}
                    placeholder="Номер заказа, Клиент, Служба доставки, Статус, Город, Телефон"
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Позже эти колонки можно будет привязать к плейсхолдерам шаблонов
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setIsCreateTableModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateCustomTable}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs ${accent.primary}`}
                >
                  Создать таблицу
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${theme.panel} overflow-hidden text-xs select-none`}>
      {/* Top Controls: Table Switcher, Table Deletion, & File Operations */}
      <div className={`p-2.5 border-b ${theme.border} ${theme.panelHeader} flex flex-wrap items-center justify-between gap-2 shrink-0`}>
        {/* Table Selector + Management Buttons */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Таблица:
          </span>
          
          <div className="relative flex-1 max-w-sm">
            <select
              value={currentTable.id}
              onChange={(e) => onSelectTable(e.target.value)}
              className={`w-full appearance-none pl-2.5 pr-6 py-1 rounded text-xs font-semibold border transition-colors outline-none cursor-pointer truncate ${theme.input}`}
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.rows.length} строк)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          </div>

          {/* Create New Table Button */}
          <button
            onClick={() => setIsCreateTableModalOpen(true)}
            className="p-1.5 rounded border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 shrink-0 transition-colors"
            title="Создать новую таблицу в базе данных"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* Delete Current Table Button */}
          <button
            onClick={() => setIsDeleteTableModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[11px] font-medium shrink-0 transition-colors"
            title={`Удалить таблицу «${currentTable.name}» из базы данных`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Удалить таблицу</span>
          </button>
        </div>

        {/* Buttons: Import / Export / Add Row */}
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${theme.panelSubtle} hover:border-slate-500 text-slate-200`}
            title="Импортировать файл .xlsx или .csv"
          >
            <Upload className="w-3 h-3 text-emerald-400" />
            <span>Импорт Excel</span>
          </button>

          <button
            onClick={() => exportTableToXlsx(currentTable)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${theme.panelSubtle} hover:border-slate-500 text-slate-300`}
            title="Экспортировать текущую таблицу в Excel (.xlsx)"
          >
            <Download className="w-3 h-3 text-sky-400" />
            <span className="hidden sm:inline">Экспорт XLSX</span>
          </button>

          <button
            onClick={() => exportTableToCsv(currentTable)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${theme.panelSubtle} hover:border-slate-500 text-slate-300`}
            title="Экспортировать в CSV (UTF-8)"
          >
            <FileText className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={() => setIsAddingRow(true)}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold shadow-sm ${accent.primary}`}
            title="Добавить новую строку в таблицу"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новая строка</span>
          </button>
        </div>
      </div>

      {/* Filter Strip: Tag Pills & Search */}
      <div className={`p-2 border-b ${theme.border} ${theme.panelSubtle} flex flex-wrap items-center justify-between gap-2 shrink-0`}>
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по колонкам, значениям, тегам..."
            className={`w-full pl-8 pr-3 py-1 rounded text-xs border outline-none ${theme.input}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Tag Filters Strip */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] flex-1">
          <span className="text-slate-400 flex items-center gap-1 opacity-70 shrink-0 text-[10px] uppercase font-bold">
            <Tag className="w-3 h-3 text-sky-400" /> Теги:
          </span>
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 text-[10px]"
            >
              Сброс ({selectedTag}) ×
            </button>
          )}
          {allTableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors shrink-0 ${
                selectedTag === tag
                  ? `${accent.primaryMuted} font-bold ring-1 ring-sky-400/50`
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Active Row Selection Feedback */}
        {activeRow ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] shrink-0 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Данные строки привязаны к плейсхолдерам</span>
            <button
              onClick={() => onSelectActiveRow(null)}
              className="ml-1 opacity-60 hover:opacity-100 text-xs"
              title="Отвязать строку"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 italic shrink-0">
            Кликните по строке, чтобы подставить её значения в шаблоны
          </div>
        )}
      </div>

      {/* Add Row Drawer Form */}
      {isAddingRow && (
        <div className={`p-3 border-b ${theme.border} ${theme.panelHeader} animate-slide-down shrink-0`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs text-slate-100">Добавление новой записи в таблицу</span>
            <button
              onClick={() => setIsAddingRow(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
            {currentTable.columns.map((col) => (
              <div key={col.id}>
                <label className="block text-[10px] font-medium text-slate-300 mb-0.5 truncate">
                  {col.name}
                </label>
                <input
                  type="text"
                  value={newRowData[col.name] || ''}
                  onChange={(e) =>
                    setNewRowData({ ...newRowData, [col.name]: e.target.value })
                  }
                  placeholder={col.name}
                  className={`w-full p-1.5 rounded border text-xs outline-none ${theme.input}`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-slate-300 mb-0.5">
                Теги строки (через запятую или пробел, например: <span className="font-mono text-sky-300">срочно, сдэк, возврат</span>)
              </label>
              <input
                type="text"
                value={newRowTags}
                onChange={(e) => setNewRowTags(e.target.value)}
                placeholder="срочно, возврат, мск"
                className={`w-full p-1.5 rounded border text-xs outline-none ${theme.input}`}
              />
            </div>

            <button
              onClick={handleSaveNewRow}
              className={`mt-4 px-4 py-1.5 rounded font-semibold text-xs ${accent.primary}`}
            >
              Сохранить строку
            </button>
          </div>
        </div>
      )}

      {/* Excel Spreadsheet Table Grid */}
      <div className="flex-1 overflow-auto border-t border-slate-800">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className={`sticky top-0 z-10 ${theme.panelHeader} border-b ${theme.border}`}>
            <tr>
              <th className="p-2.5 font-bold text-[10px] uppercase text-slate-400 border-r border-slate-800 w-12 text-center">
                #
              </th>
              <th className="p-2.5 font-bold text-[10px] uppercase text-slate-400 border-r border-slate-800 w-48">
                Теги строки
              </th>
              {currentTable.columns.map((col) => (
                <th
                  key={col.id}
                  className="p-2.5 font-bold text-[10px] uppercase text-slate-300 border-r border-slate-800 min-w-[130px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{col.name}</span>
                    <span className="text-[9px] font-mono opacity-40">{"{{" + col.name + "}}"}</span>
                  </div>
                </th>
              ))}
              <th className="p-2.5 font-bold text-[10px] uppercase text-slate-400 w-16 text-center">
                Действия
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 font-sans text-[11.5px]">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={currentTable.columns.length + 3}
                  className="p-8 text-center text-slate-400 italic"
                >
                  Строк не найдено по заданному фильтру.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const isRowActive = activeRow?.id === row.id;

                return (
                  <tr
                    key={row.id}
                    onClick={() => {
                      onSelectActiveRow(isRowActive ? null : row);
                      soundService.playClick(settings.soundEffects);
                    }}
                    className={`cursor-pointer transition-colors group ${
                      isRowActive
                        ? 'bg-emerald-950/40 border-l-4 border-l-emerald-500 font-medium'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Index / Active Marker */}
                    <td className="p-2 border-r border-slate-800/80 text-center font-mono text-[10px] text-slate-500">
                      {isRowActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                      ) : (
                        idx + 1
                      )}
                    </td>

                    {/* Tags column */}
                    <td className="p-2 border-r border-slate-800/80">
                      <div className="flex flex-wrap gap-1">
                        {row.tags.map((t) => (
                          <span
                            key={t}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(t);
                            }}
                            className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[9.5px] border border-slate-700/60"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Data Columns */}
                    {currentTable.columns.map((col) => {
                      const val = row.data[col.name] || '—';
                      return (
                        <td
                          key={col.id}
                          className="p-2 border-r border-slate-800/80 text-slate-200 truncate max-w-[200px]"
                          title={val}
                        >
                          {val}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td className="p-2 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Удалить эту строку из таблицы?')) {
                            handleDeleteRow(row.id);
                          }
                        }}
                        className="p-1 rounded opacity-30 group-hover:opacity-100 hover:text-rose-400 text-slate-400 transition-opacity"
                        title="Удалить строку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info Bar */}
      <div className={`p-2 border-t ${theme.border} ${theme.panelHeader} flex items-center justify-between text-[11px] text-slate-400 shrink-0`}>
        <div className="flex items-center gap-2">
          <span>Всего записей: <strong className="text-slate-200">{filteredRows.length}</strong> из {currentTable.rows.length}</span>
          <span>•</span>
          <span className="text-emerald-400">Форматы импорта: .xlsx, .csv (с колонкой тегов)</span>
        </div>
        <div className="flex items-center gap-2">
          {activeRow && (
            <span className="text-emerald-300 font-mono text-[10.5px]">
              Активно: {Object.values(activeRow.data)[0] || 'Строка выбрана'}
            </span>
          )}
        </div>
      </div>

      {/* Modal: Confirm Table Deletion */}
      {isDeleteTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl p-5 ${theme.panel} ${theme.border}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-slate-100 mb-1">
                  Удалить таблицу из базы данных?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Вы собираетесь безвозвратно удалить таблицу <strong className="text-rose-300">«{currentTable.name}»</strong>.
                </p>
                <div className="mt-2.5 p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>Количество строк: <strong className="text-slate-200">{currentTable.rows.length}</strong></div>
                  <div>Колонки: <span className="text-slate-300">{currentTable.columns.map(c => c.name).join(', ')}</span></div>
                </div>
                <p className="text-[11px] text-rose-400/90 mt-2">
                  Это действие невозможно отменить. Все строки и привязанные данные будут удалены.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsDeleteTableModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDeleteTable}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить таблицу из БД</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Table */}
      {isCreateTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl p-5 ${theme.panel} ${theme.border}`}>
            <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-800">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Создание новой таблицы в БД
              </span>
              <button onClick={() => setIsCreateTableModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createTableError && (
              <div className="mb-3 p-2 rounded bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{createTableError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Название таблицы *
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Например: Заказы Wildberries или Возвраты Ozon"
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Колонки таблицы (через запятую) *
                </label>
                <textarea
                  value={newTableColsInput}
                  onChange={(e) => setNewTableColsInput(e.target.value)}
                  rows={3}
                  placeholder="Номер заказа, Клиент, Служба доставки, Статус, Город, Телефон"
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Эти названия колонок можно будет привязывать к плейсхолдерам в шаблонах
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreateTableModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateCustomTable}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs ${accent.primary}`}
              >
                Создать таблицу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
