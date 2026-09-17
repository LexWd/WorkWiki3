import React, { useState } from 'react';
import { History, Copy, Check, Trash2, X, Clock } from 'lucide-react';
import { CopyHistoryItem, GuiSettings } from '../types';
import { getThemeClasses } from '../utils/theme';

interface CopyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: CopyHistoryItem[];
  onCopyItem: (item: CopyHistoryItem) => void;
  onClearHistory: () => void;
  settings: GuiSettings;
}

export const CopyHistoryModal: React.FC<CopyHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onCopyItem,
  onClearHistory,
  settings,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const theme = getThemeClasses(settings.theme);

  if (!isOpen) return null;

  const handleCopy = (item: CopyHistoryItem) => {
    onCopyItem(item);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const formatTime = (ts: number) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${theme.panel} ${theme.border}`}>
        {/* Header */}
        <div className={`p-3.5 border-b flex items-center justify-between ${theme.panelHeader} ${theme.border}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs shadow-sm">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>История скопированных ответов</span>
                <span className="text-[10.5px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 border border-slate-700 font-mono font-normal">
                  {history.length} / 30
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Последние отправленные в буфер обмена сообщения за текущую смену
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-3 space-y-2 overflow-y-auto flex-1 select-text">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">В истории пока пусто.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Скопируйте любой шаблон или скомпонованный ответ — он сохранится здесь для мгновенного повтора.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isCopied = copiedId === item.id;
              return (
                <div
                  key={item.id}
                  className="group rounded-lg border border-slate-800/80 bg-slate-900/70 hover:bg-slate-900 hover:border-slate-700 p-2.5 transition-all text-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <span className="font-semibold text-slate-200 truncate text-[12px]">
                        {item.title}
                      </span>
                      {item.category && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        {formatTime(item.copiedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30'
                        }`}
                        title="Скопировать повторно в буфер"
                      >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Скопировано' : 'Копировать'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11.5px] text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-900 whitespace-pre-wrap line-clamp-3 group-hover:line-clamp-none transition-all">
                    {item.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-xs ${theme.panelHeader} ${theme.border}`}>
          {history.length > 0 ? (
            <button
              type="button"
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить историю</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
