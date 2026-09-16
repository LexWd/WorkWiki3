import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { GuiSettings } from '../types';
import { getThemeClasses } from '../utils/theme';

export interface ToastItem {
  id: string;
  title: string;
  preview: string;
}

interface ToastNoticeProps {
  toasts: ToastItem[];
  settings: GuiSettings;
}

export const ToastNotice: React.FC<ToastNoticeProps> = ({ toasts, settings }) => {
  const theme = getThemeClasses(settings.theme);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-3 rounded-lg border shadow-2xl flex items-start gap-2.5 max-w-sm backdrop-blur-md animate-slide-up pointer-events-auto ${theme.panel} ${theme.border}`}
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-slate-100 truncate">{toast.title}</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded shrink-0">
                Скопировано
              </span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 font-sans leading-relaxed">
              {toast.preview}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
