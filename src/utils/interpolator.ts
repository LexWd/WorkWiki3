import { PlaceholderConfig, LogicBlockInfo } from '../types';

export interface ConditionEvaluation {
  matched: boolean;
  variableKey: string;
  expectedValue?: string;
  actualValue: string;
  operator: 'exists' | 'not_exists' | 'equals' | 'not_equals';
}

/**
 * Extracts condition components from condition string, e.g. "пол=м", "!трек", "тип_доставки!=курьер"
 */
export function parseConditionString(conditionStr: string): {
  variableKey: string;
  operator: 'exists' | 'not_exists' | 'equals' | 'not_equals';
  expectedValue?: string;
} {
  const trimmed = conditionStr.trim();

  // 1. Negation: !key
  if (trimmed.startsWith('!')) {
    const key = trimmed.slice(1).trim();
    return { variableKey: key, operator: 'not_exists' };
  }

  // 2. Not equals: key!=value
  if (trimmed.includes('!=')) {
    const [rawKey, rawVal] = trimmed.split('!=', 2);
    return {
      variableKey: rawKey.trim(),
      operator: 'not_equals',
      expectedValue: (rawVal || '').trim(),
    };
  }

  // 3. Equals: key=value or key==value
  if (trimmed.includes('=')) {
    const parts = trimmed.split(/={1,2}/, 2);
    return {
      variableKey: parts[0].trim(),
      operator: 'equals',
      expectedValue: (parts[1] || '').trim(),
    };
  }

  // 4. Existence / truthiness: key
  return {
    variableKey: trimmed,
    operator: 'exists',
  };
}

/**
 * Evaluates a condition against resolved values
 */
export function evaluateCondition(
  conditionStr: string,
  placeholders: PlaceholderConfig[],
  agentNameOrUnused?: any,
  agentName: string = 'Оператор',
  overrides: Record<string, string> = {}
): ConditionEvaluation {
  const effectiveAgentName = typeof agentNameOrUnused === 'string' ? agentNameOrUnused : agentName;
  const effectiveOverrides = typeof agentNameOrUnused === 'object' && agentNameOrUnused !== null && !('data' in agentNameOrUnused) ? agentNameOrUnused : overrides;

  const { variableKey, operator, expectedValue } = parseConditionString(conditionStr);
  const rawResolved = resolveTokenValue(variableKey, placeholders, effectiveAgentName, effectiveAgentName, effectiveOverrides);
  const isUnresolved = rawResolved === `{{${variableKey}}}`;
  const actualValue = isUnresolved ? '' : rawResolved;

  const normActual = actualValue.trim().toLowerCase().replace(/ё/g, 'е');
  const normExpected = (expectedValue || '').trim().toLowerCase().replace(/ё/g, 'е');

  let matched = false;

  switch (operator) {
    case 'not_exists': {
      matched =
        isUnresolved ||
        !actualValue ||
        actualValue.trim() === '' ||
        actualValue.trim() === '0' ||
        normActual === 'нет' ||
        normActual === 'false';
      break;
    }
    case 'equals': {
      matched = !isUnresolved && normActual === normExpected;
      break;
    }
    case 'not_equals': {
      matched = isUnresolved || normActual !== normExpected;
      break;
    }
    case 'exists':
    default: {
      matched =
        !isUnresolved &&
        Boolean(actualValue) &&
        actualValue.trim() !== '' &&
        actualValue.trim() !== '0' &&
        normActual !== 'нет' &&
        normActual !== 'false';
      break;
    }
  }

  return {
    matched,
    variableKey,
    expectedValue,
    actualValue,
    operator,
  };
}

/**
 * Resolves all {{?condition:ifTrue|ifFalse}} blocks in text.
 * Properly handles nested tokens {{...}} inside ifTrue and ifFalse branches.
 */
