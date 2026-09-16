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
  Info
} from 'lucide-react';
import { Snippet, PlaceholderConfig, ExcelRow, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

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

  // Calculate live resolved text
  const { result: resolvedText, unresolved } = useMemo(() => {
    return interpolateSnippet(
      inputText,
      placeholders,
      activeRow,
      settings.agentName,
      tokenOverrides
    );
  }, [inputText, placeholders, activeRow, settings.agentName, tokenOverrides]);

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
    const slashMatch = beforeCursor.match(/\/([a-zA-Zа-яА-Я0-9_]*)$/);

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
    const slashMatch = beforeCursor.match(/\/([a-zA-Zа-яА-Я0-9_]*)$/);

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

  const handleSetOverride = (tokenKey: string, value: string) => {
    setTokenOverrides((prev) => ({ ...prev, [tokenKey]: value }));
    soundService.playClick(settings.soundEffects);
  };

  const handleResetOverrides = () => {
    setTokenOverrides({});
    soundService.playClick(settings.soundEffects);
  };

  return (
    <div className={`flex flex-col h-full ${theme.panel} overflow-hidden text-xs select-none`}>
      {/* Header */}
      <div className={`p-2.5 border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between shrink-0`}>
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
        <div className="p-3 border-b border-slate-800 shrink-0 relative">
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

        {/* Middle: Interactive Multiple Choice & Placeholder Selectors */}
        {detectedTokens.length > 0 && (
          <div className="p-3 border-b border-slate-800 bg-slate-900/40 overflow-y-auto max-h-56 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-purple-400" />
                Настройка значений плейсхолдеров ({detectedTokens.length}):
              </span>
              {activeRow && (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Привязано к выбранной строке Excel
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {detectedTokens.map((tokenKey) => {
                const config = placeholders.find(
                  (p) => p.key.toLowerCase() === tokenKey.toLowerCase()
                );
                const currentVal = resolveTokenValue(
                  tokenKey,
                  placeholders,
                  activeRow,
                  settings.agentName,
                  tokenOverrides
                );

                const isChoice = config?.type === 'choice' && config.options && config.options.length > 0;
                const isOverridden = tokenKey in tokenOverrides;
                const isBoundToExcel = Boolean(config?.excelColumnBinding && activeRow?.data?.[config.excelColumnBinding]);

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
                        {isBoundToExcel && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9.5px]">
                            из Excel ({config!.excelColumnBinding})
                          </span>
                        )}
                      </div>

                      <div className="text-[10.5px] text-slate-300 font-medium truncate max-w-[200px]">
                        Выбрано: <span className="text-emerald-300 font-semibold">{currentVal}</span>
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
                              onClick={() => handleSetOverride(tokenKey, opt)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                isSelected
                                  ? 'bg-purple-600 text-white font-bold shadow-sm ring-1 ring-purple-400'
                                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                              }`}
                            >
                              {opt}
                              {isSelected && ' ✓'}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Text input field */
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => handleSetOverride(tokenKey, e.target.value)}
                          placeholder={`Значение для {{${tokenKey}}}`}
                          className={`flex-1 p-1 rounded border text-xs outline-none ${theme.input}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom: Real-Time Resolved Final Text Preview */}
        <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden bg-slate-950/40">
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
