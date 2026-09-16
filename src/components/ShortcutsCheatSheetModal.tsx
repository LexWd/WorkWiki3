import React, { useState, useEffect } from 'react';
import { X, Keyboard, Zap } from 'lucide-react';
import { GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';

interface ShortcutsCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GuiSettings;
}

interface ShortcutItem {
  keys: string[];
  action: string;
  category: 'Основные' | 'Быстрые шаблоны' | 'Редактор и буфер' | 'Режимы окна';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'K'], action: 'Открыть быструю командную палитру поиска шаблонов', category: 'Основные' },
  { keys: ['/'], action: 'Вызов меню автодополнения слэш-команд при вводе текста', category: 'Редактор и буфер' },
  { keys: ['Alt', '1...9'], action: 'Мгновенное копирование закрепленного шаблона напрямую в буфер ОС', category: 'Быстрые шаблоны' },
  { keys: ['Ctrl', '1...5'], action: 'Быстрое переключение вкладок (Шаблоны / Excel / Плейсхолдеры / Ссылки / Заметки)', category: 'Режимы окна' },
  { keys: ['Ctrl', 'Enter'], action: 'Скопировать готовый сформированный ответ из редактора', category: 'Редактор и буфер' },
  { keys: ['Ctrl', 'B'], action: 'Переключить ультракомпактный режим окна Mini-HUD', category: 'Режимы окна' },
  { keys: ['Ctrl', 'Alt', 'Q'], action: 'Глобальный вызов / скрытие окна поверх любого приложения (в Windows)', category: 'Режимы окна' },
  { keys: ['Ctrl', 'N'], action: 'Создать новый шаблон быстрого ответа', category: 'Основные' },
  { keys: ['Ctrl', 'D'], action: 'Быстрое переключение на вкладку Excel-базы данных', category: 'Режимы окна' },
  { keys: ['Esc'], action: 'Закрыть любое модальное окно или палитру', category: 'Основные' },
  { keys: ['?'], action: 'Открыть эту справку по горячим клавишам', category: 'Основные' },
];

export const ShortcutsCheatSheetModal: React.FC<ShortcutsCheatSheetModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [pressedCombo, setPressedCombo] = useState<string>('');

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.metaKey) parts.push('Cmd');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (!['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
        parts.push(e.key.toUpperCase());
      }
      setPressedCombo(parts.join(' + '));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${theme.panel} ${theme.border}`}>
        {/* Header */}
        <div className={`p-3.5 border-b flex items-center justify-between ${theme.panelHeader} ${theme.border}`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${accent.primary}`}>
              <Keyboard className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Справочник горячих клавиш</h2>
              <p className="text-[11px] text-slate-400">Работа без мыши для максимальной скорости ответов клиентам</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Interactive Key Tester */}
          <div className={`p-3 rounded-lg border flex items-center justify-between ${theme.cardActive}`}>
            <div>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Интерактивный тестер клавиатуры
              </div>
              <div className="text-[11px] text-slate-400">Нажмите любое сочетание клавиш на вашей физической клавиатуре:</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs font-bold text-sky-400 min-w-[130px] text-center">
              {pressedCombo || 'Ожидание нажатия...'}
            </div>
          </div>

          {/* List of shortcuts */}
          <div className="space-y-2">
            {SHORTCUTS.map((item, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 ${theme.card}`}
              >
                <div>
                  <div className="font-medium text-slate-200 text-xs">{item.action}</div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">{item.category}</div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.keys.map((k) => (
                    <kbd
                      key={k}
                      className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-slate-200 shadow-xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-[11px] text-slate-400 ${theme.panelHeader} ${theme.border}`}>
          <span>Подсказка: нажимайте <kbd className="font-mono bg-slate-800 px-1 rounded">?</kbd> в любое время</span>
          <button
            onClick={onClose}
            className={`px-3 py-1 rounded font-semibold ${accent.primary}`}
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