export function resolveLogicBlocks(
  text: string,
  placeholders: PlaceholderConfig[],
  agentNameOrUnused?: any,
  agentName: string = 'Оператор',
  overrides: Record<string, string> = {}
): string {
  const effectiveAgentName = typeof agentNameOrUnused === 'string' ? agentNameOrUnused : agentName;
  const effectiveOverrides = typeof agentNameOrUnused === 'object' && agentNameOrUnused !== null && !('data' in agentNameOrUnused) ? agentNameOrUnused : overrides;
  let output = '';
  let i = 0;

  while (i < text.length) {
    // Look for start of logic block '{{?'
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '?') {
      const startIndex = i;
      let depth = 1;
      let j = i + 3; // after '{{?'
      let colonIndex = -1;
      let pipeIndex = -1;

      while (j < text.length && depth > 0) {
        if (text[j] === '{' && text[j + 1] === '{') {
          depth++;
          j += 2;
        } else if (text[j] === '}' && text[j + 1] === '}') {
          depth--;
          if (depth === 0) {
            break;
          }
          j += 2;
        } else {
          // If we are at root depth 1 inside this logic block
          if (depth === 1) {
            if (text[j] === ':' && colonIndex === -1) {
              colonIndex = j;
            } else if (text[j] === '|' && colonIndex !== -1 && pipeIndex === -1) {
              pipeIndex = j;
            }
          }
          j++;
        }
      }

      if (depth === 0 && colonIndex !== -1) {
        const conditionPart = text.slice(startIndex + 3, colonIndex);
        let ifTrue = '';
        let ifFalse = '';

        if (pipeIndex !== -1) {
          ifTrue = text.slice(colonIndex + 1, pipeIndex);
          ifFalse = text.slice(pipeIndex + 1, j);
        } else {
          ifTrue = text.slice(colonIndex + 1, j);
          ifFalse = '';
        }

        const evaluation = evaluateCondition(
          conditionPart,
          placeholders,
          effectiveAgentName,
          effectiveAgentName,
          effectiveOverrides
        );

        const chosenBranch = evaluation.matched ? ifTrue : ifFalse;
        output += chosenBranch;
        i = j + 2; // skip closing '}}'
        continue;
      }
    }

    output += text[i];
    i++;
  }

  // If there are nested logic blocks inside the chosen branch, perform another pass
  if (output.includes('{{?')) {
    return resolveLogicBlocks(output, placeholders, effectiveAgentName, effectiveAgentName, effectiveOverrides);
  }

  return output;
}

/**
 * Inspects all logic blocks in a template string for UI display and diagnostics
 */
export function extractLogicBlocks(text: string): LogicBlockInfo[] {
  const blocks: LogicBlockInfo[] = [];
  let i = 0;

  while (i < text.length) {
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '?') {
      const startIndex = i;
      let depth = 1;
      let j = i + 3;
      let colonIndex = -1;
      let pipeIndex = -1;

      while (j < text.length && depth > 0) {
        if (text[j] === '{' && text[j + 1] === '{') {
          depth++;
          j += 2;
        } else if (text[j] === '}' && text[j + 1] === '}') {
          depth--;
          if (depth === 0) break;
          j += 2;
        } else {
          if (depth === 1) {
            if (text[j] === ':' && colonIndex === -1) {
              colonIndex = j;
            } else if (text[j] === '|' && colonIndex !== -1 && pipeIndex === -1) {
              pipeIndex = j;
            }
          }
          j++;
        }
      }

      if (depth === 0 && colonIndex !== -1) {
        const raw = text.slice(startIndex, j + 2);
        const conditionPart = text.slice(startIndex + 3, colonIndex).trim();
        const { variableKey, operator, expectedValue } = parseConditionString(conditionPart);
        let ifTrue = '';
        let ifFalse: string | undefined = undefined;

        if (pipeIndex !== -1) {
          ifTrue = text.slice(colonIndex + 1, pipeIndex);
          ifFalse = text.slice(pipeIndex + 1, j);
        } else {
          ifTrue = text.slice(colonIndex + 1, j);
        }

        blocks.push({
          raw,
          condition: conditionPart,
          variableKey,
          operator,
          expectedValue,
          ifTrue,
          ifFalse,
        });

        i = j + 2;
        continue;
      }
    }
    i++;
  }

  return blocks;
}

