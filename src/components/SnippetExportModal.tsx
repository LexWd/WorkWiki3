import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  X, 
  FileJson, 
  Layers, 
  FolderDown, 
  Tag, 
  Zap, 
  Code,
  Info
} from 'lucide-react';
import { Snippet, SnippetCollectionExport, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';

interface SnippetExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: Snippet[];
  initialCategory: string;
  availableCategories: string[];
  settings: GuiSettings;
  onNotify?: (title: string, message: string) => void;
}

export const SnippetExportModal: React.FC<SnippetExportModalProps> = ({
  isOpen,
  onClose,
  snippets,
  initialCategory,
  availableCategories,
  settings,
  onNotify,
}) => {
  // Category selection for export
  const [selectedCollection, setSelectedCollection] = useState<string>(() => {
    if (initialCategory && initialCategory !== 'Все') {
      return initialCategory;
    }
    const categoriesWithSnippets = availableCategories.filter(
      (c) => c !== 'Все' && snippets.some((s) => s.category === c)
    );
    return categoriesWithSnippets[0] || 'Все';
  });

  const [customCollectionName, setCustomCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [resetUsageStats, setResetUsageStats] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  // Filter snippets belonging to the selected collection
  const exportSnippets = useMemo(() => {
    if (selectedCollection === 'Все') {
      return snippets;
    }
    return snippets.filter((s) => s.category === selectedCollection);
  }, [snippets, selectedCollection]);

  // Construct JSON object
  const exportObject = useMemo((): SnippetCollectionExport => {
    const finalName = customCollectionName.trim() || (selectedCollection === 'Все' ? 'Все коллекции' : selectedCollection);
    return {
      format: 'smart-desk-snippet-collection',
      version: 1,
      collectionName: finalName,
      category: selectedCollection === 'Все' ? 'Все' : selectedCollection,
      description: collectionDescription.trim() || undefined,
      exportedAt: new Date().toISOString(),
      count: exportSnippets.length,
      snippets: exportSnippets.map((s) => ({
        ...s,
        usageCount: resetUsageStats ? 0 : s.usageCount,
      })),
    };
  }, [selectedCollection, customCollectionName, collectionDescription, resetUsageStats, exportSnippets]);

  const jsonString = useMemo(() => {
    return JSON.stringify(exportObject, null, 2);
  }, [exportObject]);

  if (!isOpen) return null;

  // Sanitize filename slug
  const getDownloadFilename = () => {
    const name = (customCollectionName.trim() || selectedCollection)
      .toLowerCase()
      .replace(/[^a-zа-я0-9_-]/gi, '_')
      .replace(/_+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    return `snippets_${name || 'collection'}_${dateStr}.json`;
  };

  const handleDownload = () => {
    if (exportSnippets.length === 0) return;

    try {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getDownloadFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      soundService.playCopyChime(settings.soundEffects);
      if (onNotify) {
        onNotify('Экспорт выполнен', `Файл «${getDownloadFilename()}» успешно скачан (${exportSnippets.length} шаблонов)`);
      }
      onClose();
    } catch (e) {
      console.error('Export download failed', e);
    }
  };

  const handleCopyJson = () => {
    if (exportSnippets.length === 0) return;

    navigator.clipboard.writeText(jsonString).then(() => {
      setIsCopied(true);
      soundService.playCopyChime(settings.soundEffects);
      if (onNotify) {
        onNotify('JSON скопирован', `Коллекция «${exportObject.collectionName}» скопирована в буфер обмена`);
      }
      setTimeout(() => setIsCopied(false), 2000);
    }).catch((err) => {
      console.warn('Clipboard write failed', err);
    });
  };

  // Group snippet count by category for helper list
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of availableCategories) {
      if (c === 'Все') {
        counts[c] = snippets.length;
      } else {
        counts[c] = snippets.filter((s) => s.category === c).length;
      }
    }
    return counts;
  }, [availableCategories, snippets]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-xl rounded-xl border shadow-2xl p-5 ${theme.panel} ${theme.border} max-h-[92vh] flex flex-col text-xs`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              <FolderDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Экспорт коллекции шаблонов
              </h3>
              <p className="text-[11px] text-slate-400">
                Сохранение выбранной коллекции быстрых ответов в формате JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-4">
          {/* Collection Selector */}
          <div>
            <label className="block font-medium text-slate-200 mb-1.5">
              Выберите индивидуальную коллекцию для экспорта:
            </label>
            <select
              value={selectedCollection}
              onChange={(e) => {
                setSelectedCollection(e.target.value);
                setCustomCollectionName('');
              }}
              className={`w-full p-2 rounded-lg border text-xs outline-none font-medium ${theme.input}`}
            >
              {availableCategories.map((cat) => {
                const count = categoryCounts[cat] || 0;
                return (
                  <option key={cat} value={cat}>
                    {cat === 'Все' ? `★ Все коллекции (${count} шаблонов)` : `${cat} (${count} шаблонов)`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Collection Name & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Имя коллекции в файле (опционально)
              </label>
              <input
                type="text"
                value={customCollectionName}
                onChange={(e) => setCustomCollectionName(e.target.value)}
                placeholder={selectedCollection}
                className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Описание коллекции (опционально)
              </label>
              <input
                type="text"
                value={collectionDescription}
                onChange={(e) => setCollectionDescription(e.target.value)}
                placeholder="Для операторов 1 линии, шаблонные ответы..."
                className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={resetUsageStats}
                onChange={(e) => setResetUsageStats(e.target.checked)}
                className="rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <span>Сбросить счётчики использования в экспортируемом файле (обнулить)</span>
            </label>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                Будет экспортировано: <strong className="text-sky-400 font-mono">{exportSnippets.length}</strong> шаблонов
              </span>

              <button
                type="button"
                onClick={() => setShowJsonPreview(!showJsonPreview)}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
              >
                <Code className="w-3.5 h-3.5" />
                <span>{showJsonPreview ? 'Скрыть код JSON' : 'Показать код JSON'}</span>
              </button>
            </div>
          </div>

          {/* Raw JSON Preview */}
          {showJsonPreview && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 max-h-48 overflow-y-auto">
              <pre className="font-mono text-[10px] text-emerald-400 whitespace-pre-wrap break-all leading-snug">
                {jsonString}
              </pre>
            </div>
          )}

          {/* Snippets in Collection Preview */}
          <div>
            <span className="block font-medium text-slate-300 mb-1.5">
              Содержимое коллекции ({exportSnippets.length}):
            </span>
            {exportSnippets.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-slate-500">
                В выбранной категории нет шаблонов для экспорта.
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 divide-y divide-slate-800/80 max-h-48 overflow-y-auto">
                {exportSnippets.map((s) => (
                  <div key={s.id} className="p-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200 truncate">{s.title}</span>
                        <span className="font-mono text-[9.5px] text-sky-400 bg-sky-950/60 border border-sky-800/70 px-1 rounded">
                          {s.shortcut}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                        {s.content}
                      </p>
                    </div>
                    <span className="font-mono text-[9.5px] text-slate-500 shrink-0">
                      {s.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium"
          >
            Закрыть
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              disabled={exportSnippets.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors ${
                exportSnippets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Скопировать JSON в буфер обмена"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Скопировано!' : 'Копировать JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={exportSnippets.length === 0}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all ${accent.primary} ${
                exportSnippets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Скачать коллекцию как .json файл"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать JSON файл</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
