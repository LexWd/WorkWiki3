import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileJson, 
  Check, 
  X, 
  AlertCircle, 
  Layers, 
  FileText, 
  Plus, 
  FolderUp, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Snippet, ImportSnippetMode, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';

interface SnippetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCategory: string;
  availableCategories: string[];
  onImport: (
    snippets: Snippet[],
    mode: ImportSnippetMode,
    targetCategory?: string
  ) => void;
  settings: GuiSettings;
  onNotify?: (title: string, message: string) => void;
}

interface ParsedCollectionData {
  collectionName?: string;
  category?: string;
  description?: string;
  exportedAt?: string;
  snippets: Snippet[];
}

export const SnippetImportModal: React.FC<SnippetImportModalProps> = ({
  isOpen,
  onClose,
  currentCategory,
  availableCategories,
  onImport,
  settings,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCollectionData | null>(null);

  // Import options
  const [targetCategoryOption, setTargetCategoryOption] = useState<string>('as_is');
  const [selectedExistingCategory, setSelectedExistingCategory] = useState<string>(() => {
    return currentCategory !== 'Все' ? currentCategory : (availableCategories[1] || 'Заказы и доставка');
  });
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [importMode, setImportMode] = useState<ImportSnippetMode>('merge');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  // Parser helper function
  const parseJsonContent = (jsonString: string, sourceName?: string) => {
    setParseError(null);
    if (!jsonString.trim()) {
      setParseError('Файл или текст пуст. Вставьте валидный JSON.');
      setParsedData(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonString);
      let rawSnippets: any[] = [];
      let detectedName: string | undefined = undefined;
      let detectedCategory: string | undefined = undefined;
      let detectedDescription: string | undefined = undefined;
      let detectedExportedAt: string | undefined = undefined;

      if (Array.isArray(parsed)) {
        rawSnippets = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.snippets)) {
          rawSnippets = parsed.snippets;
        } else if (Array.isArray(parsed.items)) {
          rawSnippets = parsed.items;
        } else if (Array.isArray(parsed.data)) {
          rawSnippets = parsed.data;
        } else {
          throw new Error('В JSON объекте не найден массив шаблонов (поле "snippets" или "items")');
        }

        detectedName = parsed.collectionName || parsed.name || parsed.title;
        detectedCategory = parsed.category || detectedName;
        detectedDescription = parsed.description;
        detectedExportedAt = parsed.exportedAt;
      } else {
        throw new Error('Некорректный формат JSON (ожидался объект или массив)');
      }

      if (rawSnippets.length === 0) {
        throw new Error('В переданных данных не найдено ни одного шаблона.');
      }

      // Sanitize and validate individual snippets
      const validSnippets: Snippet[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < rawSnippets.length; i++) {
        const item = rawSnippets[i];
        if (!item || typeof item !== 'object') continue;

        const title = String(item.title || item.name || `Шаблон #${i + 1}`).trim();
        const content = String(item.content || item.text || item.body || '').trim();

        if (!title && !content) continue;

        let shortcut = String(item.shortcut || item.command || '').trim();
        if (!shortcut) {
          shortcut = '/' + title.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').slice(0, 15);
        } else if (!shortcut.startsWith('/')) {
          shortcut = '/' + shortcut;
        }

        let category = String(item.category || detectedCategory || 'Общие').trim();
        if (!category) category = 'Общие';

        let tags: string[] = [];
        if (Array.isArray(item.tags)) {
          tags = item.tags.map((t: any) => String(t).trim().toLowerCase()).filter(Boolean);
        } else if (typeof item.tags === 'string') {
          tags = item.tags.split(/[,;\s]+/).map((t: string) => t.trim().toLowerCase()).filter(Boolean);
        }

        const id = item.id && typeof item.id === 'string' ? item.id : `snip-import-${timestamp}-${i}`;
        const hotkey = typeof item.hotkey === 'string' ? item.hotkey : undefined;
        const isPinned = Boolean(item.isPinned);
        const usageCount = typeof item.usageCount === 'number' && item.usageCount >= 0 ? item.usageCount : 0;
        const updatedAt = typeof item.updatedAt === 'number' ? item.updatedAt : timestamp;

        validSnippets.push({
          id,
          title: title || 'Без названия',
          shortcut,
          category,
          content: content || 'Текст шаблона отсутствует',
          tags,
          hotkey,
          isPinned,
          usageCount,
          updatedAt,
        });
      }

      if (validSnippets.length === 0) {
        throw new Error('Файл не содержит корректных записей быстрых ответов (требуются поля title и content).');
      }

      setParsedData({
        collectionName: detectedName || sourceName || 'Импортированная коллекция',
        category: detectedCategory,
        description: detectedDescription,
        exportedAt: detectedExportedAt,
        snippets: validSnippets,
      });

      if (sourceName) {
        setFileName(sourceName);
      }
      setParseError(null);
      soundService.playCopyChime(settings.soundEffects);
    } catch (err: any) {
      console.warn('JSON parsing error:', err);
      setParseError(err.message || 'Ошибка разбора JSON файла');
      setParsedData(null);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setParseError('Пожалуйста, выберите файл с расширением .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseJsonContent(content, file.name);
    };
    reader.onerror = () => {
      setParseError('Не удалось прочитать файл');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleApplyImport = () => {
    if (!parsedData || parsedData.snippets.length === 0) return;

    let targetCat: string | undefined = undefined;

    if (targetCategoryOption === 'as_is') {
      // Keep individual categories or detected category
      targetCat = parsedData.category || undefined;
    } else if (targetCategoryOption === 'existing') {
      targetCat = selectedExistingCategory;
    } else if (targetCategoryOption === 'custom') {
      targetCat = customCategoryInput.trim() || 'Новая коллекция';
    }

    // Assign category if explicitly overridden
    const finalSnippets: Snippet[] = parsedData.snippets.map((s) => {
      if (targetCategoryOption !== 'as_is' && targetCat) {
        return { ...s, category: targetCat };
      }
      return s;
    });

    onImport(finalSnippets, importMode, targetCat);

    if (onNotify) {
      onNotify(
        'Коллекция импортирована',
        `Успешно загружено ${finalSnippets.length} шаблонов в базу данных`
      );
    }

    onClose();
  };

  // Filter existing categories excluding 'Все'
  const selectableExistingCategories = useMemo(() => {
    return availableCategories.filter((c) => c !== 'Все');
  }, [availableCategories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-xl rounded-xl border shadow-2xl p-5 ${theme.panel} ${theme.border} max-h-[92vh] flex flex-col text-xs`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <FolderUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Импорт коллекции шаблонов
              </h3>
              <p className="text-[11px] text-slate-400">
                Загрузка файла коллекции быстрых ответов в базу приложения
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-4">
          {/* Tab buttons: File Upload vs Raw Text */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold text-xs transition-all ${
                activeTab === 'file'
                  ? `${accent.primary} shadow-xs`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Загрузка JSON файла</span>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold text-xs transition-all ${
                activeTab === 'text'
                  ? `${accent.primary} shadow-xs`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Вставить JSON текстом</span>
            </button>
          </div>

          {/* File Upload Mode (Drag & Drop + Click) */}
          {activeTab === 'file' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
                    : fileName
                    ? 'border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-400'
                    : 'border-slate-700 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900/90'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                  <FileJson className={`w-5 h-5 ${fileName ? 'text-emerald-400' : 'text-sky-400'}`} />
                </div>

                {fileName ? (
                  <div>
                    <span className="font-bold text-emerald-400 text-xs block">
                      Файл выбран: {fileName}
                    </span>
                    <span className="text-[10.5px] text-slate-400 block mt-0.5">
                      Кликните или перетащите другой файл для замены
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-slate-200 text-xs block">
                      Перетащите .json файл сюда или нажмите для выбора
                    </span>
                    <span className="text-[10.5px] text-slate-400 block mt-0.5">
                      Поддерживаются коллекции Smart Desk и стандартные списки JSON
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Text Paste Mode */
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Вставьте содержимое JSON коллекции:
              </label>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  parseJsonContent(e.target.value, 'Вставленный JSON');
                }}
                rows={5}
                placeholder='{\n  "collectionName": "Заказы",\n  "snippets": [\n    { "title": "Статус заказа", "shortcut": "/статус", "content": "..." }\n  ]\n}'
                className={`w-full p-2.5 rounded-lg border font-mono text-[11px] outline-none ${theme.input}`}
              />
            </div>
          )}

          {/* Validation Error Banner */}
          {parseError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <div className="text-[11px] leading-relaxed">
                <strong className="block text-xs font-bold text-rose-200">Ошибка импорта</strong>
                {parseError}
              </div>
            </div>
          )}

          {/* Parsed Collection Preview & Config */}
          {parsedData && (
            <div className="space-y-3.5 pt-1">
              {/* Summary Stats Header */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-100 text-xs">
                      {parsedData.collectionName || 'Коллекция'}
                    </span>
                    {parsedData.category && (
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-1.5 py-0.2 rounded font-semibold">
                        {parsedData.category}
                      </span>
                    )}
                  </div>
                  {parsedData.description && (
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {parsedData.description}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="block font-mono font-bold text-sm text-emerald-400">
                    {parsedData.snippets.length}
                  </span>
                  <span className="text-[10px] text-slate-400">шаблонов готово</span>
                </div>
              </div>

              {/* Target Category Configuration */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
                <span className="font-bold text-[11px] text-slate-200 block">
                  1. Назначение коллекции / категории
                </span>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="catOption"
                      value="as_is"
                      checked={targetCategoryOption === 'as_is'}
                      onChange={() => setTargetCategoryOption('as_is')}
                      className="text-sky-500 focus:ring-0"
                    />
                    <span>
                      Сохранить категории из файла{' '}
                      {parsedData.category && (
                        <strong className="text-slate-200 font-mono">({parsedData.category})</strong>
                      )}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="catOption"
                      value="existing"
                      checked={targetCategoryOption === 'existing'}
                      onChange={() => setTargetCategoryOption('existing')}
                      className="text-sky-500 focus:ring-0"
                    />
                    <span>Поместить в существующую категорию:</span>
                  </label>

                  {targetCategoryOption === 'existing' && (
                    <div className="pl-6 pt-1">
                      <select
                        value={selectedExistingCategory}
                        onChange={(e) => setSelectedExistingCategory(e.target.value)}
                        className={`w-full p-1.5 rounded-lg border text-xs outline-none ${theme.input}`}
                      >
                        {selectableExistingCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="catOption"
                      value="custom"
                      checked={targetCategoryOption === 'custom'}
                      onChange={() => setTargetCategoryOption('custom')}
                      className="text-sky-500 focus:ring-0"
                    />
                    <span>Создать новую категорию для этой коллекции:</span>
                  </label>

                  {targetCategoryOption === 'custom' && (
                    <div className="pl-6 pt-1">
                      <input
                        type="text"
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        placeholder="Например: VIP Обслуживание или Склад"
                        className={`w-full p-1.5 rounded-lg border text-xs outline-none ${theme.input}`}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Import Mode: Merge vs Replace Category vs Replace All */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <span className="font-bold text-[11px] text-slate-200 block">
                  2. Режим импорта
                </span>

                <div className="space-y-1.5 text-[11px]">
                  <label className="flex items-start gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-sky-500 focus:ring-0"
                    />
                    <div>
                      <strong className="text-slate-100">Объединить (Рекомендуется)</strong>
                      <div className="text-[10px] text-slate-400">
                        Добавить новые шаблоны в базу данных, сохраняя текущие шаблоны
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace_category"
                      checked={importMode === 'replace_category'}
                      onChange={() => setImportMode('replace_category')}
                      className="mt-0.5 text-amber-500 focus:ring-0"
                    />
                    <div>
                      <strong className="text-amber-300">Заменить шаблоны в этой категории</strong>
                      <div className="text-[10px] text-slate-400">
                        Удалить существующие шаблоны в выбранной категории и записать новые
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace_all"
                      checked={importMode === 'replace_all'}
                      onChange={() => setImportMode('replace_all')}
                      className="mt-0.5 text-rose-500 focus:ring-0"
                    />
                    <div>
                      <strong className="text-rose-300">Заменить всю базу шаблонов</strong>
                      <div className="text-[10px] text-slate-400">
                        Перезаписать все шаблоны во всех категориях данными из этого файла
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Snippets Preview List */}
              <div>
                <span className="block font-medium text-slate-300 mb-1.5">
                  Предпросмотр шаблонов ({parsedData.snippets.length}):
                </span>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 divide-y divide-slate-800/80 max-h-40 overflow-y-auto">
                  {parsedData.snippets.map((s, idx) => (
                    <div key={idx} className="p-2 flex items-start justify-between gap-2">
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
                        {targetCategoryOption === 'as_is'
                          ? s.category
                          : targetCategoryOption === 'existing'
                          ? selectedExistingCategory
                          : customCategoryInput || 'Новая'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium"
          >
            Отмена
          </button>

          <button
            onClick={handleApplyImport}
            disabled={!parsedData || parsedData.snippets.length === 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all ${accent.primary} ${
              !parsedData || parsedData.snippets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Применить импорт шаблонов в базу"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {parsedData
                ? `Импортировать ${parsedData.snippets.length} шаблонов`
                : 'Выберите или вставьте файл'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