export function extractTokens(text: string): string[] {
  const uniqueKeys = new Set<string>();

  // 1. Extract variable keys from logic blocks {{?condition:true|false}}
  const logicBlocks = extractLogicBlocks(text);
  for (const block of logicBlocks) {
    if (block.variableKey) {
      uniqueKeys.add(block.variableKey.trim());
    }
    // Also extract nested tokens inside true and false branches
    const insideTokens = extractTokens(block.ifTrue + (block.ifFalse ? ' ' + block.ifFalse : ''));
    insideTokens.forEach((k) => uniqueKeys.add(k));
  }

  // 2. Extract standard tokens {{key}} (excluding logic blocks {{?...}})
  const matches = text.match(/\{\{\s*([^{}\r\n]+?)\s*\}\}/g);
  if (matches) {
    for (const m of matches) {
      const inner = m.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim();
      if (!inner.startsWith('?') && inner.length > 0) {
        uniqueKeys.add(inner);
      }
    }
  }

  return Array.from(uniqueKeys).filter((k) => k.length > 0);
}

export function resolveTokenValue(
  tokenKey: string,
  placeholders: PlaceholderConfig[],
  agentNameOrUnused?: any,
  agentName: string = 'Оператор',
  overrides: Record<string, string> = {}
): string {
  const effectiveAgentName: string = typeof agentNameOrUnused === 'string' ? agentNameOrUnused : agentName;
  const effectiveOverrides: Record<string, string> = 
    (typeof agentNameOrUnused === 'object' && agentNameOrUnused !== null && !('data' in agentNameOrUnused)
      ? agentNameOrUnused
      : overrides) as Record<string, string>;

  const cleanKey = tokenKey.trim();
  const lowerKey = cleanKey.toLowerCase();
  const normKey = lowerKey.replace(/ё/g, 'е');

  // 1. Check explicit overrides first (including empty string when user erases placeholder)
  if (cleanKey in effectiveOverrides && effectiveOverrides[cleanKey] !== undefined) {
    return String(effectiveOverrides[cleanKey]);
  }

  // Check case-insensitive and ё/е normalized override
  for (const [k, v] of Object.entries(effectiveOverrides)) {
    if (k.toLowerCase() === lowerKey && v !== undefined) {
      return String(v);
    }
    if (k.toLowerCase().replace(/ё/g, 'е') === normKey && v !== undefined) {
      return String(v);
    }
  }

  // 2. Special built-in
  if (
    lowerKey === 'имя' ||
    lowerKey === 'имя_оператора' ||
    lowerKey === 'agent_name' ||
    normKey === 'имя_оператора'
  ) {
    return effectiveAgentName;
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
    // Return default or first option (even if empty string)
    if (config.defaultValue !== undefined && config.defaultValue !== null) {
      return String(config.defaultValue);
    }
    if (config.options && config.options.length > 0) {
      return String(config.options[0] ?? '');
    }
    return '';
  }

  return `{{${tokenKey}}}`;
}

export function interpolateSnippet(
  text: string,
  placeholders: PlaceholderConfig[],
  agentNameOrUnused?: any,
  agentName: string = 'Оператор',
  overrides: Record<string, string> = {}
): { result: string; unresolved: string[] } {
  const effectiveAgentName = typeof agentNameOrUnused === 'string' ? agentNameOrUnused : agentName;
  const effectiveOverrides = typeof agentNameOrUnused === 'object' && agentNameOrUnused !== null && !('data' in agentNameOrUnused) ? agentNameOrUnused : overrides;

  const unresolved: string[] = [];

  // Step 1: Resolve all logic blocks first (evaluating conditions and choosing branches)
  const textWithResolvedLogic = resolveLogicBlocks(
    text,
    placeholders,
    effectiveAgentName,
    effectiveAgentName,
    effectiveOverrides
  );

  // Step 2: Resolve standard placeholders
  const result = textWithResolvedLogic.replace(/\{\{\s*([^{}\r\n]+?)\s*\}\}/g, (match, rawKey) => {
    const key = rawKey.trim();
    // In case there is an unhandled logic block
    if (key.startsWith('?')) {
      return match;
    }
    const val = resolveTokenValue(key, placeholders, effectiveAgentName, effectiveAgentName, effectiveOverrides);
    if (val === match || val === `{{${key}}}`) {
      unresolved.push(key);
      return match;
    }
    return val;
  });

  return { result, unresolved };
}

