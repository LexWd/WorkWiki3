import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, RotateCcw, X } from 'lucide-react';

export interface ConfirmDialogModalProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: 'trash' | 'alert' | 'reset';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Удалить',
  cancelText = 'Отмена',
  variant = 'danger',
  icon = 'trash',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const iconBg =
    variant === 'danger'
      ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
      : variant === 'warning'
      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
      : 'bg-sky-500/20 border-sky-500/30 text-sky-400';

  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-500 text-slate-900 shadow-amber-900/50 font-bold'
      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/50';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden animate-scale-up"
      >
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${iconBg}`}>
              {icon === 'trash' && <Trash2 className="w-5 h-5" />}
              {icon === 'alert' && <AlertTriangle className="w-5 h-5" />}
              {icon === 'reset' && <RotateCcw className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm text-slate-100 leading-snug">{title}</h3>
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors"
                  title="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2 text-xs text-slate-300 leading-relaxed break-words">
                {description}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer ${confirmBtnClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
