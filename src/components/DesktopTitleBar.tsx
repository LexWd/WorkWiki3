import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Pin } from 'lucide-react';

export const DesktopTitleBar: React.FC = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      setIsElectron(true);
      window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
      window.electronAPI.getAlwaysOnTop().then(setIsAlwaysOnTop).catch(() => {});
    }
  }, []);

  // Only render if inside Electron desktop app
  if (!isElectron) {
    return null;
  }

  const handleMinimize = () => {
    window.electronAPI?.minimize().catch(() => {});
  };

  const handleMaximize = async () => {
    await window.electronAPI?.maximize().catch(() => {});
    const max = await window.electronAPI?.isMaximized().catch(() => false);
    setIsMaximized(!!max);
  };

  const handleClose = () => {
    window.electronAPI?.close().catch(() => {});
  };

  const handleTogglePin = async () => {
    const next = await window.electronAPI?.toggleAlwaysOnTop().catch(() => false);
    setIsAlwaysOnTop(!!next);
  };

  return (
    <div 
      className="h-8 w-full bg-slate-950 border-b border-slate-900 flex items-center justify-between select-none shrink-0 z-50 px-2"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-2 pl-1">
        <img src="./icon.png" alt="" className="w-4 h-4 object-contain" />
        <span className="text-xs font-semibold text-slate-300">QuickReply Desk</span>
        <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
      </div>

      <div 
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={handleTogglePin}
          title={isAlwaysOnTop ? 'Открепить от верха' : 'Закрепить поверх всех окон'}
          className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
            isAlwaysOnTop ? 'text-sky-400 bg-sky-950/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleMinimize}
          title="Свернуть"
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleMaximize}
          title={isMaximized ? 'Восстановить' : 'Развернуть'}
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          {isMaximized ? <Copy className="w-3.5 h-3.5 rotate-180" /> : <Square className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleClose}
          title="Свернуть в трей"
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
