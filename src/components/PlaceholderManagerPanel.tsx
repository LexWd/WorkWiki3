import React, { useState } from 'react';
import { 
  Brackets, 
  Plus, 
  ListOrdered, 
  Type, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  RotateCcw, 
  Sparkles, 
  Link2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { PlaceholderConfig, PlaceholderType, ExcelTable, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';
import { DEFAULT_PLACEHOLDERS } from '../data/defaultData';
import { ConfirmDialogModal } from './ConfirmDialogModal';

interface PlaceholderManagerPanelProps {
  placeholders: PlaceholderConfig[];
  onUpdatePlaceholders: (placeholders: PlaceholderConfig[]) => void;
  tables: ExcelTable[];
  settings: GuiSettings;
}

export const PlaceholderManagerPanel: React.FC<PlaceholderManagerPanelProps> = ({
  placeholders,
  onUpdatePlaceholders,
  tables,
  settings,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Form states for creating / editing
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<PlaceholderType>('choice');
  const [formOptions, setFormOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [formDefaultVal, setFormDefaultVal] = useState('');
  const [formBinding, setFormBinding] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  // Collect all available Excel columns from all tables
  const availableColumns = Array.from(
    new Set(tables.flatMap((t) => t.columns.map((c) => c.name)))
  );

  const startEdit = (p: PlaceholderConfig) => {
    setEditingId(p.id);
    setIsCreatingNew(false);
    setFormKey(p.key);
    setFormLabel(p.label);
    setFormDesc(p.description || '');
    setFormType(p.type);
    setFormOptions(p.options ? [...p.options] : []);
    setFormDefaultVal(p.defaultValue);
    setFormBinding(p.excelColumnBinding || '');
    setFormError(null);
  };

  const startCreate = () => {
    setIsCreatingNew(true);
    setEditingId(null);
    setFormKey('');
    setFormLabel('');
    setFormDesc('');
    setFormType('choice');
    setFormOptions(['Вариант 1', 'Вариант 2']);
    setFormDefaultVal('');
    setFormBinding('');
    setFormError(null);
  };

  const cancelForm = () => {
    setEditingId(null);
    setIsCreatingNew(false);
    setFormError(null);
  };

  const handleAddOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (!formOptions.includes(trimmed)) {
      setFormOptions([...formOptions, trimmed]);
      if (!formDefaultVal) setFormDefaultVal(trimmed);
    }
    setNewOptionInput('');
  };

  const handleRemoveOption = (opt: string) => {
    const updated = formOptions.filter((o) => o !== opt);
    setFormOptions(updated);
    if (formDefaultVal === opt) {
      setFormDefaultVal(updated[0] || '');
    }
  };

  const handleSave = () => {
    const cleanKey = formKey.trim().replace(/[{}]/g, '').toLowerCase().replace(/\s+/g, '_');
    if (!cleanKey) {
      setFormError('Пожалуйста, укажите ключ плейсхолдера (например: служба_доставки)');
      return;
    }

    const payload: PlaceholderConfig = {
      id: isCreatingNew ? 'ph-' + Date.now() : editingId!,
      key: cleanKey,
      label: formLabel.trim() || cleanKey,
      description: formDesc.trim(),
      type: formType,
      options: formType === 'choice' ? formOptions : undefined,
      defaultValue: formDefaultVal.trim(),
      excelColumnBinding: formBinding || undefined,
    };

    if (isCreatingNew) {
      onUpdatePlaceholders([...placeholders, payload]);
    } else {
      onUpdatePlaceholders(placeholders.map((p) => (p.id === editingId ? payload : p)));
    }

    cancelForm();
    soundService.playCopyChime(settings.soundEffects);
  };

  const handleDelete = (id: string) => {
    setIdToDelete(id);
  };

  const handleResetDefaults = () => {
    setIsResetConfirmOpen(true);
  };

  return (
    <div className={`flex flex-col h-full ${theme.panel} overflow-hidden text-xs select-none`}>
      {/* Header */}
      <div className={`p-3 border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${accent.primary}`}>
            <Brackets className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-100">База данных плейсхолдеров (Placeholder Customization)</h2>
            <p className="text-[11px] text-slate-400">
              Стандартные данные, множественный выбор (Multiple choice) и привязка к колонкам Excel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] border border-slate-700 hover:border-slate-500 text-slate-300 transition-colors`}
            title="Восстановить стандартный набор плейсхолдеров"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Сброс к стандарту</span>
          </button>

          <button
            onClick={startCreate}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold text-xs shadow-sm ${accent.primary}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый плейсхолдер</span>
          </button>
        </div>
      </div>

      {/* Main List and Editor Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left / Top List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 border-r border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center justify-between">
            <span>Зарегистрированные плейсхолдеры ({placeholders.length})</span>
            <span className="text-slate-500">Кликните для редактирования</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {placeholders.map((p) => (
              <div
                key={p.id}
                onClick={() => startEdit(p)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  editingId === p.id
                    ? `${accent.primaryMuted} border-sky-400 ring-1 ring-sky-400/40`
                    : `${theme.card} hover:border-slate-600`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sky-400 bg-sky-950/60 border border-sky-800/80 px-1.5 py-0.5 rounded text-[11px]">
                        {"{{" + p.key + "}}"}
                      </span>
                      <span className="font-semibold text-slate-200 text-xs">{p.label}</span>
                    </div>
                    {p.description && (
                      <p className="text-[10.5px] text-slate-400 mt-1">{p.description}</p>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                      p.type === 'choice'
                        ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {p.type === 'choice' ? 'Множественный выбор' : 'Текст'}
                  </span>
                </div>

                {/* Multiple choice options preview */}
                {p.type === 'choice' && p.options && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block mb-1">
                      Варианты выбора ({p.options.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {p.options.map((opt) => (
                        <span
                          key={opt}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-sans ${
                            opt === p.defaultValue
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700 font-semibold'
                              : 'bg-slate-800/70 text-slate-300 border border-slate-700/60'
                          }`}
                        >
                          {opt} {opt === p.defaultValue && '✓'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Binding and default info */}
                <div className="mt-2 pt-1.5 flex items-center justify-between text-[10.5px] text-slate-400">
                  <div className="truncate">
                    По умолч.:{' '}
                    {p.defaultValue ? (
                      <strong className="text-slate-200 font-mono">{p.defaultValue}</strong>
                    ) : (
                      <span className="text-amber-400/90 font-medium italic font-mono">(пусто)</span>
                    )}
                  </div>
                  {p.excelColumnBinding && (
                    <div className="flex items-center gap-1 text-emerald-400 shrink-0">
                      <Link2 className="w-3 h-3" />
                      <span>Excel: {p.excelColumnBinding}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right / Bottom Editor Form */}
        {(isCreatingNew || editingId) && (
          <div className="w-full md:w-[380px] lg:w-[420px] p-4 bg-slate-950/70 overflow-y-auto flex flex-col justify-between shrink-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                  {isCreatingNew ? 'Создание плейсхолдера' : 'Настройка плейсхолдера'}
                </span>
                <button onClick={cancelForm} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-2 rounded bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Key */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Ключ токена (без скобок, например: <code className="text-sky-300 font-mono">служба_доставки</code>)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-slate-500">{"{{"}</span>
                  <input
                    type="text"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    placeholder="ключ_токена"
                    className={`w-full pl-7 pr-7 py-1.5 rounded border font-mono text-xs outline-none ${theme.input}`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-slate-500">{"}}"}</span>
                </div>
              </div>

              {/* Label & Description */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Название для оператора
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Служба доставки"
                  className={`w-full p-1.5 rounded border text-xs outline-none ${theme.input}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Краткое описание / подсказка
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Курьерская компания или сервис перевозки"
                  className={`w-full p-1.5 rounded border text-xs outline-none ${theme.input}`}
                />
              </div>

              {/* Type: Text vs Multiple Choice */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Тип плейсхолдера
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('choice')}
                    className={`p-2 rounded border flex flex-col items-center text-center transition-all ${
                      formType === 'choice'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200 ring-1 ring-purple-500/40'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <ListOrdered className="w-4 h-4 mb-1 text-purple-400" />
                    <span className="font-semibold text-xs">Множественный выбор</span>
                    <span className="text-[9.5px] opacity-70">Список вариантов выбора</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('text')}
                    className={`p-2 rounded border flex flex-col items-center text-center transition-all ${
                      formType === 'text'
                        ? 'bg-sky-950/60 border-sky-500 text-sky-200 ring-1 ring-sky-500/40'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Type className="w-4 h-4 mb-1 text-sky-400" />
                    <span className="font-semibold text-xs">Текстовое поле</span>
                    <span className="text-[9.5px] opacity-70">Свободный ввод значения</span>
                  </button>
                </div>
              </div>

              {/* Multiple Choice Options Manager */}
              {formType === 'choice' && (
                <div className="p-2.5 rounded-lg border border-purple-900/50 bg-purple-950/20 space-y-2">
                  <label className="block text-[11px] font-semibold text-purple-200">
                    Варианты для множественного выбора
                  </label>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      placeholder="Добавить вариант (например: СДЭК)..."
                      className={`flex-1 p-1.5 rounded border text-xs outline-none ${theme.input}`}
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-2.5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {/* Explicit empty default option for choice */}
                    <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800 text-xs">
                      <span className="text-slate-400 italic">Без предвыбора (пустое по умолчанию)</span>
                      <button
                        type="button"
                        onClick={() => setFormDefaultVal('')}
                        className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                          formDefaultVal === ''
                            ? 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-400'
                            : 'text-slate-400 hover:text-slate-200 bg-slate-800'
                        }`}
                        title="Оставить значение пустым до выбора оператором"
                      >
                        {formDefaultVal === '' ? 'По умолч. (пусто) ✓' : 'Сделать пустым'}
                      </button>
                    </div>

                    {formOptions.map((opt) => (
                      <div
                        key={opt}
                        className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 border border-slate-800 text-xs"
                      >
                        <span className="truncate text-slate-200">{opt}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setFormDefaultVal(formDefaultVal === opt ? '' : opt)}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              formDefaultVal === opt
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Сделать значением по умолчанию (или кликните снова, чтобы сделать пустым)"
                          >
                            {formDefaultVal === opt ? 'По умолч. ✓' : 'Выбрать'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt)}
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Value for text type */}
              {formType === 'text' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-300">
                      Значение по умолчанию
                    </label>
                    {formDefaultVal !== '' && (
                      <button
                        type="button"
                        onClick={() => setFormDefaultVal('')}
                        className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        Сделать пустым
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formDefaultVal}
                    onChange={(e) => setFormDefaultVal(e.target.value)}
                    placeholder="Оставьте пустым для пустого значения по умолчанию"
                    className={`w-full p-1.5 rounded border text-xs outline-none ${theme.input}`}
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {formDefaultVal.trim() === ''
                      ? '✓ Пустое значение: шаблон будет ждать ввода от оператора или останется пустым.'
                      : 'Это значение будет автоматически подставляться в шаблон.'}
                  </span>
                </div>
              )}

              {/* Excel Column Binding */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                  Привязать к колонке Excel (автозаполнение из строки)
                </label>
                <select
                  value={formBinding}
                  onChange={(e) => setFormBinding(e.target.value)}
                  className={`w-full p-1.5 rounded border text-xs outline-none cursor-pointer ${theme.input}`}
                >
                  <option value="">-- Без привязки к Excel --</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      Колонка Excel: {col}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Когда в таблице выбрана строка, значение возьмется напрямую из нее.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2 mt-4">
              {!isCreatingNew && editingId && (
                <button
                  type="button"
                  onClick={() => handleDelete(editingId)}
                  className="px-2.5 py-1.5 rounded border border-rose-800/80 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 text-xs"
                >
                  Удалить
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className={`px-4 py-1.5 rounded font-semibold text-xs shadow-sm ${accent.primary}`}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation: Delete placeholder */}
      <ConfirmDialogModal
        isOpen={idToDelete !== null}
        title="Удалить плейсхолдер?"
        description={
          idToDelete ? (
            <div>
              Вы действительно хотите удалить плейсхолдер{' '}
              <strong className="text-rose-300 font-mono">
                {"{{" + (placeholders.find((p) => p.id === idToDelete)?.key || '') + "}}"}
              </strong>?
            </div>
          ) : null
        }
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        icon="trash"
        onConfirm={() => {
          if (idToDelete) {
            onUpdatePlaceholders(placeholders.filter((p) => p.id !== idToDelete));
            if (editingId === idToDelete) {
              cancelForm();
            }
            setIdToDelete(null);
            soundService.playClick(settings.soundEffects);
          }
        }}
        onCancel={() => setIdToDelete(null)}
      />

      {/* Confirmation: Reset placeholders */}
      <ConfirmDialogModal
        isOpen={isResetConfirmOpen}
        title="Сбросить плейсхолдеры?"
        description="Восстановить стандартные заводские плейсхолдеры? Все добавленные вручную параметры будут заменены."
        confirmText="Сбросить"
        cancelText="Отмена"
        variant="warning"
        icon="reset"
        onConfirm={() => {
          onUpdatePlaceholders(DEFAULT_PLACEHOLDERS);
          setIsResetConfirmOpen(false);
          soundService.playCopyChime(settings.soundEffects);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
