import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  Zap, 
  Brackets, 
  ListOrdered, 
  CheckCircle2, 
  ExternalLink,
  Keyboard,
  Info,
  X,
  Maximize2,
  Minimize2,
  Sliders,
} from 'lucide-react';
import { Snippet, PlaceholderConfig, ExcelRow, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses, getDensityPadding } from '../utils/theme';
import { extractTokens, interpolateSnippet, resolveTokenValue } from '../utils/interpolator';
import { soundService } from '../utils/sound';

interface LiveComposerAndResolverProps {
  selectedSnippet: Snippet | null;
  snippets: Snippet[];
  placeholders: PlaceholderConfig[];
  activeRow: ExcelRow | null;
  settings: GuiSettings;
  onCopyResolved: (text: string, title?: string) => void;
  onSelectSnippet: (snippet: Snippet) => void;
  onUpdateSettings?: (partial: Partial<GuiSettings>) => void;
}

export const LiveComposerAndResolver: React.FC<LiveComposerAndResolverProps> = ({
  selectedSnippet,
  snippets,
  placeholders,
  activeRow,
  settings,
  onCopyResolved,
  onSelectSnippet,
  onUpdateSettings,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);

  // Height of composer textarea
  const [composerHeight, setComposerHeight] = useState<number>(() => settings.composerHeight || 90);
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const dragStartYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(90);

  // Placeholder panel resize state & field size adjustments
  const [placeholderPanelHeight, setPlaceholderPanelHeight] = useState<number | 'auto'>(() => {
    try {
      const saved = localStorage.getItem('quickreply_placeholder_section_height');
      if (saved === 'auto') return 'auto';
      return saved ? parseInt(saved, 10) : 220;
    } catch {
      return 220;
    }
  });
  const [isResizingPlaceholderPanel, setIsResizingPlaceholderPanel] = useState(false);
  const dragPlaceholderStartYRef = useRef<number>(0);
  const startPlaceholderHeightRef = useRef<number>(220);

  // Field size mode: 'compact' (1 line) | 'normal' (2-3 lines) | 'expanded' (5 lines)
  const [fieldSizeMode, setFieldSizeMode] = useState<'compact' | 'normal' | 'expanded'>('normal');
  // Per-field override: allows toggling individual fields between compact and multiline
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);
  const density = getDensityPadding(settings.density);

  // Drag listener for composer height
  useEffect(() => {
    if (!isResizingHeight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartYRef.current;
      const newHeight = Math.max(55, Math.min(320, startHeightRef.current + deltaY));
      setComposerHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingHeight(false);
      onUpdateSettings?.({ composerHeight });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingHeight, composerHeight, onUpdateSettings]);

  // Drag listener for placeholder panel height
  useEffect(() => {
    if (!isResizingPlaceholderPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragPlaceholderStartYRef.current;
      const newHeight = Math.max(90, Math.min(550, startPlaceholderHeightRef.current + deltaY));
      setPlaceholderPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingPlaceholderPanel(false);
      try {
        if (typeof placeholderPanelHeight === 'number') {
          localStorage.setItem('quickreply_placeholder_section_height', placeholderPanelHeight.toString());
        }
      } catch (err) {
        console.warn('Failed to save placeholder section height:', err);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPlaceholderPanel, placeholderPanelHeight]);

  // When selected snippet changes, update input text
  useEffect(() => {
    if (selectedSnippet) {
      setInputText(selectedSnippet.content);
      setTokenOverrides({});
    }
  }, [selectedSnippet]);

  // Extract all tokens in the current composer text
  const detectedTokens = useMemo(() => {
    return extractTokens(inputText);
  }, [inputText]);

  // Calculate live resolved text (Excel tables are decoupled from templates)
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

  return (
    <div className={`flex flex-col h-full ${theme.panel} overflow-hidden text-xs select-none min-w-0`}>
      {/* Header */}
      <div className={`${density.card} border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${accent.primary}`}>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xs text-slate-100">
                {selectedSnippet ? selectedSnippet.title : 'Быстрый редактор и подстановка'}
              </h2>
              {selectedSnippet && (
                <span className="font-mono text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/80">
                  {selectedSnippet.shortcut}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Интерактивный выбор вариантов плейсхолдеров и копирование в буфер обмена
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {Object.keys(tokenOverrides).length > 0 && (
            <button
              onClick={handleResetOverrides}
              className="flex items-center gap-1 text-[10.5px] text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30"
              title="Сбросить выбранные вручную значения"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сброс выбора</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={!resolvedText.trim()}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md transition-transform active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white'
                : !resolvedText.trim()
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-400'
                : `${accent.primary}`
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано в буфер!' : 'Копировать ответ'}</span>
            <kbd className="hidden lg:inline font-mono text-[9px] bg-black/20 px-1 py-0.2 rounded opacity-80">
              Ctrl+Enter
            </kbd>
          </button>
        </div>
      </div>

      {/* Main interactive area: split into Template Editor & Dynamic Resolver */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top: Raw Input / Template text with autocomplete */}
        <div className={`${density.card} border-b border-slate-800 shrink-0 relative`}>
          <div className="flex items-center justify-between mb-1.5 text-[10.5px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-300">
              Текст шаблона с плейсхолдерами:
            </span>
            <div className="flex items-center gap-2">
              {/* Preset size buttons */}
              <div className="hidden sm:flex items-center gap-1 text-[9.5px]">
                <span className="text-slate-500">Высота:</span>
                <button
                  type="button"
                  onClick={() => {
                    setComposerHeight(65);
                    onUpdateSettings?.({ composerHeight: 65 });
                  }}
                  className={`px-1.5 py-0.5 rounded border ${
                    composerHeight <= 75 ? 'bg-sky-500/30 text-sky-300 border-sky-400/50' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Компакт
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposerHeight(115);
                    onUpdateSettings?.({ composerHeight: 115 });
                  }}
                  className={`px-1.5 py-0.5 rounded border ${
                    composerHeight > 75 && composerHeight <= 140 ? 'bg-sky-500/30 text-sky-300 border-sky-400/50' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Средний
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposerHeight(190);
                    onUpdateSettings?.({ composerHeight: 190 });
                  }}
                  className={`px-1.5 py-0.5 rounded border ${
                    composerHeight > 140 ? 'bg-sky-500/30 text-sky-300 border-sky-400/50' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Большой
                </button>
              </div>

              <span>
                Введите <code className="text-sky-300 font-mono">/</code> для команд
              </span>
            </div>
          </div>

          <div className="relative">
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
              style={{ height: `${composerHeight}px` }}
              className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed outline-none resize-none font-sans transition-[height] duration-75 ${theme.input}`}
            />

            {/* Slash-command suggestion popover */}
            {matchingSlashSnippets.length > 0 && (
              <div className="absolute left-0 bottom-full mb-1 z-30 w-80 rounded-lg bg-slate-900 border border-slate-700 shadow-2xl p-1 animate-slide-up">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  Быстрые ответы ({matchingSlashSnippets.length})
                </div>
                {matchingSlashSnippets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSlashSnippet(s)}
                    className="w-full text-left p-2 rounded hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">{s.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.shortcut}</div>
                    </div>
                    <span className="text-[10px] text-sky-400 font-mono bg-sky-950 px-1 py-0.5 rounded border border-sky-800">
                      Вставить ↵
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resizable horizontal splitter handle between composer and resolver */}
        <div
          onMouseDown={(e) => {
            dragStartYRef.current = e.clientY;
            startHeightRef.current = composerHeight;
            setIsResizingHeight(true);
          }}
          onDoubleClick={() => {
            setComposerHeight(90);
            onUpdateSettings?.({ composerHeight: 90 });
          }}
          title="Потяните для изменения высоты редактора (двойной клик — сброс к 90px)"
          className={`h-1.5 hover:h-2 select-none cursor-row-resize flex items-center justify-center transition-all group ${
            isResizingHeight ? 'bg-sky-500 h-2' : 'bg-slate-800/80 hover:bg-sky-500/50'
          }`}
        >
          <div className="w-10 h-0.5 rounded-full bg-slate-600 group-hover:bg-white transition-colors" />
        </div>

        {/* Middle: Interactive Multiple Choice & Placeholder Selectors with Resizing */}
        {detectedTokens.length > 0 && (
          <div className="flex flex-col shrink-0 border-b border-slate-800">
            <div 
              style={{ 
                height: placeholderPanelHeight === 'auto' ? 'auto' : `${placeholderPanelHeight}px`,
                maxHeight: placeholderPanelHeight === 'auto' ? 'none' : `${placeholderPanelHeight}px` 
              }}
              className="p-3 bg-slate-900/40 overflow-y-auto"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <span className="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-purple-400" />
                  Настройка значений плейсхолдеров ({detectedTokens.length}):
                </span>

                {/* Sizing & Mode Controls */}
                <div className="flex items-center gap-2">
                  {/* Field Height Modes */}
                  <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded border border-slate-800 text-[10.5px]">
                    <span className="text-[10px] text-slate-400 px-1 font-medium">
                      Размер полей:
                    </span>
                    <button
                      type="button"
                      onClick={() => setFieldSizeMode('compact')}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        fieldSizeMode === 'compact'
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Компактный: 1 строка"
                    >
                      1 стр
                    </button>
                    <button
                      type="button"
                      onClick={() => setFieldSizeMode('normal')}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        fieldSizeMode === 'normal'
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Стандартный: 2-3 строки с возможностью растягивания"
                    >
                      3 стр
                    </button>
                    <button
                      type="button"
                      onClick={() => setFieldSizeMode('expanded')}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        fieldSizeMode === 'expanded'
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Большой: 5 строк для развернутого описания"
                    >
                      5 стр
                    </button>
                  </div>

                  {/* Panel Height Presets */}
                  <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded border border-slate-800 text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => {
                        setPlaceholderPanelHeight(150);
                        try { localStorage.setItem('quickreply_placeholder_section_height', '150'); } catch {}
                      }}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        placeholderPanelHeight === 150 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Высота блока 150px"
                    >
                      150px
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlaceholderPanelHeight(230);
                        try { localStorage.setItem('quickreply_placeholder_section_height', '230'); } catch {}
                      }}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        placeholderPanelHeight === 230 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Высота блока 230px (стандарт)"
                    >
                      230px
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlaceholderPanelHeight('auto');
                        try { localStorage.setItem('quickreply_placeholder_section_height', 'auto'); } catch {}
                      }}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        placeholderPanelHeight === 'auto' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Автоматическая высота (без ограничения)"
                    >
                      Авто
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
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
                      className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sky-400 font-bold text-[11px]">
                            {"{{" + tokenKey + "}}"}
                          </span>
                          <span className="text-slate-400 text-[10.5px]">
                            {config?.label || tokenKey}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-[10.5px] text-slate-300 font-medium truncate max-w-[200px]">
                            Выбрано:{' '}
                            {currentVal !== '' ? (
                              <span className="text-emerald-300 font-semibold">{currentVal}</span>
                            ) : (
                              <span className="text-slate-500 italic font-normal">(пусто)</span>
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
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              title={isMultiline ? 'Свернуть в однострочное поле' : 'Развернуть в многострочное поле с регулировкой высоты'}
                            >
                              {isMultiline ? (
                                <Minimize2 className="w-3 h-3 text-sky-400" />
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
                                    ? 'bg-purple-600 text-white font-bold shadow-sm ring-1 ring-purple-400'
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
                              className="px-2 py-1 rounded text-[10.5px] text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Стереть выбор (пустая строка)"
                            >
                              Очистить
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Text input or resizable textarea */
                        <div className="flex items-start gap-1.5">
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
                              className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0 mt-0.5"
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

            {/* Draggable Resizer for Placeholder Panel */}
            <div
              onMouseDown={(e) => {
                dragPlaceholderStartYRef.current = e.clientY;
                startPlaceholderHeightRef.current = typeof placeholderPanelHeight === 'number' ? placeholderPanelHeight : 220;
                setIsResizingPlaceholderPanel(true);
              }}
              onDoubleClick={() => {
                setPlaceholderPanelHeight(220);
                try { localStorage.setItem('quickreply_placeholder_section_height', '220'); } catch {}
              }}
              title="Потяните для изменения высоты блока плейсхолдеров (двойной клик — сброс к 220px)"
              className={`h-1.5 hover:h-2 select-none cursor-row-resize flex items-center justify-center transition-all group ${
                isResizingPlaceholderPanel ? 'bg-purple-500 h-2' : 'bg-slate-800/80 hover:bg-purple-500/50'
              }`}
            >
              <div className="w-10 h-0.5 rounded-full bg-slate-600 group-hover:bg-purple-300 transition-colors" />
            </div>
          </div>
        )}

        {/* Bottom: Real-Time Resolved Final Text Preview */}
        <div className={`flex-1 ${density.card} flex flex-col justify-between overflow-hidden bg-slate-950/40`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-[10.5px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Итоговый текст для отправки клиенту:
            </span>
            <div className="text-[10.5px] text-slate-500">
              {resolvedText.trim().split(/\s+/).filter(Boolean).length} слов • {resolvedText.length} симв.
            </div>
          </div>

          <div
            onClick={handleCopy}
            className={`flex-1 p-3 rounded-lg border overflow-y-auto font-sans text-xs leading-relaxed transition-all cursor-pointer group ${
              copied
                ? 'border-emerald-500 bg-emerald-950/20'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
            title="Кликните, чтобы скопировать"
          >
            {resolvedText.trim() ? (
              <p className="whitespace-pre-wrap text-slate-100 font-normal select-text">
                {resolvedText}
              </p>
            ) : (
              <p className="text-slate-500 italic">
                Итоговый текст отобразится здесь после выбора шаблона...
              </p>
            )}
          </div>

          <div className="mt-2 pt-2 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <Keyboard className="w-3.5 h-3.5 text-sky-400" />
              <span>Нажмите <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-200">Ctrl + Enter</kbd> для быстрого копирования</span>
            </div>
            {unresolved.length > 0 && (
              <span className="text-amber-400 text-[10px]">
                Неразрешенных токенов: {unresolved.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
