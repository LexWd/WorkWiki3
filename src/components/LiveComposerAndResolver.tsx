import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Copy, 
  Check, 
  RotateCcw, 
  Zap, 
  ListOrdered, 
  CheckCircle2, 
  Keyboard,
  X,
  Maximize2,
  Minimize2,
  LayoutTemplate
} from 'lucide-react';
import { Snippet, PlaceholderConfig, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses, getDensityPadding } from '../utils/theme';
import { extractTokens, interpolateSnippet, resolveTokenValue } from '../utils/interpolator';
import { soundService } from '../utils/sound';

interface LiveComposerAndResolverProps {
  selectedSnippet: Snippet | null;
  snippets: Snippet[];
  placeholders: PlaceholderConfig[];
  activeRow?: any;
  settings: GuiSettings;
  onCopyResolved: (text: string, title?: string) => void;
  onSelectSnippet: (snippet: Snippet) => void;
  onUpdateSettings?: (partial: Partial<GuiSettings>) => void;
}

export const LiveComposerAndResolver: React.FC<LiveComposerAndResolverProps> = ({
  selectedSnippet,
  snippets,
  placeholders,
  settings,
  onCopyResolved,
  onSelectSnippet,
  onUpdateSettings,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Proportional flex-percentages ensuring blocks fill 100% of the element
  const [topPercent, setTopPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('workwiki_composer_top_percent');
      return saved ? Math.max(15, Math.min(80, parseFloat(saved))) : 32;
    } catch {
      return 32;
    }
  });

  const [midPercent, setMidPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('workwiki_composer_mid_percent');
      return saved ? Math.max(15, Math.min(70, parseFloat(saved))) : 34;
    } catch {
      return 34;
    }
  });

  // Dragging states for the two horizontal splitters
  const [isDraggingSplitter1, setIsDraggingSplitter1] = useState(false);
  const startDragY1Ref = useRef<number>(0);
  const startTopPercentRef = useRef<number>(32);

  const [isDraggingSplitter2, setIsDraggingSplitter2] = useState(false);
  const startDragY2Ref = useRef<number>(0);
  const startMidPercentRef = useRef<number>(34);

  // Field size mode: 'compact' (1 line) | 'normal' (2-3 lines) | 'expanded' (5 lines)
  const [fieldSizeMode, setFieldSizeMode] = useState<'compact' | 'normal' | 'expanded'>('normal');
  // Per-field override: allows toggling individual fields between compact and multiline
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLight = settings.theme === 'light-minimal';
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor, isLight);
  const density = getDensityPadding(settings.density);

  // Extract all tokens in the current composer text
  const detectedTokens = useMemo(() => {
    return extractTokens(inputText);
  }, [inputText]);

  // When tokens change or are absent, calculate bottom block percentage so sum is strictly 100%
  const bottomPercent = useMemo(() => {
    if (detectedTokens.length === 0) {
      return Math.max(15, 100 - topPercent);
    }
    return Math.max(15, 100 - topPercent - midPercent);
  }, [detectedTokens.length, topPercent, midPercent]);

  // Drag handler for Splitter 1 (between Composer and Middle/Bottom)
  useEffect(() => {
    if (!isDraggingSplitter1) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const totalH = containerRef.current.clientHeight;
      if (totalH <= 0) return;

      const deltaY = e.clientY - startDragY1Ref.current;
      const deltaPercent = (deltaY / totalH) * 100;
      const minPercent = 15;
      const maxPercent = detectedTokens.length > 0 ? Math.max(minPercent, 100 - midPercent - 15) : 85;
      const newTop = Math.max(minPercent, Math.min(maxPercent, startTopPercentRef.current + deltaPercent));
      setTopPercent(newTop);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter1(false);
      try {
        localStorage.setItem('workwiki_composer_top_percent', topPercent.toString());
      } catch {}
      onUpdateSettings?.({ composerHeight: Math.round(topPercent) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter1, topPercent, midPercent, detectedTokens.length, onUpdateSettings]);

  // Drag handler for Splitter 2 (between Middle and Bottom)
  useEffect(() => {
    if (!isDraggingSplitter2) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const totalH = containerRef.current.clientHeight;
      if (totalH <= 0) return;

      const deltaY = e.clientY - startDragY2Ref.current;
      const deltaPercent = (deltaY / totalH) * 100;
      const minPercent = 15;
      const maxPercent = Math.max(minPercent, 100 - topPercent - 15);
      const newMid = Math.max(minPercent, Math.min(maxPercent, startMidPercentRef.current + deltaPercent));
      setMidPercent(newMid);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter2(false);
      try {
        localStorage.setItem('workwiki_composer_mid_percent', midPercent.toString());
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter2, topPercent, midPercent]);

  // When selected snippet changes, update input text
  useEffect(() => {
    if (selectedSnippet) {
      setInputText(selectedSnippet.content);
      setTokenOverrides({});
    }
  }, [selectedSnippet]);

  // Calculate live resolved text
  const { result: resolvedText, unresolved } = useMemo(() => {
    return interpolateSnippet(
      inputText,
      placeholders,
      null,
      settings.agentName,
      tokenOverrides
    );
  }, [inputText, placeholders, settings.agentName, tokenOverrides]);

  // Slash commands filtering
  const matchingSlashSnippets = useMemo(() => {
    if (slashQuery === null) return [];
    const q = slashQuery.toLowerCase();
    return snippets
      .filter((s) => s.shortcut.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [slashQuery, snippets]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursor = e.target.selectionStart;
    const beforeCursor = val.slice(0, cursor);
    const slashMatch = beforeCursor.match(/\/([a-zA-Zа-яА-ЯёЁ0-9_]*)$/);

    if (slashMatch) {
      setSlashQuery(slashMatch[1]);
    } else {
      setSlashQuery(null);
    }
  };

  const handleSelectSlashSnippet = (snip: Snippet) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const beforeCursor = inputText.slice(0, cursor);
    const afterCursor = inputText.slice(cursor);
    const slashMatch = beforeCursor.match(/\/([a-zA-Zа-яА-ЯёЁ0-9_]*)$/);

    if (slashMatch) {
      const cleanBefore = beforeCursor.slice(0, slashMatch.index);
      setInputText(cleanBefore + snip.content + afterCursor);
      onSelectSnippet(snip);
    }
    setSlashQuery(null);
    soundService.playShortcutPop(settings.soundEffects);
  };

  const handleCopy = () => {
    if (!resolvedText.trim()) return;
    onCopyResolved(resolvedText, selectedSnippet?.title || 'Собственный ответ');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Global shortcut inside component: Ctrl+Enter to copy answer from anywhere in the resolver
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (resolvedText.trim()) {
          e.preventDefault();
          handleCopy();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resolvedText, selectedSnippet, onCopyResolved]);

  const handleSetOverride = (tokenKey: string, value: string, playSound = false) => {
    setTokenOverrides((prev) => ({ ...prev, [tokenKey]: value }));
    if (playSound) {
      soundService.playClick(settings.soundEffects);
    }
  };

  const handleResetOverrides = () => {
    setTokenOverrides({});
    soundService.playClick(settings.soundEffects);
  };

  const applyFillPreset = (mode: 'equal' | 'composer' | 'resolved') => {
    if (detectedTokens.length === 0) {
      if (mode === 'equal') {
        setTopPercent(50);
      } else if (mode === 'composer') {
        setTopPercent(65);
      } else {
        setTopPercent(35);
      }
    } else {
      if (mode === 'equal') {
        setTopPercent(32);
        setMidPercent(34);
      } else if (mode === 'composer') {
        setTopPercent(48);
        setMidPercent(26);
      } else {
        setTopPercent(24);
        setMidPercent(26);
      }
    }
    try {
      localStorage.setItem('workwiki_composer_top_percent', topPercent.toString());
      localStorage.setItem('workwiki_composer_mid_percent', midPercent.toString());
    } catch {}
  };

  return (
    <div className={`flex flex-col h-full w-full ${theme.panel} overflow-hidden text-xs select-none min-w-0`}>
      {/* Top Header of the Editor Element */}
      <div className={`${density.card} border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between shrink-0 w-full`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${accent.primary}`}>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate">
              <h2 className={`font-bold text-xs truncate ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                {selectedSnippet ? selectedSnippet.title : 'Быстрый редактор и подстановка'}
              </h2>
              {selectedSnippet && (
                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded border shrink-0 ${
                  isLight
                    ? 'text-sky-800 bg-sky-100 border-sky-300'
                    : 'text-sky-400 bg-sky-950/60 border-sky-800/80'
                }`}>
                  {selectedSnippet.shortcut}
                </span>
              )}
            </div>
            <p className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Блоки адаптированы и полностью заполняют окно редактора
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {Object.keys(tokenOverrides).length > 0 && (
            <button
              onClick={handleResetOverrides}
              className={`flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                isLight
                  ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                  : 'text-amber-400 hover:text-amber-300 border-amber-500/30'
              }`}
              title="Сбросить выбранные вручную значения"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сброс</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={!resolvedText.trim()}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : !resolvedText.trim()
                ? isLight
                  ? 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-400'
                : `${accent.primary}`
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            <kbd className="hidden lg:inline font-mono text-[9px] bg-black/20 px-1 py-0.2 rounded opacity-80">
              Ctrl+Enter
            </kbd>
          </button>
        </div>
      </div>

      {/* Main interactive area: ALL blocks fill 100% of this element */}
      <div ref={containerRef} className="flex-1 min-h-0 flex flex-col overflow-hidden w-full h-full">
        {/* Block 1: Raw Template Editor (Fills proportional share completely) */}
        <div 
          style={{ 
            flex: `${detectedTokens.length > 0 ? topPercent : topPercent} 1 0%`,
          }}
          className={`${density.card} border-b ${theme.border} min-h-[75px] flex flex-col relative w-full overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-1.5 text-[10.5px] shrink-0">
            <span className={`font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Текст шаблона с плейсхолдерами:
            </span>
            <div className="flex items-center gap-2">
              {/* Presets to fill blocks in window */}
              <div className="hidden sm:flex items-center gap-1 text-[9.5px]">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Заполнение:</span>
                <button
                  type="button"
                  onClick={() => applyFillPreset('equal')}
                  className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Равномерно распределить блоки на 100% высоты"
                >
                  Равномерно
                </button>
                <button
                  type="button"
                  onClick={() => applyFillPreset('composer')}
                  className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Увеличить блок редактирования шаблона"
                >
                  Шаблон +
                </button>
                <button
                  type="button"
                  onClick={() => applyFillPreset('resolved')}
                  className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Увеличить блок итогового ответа"
                >
                  Ответ +
                </button>
              </div>

              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                Введите <code className={`${isLight ? 'text-sky-700 bg-sky-50 px-1 rounded' : 'text-sky-300'} font-mono`}>/</code> для команд
              </span>
            </div>
          </div>

          {/* Textarea container filling 100% of Block 1 */}
          <div className="relative flex-1 min-h-0 flex flex-col w-full h-full">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleCopy();
                }
              }}
              placeholder="Выберите шаблон слева или начните вводить текст с {{плейсхолдерами}}..."
              className={`w-full h-full flex-1 min-h-[50px] p-2.5 rounded-lg border text-xs leading-relaxed outline-none resize-none font-sans ${theme.input}`}
            />

            {/* Slash-command suggestion popover */}
            {matchingSlashSnippets.length > 0 && (
              <div className={`absolute left-0 bottom-full mb-1 z-30 w-80 rounded-lg shadow-2xl p-1 animate-slide-up border ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}>
                <div className={`px-2 py-1 text-[10px] uppercase font-bold border-b ${
                  isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800'
                }`}>
                  Быстрые ответы ({matchingSlashSnippets.length})
                </div>
                {matchingSlashSnippets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSlashSnippet(s)}
                    className={`w-full text-left p-2 rounded flex items-center justify-between transition-colors cursor-pointer ${
                      isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">{s.title}</div>
                      <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{s.shortcut}</div>
                    </div>
                    <span className={`text-[10px] font-mono px-1 py-0.5 rounded border ${
                      isLight ? 'text-sky-800 bg-sky-50 border-sky-200' : 'text-sky-400 bg-sky-950 border-sky-800'
                    }`}>
                      Вставить ↵
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resizable horizontal splitter handle between Block 1 and Block 2/3 */}
        <div
          onMouseDown={(e) => {
            startDragY1Ref.current = e.clientY;
            startTopPercentRef.current = topPercent;
            setIsDraggingSplitter1(true);
          }}
          onDoubleClick={() => {
            setTopPercent(detectedTokens.length > 0 ? 32 : 50);
          }}
          title="Потяните для изменения пропорций блоков (двойной клик — сброс)"
          className={`h-1.5 hover:h-2 select-none cursor-row-resize flex items-center justify-center shrink-0 transition-all group ${
            isDraggingSplitter1
              ? 'bg-sky-500 h-2'
              : isLight
              ? 'bg-slate-200 hover:bg-sky-400/50'
              : 'bg-slate-800/80 hover:bg-sky-500/50'
          }`}
        >
          <div className={`w-10 h-0.5 rounded-full transition-colors ${
            isLight ? 'bg-slate-400 group-hover:bg-slate-700' : 'bg-slate-600 group-hover:bg-white'
          }`} />
        </div>

        {/* Block 2: Interactive Multiple Choice & Placeholder Selectors (Fills proportional share) */}
        {detectedTokens.length > 0 && (
          <>
            <div 
              style={{ flex: `${midPercent} 1 0%` }}
              className={`flex flex-col min-h-[85px] border-b ${theme.border} w-full overflow-hidden`}
            >
              <div className={`p-3 flex-1 min-h-0 overflow-y-auto flex flex-col w-full ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 shrink-0">
                  <span className={`font-bold text-[11px] flex items-center gap-1.5 ${
                    isLight ? 'text-slate-800' : 'text-slate-200'
                  }`}>
                    <ListOrdered className={`w-3.5 h-3.5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                    Настройка значений плейсхолдеров ({detectedTokens.length}):
                  </span>

                  {/* Field Height Modes */}
                  <div className={`flex items-center gap-1 p-0.5 rounded border text-[10.5px] ${
                    isLight ? 'bg-white border-slate-300 shadow-xs' : 'bg-slate-950/80 border-slate-800'
                  }`}>
                    <span className={`text-[10px] px-1 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Размер полей:
                    </span>
                    <button
                      type="button"
                      onClick={() => setFieldSizeMode('compact')}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        fieldSizeMode === 'compact'
                          ? 'bg-purple-600 text-white font-bold'
                          : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Компактный: 1 строка"
                    >
                      1 стр
                    </button>
                    <button
                      type="button"
                      onClick={() => setFieldSizeMode('normal')}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        fieldSizeMode === 'normal'
                          ? 'bg-purple-600 text-white font-bold'
                          : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Стандартный: 2-3 строки с возможностью растягивания"
                    >
                      3 стр
                    </button>
                    <button
                      type="button"
                      onClick={() => setFieldSizeMode('expanded')}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        fieldSizeMode === 'expanded'
                          ? 'bg-purple-600 text-white font-bold'
                          : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Большой: 5 строк для развернутого описания"
                    >
                      5 стр
                    </button>
                  </div>
                </div>

                {/* Placeholders List filling remaining height of Block 2 */}
                <div className="space-y-2.5 flex-1 min-h-0 w-full">
                  {detectedTokens.map((tokenKey) => {
                    const config = placeholders.find(
                      (p) => p.key.toLowerCase() === tokenKey.toLowerCase()
                    );
                    const currentVal = resolveTokenValue(
                      tokenKey,
                      placeholders,
                      null,
                      settings.agentName,
                      tokenOverrides
                    );

                    const isChoice = config?.type === 'choice' && config.options && config.options.length > 0;
                    const isExplicitExpanded = expandedFields[tokenKey];
                    const isMultiline = isExplicitExpanded !== undefined
                      ? isExplicitExpanded
                      : fieldSizeMode !== 'compact';

                    const rowsCount = isExplicitExpanded
                      ? 5
                      : fieldSizeMode === 'expanded'
                      ? 5
                      : fieldSizeMode === 'normal'
                      ? 3
                      : 1;

                    return (
                      <div
                        key={tokenKey}
                        className={`p-2.5 rounded-lg border flex flex-col gap-1.5 transition-colors w-full ${
                          isLight
                            ? 'border-slate-200 bg-white shadow-xs'
                            : 'border-slate-800 bg-slate-950/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono font-bold text-[11px] ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                              {"{{" + tokenKey + "}}"}
                            </span>
                            <span className={`text-[10.5px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                              {config?.label || tokenKey}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className={`text-[10.5px] font-medium truncate max-w-[200px] ${
                              isLight ? 'text-slate-700' : 'text-slate-300'
                            }`}>
                              Выбрано:{' '}
                              {currentVal !== '' ? (
                                <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-300 font-semibold'}>{currentVal}</span>
                              ) : (
                                <span className={isLight ? 'text-slate-400 italic' : 'text-slate-500 italic font-normal'}>(пусто)</span>
                              )}
                            </div>

                            {!isChoice && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedFields((prev) => ({
                                    ...prev,
                                    [tokenKey]: !(prev[tokenKey] ?? (fieldSizeMode !== 'compact')),
                                  }));
                                }}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                                title={isMultiline ? 'Свернуть в однострочное поле' : 'Развернуть в многострочное поле с регулировкой высоты'}
                              >
                                {isMultiline ? (
                                  <Minimize2 className={`w-3 h-3 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
                                ) : (
                                  <Maximize2 className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* If Multiple Choice: render clickable pills */}
                        {isChoice ? (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {config.options!.map((opt) => {
                              const isSelected = currentVal === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleSetOverride(tokenKey, isSelected ? '' : opt, true)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-600 text-white font-bold shadow-xs ring-1 ring-purple-400'
                                      : isLight
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                                  }`}
                                  title={isSelected ? 'Нажмите, чтобы снять выбор (сделать пустым)' : undefined}
                                >
                                  {opt}
                                  {isSelected && ' ✓'}
                                </button>
                              );
                            })}
                            {currentVal !== '' && (
                              <button
                                type="button"
                                onClick={() => handleSetOverride(tokenKey, '', true)}
                                className={`px-2 py-1 rounded text-[10.5px] transition-colors cursor-pointer border ${
                                  isLight
                                    ? 'text-rose-700 hover:text-rose-900 border-slate-300 bg-slate-100 hover:bg-rose-50'
                                    : 'text-slate-400 hover:text-rose-300 border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800'
                                }`}
                                title="Стереть выбор (пустая строка)"
                              >
                                Очистить
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Text input or resizable textarea */
                          <div className="flex items-start gap-1.5 w-full">
                            {isMultiline ? (
                              <textarea
                                rows={rowsCount}
                                value={currentVal}
                                onChange={(e) => handleSetOverride(tokenKey, e.target.value, false)}
                                placeholder={`Значение для {{${tokenKey}}} (потяните правый нижний угол для изменения высоты)`}
                                className={`flex-1 p-1.5 px-2 rounded border text-xs outline-none resize-y min-h-[44px] ${theme.input}`}
                              />
                            ) : (
                              <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => handleSetOverride(tokenKey, e.target.value, false)}
                                placeholder={`Значение для {{${tokenKey}}} (пусто)`}
                                className={`flex-1 p-1 px-2 rounded border text-xs outline-none ${theme.input}`}
                              />
                            )}

                            {currentVal !== '' && (
                              <button
                                type="button"
                                onClick={() => handleSetOverride(tokenKey, '', true)}
                                className={`p-1 rounded transition-colors cursor-pointer shrink-0 mt-0.5 ${
                                  isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}
                                title="Стереть значение (сделать пустым)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Splitter 2 between Middle and Bottom */}
            <div
              onMouseDown={(e) => {
                startDragY2Ref.current = e.clientY;
                startMidPercentRef.current = midPercent;
                setIsDraggingSplitter2(true);
              }}
              onDoubleClick={() => {
                setMidPercent(34);
              }}
              title="Потяните для изменения пропорций блоков параметров и ответа (двойной клик — сброс)"
              className={`h-1.5 hover:h-2 select-none cursor-row-resize flex items-center justify-center shrink-0 transition-all group ${
                isDraggingSplitter2
                  ? 'bg-purple-500 h-2'
                  : isLight
                  ? 'bg-slate-200 hover:bg-purple-400/50'
                  : 'bg-slate-800/80 hover:bg-purple-500/50'
              }`}
            >
              <div className={`w-10 h-0.5 rounded-full transition-colors ${
                isLight ? 'bg-slate-400 group-hover:bg-purple-600' : 'bg-slate-600 group-hover:bg-purple-300'
              }`} />
            </div>
          </>
        )}

        {/* Block 3: Real-Time Resolved Final Text Preview (Fills remaining height completely) */}
        <div 
          style={{ flex: `${bottomPercent} 1 0%` }}
          className={`min-h-[85px] ${density.card} flex flex-col justify-between overflow-hidden w-full ${
            isLight ? 'bg-slate-50/70 border-t border-slate-200' : 'bg-slate-950/40 border-t border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <span className={`font-bold text-[10.5px] uppercase tracking-wider flex items-center gap-1 ${
              isLight ? 'text-emerald-800' : 'text-emerald-400'
            }`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              Итоговый текст для отправки клиенту:
            </span>
            <div className={`text-[10.5px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {resolvedText.trim().split(/\s+/).filter(Boolean).length} слов • {resolvedText.length} симв.
            </div>
          </div>

          {/* Text preview container filling 100% of Block 3 */}
          <div
            onClick={handleCopy}
            className={`flex-1 min-h-0 p-3 rounded-lg border overflow-y-auto font-sans text-xs leading-relaxed transition-all cursor-pointer group w-full ${
              copied
                ? isLight
                  ? 'border-emerald-500 bg-emerald-50 text-slate-900 shadow-sm'
                  : 'border-emerald-500 bg-emerald-950/20'
                : isLight
                ? 'border-slate-300 bg-white hover:border-slate-400 shadow-xs'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
            title="Кликните, чтобы скопировать"
          >
            {resolvedText.trim() ? (
              <p className={`whitespace-pre-wrap font-normal select-text ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {resolvedText}
              </p>
            ) : (
              <p className={isLight ? 'text-slate-400 italic' : 'text-slate-500 italic'}>
                Итоговый текст отобразится здесь после выбора шаблона...
              </p>
            )}
          </div>

          <div className={`mt-2 pt-2 flex items-center justify-between text-[11px] shrink-0 ${
            isLight ? 'text-slate-600 border-t border-slate-200' : 'text-slate-400 border-t border-slate-800/80'
          }`}>
            <div className="flex items-center gap-1">
              <Keyboard className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
              <span>Нажмите <kbd className={`font-mono px-1 py-0.5 rounded border ${
                isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}>Ctrl + Enter</kbd> для быстрого копирования</span>
            </div>
            {unresolved.length > 0 && (
              <span className={`font-semibold text-[10px] ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                Неразрешенных токенов: {unresolved.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
