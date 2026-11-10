import { Snippet, PlaceholderConfig, NoteCard, ResourceWidget } from '../types';

export type GlobalSearchResultType = 'snippet' | 'placeholder' | 'note' | 'resource';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string;
  badge?: string;
  category?: string;
  snippet?: Snippet;
  placeholder?: PlaceholderConfig;
  note?: NoteCard;
  resource?: ResourceWidget;
  score: number;
}

// Convert common layout typos between EN and RU
const EN_TO_RU_MAP: Record<string, string> = {
  'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г',
  'i': 'ш', 'o': 'щ', 'p': 'з', '[': 'х', ']': 'ъ', 'a': 'ф', 's': 'ы',
  'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д',
  ';': 'ж', "'": 'э', 'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и',
  'n': 'т', 'm': 'ь', ',': 'б', '.': 'ю',
};

const RU_TO_EN_MAP: Record<string, string> = Object.entries(EN_TO_RU_MAP).reduce(
  (acc, [en, ru]) => {
    acc[ru] = en;
    return acc;
  },
  {} as Record<string, string>
);

export function switchKeyboardLayout(text: string): string {
  const lower = text.toLowerCase();
  let toRu = '';
  let toEn = '';
  for (const ch of lower) {
    toRu += EN_TO_RU_MAP[ch] || ch;
    toEn += RU_TO_EN_MAP[ch] || ch;
  }
  return toRu !== lower ? toRu : toEn;
}

