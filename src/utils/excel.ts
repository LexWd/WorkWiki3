import * as XLSX from 'xlsx';
import { ExcelColumn, ExcelRow, ExcelTable } from '../types';

export async function parseExcelOrCsvFile(file: File): Promise<{
  name: string;
  columns: ExcelColumn[];
  rows: ExcelRow[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0] || 'Лист1';
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON array of objects
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('Таблица пуста или не содержит строк с данными.');
  }

  // Extract columns
  const firstRow = rawRows[0];
  const keys = Object.keys(firstRow);
  const columns: ExcelColumn[] = keys
    .filter((k) => k.toLowerCase() !== 'теги' && k.toLowerCase() !== 'tags')
    .map((key, idx) => ({
      id: `col-${idx}-${Date.now()}`,
      name: key,
      key: key,
    }));

  // Parse rows & tags
  const rows: ExcelRow[] = rawRows.map((raw, idx) => {
    const data: Record<string, string> = {};
    let tags: string[] = [];
    let notes: string | undefined = undefined;

    for (const [k, v] of Object.entries(raw)) {
      const valStr = String(v ?? '').trim();
      const kLower = k.toLowerCase().trim();

      if (kLower === 'теги' || kLower === 'tags' || kLower === 'tag') {
        tags = valStr
          .split(/[,;\s]+/)
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0);
      } else if (kLower === 'заметки' || kLower === 'примечания' || kLower === 'notes') {
        notes = valStr;
      } else {
        data[k] = valStr;
      }
    }

    // Auto-generate tags if empty from key fields
    if (tags.length === 0) {
      const tagCandidates = Object.values(data)
        .slice(0, 3)
        .map((val) => val.split(' ')[0]?.toLowerCase())
        .filter(Boolean);
      tags = Array.from(new Set(tagCandidates)).slice(0, 3);
    }

    return {
      id: `row-${Date.now()}-${idx}`,
      tags,
      data,
      notes,
    };
  });

  const baseName = file.name.replace(/\.[^/.]+$/, '');

  return {
    name: baseName || 'Импортированная таблица',
    columns,
    rows,
  };
}

export function exportTableToXlsx(table: ExcelTable) {
  const exportData = table.rows.map((r) => ({
    ...r.data,
    'Теги': r.tags.join(', '),
    ...(r.notes ? { 'Заметки': r.notes } : {}),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Данные');

  const cleanName = table.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
  XLSX.writeFile(workbook, `${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTableToCsv(table: ExcelTable) {
  const exportData = table.rows.map((r) => ({
    ...r.data,
    'Теги': r.tags.join(', '),
    ...(r.notes ? { 'Заметки': r.notes } : {}),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  // UTF-8 BOM for proper Russian encoding in Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = table.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
  a.download = `${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
