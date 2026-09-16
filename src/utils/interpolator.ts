import { PlaceholderConfig, ExcelRow } from '../types';

export function extractTokens(text: string): string[] {
  const matches = text.match(/\{\{([a-zA-Zа-яА-Я0-9_-]+)\}\}/g);
  if (!matches) return [];
  const unique = Array.from(new Set(matches.map((m) => m.slice(2, -2).trim())));
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

  // 1. Check explicit overrides first
  if (cleanKey in overrides && overrides[cleanKey] !== undefined && overrides[cleanKey] !== '') {
    return overrides[cleanKey];
  }

  // 2. Special built-in
  if (cleanKey === 'имя_оператора' || cleanKey === 'agent_name') {
    return agentName;
  }

  // 3. Check placeholder config
  const config = placeholders.find(
    (p) => p.key.toLowerCase() === cleanKey.toLowerCase()
  );

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
      if (colName.toLowerCase().replace(/\s+/g, '_') === cleanKey.toLowerCase()) {
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

  const result = text.replace(/\{\{([a-zA-Zа-яА-Я0-9_-]+)\}\}/g, (match, key) => {
    const val = resolveTokenValue(key, placeholders, activeRow, agentName, overrides);
    if (val === match) {
      unresolved.push(key);
      return match;
    }
    return val;
  });

  return { result, unresolved };
}