export function normalizeSearchString(str: string): string {
  return str
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s/_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates a relevance score for query against target string.
 * Higher score = better match. 0 = no match.
 */
function scoreMatch(target: string, queryTokens: string[], originalQuery: string): number {
  const normTarget = normalizeSearchString(target);
  if (!normTarget) return 0;

  // Exact match
  if (normTarget === originalQuery) return 100;
  // Prefix match
  if (normTarget.startsWith(originalQuery)) return 80;
  // Substring match
  if (normTarget.includes(originalQuery)) return 60;

  // Token-level match
  let matchedTokens = 0;
  let score = 0;
  for (const token of queryTokens) {
    if (!token) continue;
    if (normTarget.includes(token)) {
      matchedTokens++;
      score += token.length * 5;
      if (normTarget.split(' ').some((w) => w.startsWith(token))) {
        score += 10;
      }
    }
  }

  if (matchedTokens === queryTokens.length) {
    return 40 + score;
  }

  return matchedTokens > 0 ? score : 0;
}

/**
 * Performs unified fuzzy & layout-aware search across snippets, placeholders, notes and resources.
 */
export function performGlobalSearch(
  query: string,
  data: {
    snippets: Snippet[];
    placeholders: PlaceholderConfig[];
    notes: NoteCard[];
    widgets: ResourceWidget[];
  },
  filterType?: GlobalSearchResultType | 'all'
): GlobalSearchResult[] {
  const rawQ = query.trim();
  if (!rawQ) {
    // Return top popular / pinned items
    const results: GlobalSearchResult[] = [];
    data.snippets
      .filter((s) => s.isPinned)
      .slice(0, 5)
      .forEach((s) => {
        results.push({
          id: `snip-${s.id}`,
          type: 'snippet',
          title: s.title,
          subtitle: s.content.slice(0, 100),
          badge: s.shortcut,
          category: s.category,
          snippet: s,
          score: 100 + (s.usageCount || 0),
        });
      });
    return results;
  }

  const normQuery = normalizeSearchString(rawQ);
  const layoutSwitched = normalizeSearchString(switchKeyboardLayout(rawQ));
  const queryTokens = normQuery.split(' ').filter((t) => t.length > 0);
  const layoutTokens = layoutSwitched.split(' ').filter((t) => t.length > 0);

  const results: GlobalSearchResult[] = [];

  // 1. Snippets search
  if (!filterType || filterType === 'all' || filterType === 'snippet') {
    for (const s of data.snippets) {
      let score = 0;
      score = Math.max(score, scoreMatch(s.title, queryTokens, normQuery) * 1.5);
      score = Math.max(score, scoreMatch(s.shortcut, queryTokens, normQuery) * 2.0);
      score = Math.max(score, scoreMatch(s.tags.join(' '), queryTokens, normQuery) * 1.3);
      score = Math.max(score, scoreMatch(s.content, queryTokens, normQuery));
      score = Math.max(score, scoreMatch(s.category, queryTokens, normQuery));

      // Layout switched check
      if (layoutSwitched !== normQuery) {
        score = Math.max(score, scoreMatch(s.title, layoutTokens, layoutSwitched) * 1.2);
        score = Math.max(score, scoreMatch(s.shortcut, layoutTokens, layoutSwitched) * 1.6);
        score = Math.max(score, scoreMatch(s.content, layoutTokens, layoutSwitched) * 0.8);
      }

      if (score > 0) {
        if (s.isPinned) score += 15;
        if (s.usageCount > 0) score += Math.min(20, s.usageCount);

        results.push({
          id: `snip-${s.id}`,
          type: 'snippet',
          title: s.title,
          subtitle: s.content.slice(0, 110),
          badge: s.shortcut,
          category: s.category,
          snippet: s,
          score,
        });
      }
    }
  }

  // 2. Placeholders search
  if (!filterType || filterType === 'all' || filterType === 'placeholder') {
    for (const p of data.placeholders) {
      let score = 0;
      score = Math.max(score, scoreMatch(p.key, queryTokens, normQuery) * 2.0);
      score = Math.max(score, scoreMatch(p.label, queryTokens, normQuery) * 1.5);
      score = Math.max(score, scoreMatch(p.description, queryTokens, normQuery));
      if (p.defaultValue) {
        score = Math.max(score, scoreMatch(p.defaultValue, queryTokens, normQuery));
      }

      if (layoutSwitched !== normQuery) {
        score = Math.max(score, scoreMatch(p.key, layoutTokens, layoutSwitched) * 1.6);
        score = Math.max(score, scoreMatch(p.label, layoutTokens, layoutSwitched) * 1.2);
      }

      if (score > 0) {
        results.push({
          id: `ph-${p.id}`,
          type: 'placeholder',
          title: `{{${p.key}}}`,
          subtitle: `${p.label}${p.description ? ' • ' + p.description : ''} (По умолч: ${p.defaultValue || 'пусто'})`,
          badge: p.type === 'choice' ? 'Выбор' : 'Текст',
          placeholder: p,
          score,
        });
      }
    }
  }

  // 3. Notes search
  if (!filterType || filterType === 'all' || filterType === 'note') {
    for (const n of data.notes) {
      let score = 0;
      score = Math.max(score, scoreMatch(n.title, queryTokens, normQuery) * 1.5);
      score = Math.max(score, scoreMatch(n.content, queryTokens, normQuery));
      if (n.tags) {
        score = Math.max(score, scoreMatch(n.tags.join(' '), queryTokens, normQuery) * 1.2);
      }
      if (n.checklist && n.checklist.length > 0) {
        const checkText = n.checklist.map((i) => i.text).join(' ');
        score = Math.max(score, scoreMatch(checkText, queryTokens, normQuery));
      }

      if (score > 0) {
        if (n.isPinned) score += 10;
        results.push({
          id: `note-${n.id}`,
          type: 'note',
          title: n.title || 'Безымянная заметка',
          subtitle: n.content ? n.content.slice(0, 110) : `${n.checklist?.length || 0} пунктов чек-листа`,
          badge: n.checklist && n.checklist.length > 0 ? 'Чек-лист' : 'Заметка',
          note: n,
          score,
        });
      }
    }
  }

  // 4. Resources and Widgets search
  if (!filterType || filterType === 'all' || filterType === 'resource') {
    for (const w of data.widgets) {
      let score = 0;
      score = Math.max(score, scoreMatch(w.title, queryTokens, normQuery) * 1.6);
      score = Math.max(score, scoreMatch(w.url, queryTokens, normQuery));
      score = Math.max(score, scoreMatch(w.category, queryTokens, normQuery));
      if (w.description) {
        score = Math.max(score, scoreMatch(w.description, queryTokens, normQuery));
      }

      if (score > 0) {
        results.push({
          id: `widget-${w.id}`,
          type: 'resource',
          title: w.title,
          subtitle: w.url,
          badge: w.type === 'link' ? 'Ссылка' : 'Виджет',
          category: w.category,
          resource: w,
          score,
        });
      }
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 18);
}
