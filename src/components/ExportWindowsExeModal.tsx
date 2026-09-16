import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Terminal, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Layers, 
  ShieldCheck, 
  Zap, 
  FolderDown, 
  Monitor, 
  Cpu, 
  FileCode, 
  HelpCircle,
  Pin
} from 'lucide-react';
import { getThemeClasses } from '../utils/theme';
import { GuiSettings } from '../types';

interface ExportWindowsExeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GuiSettings;
  onNotification?: (msg: string) => void;
}

export const ExportWindowsExeModal: React.FC<ExportWindowsExeModalProps> = ({
  isOpen,
  onClose,
  settings,
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'github' | 'manual'>('quick');
  const [copiedCode, setCopiedCode] = useState(false);
  const theme = getThemeClasses(settings.theme);

  if (!isOpen) return null;

  const copyCommand = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    onNotification?.('Команда сборки скопирована в буфер обмена!');
  };

  const handleDownloadBat = () => {
    const batContent = `@echo off
chcp 65001 >nul
title QuickReply Desk — Сборка Windows EXE
cls

echo ====================================================================
echo             QuickReply Desk — Сборка EXE для Windows
echo ====================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден в системе!
    echo Пожалуйста, установите Node.js LTS: https://nodejs.org/
    echo Или выполните: winget install OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)

echo [1/3] Проверка и установка зависимостей (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось установить зависимости npm.
    pause
    exit /b 1
)

echo.
echo [2/3] Компиляция приложения и упаковка в Windows EXE (Portable + Setup)...
call npm run electron:build:win
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сборка electron-builder завершилась с ошибкой.
    pause
    exit /b 1
)

echo.
echo [3/3] Сборка успешно завершена!
echo Файлы готовы в папке release/
start "" "release"
pause
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build-exe.bat';
    a.click();
    URL.revokeObjectURL(url);
    onNotification?.('Файл build-exe.bat скачан!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${theme.panel} ${theme.border}`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Экспорт в Windows (.exe)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Electron Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Полная поддержка сборки автономного Portable EXE и классического инсталлятора
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Top Feature Cards: Portable vs Setup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sky-300 font-semibold text-sm">
                  <Zap className="w-4 h-4 text-sky-400" />
                  QuickReply-Desk-Portable.exe
                </div>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono">
                  Хит для смены
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Один файл без установки и прав администратора. Идеально для рабочих компьютеров с ограниченными правами. Можно носить на флешке.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Не оставляет следов в реестре
              </div>
            </div>

            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  QuickReply Desk Setup.exe
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">
                  Инсталлятор
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Полноценный установщик для постоянной работы: ярлыки на рабочем столе, в меню «Пуск» и автозапуск при включении Windows.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Интеграция с треем и автообновлениями
              </div>
            </div>
          </div>

          {/* Navigation Tabs for Export Methods */}
          <div>
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-4">
              <button
                onClick={() => setActiveTab('quick')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'quick'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Способ 1: Сборка в 1 клик (.bat)
              </button>
              <button
                onClick={() => setActiveTab('github')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'github'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Способ 2: Облако GitHub Actions
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'manual'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Способ 3: Через терминал
              </button>
            </div>

            {/* Tab 1: 1-Click BAT */}
            {activeTab === 'quick' && (
              <div className="space-y-4 rounded-xl p-4 border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">
                    1
                  </span>
                  Скачайте архив проекта
                </div>
                <p className="text-xs text-slate-400 pl-7">
                  В правом верхнем меню Google AI Studio нажмите шестерёнку / меню проекта и выберите <strong className="text-slate-200">Export to ZIP</strong>. Распакуйте архив в любую папку на компьютере.
                </p>

                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">
                    2
                  </span>
                  Запустите скрипт сборки
                </div>
                <p className="text-xs text-slate-400 pl-7">
                  В распакованной папке дважды кликните по файлу <code className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-sky-300">build-exe.bat</code>. Он уже включен в архив!
                </p>

                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">
                    3
                  </span>
                  Готово! Файлы в папке release/
                </div>
                <p className="text-xs text-slate-400 pl-7">
                  Скрипт автоматически установит зависимости, скомпилирует приложение и откроет проводник Windows с готовыми файлами <span className="text-emerald-400 font-mono">QuickReply-Desk-Portable.exe</span>.
                </p>

                <div className="pt-2 flex flex-wrap gap-2.5">
                  <button
                    onClick={handleDownloadBat}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Скачать скрипт сборки (build-exe.bat)
                  </button>
                  <button
                    onClick={() => copyCommand('winget install OpenJS.NodeJS.LTS')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    winget install OpenJS.NodeJS.LTS
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: GitHub Actions */}
            {activeTab === 'github' && (
              <div className="space-y-4 rounded-xl p-4 border border-slate-800 bg-slate-900/40">
                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
                  <strong>Сборка без установки программ на компьютер:</strong> В проект уже добавлен готовый файл <code className="text-sky-300 font-mono">.github/workflows/build-windows.yml</code>. Сервера GitHub соберут Windows EXE бесплатно в облаке!
                </div>

                <div className="space-y-3 text-xs text-slate-300 pl-1">
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-sky-400 font-bold">1.</span>
                    <span>В меню AI Studio нажмите <strong>Export to GitHub</strong> и отправьте код в свой репозиторий.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-sky-400 font-bold">2.</span>
                    <span>Откройте репозиторий на GitHub и перейдите во вкладку <strong>Actions</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-sky-400 font-bold">3.</span>
                    <span>Выберите рабочий процесс <strong>Build Windows Executables</strong> и нажмите кнопку <strong>Run workflow</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-sky-400 font-bold">4.</span>
                    <span>Через 2–3 минуты скачайте готовый архив с <strong>.exe</strong> файлом из раздела <strong>Artifacts</strong>.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Manual Terminal */}
            {activeTab === 'manual' && (
              <div className="space-y-3 rounded-xl p-4 border border-slate-800 bg-slate-900/40">
                <p className="text-xs text-slate-300">
                  Если вы разработчик и предпочитаете командную строку (CMD, PowerShell или Git Bash):
                </p>

                <div className="relative">
                  <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-sky-300 font-mono overflow-x-auto leading-relaxed">
                    {`# 1. Установка зависимостей
npm install

# 2. Сборка Windows EXE (Portable + Setup)
npm run electron:build:win

# 3. Или только Portable EXE
npm run electron:build:portable`}
                  </pre>
                  <button
                    onClick={() => copyCommand('npm install && npm run electron:build:win')}
                    className="absolute top-3 right-3 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Perks Summary */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Встроенные фичи десктопного приложения Windows
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2 text-slate-300">
                <span className="text-sky-400 font-bold">•</span>
                <span><strong>Трей Windows:</strong> сворачивание рядом с часами, быстрое разворачивание по двойному клику.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <span className="text-sky-400 font-bold">•</span>
                <span><strong>Глобальный хоткей:</strong> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-sky-300">Ctrl+Alt+Q</kbd> мгновенно открывает окно поверх любого приложения.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <span className="text-sky-400 font-bold">•</span>
                <span><strong>Поверх всех окон:</strong> закрепление окна, чтобы оно не скрывалось при переходе в тикет-систему.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <span className="text-sky-400 font-bold">•</span>
                <span><strong>Память мониторов:</strong> приложение автоматически сохраняет позицию и размер окна при перезапуске.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Подробная инструкция записана в файле <code className="text-slate-300 font-mono">EXPORT_WINDOWS_EXE.md</code></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
