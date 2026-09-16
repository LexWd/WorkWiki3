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
  Copy, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Columns2, 
  ChevronDown,
  FileText,
  AlertTriangle,
  AlertCircle,
  X,
  SlidersHorizontal,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { ExcelTable, ExcelRow, ExcelColumn, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { parseExcelOrCsvFile, exportTableToXlsx, exportTableToCsv } from '../utils/excel';
import { soundService } from '../utils/sound';

interface ExcelTableDatabasePanelProps {
  tables: ExcelTable[];
  activeTableId: string;
  onSelectTable: (id: string) => void;
  onUpdateTable: (table: ExcelTable) => void;
  onCreateTable: (table: ExcelTable) => void;
  onDeleteTable: (id: string) => void;
  activeRow?: ExcelRow | null;
  onSelectActiveRow?: (row: ExcelRow | null) => void;
  settings: GuiSettings;
  onToastNotice?: (title: string, message: string) => void;
}

type ViewMode = 'table' | 'charts' | 'split';
type ChartType = 'bar' | 'donut' | 'line';
type MetricType = 'count' | 'sum' | 'avg';

const CHART_PALETTE = [
  { fill: '#38bdf8', stroke: '#0284c7', text: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-500/40' }, // Sky
  { fill: '#34d399', stroke: '#059669', text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' }, // Emerald
  { fill: '#fbbf24', stroke: '#d97706', text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40' }, // Amber
  { fill: '#a78bfa', stroke: '#7c3aed', text: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/40' }, // Violet
  { fill: '#f472b6', stroke: '#db2777', text: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500/40' }, // Pink
  { fill: '#22d3ee', stroke: '#0891b2', text: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40' }, // Cyan
  { fill: '#fb923c', stroke: '#ea580c', text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40' }, // Orange
  { fill: '#818cf8', stroke: '#4f46e5', text: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/40' }, // Indigo
  { fill: '#e879f9', stroke: '#c026d3', text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/40' }, // Fuchsia
  { fill: '#a3e635', stroke: '#65a30d', text: 'text-lime-400', bg: 'bg-lime-500/20', border: 'border-lime-500/40' }, // Lime
];

export const ExcelTableDatabasePanel: React.FC<ExcelTableDatabasePanelProps> = ({
  tables,
  activeTableId,
  onSelectTable,
  onUpdateTable,
  onCreateTable,
  onDeleteTable,
  settings,
  onToastNotice,
}) => {
  // View mode: 'table' | 'charts' | 'split'
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [groupByCol, setGroupByCol] = useState<string>('');
  const [metricType, setMetricType] = useState<MetricType>('count');
  const [numericCol, setNumericCol] = useState<string>('');
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [newRowTags, setNewRowTags] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Table creation & deletion modals
  const [isDeleteTableModalOpen, setIsDeleteTableModalOpen] = useState(false);
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [createTableError, setCreateTableError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableColsInput, setNewTableColsInput] = useState('Номер заказа, Клиент, Служба доставки, Статус, Город, Сумма');

  // Quick-Copy state: tracks which cell/row was just copied for visual feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  // Detect numeric and categorical columns
  const { categoricalCols, numericCols } = useMemo(() => {
    if (!currentTable || currentTable.columns.length === 0) {
      return { categoricalCols: [], numericCols: [] };
    }

    const numCols: string[] = [];
    const catCols: string[] = [];

    currentTable.columns.forEach((col) => {
      let isNumeric = true;
      let sampleCount = 0;

      for (const row of currentTable.rows.slice(0, 30)) {
        const val = row.data[col.name];
        if (val !== undefined && val !== null && val.trim() !== '') {
          sampleCount++;
          const cleanVal = val.replace(/[\s₽$€]/g, '').replace(',', '.');
          if (isNaN(Number(cleanVal))) {
            isNumeric = false;
            break;
          }
        }
      }

      if (isNumeric && sampleCount > 0) {
        numCols.push(col.name);
      }
      catCols.push(col.name);
    });

    return { categoricalCols: catCols, numericCols: numCols };
  }, [currentTable]);

  // Default selected grouping column if not set or invalid
  const effectiveGroupByCol = useMemo(() => {
    if (groupByCol && categoricalCols.includes(groupByCol)) {
      return groupByCol;
    }
    // Prefer columns named "Статус", "Служба доставки", "Город", etc.
    const priority = ['статус', 'служба доставки', 'город', 'категория', 'тип', 'клиент'];
    for (const p of priority) {
      const match = categoricalCols.find((c) => c.toLowerCase().includes(p));
      if (match) return match;
    }
    return categoricalCols[0] || '';
  }, [groupByCol, categoricalCols]);

  // Default numeric column
  const effectiveNumericCol = useMemo(() => {
    if (numericCol && numericCols.includes(numericCol)) {
      return numericCol;
    }
    return numericCols[0] || '';
  }, [numericCol, numericCols]);

  // Filter rows by search and tag
  const filteredRows = useMemo(() => {
    if (!currentTable) return [];
    const q = searchQuery.toLowerCase().trim();

    return currentTable.rows.filter((row) => {
      const matchesTag = !selectedTag || row.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
      if (!matchesTag) return false;

      if (!q) return true;
      if (row.tags.some((t) => t.toLowerCase().includes(q))) return true;
      for (const val of Object.values(row.data)) {
        if (String(val).toLowerCase().includes(q)) return true;
      }
      if (row.notes && row.notes.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [currentTable, searchQuery, selectedTag]);

  // Compute aggregated Chart Data based on filteredRows
  const chartData = useMemo(() => {
    if (!currentTable || filteredRows.length === 0 || !effectiveGroupByCol) {
      return [];
    }

    const groupMap = new Map<string, { count: number; sum: number; values: number[] }>();

    filteredRows.forEach((row) => {
      const rawCat = row.data[effectiveGroupByCol];
      const category = (rawCat !== undefined && rawCat !== null && rawCat.trim() !== '') 
        ? rawCat.trim() 
        : 'Не указано';

      let numVal = 0;
      if (effectiveNumericCol && row.data[effectiveNumericCol]) {
        const clean = String(row.data[effectiveNumericCol]).replace(/[\s₽$€]/g, '').replace(',', '.');
        const parsed = parseFloat(clean);
        if (!isNaN(parsed)) numVal = parsed;
      }

      const existing = groupMap.get(category) || { count: 0, sum: 0, values: [] };
      existing.count += 1;
      existing.sum += numVal;
      existing.values.push(numVal);
      groupMap.set(category, existing);
    });

    const totalRows = filteredRows.length;
    let grandTotalMetric = 0;

    const list = Array.from(groupMap.entries()).map(([label, stats], idx) => {
      let metricValue = stats.count;
      if (metricType === 'sum') {
        metricValue = Math.round(stats.sum * 100) / 100;
      } else if (metricType === 'avg') {
        metricValue = stats.count > 0 ? Math.round((stats.sum / stats.count) * 100) / 100 : 0;
      }
      grandTotalMetric += metricValue;

      const palette = CHART_PALETTE[idx % CHART_PALETTE.length];
      return {
        label,
        count: stats.count,
        sum: stats.sum,
        avg: stats.count > 0 ? Math.round((stats.sum / stats.count) * 100) / 100 : 0,
        metricValue,
        palette,
      };
    });

    // Sort descending by metric value
    list.sort((a, b) => b.metricValue - a.metricValue);

    // Calculate percentages
    return list.map((item) => ({
      ...item,
      percentage: grandTotalMetric > 0 ? Math.round((item.metricValue / grandTotalMetric) * 100) : 0,
      rowPercent: totalRows > 0 ? Math.round((item.count / totalRows) * 100) : 0,
    }));
  }, [currentTable, filteredRows, effectiveGroupByCol, metricType, effectiveNumericCol]);

  // KPI summary metrics
  const kpiMetrics = useMemo(() => {
    if (!currentTable || chartData.length === 0) {
      return {
        totalRows: 0,
        distinctCategories: 0,
        topCategory: '—',
        topPercent: 0,
        numericSum: 0,
      };
    }

    const totalRows = filteredRows.length;
    const distinctCategories = chartData.length;
    const top = chartData[0];
    const numericSum = chartData.reduce((acc, curr) => acc + curr.sum, 0);

    return {
      totalRows,
      distinctCategories,
      topCategory: top ? top.label : '—',
      topPercent: top ? (metricType === 'count' ? top.rowPercent : top.percentage) : 0,
      numericSum: Math.round(numericSum * 100) / 100,
    };
  }, [currentTable, filteredRows.length, chartData, metricType]);

  // Quick Copy Handler for individual cell
  const handleQuickCopyCell = (value: string, key: string, label?: string) => {
    if (!value || value === '—') return;
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    soundService.playCopyChime(settings.soundEffects);
    if (onToastNotice) {
      onToastNotice('Значение скопировано', label ? `${label}: «${value}»` : `«${value}»`);
    }
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1400);
  };

  // Quick Copy Handler for entire row
  const handleQuickCopyRow = (row: ExcelRow, idx: number) => {
    if (!currentTable) return;
    const parts: string[] = [];
    currentTable.columns.forEach((col) => {
      const val = row.data[col.name];
      if (val) parts.push(`${col.name}: ${val}`);
    });
    const text = parts.join(' | ');
    navigator.clipboard.writeText(text);
    const key = `row-${row.id}`;
    setCopiedKey(key);
    soundService.playCopyChime(settings.soundEffects);
    if (onToastNotice) {
      onToastNotice('Строка скопирована', `Строка #${idx + 1} скопирована в буфер`);
    }
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1400);
  };

  // Quick Copy Handler for entire column
  const handleQuickCopyColumn = (colName: string) => {
    if (!currentTable) return;
    const values = filteredRows
      .map((r) => r.data[colName])
      .filter((v) => v !== undefined && v !== null && v.trim() !== '');
    const text = values.join('\n');
    navigator.clipboard.writeText(text);
    const key = `col-${colName}`;
    setCopiedKey(key);
    soundService.playCopyChime(settings.soundEffects);
    if (onToastNotice) {
      onToastNotice('Колонка скопирована', `${values.length} значений из «${colName}» скопированы`);
    }
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1400);
  };

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
      if (onToastNotice) {
        onToastNotice('Таблица импортирована', `${newTable.name} (${newTable.rows.length} строк)`);
      }
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
    if (onToastNotice) {
      onToastNotice('Строка добавлена', `Новая запись добавлена в «${currentTable.name}»`);
    }
  };

  const handleDeleteRow = (rowId: string) => {
    if (!currentTable) return;
    const updatedTable: ExcelTable = {
      ...currentTable,
      rows: currentTable.rows.filter((r) => r.id !== rowId),
      updatedAt: Date.now(),
    };
    onUpdateTable(updatedTable);
    if (onToastNotice) {
      onToastNotice('Строка удалена', 'Запись удалена из таблицы');
    }
  };

  // Delete current table handler
  const handleConfirmDeleteTable = () => {
    if (!currentTable) return;
    onDeleteTable(currentTable.id);
    setIsDeleteTableModalOpen(false);
    soundService.playClick(settings.soundEffects);
  };

  // Create custom table handler
  const handleCreateCustomTable = () => {
    const trimmedName = newTableName.trim();
    if (!trimmedName) {
      setCreateTableError('Введите название таблицы');
      return;
    }

    let colNames = newTableColsInput
      .split(/[,;\n]+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (colNames.length === 0) {
      colNames = ['Наименование', 'Значение', 'Статус', 'Примечание'];
    }

    const cols: ExcelColumn[] = colNames.map((name, idx) => ({
      id: `col-${Date.now()}-${idx}`,
      name,
      key: name,
    }));

    const newTable: ExcelTable = {
      id: 'table-' + Date.now(),
      name: trimmedName,
      description: 'Пользовательская таблица базы данных',
      columns: cols,
      rows: [],
      updatedAt: Date.now(),
    };

    onCreateTable(newTable);
    onSelectTable(newTable.id);
    setIsCreateTableModalOpen(false);
    setCreateTableError(null);
    setNewTableName('');
    setNewTableColsInput('');
    soundService.playClick(settings.soundEffects);
    if (onToastNotice) {
      onToastNotice('Таблица создана', `«${trimmedName}» готова к работе`);
    }
  };

  // Max value for scaling bar chart
  const maxMetricVal = Math.max(...chartData.map((d) => d.metricValue), 1);

  return (
    <div className={`flex flex-col h-full ${theme.panel} overflow-hidden text-xs select-none relative`}>
      {/* Hidden File Input for Excel/CSV import - always mounted */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Controls: Table Switcher, View Modes (Table / Charts / Split), Operations */}
      <div className={`p-2.5 border-b ${theme.border} ${theme.panelHeader} flex flex-wrap items-center justify-between gap-2 shrink-0`}>
        {currentTable ? (
          <>
            {/* Table Selector + Management Buttons */}
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Таблица:
              </span>
              
              <div className="relative flex-1 max-w-xs">
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
                type="button"
                onClick={() => setIsCreateTableModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-semibold text-xs shrink-0 transition-colors cursor-pointer"
                title="Создать новую таблицу в базе данных"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Создать таблицу</span>
              </button>

              {/* Import Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs shrink-0 transition-colors cursor-pointer"
                title="Импортировать файл .xlsx или .csv"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isImporting ? 'Импорт...' : 'Импорт из файла'}</span>
              </button>

              {/* Delete Current Table Button */}
              <button
                type="button"
                onClick={() => setIsDeleteTableModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[11px] font-medium shrink-0 transition-colors cursor-pointer"
                title={`Удалить таблицу «${currentTable.name}»`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Удалить</span>
              </button>
            </div>

            {/* View Mode Switcher: Table | Charts | Split */}
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? `${accent.primary} shadow-xs font-bold`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Отображение таблицы данных с быстрым копированием ячеек"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Таблица</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('charts')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'charts'
                    ? `${accent.primary} shadow-xs font-bold`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Графики и визуальная аналитика данных"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Графики</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? `${accent.primary} shadow-xs font-bold`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Разделенный экран: график сверху, таблица снизу"
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Разделенный</span>
              </button>
            </div>

            {/* Operations: Export / Add Row */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => exportTableToXlsx(currentTable)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${theme.panelSubtle} hover:border-slate-500 text-slate-300 cursor-pointer`}
                title="Экспортировать в Excel (.xlsx)"
              >
                <Download className="w-3 h-3 text-sky-400" />
                <span className="hidden sm:inline">XLSX</span>
              </button>

              <button
                type="button"
                onClick={() => exportTableToCsv(currentTable)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${theme.panelSubtle} hover:border-slate-500 text-slate-300 cursor-pointer`}
                title="Экспортировать в CSV"
              >
                <FileText className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddingRow(true)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold shadow-sm ${accent.primary} cursor-pointer`}
                title="Добавить новую строку в таблицу"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Строка</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm text-slate-100">База таблиц Excel</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateTableModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer ${accent.primary}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать таблицу</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isImporting ? 'Загрузка...' : 'Импорт из файла'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Error Notice if any */}
      {importError && (
        <div className="m-2.5 p-2.5 rounded-lg bg-rose-950/90 border border-rose-500/80 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{importError}</span>
          </div>
          <button onClick={() => setImportError(null)} className="text-slate-400 hover:text-white p-0.5 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!currentTable ? (
        <div className={`flex flex-col items-center justify-center flex-1 p-8 text-center select-none ${theme.panel}`}>
          <FileSpreadsheet className="w-16 h-16 text-slate-500 mb-4 opacity-40" />
          <h2 className="text-base font-bold text-slate-200 mb-2">Таблицы базы данных отсутствуют</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            Создайте новую пустую таблицу или импортируйте существующий файл Excel (.xlsx) или .csv с заказами, тарифами или клиентами.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateTableModalOpen(true)}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer ${accent.primary}`}
            >
              <Plus className="w-4 h-4" />
              <span>Создать таблицу</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-bold text-xs border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>{isImporting ? 'Загрузка файла...' : 'Импорт из файла (.xlsx, .csv)'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Strip: Search, Tag Pills, Quick-Copy Prompt */}
          <div className={`p-2 border-b ${theme.border} ${theme.panelSubtle} flex flex-wrap items-center justify-between gap-2 shrink-0`}>
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по строкам, значениям, тегам..."
                className={`w-full pl-8 pr-3 py-1 rounded text-xs border outline-none select-text ${theme.input}`}
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
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition-colors shrink-0 cursor-pointer ${
              selectedTag === null
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Все ({currentTable.rows.length})
          </button>
          {allTableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2 py-0.5 rounded text-[10.5px] font-mono transition-colors shrink-0 cursor-pointer ${
                selectedTag === tag
                  ? 'bg-sky-500 text-white font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-sky-300 border border-slate-700/50'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Quick-copy indicator badge */}
        <div className="hidden lg:flex items-center gap-1 text-[10.5px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
          <Copy className="w-3 h-3 text-sky-400" />
          <span>Клик по любой ячейке копирует значение</span>
        </div>
      </div>

      {/* Inline Row Adding Form */}
      {isAddingRow && (
        <div className={`p-3 border-b ${theme.border} bg-slate-900/90 shrink-0 animate-fade-in`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              Добавление строки в таблицу «{currentTable.name}»
            </span>
            <button
              onClick={() => setIsAddingRow(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
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
                  className={`w-full p-1.5 rounded border text-xs outline-none select-text ${theme.input}`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-slate-300 mb-0.5">
                Теги строки (например: <span className="font-mono text-sky-300">срочно, сдэк, возврат</span>)
              </label>
              <input
                type="text"
                value={newRowTags}
                onChange={(e) => setNewRowTags(e.target.value)}
                placeholder="срочно, возврат, мск"
                className={`w-full p-1.5 rounded border text-xs outline-none select-text ${theme.input}`}
              />
            </div>

            <button
              onClick={handleSaveNewRow}
              className={`mt-4 px-4 py-1.5 rounded font-semibold text-xs cursor-pointer ${accent.primary}`}
            >
              Сохранить строку
            </button>
          </div>
        </div>
      )}

      {/* Error Banners */}
      {importError && (
        <div className="p-2.5 bg-rose-950/80 border-b border-rose-500/80 text-rose-200 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{importError}</span>
          </div>
          <button onClick={() => setImportError(null)} className="text-rose-300 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area: depends on viewMode ('table' | 'charts' | 'split') */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* CHARTS VIEW / SECTION (rendered in 'charts' or 'split' mode) */}
        {(viewMode === 'charts' || viewMode === 'split') && (
          <div className={`flex flex-col ${viewMode === 'split' ? 'h-1/2 border-b border-slate-800' : 'flex-1'} overflow-y-auto p-3.5 space-y-3 bg-slate-950/40`}>
            {/* Chart Control Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Group By Column Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px] font-semibold uppercase">Группировка:</span>
                  <select
                    value={effectiveGroupByCol}
                    onChange={(e) => setGroupByCol(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-100 rounded px-2.5 py-1 text-xs outline-none font-medium cursor-pointer"
                  >
                    {categoricalCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Metric Type Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px] font-semibold uppercase">Метрика:</span>
                  <select
                    value={metricType}
                    onChange={(e) => setMetricType(e.target.value as MetricType)}
                    className="bg-slate-950 border border-slate-700 text-slate-100 rounded px-2.5 py-1 text-xs outline-none font-medium cursor-pointer"
                  >
                    <option value="count">Количество записей (Строк)</option>
                    {numericCols.length > 0 && (
                      <>
                        <option value="sum">Сумма значений по колонке</option>
                        <option value="avg">Среднее значение по колонке</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Numeric Column Selector (if sum or avg selected) */}
                {(metricType === 'sum' || metricType === 'avg') && numericCols.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px]">Колонка сумм:</span>
                    <select
                      value={effectiveNumericCol}
                      onChange={(e) => setNumericCol(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-emerald-300 rounded px-2.5 py-1 text-xs outline-none font-medium cursor-pointer"
                    >
                      {numericCols.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Chart Type Toggle: Bar | Donut | Line */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`p-1 rounded transition-colors ${
                    chartType === 'bar' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Столбчатая диаграмма"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('donut')}
                  className={`p-1 rounded transition-colors ${
                    chartType === 'donut' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Круговая диаграмма (Донат)"
                >
                  <PieChart className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`p-1 rounded transition-colors ${
                    chartType === 'line' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Линейный график тренда"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Всего записей</span>
                <span className="text-xl font-black text-slate-100 font-mono mt-0.5">
                  {kpiMetrics.totalRows}
                </span>
                <span className="text-[10px] text-slate-500">в текущей таблице</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Групп в «{effectiveGroupByCol}»</span>
                <span className="text-xl font-black text-sky-400 font-mono mt-0.5">
                  {kpiMetrics.distinctCategories}
                </span>
                <span className="text-[10px] text-slate-500">уникальных значений</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Лидер выборки</span>
                <span className="text-sm font-bold text-emerald-300 truncate mt-0.5" title={kpiMetrics.topCategory}>
                  {kpiMetrics.topCategory}
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono">{kpiMetrics.topPercent}% от общего объема</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {metricType === 'count' ? 'Статус фильтра' : `Итог по «${effectiveNumericCol}»`}
                </span>
                <span className="text-base font-bold text-amber-300 font-mono mt-0.5 truncate">
                  {metricType === 'count' 
                    ? (selectedTag ? `#${selectedTag}` : 'Все данные') 
                    : kpiMetrics.numericSum.toLocaleString('ru-RU')}
                </span>
                <span className="text-[10px] text-slate-500">
                  {metricType === 'count' ? 'активный фильтр' : 'суммарный показатель'}
                </span>
              </div>
            </div>

            {/* Interactive Charts Canvas Area */}
            {chartData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic">
                Нет данных для построения графиков по выбранной колонке.
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-4">
                {/* 1. BAR CHART */}
                {chartType === 'bar' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                      <span>Категория («{effectiveGroupByCol}»)</span>
                      <span>{metricType === 'count' ? 'Количество / Доля' : `Значение (${metricType.toUpperCase()}) / Доля`}</span>
                    </div>

                    {chartData.map((item, idx) => {
                      const widthPercent = Math.max(3, Math.round((item.metricValue / maxMetricVal) * 100));
                      return (
                        <div 
                          key={item.label}
                          className="group p-2 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 transition-colors"
                          onMouseEnter={() => setHoveredSlice(idx)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        >
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: item.palette.fill }}
                              />
                              <span className="font-semibold text-slate-200 truncate" title={item.label}>
                                {item.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                              <span className="font-bold text-slate-100">
                                {item.metricValue.toLocaleString('ru-RU')}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-sky-300 border border-slate-700">
                                {item.percentage}%
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar with smooth fill */}
                          <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: `${widthPercent}%`,
                                backgroundColor: item.palette.fill,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. DONUT / PIE CHART */}
                {chartType === 'donut' && (
                  <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-2">
                    {/* SVG Donut */}
                    <div className="relative w-52 h-52 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                        {(() => {
                          let accumulatedPercent = 0;
                          return chartData.map((item, idx) => {
                            const p = item.percentage;
                            if (p <= 0) return null;
                            const strokeDasharray = `${p} ${100 - p}`;
                            const strokeDashoffset = -accumulatedPercent;
                            accumulatedPercent += p;
                            const isHovered = hoveredSlice === idx;

                            return (
                              <circle
                                key={item.label}
                                cx="50"
                                cy="50"
                                r="38"
                                fill="transparent"
                                stroke={item.palette.fill}
                                strokeWidth={isHovered ? '18' : '14'}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                pathLength="100"
                                className="transition-all duration-300 cursor-pointer"
                                onMouseEnter={() => setHoveredSlice(idx)}
                                onMouseLeave={() => setHoveredSlice(null)}
                              />
                            );
                          });
                        })()}
                      </svg>

                      {/* Center Stats */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                        {hoveredSlice !== null && chartData[hoveredSlice] ? (
                          <>
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">
                              {chartData[hoveredSlice].label}
                            </span>
                            <span className="text-lg font-black text-white font-mono leading-tight">
                              {chartData[hoveredSlice].percentage}%
                            </span>
                            <span className="text-[9.5px] text-sky-400 font-mono">
                              {chartData[hoveredSlice].metricValue.toLocaleString('ru-RU')}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Всего</span>
                            <span className="text-lg font-black text-slate-100 font-mono">
                              {kpiMetrics.totalRows}
                            </span>
                            <span className="text-[9.5px] text-slate-400">строк</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex-1 w-full max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {chartData.map((item, idx) => (
                        <div
                          key={item.label}
                          onMouseEnter={() => setHoveredSlice(idx)}
                          onMouseLeave={() => setHoveredSlice(null)}
                          className={`flex items-center justify-between p-1.5 rounded-lg border transition-colors cursor-pointer text-xs ${
                            hoveredSlice === idx 
                              ? 'bg-slate-800 border-sky-500/60 text-white' 
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: item.palette.fill }}
                            />
                            <span className="font-medium truncate" title={item.label}>
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                            <span className="font-bold text-slate-200">
                              {item.metricValue.toLocaleString('ru-RU')}
                            </span>
                            <span className="text-slate-400 font-semibold w-10 text-right">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. LINE / TREND CHART */}
                {chartType === 'line' && (
                  <div className="py-2">
                    <div className="h-44 w-full relative">
                      <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                        {/* Horizontal Grid lines */}
                        <line x1="0" y1="20" x2="500" y2="20" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
                        <line x1="0" y1="60" x2="500" y2="60" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
                        <line x1="0" y1="100" x2="500" y2="100" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />

                        {(() => {
                          const pts = chartData.map((item, i) => {
                            const x = chartData.length > 1 ? (i / (chartData.length - 1)) * 480 + 10 : 250;
                            const y = 110 - (item.metricValue / maxMetricVal) * 90;
                            return { x, y, item, i };
                          });

                          const pathD = pts.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '');
                          const areaD = `${pathD} L ${pts[pts.length - 1].x} 115 L ${pts[0].x} 115 Z`;

                          return (
                            <>
                              {/* Filled Area */}
                              <path d={areaD} fill="url(#lineGradient)" opacity="0.3" />
                              <defs>
                                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#38bdf8" />
                                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                                </linearGradient>
                              </defs>

                              {/* Main Line */}
                              <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

                              {/* Data Points */}
                              {pts.map((pt) => (
                                <g key={pt.item.label} className="cursor-pointer">
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r="4"
                                    fill="#0284c7"
                                    stroke="#38bdf8"
                                    strokeWidth="2"
                                  />
                                  <text
                                    x={pt.x}
                                    y={pt.y - 8}
                                    textAnchor="middle"
                                    className="text-[8px] fill-slate-300 font-mono font-bold"
                                  >
                                    {pt.item.metricValue}
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Labels below line chart */}
                    <div className="flex justify-between text-[10px] text-slate-400 px-2 mt-1 truncate">
                      {chartData.slice(0, 6).map((d) => (
                        <span key={d.label} className="truncate max-w-[80px]" title={d.label}>
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DATA TABLE VIEW / SECTION (rendered in 'table' or 'split' mode) */}
        {(viewMode === 'table' || viewMode === 'split') && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 border-t border-slate-800">
            {/* Table Header Bar with Quick Copy Hint */}
            <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">
                  Строк в таблице: <strong className="text-white">{filteredRows.length}</strong>
                </span>
                <span>•</span>
                <span className="text-sky-400 flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Нажмите на любую ячейку, чтобы мгновенно скопировать её значение
                </span>
              </div>

              {copiedKey && (
                <div className="flex items-center gap-1 text-emerald-400 font-bold animate-pulse text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                  <Check className="w-3.5 h-3.5" />
                  <span>Скопировано в буфер!</span>
                </div>
              )}
            </div>

            {/* Scrollable Data Table Grid */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className={`sticky top-0 z-10 ${theme.panelHeader} border-b ${theme.border}`}>
                  <tr>
                    <th className="p-2 font-bold text-[10px] uppercase text-slate-400 border-r border-slate-800 w-12 text-center">
                      #
                    </th>
                    <th className="p-2 font-bold text-[10px] uppercase text-slate-400 border-r border-slate-800 w-44">
                      Теги строки
                    </th>
                    {currentTable.columns.map((col) => (
                      <th
                        key={col.id}
                        className="p-2 font-bold text-[10px] uppercase text-slate-300 border-r border-slate-800 min-w-[130px] group select-none"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{col.name}</span>
                          <button
                            type="button"
                            onClick={() => handleQuickCopyColumn(col.name)}
                            className="opacity-20 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition-opacity cursor-pointer"
                            title={`Копировать все значения колонки «${col.name}»`}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="p-2 font-bold text-[10px] uppercase text-slate-400 w-24 text-center">
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
                      const isRowCopied = copiedKey === `row-${row.id}`;

                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors group hover:bg-slate-800/50 ${
                            isRowCopied ? 'bg-emerald-950/40' : ''
                          }`}
                        >
                          {/* Index */}
                          <td className="p-2 border-r border-slate-800/80 text-center font-mono text-[10.5px] text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Tags column */}
                          <td className="p-2 border-r border-slate-800/80">
                            <div className="flex flex-wrap gap-1">
                              {row.tags.length > 0 ? (
                                row.tags.map((t) => (
                                  <span
                                    key={t}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTag(t);
                                    }}
                                    className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[9.5px] border border-slate-700/60 cursor-pointer"
                                  >
                                    #{t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-600 text-[10px] italic">—</span>
                              )}
                            </div>
                          </td>

                          {/* Data Columns with 1-Click Quick Copy */}
                          {currentTable.columns.map((col) => {
                            const val = row.data[col.name] || '—';
                            const cellKey = `${row.id}-${col.id}`;
                            const isCellCopied = copiedKey === cellKey;

                            return (
                              <td
                                key={col.id}
                                onClick={() => handleQuickCopyCell(val, cellKey, col.name)}
                                className={`p-2 border-r border-slate-800/80 truncate max-w-[220px] transition-colors relative cursor-pointer group/cell ${
                                  isCellCopied
                                    ? 'bg-emerald-600/30 text-emerald-200 font-bold'
                                    : 'text-slate-200 hover:bg-sky-950/50 hover:text-white'
                                }`}
                                title={`Кликните, чтобы скопировать «${val}»`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate select-text">{val}</span>
                                  {isCellCopied ? (
                                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950 px-1 rounded shrink-0">
                                      <Check className="w-2.5 h-2.5" />
                                    </span>
                                  ) : (
                                    <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0" />
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Row Actions: Quick Copy Row & Delete */}
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickCopyRow(row, idx)}
                                className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Копировать всю строку (текст)"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id)}
                                className="p-1 rounded opacity-30 group-hover:opacity-100 hover:text-rose-400 text-slate-400 transition-opacity cursor-pointer"
                                title="Удалить строку"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className={`p-2 border-t ${theme.border} ${theme.panelHeader} flex items-center justify-between text-[11px] text-slate-400 shrink-0`}>
        <div className="flex items-center gap-2">
          <span>Таблица: <strong className="text-slate-200">{currentTable.name}</strong></span>
          <span>•</span>
          <span>Всего записей: <strong className="text-slate-200">{filteredRows.length}</strong> из {currentTable.rows.length}</span>
          <span>•</span>
          <span className="text-emerald-400">Форматы: .xlsx, .csv</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10.5px]">
            Режим: <strong className="text-sky-400 uppercase">{viewMode === 'table' ? 'Таблица' : viewMode === 'charts' ? 'Графики' : 'Разделенный экран'}</strong>
          </span>
        </div>
      </div>
      </>
      )}

      {/* Modal: Confirm Table Deletion */}
      {isDeleteTableModalOpen && currentTable && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
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
                  Это действие невозможно отменить. Все строки таблицы будут удалены.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsDeleteTableModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDeleteTable}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить таблицу</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Table */}
      {isCreateTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl p-5 ${theme.panel} ${theme.border}`}>
            <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-800">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Создание новой таблицы
              </span>
              <button onClick={() => setIsCreateTableModalOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
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
                  placeholder="Например: Заказы Wildberries или База тарифов"
                  className={`w-full p-2 rounded-lg border text-xs outline-none select-text ${theme.input}`}
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
                  placeholder="Номер заказа, Клиент, Служба доставки, Статус, Город, Сумма"
                  className={`w-full p-2 rounded-lg border text-xs outline-none select-text ${theme.input}`}
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Укажите заголовки колонок, например: Статус, Город, Сумма
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreateTableModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateCustomTable}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${accent.primary}`}
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
