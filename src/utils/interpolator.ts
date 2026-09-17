import { PlaceholderConfig, ExcelRow } from '../types';

export function extractTokens(text: string): string[] {
  // Support Cyrillic (including ё/Ё), Latin, digits, hyphens, underscores and whitespace trimming
  const matches = text.match(/\{\{\s*([^{}\r\n]+?)\s*\}\}/g);
  if (!matches) return [];
  const unique = Array.from(
    new Set(
      matches
        .map((m) => m.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim())
        .filter((k) => k.length > 0)
    )
  );
  return unique;
}

export function resolveTokenValue(
  tokenKey: string,
  placeholders: PlaceholderConfig[],
  activeRow?: ExcelRow | null,
  agentName: string = 'Оператор',
  overrides: Record<string, string> = {}
): string {
  const cleanKey = tokenKey.trim();
  const lowerKey = cleanKey.toLowerCase();
  const normKey = lowerKey.replace(/ё/g, 'е');

  // 1. Check explicit overrides first (including empty string when user erases placeholder)
  if (cleanKey in overrides && overrides[cleanKey] !== undefined) {
    return overrides[cleanKey];
  }

  // Check case-insensitive and ё/е normalized override
  for (const [k, v] of Object.entries(overrides)) {
    if (k.toLowerCase() === lowerKey && v !== undefined) {
      return v;
    }
    if (k.toLowerCase().replace(/ё/g, 'е') === normKey && v !== undefined) {
      return v;
    }
  }

  // 2. Special built-in
  if (
    lowerKey === 'имя_оператора' ||
    lowerKey === 'agent_name' ||
    normKey === 'имя_оператора'
  ) {
    return agentName;
  }

  // 3. Check placeholder config (exact, case-insensitive, ё/е normalized, or label)
  let config = placeholders.find((p) => p.key === cleanKey);
  if (!config) {
    config = placeholders.find((p) => p.key.toLowerCase() === lowerKey);
  }
  if (!config) {
    config = placeholders.find(
      (p) => p.key.toLowerCase().replace(/ё/g, 'е') === normKey
    );
  }
  if (!config) {
    config = placeholders.find(
      (p) =>
        p.label.toLowerCase() === lowerKey ||
        p.label.toLowerCase().replace(/ё/g, 'е') === normKey
    );
  }

  if (config) {
    // Check if bound to active Excel row
    if (config.excelColumnBinding && activeRow?.data) {
      const boundVal = activeRow.data[config.excelColumnBinding];
      if (boundVal !== undefined && boundVal !== '') {
        return boundVal;
      }
    }
    // Return default or first option
    if (config.defaultValue) return config.defaultValue;
    if (config.options && config.options.length > 0) return config.options[0];
  }

  // 4. Check if activeRow has an exact column name matching the tokenKey
  if (activeRow?.data) {
    if (activeRow.data[cleanKey]) {
      return activeRow.data[cleanKey];
    }
    for (const [colName, val] of Object.entries(activeRow.data)) {
      const normCol = colName.toLowerCase().replace(/\s+/g, '_').replace(/ё/g, 'е');
      if (normCol === normKey) {
        return val;
      }
    }
  }

  return `{{${tokenKey}}}`;
}

export function interpolateSnippet(
  text: string,
  placeholders: PlaceholderConfig[],
  activeRow?: ExcelRow | null,
  agentName: string = 'Оператор',
  overrides: Record<string, string> = {}
): { result: string; unresolved: string[] } {
  const unresolved: string[] = [];

  const result = text.replace(/\{\{\s*([^{}\r\n]+?)\s*\}\}/g, (match, rawKey) => {
    const key = rawKey.trim();
    const val = resolveTokenValue(key, placeholders, activeRow, agentName, overrides);
    if (val === match || val === `{{${key}}}`) {
      unresolved.push(key);
      return match;
    }
    return val;
  });

  return { result, unresolved };
}
