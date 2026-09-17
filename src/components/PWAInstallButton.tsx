import React, { useState } from 'react';
import { Download, Check, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already installed, hide prompt button
  if (isInstalled && !justInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 3500);
    }
  };

  if (justInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-medium">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>Установлено</span>
      </div>
    );
  }

  // Chromium / Desktop / Android flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sky-500/50 bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 text-xs font-semibold shadow-sm transition-all hover:scale-102 active:scale-98 cursor-pointer ${className}`}
        title="Установить QuickReply Desk как отдельное приложение (PWA)"
      >
        <Download className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
        <span>{variant === 'full' ? 'Установить приложение' : 'Установить PWA'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer ${className}`}
          title="Инструкция по установке на iPhone/iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          <span>На экран «Домой»</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 font-bold text-sm text-sky-300">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>Установка на iOS (Safari)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                1. Нажмите кнопку <strong>«Поделиться» (Share)</strong> в нижней панели Safari.<br />
                2. Пролистайте вниз и выберите <strong>«На экран "Домой"» (Add to Home Screen)</strong>.<br />
                3. Приложение появится среди ваших иконок и будет работать офлайн.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
