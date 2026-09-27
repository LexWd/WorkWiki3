import React, { useState, useMemo } from 'react';
import { 
  Brackets, 
  Sparkles, 
  Check, 
  Copy, 
  HelpCircle, 
  Play, 
  X, 
  ArrowRight, 
  Sliders, 
  Tag, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { PlaceholderConfig, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';
import { evaluateCondition } from '../utils/interpolator';
import { copyToClipboard } from '../utils/clipboard';

interface ConditionalPlaceholderBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeholders: PlaceholderConfig[];
  onInsertSnippet?: (conditionalSyntax: string) => void;
  onApplyToField?: (conditionalSyntax: string) => void;
  onSaveAsPlaceholder?: (data: {
    key: string;
    label: string;
    description: string;
    defaultValue: string;
  }) => void;
  settings: GuiSettings;
}

type OperatorType = 'exists' | 'not_exists' | 'equals' | 'not_equals';

interface PresetItem {
  id: string;
  name: string;
  description: string;
  variable: string;
  operator: OperatorType;
  compareValue: string;
  ifTrue: string;
  ifFalse: string;
}

const PRESETS: PresetItem[] = [
  {
    id: 'gender',
    name: 'Обращение по полу (Уважаемый / Уважаемая)',
    description: 'Приветствие клиента в зависимости от пола',
    variable: 'пол',
    operator: 'equals',
    compareValue: 'м',
    ifTrue: 'Уважаемый',
    ifFalse: 'Уважаемая',
  },
  {
    id: 'track',
    name: 'Трек-номер отправления',
    description: 'Отображение трека, если он уже сформирован',
    variable: 'трек_номер',
    operator: 'exists',
    compareValue: '',
    ifTrue: 'Ваш трек-номер для отслеживания: {{трек_номер}}',
    ifFalse: 'Трек-номер будет сформирован после передачи в доставку',
  },
  {
    id: 'delivery_type',
    name: 'Тип доставки (Курьер / Самовывоз)',
    description: 'Инструкция для курьерской доставки или ПВЗ',
    variable: 'служба_доставки',
    operator: 'equals',
    compareValue: 'Курьерская доставка',
    ifTrue: 'Курьер свяжется с вами за 1 час до прибытия.',
    ifFalse: 'Заказ поступит в выбранный пункт выдачи.',
  },
  {
    id: 'promo',
    name: 'Скидка и промокод',
    description: 'Уведомление о скидке при наличии промокода',
    variable: 'промокод',
    operator: 'exists',
    compareValue: '',
    ifTrue: 'К заказу успешно применен промокод {{промокод}}.',
    ifFalse: 'Вы можете активировать промокод в любое время в профиле.',
  },
];

export const ConditionalPlaceholderBuilderModal: React.FC<ConditionalPlaceholderBuilderModalProps> = ({
  isOpen,
  onClose,
  placeholders,
  onInsertSnippet,
  onApplyToField,
  onSaveAsPlaceholder,
  settings,
}) => {
  const [selectedVariable, setSelectedVariable] = useState<string>(() => {
    return placeholders[0]?.key || 'имя_клиента';
  });
  const [customVariable, setCustomVariable] = useState('');
  const [operator, setOperator] = useState<OperatorType>('exists');
  const [compareValue, setCompareValue] = useState('');
  const [ifTrueText, setIfTrueText] = useState('Текст, если условие выполнено');
  const [ifFalseText, setIfFalseText] = useState('Текст, если условие не выполнено');
  
  // Interactive Live Testing Sandbox
  const [testValue, setTestValue] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  const activeVariableKey = customVariable.trim() || selectedVariable;

  // Selected placeholder config if exists
  const selectedConfig = placeholders.find(
    (p) => p.key.toLowerCase() === activeVariableKey.toLowerCase()
  );

  // Generate conditional expression string
  const conditionExpression = useMemo(() => {
    switch (operator) {
      case 'not_exists':
        return `!${activeVariableKey}`;
      case 'equals':
        return `${activeVariableKey}=${compareValue.trim()}`;
      case 'not_equals':
        return `${activeVariableKey}!=${compareValue.trim()}`;
      case 'exists':
      default:
        return activeVariableKey;
    }
  }, [operator, activeVariableKey, compareValue]);

  // Full syntax: {{?condition:ifTrue|ifFalse}}
  const fullSyntax = useMemo(() => {
    if (!ifFalseText.trim()) {
      return `{{?${conditionExpression}:${ifTrueText}}}`;
    }
    return `{{?${conditionExpression}:${ifTrueText}|${ifFalseText}}}`;
  }, [conditionExpression, ifTrueText, ifFalseText]);

  // Real-time evaluation in Sandbox
  const evaluation = useMemo(() => {
    const overrides: Record<string, string> = {
      [activeVariableKey]: testValue,
    };
    return evaluateCondition(
      conditionExpression,
      placeholders,
      null,
      settings.agentName,
      overrides
    );
  }, [conditionExpression, activeVariableKey, testValue, placeholders, settings.agentName]);

  const simulatedOutput = evaluation.matched ? ifTrueText : ifFalseText;

  const handleCopyCode = async () => {
    await copyToClipboard(fullSyntax);
    soundService.playCopyChime(settings.soundEffects);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (onInsertSnippet) {
      onInsertSnippet(fullSyntax);
      soundService.playSuccess(settings.soundEffects);
      onClose();
    } else {
      handleCopyCode();
    }
  };

  const applyPreset = (preset: PresetItem) => {
    setSelectedVariable(preset.variable);
    setCustomVariable('');
    setOperator(preset.operator);
    setCompareValue(preset.compareValue);
    setIfTrueText(preset.ifTrue);
    setIfFalseText(preset.ifFalse);
    setTestValue(preset.compareValue || 'Тестовое значение');
    soundService.playClick(settings.soundEffects);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-2xl rounded-2xl border ${theme.border} ${theme.panel} shadow-2xl flex flex-col max-h-[94vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-3.5 border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent.primary} shadow-xs`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Конструктор условных плейсхолдеров
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                  If / Else
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Вставка умных условий в шаблоны ответов без ручного набора кода
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Quick Presets Bar */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Быстрые готовые шаблоны (1 клик):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-left transition-all cursor-pointer group"
                >
                  <span className="font-semibold text-slate-200 block truncate group-hover:text-sky-300">
                    {preset.name.split('(')[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Builder Form */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3.5">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
              1. Настройка условия:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Variable selector */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block text-[11px]">
                  Переменная / Плейсхолдер:
                </label>
                <select
                  value={selectedVariable}
                  onChange={(e) => {
                    setSelectedVariable(e.target.value);
                    setCustomVariable('');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-sky-500"
                >
                  <optgroup label="Настроенные плейсхолдеры">
                    {placeholders.map((p) => (
                      <option key={p.id} value={p.key}>
                        {p.label} (&#123;&#123;{p.key}&#125;&#125;)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Системные переменные">
                    <option value="имя_оператора">имя_оператора</option>
                    <option value="дата">дата</option>
                    <option value="время">время</option>
                  </optgroup>
                </select>
                <input
                  type="text"
                  value={customVariable}
                  onChange={(e) => setCustomVariable(e.target.value)}
                  placeholder="Или своя переменная..."
                  className="w-full px-2 py-1 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 outline-none focus:border-sky-500 mt-1"
                />
              </div>

              {/* Operator */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block text-[11px]">
                  Условие:
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as OperatorType)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-sky-500"
                >
                  <option value="exists">Заполнено / Не пусто</option>
                  <option value="not_exists">Не заполнено / Пусто</option>
                  <option value="equals">Равно конкретному значению (=)</option>
                  <option value="not_equals">Не равно значению (!=)</option>
                </select>
              </div>

              {/* Compare Value (if equals/not_equals) */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block text-[11px]">
                  Значение для сравнения:
                </label>
                <input
                  type="text"
                  disabled={operator === 'exists' || operator === 'not_exists'}
                  value={compareValue}
                  onChange={(e) => setCompareValue(e.target.value)}
                  placeholder={operator === 'exists' ? '(любое значение)' : 'Например: м, курьер...'}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-sky-500 disabled:opacity-40"
                />

                {/* Quick pills from choice placeholder */}
                {selectedConfig?.type === 'choice' && selectedConfig.options && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedConfig.options.slice(0, 4).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setOperator('equals');
                          setCompareValue(opt);
                        }}
                        className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Branches: If True & If False */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-emerald-400 font-semibold flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Текст, если условие ВЫПОЛНЕНО (Истина):</span>
                </label>
                <textarea
                  rows={3}
                  value={ifTrueText}
                  onChange={(e) => setIfTrueText(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-emerald-500/40 text-xs text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="Текст или шаблон с переменными {{...}}"
                />
              </div>

              <div className="space-y-1">
                <label className="text-amber-400 font-semibold flex items-center gap-1.5 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Текст, если условие НЕ ВЫПОЛНЕНО (Иначе / Ложь):</span>
                </label>
                <textarea
                  rows={3}
                  value={ifFalseText}
                  onChange={(e) => setIfFalseText(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-amber-500/40 text-xs text-slate-100 outline-none focus:border-amber-400"
                  placeholder="Оставьте пустым, если ветка «Иначе» не нужна"
                />
              </div>
            </div>
          </div>

          {/* Generated Syntax Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-sky-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1">
                <Brackets className="w-3.5 h-3.5" />
                Сгенерированный код условия:
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано!' : 'Копировать код'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-sky-200 select-all break-all">
              {fullSyntax}
            </div>
          </div>

          {/* Interactive Live Testing Sandbox */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Песочница: Тестирование работы в реальном времени
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                evaluation.matched 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                  : 'bg-amber-950 text-amber-300 border border-amber-700'
              }`}>
                {evaluation.matched ? 'Сработало: ДА (Истина)' : 'Сработало: ИНАЧЕ (Ложь)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs shrink-0">
                Значение переменной «{activeVariableKey}»:
              </span>
              <input
                type="text"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                placeholder="Введите тестовое значение для проверки..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setTestValue('')}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                title="Очистить значение для проверки условия отсутствия"
              >
                Очистить (Пусто)
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block font-semibold">
                Итоговый текст, который получит клиент:
              </span>
              <div className="text-xs text-slate-100 font-medium">
                {simulatedOutput || <span className="text-slate-500 italic">(пусто)</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3.5 border-t ${theme.border} ${theme.panelHeader} flex items-center justify-between shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Отмена
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Скопировать код</span>
            </button>

            {onApplyToField && (
              <button
                type="button"
                onClick={() => {
                  onApplyToField(fullSyntax);
                  soundService.playSuccess(settings.soundEffects);
                  onClose();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-md cursor-pointer ${accent.primary}`}
              >
                <Check className="w-4 h-4" />
                <span>Применить в поле плейсхолдера</span>
              </button>
            )}

            {onSaveAsPlaceholder && (
              <button
                type="button"
                onClick={() => {
                  const safeKey = `условие_${activeVariableKey.replace(/[^a-zA-Zа-яА-ЯёЁ0-9_]/g, '_').toLowerCase()}`;
                  onSaveAsPlaceholder({
                    key: safeKey,
                    label: `Условие: ${activeVariableKey}`,
                    description: `Динамическое условие на основе «${activeVariableKey}»`,
                    defaultValue: fullSyntax,
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-md cursor-pointer bg-purple-600 hover:bg-purple-500 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Создать плейсхолдер с условием</span>
              </button>
            )}

            {onInsertSnippet && (
              <button
                type="button"
                onClick={handleInsert}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-md cursor-pointer ${accent.primary}`}
              >
                <ArrowRight className="w-4 h-4" />
                <span>Вставить в шаблон</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
