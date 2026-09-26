import React from 'react';
import { 
  MessageSquare, 
  Truck, 
  RotateCcw, 
  Cpu, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Folder, 
  Tag, 
  Star, 
  Layers, 
  Package, 
  ShieldCheck, 
  HeartHandshake, 
  HelpCircle, 
  FileText, 
  Headphones, 
  Sparkles, 
  LifeBuoy
} from 'lucide-react';
import { CategoryColor, CategoryMetadata, CustomIcon } from '../types';
import { storage } from './storage';

export interface CategoryColorDef {
  id: CategoryColor;
  label: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  dotColor: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  ringColor: string;
  hoverBorder: string;
  subtleBadge: string;
}

export const CATEGORY_COLOR_DEFS: Record<CategoryColor, CategoryColorDef> = {
  sky: {
    id: 'sky',
    label: 'Небесный',
    pillBg: 'bg-sky-500/10',
    pillBorder: 'border-sky-500/30',
    pillText: 'text-sky-300',
    dotColor: 'bg-sky-400',
    activeBg: 'bg-sky-500/25',
    activeBorder: 'border-sky-400',
    activeText: 'text-sky-200',
    ringColor: 'ring-sky-400/40',
    hoverBorder: 'hover:border-sky-500/50',
    subtleBadge: 'bg-sky-950/40 text-sky-300 border-sky-800/60',
  },
  emerald: {
    id: 'emerald',
    label: 'Изумрудный',
    pillBg: 'bg-emerald-500/10',
    pillBorder: 'border-emerald-500/30',
    pillText: 'text-emerald-300',
    dotColor: 'bg-emerald-400',
    activeBg: 'bg-emerald-500/25',
    activeBorder: 'border-emerald-400',
    activeText: 'text-emerald-200',
    ringColor: 'ring-emerald-400/40',
    hoverBorder: 'hover:border-emerald-500/50',
    subtleBadge: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
  },
  amber: {
    id: 'amber',
    label: 'Янтарный',
    pillBg: 'bg-amber-500/10',
    pillBorder: 'border-amber-500/30',
    pillText: 'text-amber-300',
    dotColor: 'bg-amber-400',
    activeBg: 'bg-amber-500/25',
    activeBorder: 'border-amber-400',
    activeText: 'text-amber-200',
    ringColor: 'ring-amber-400/40',
    hoverBorder: 'hover:border-amber-500/50',
    subtleBadge: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
  },
  purple: {
    id: 'purple',
    label: 'Фиолетовый',
    pillBg: 'bg-purple-500/10',
    pillBorder: 'border-purple-500/30',
    pillText: 'text-purple-300',
    dotColor: 'bg-purple-400',
    activeBg: 'bg-purple-500/25',
    activeBorder: 'border-purple-400',
    activeText: 'text-purple-200',
    ringColor: 'ring-purple-400/40',
    hoverBorder: 'hover:border-purple-500/50',
    subtleBadge: 'bg-purple-950/40 text-purple-300 border-purple-800/60',
  },
  rose: {
    id: 'rose',
    label: 'Коралловый',
    pillBg: 'bg-rose-500/10',
    pillBorder: 'border-rose-500/30',
    pillText: 'text-rose-300',
    dotColor: 'bg-rose-400',
    activeBg: 'bg-rose-500/25',
    activeBorder: 'border-rose-400',
    activeText: 'text-rose-200',
    ringColor: 'ring-rose-400/40',
    hoverBorder: 'hover:border-rose-500/50',
    subtleBadge: 'bg-rose-950/40 text-rose-300 border-rose-800/60',
  },
  indigo: {
    id: 'indigo',
    label: 'Индиго',
    pillBg: 'bg-indigo-500/10',
    pillBorder: 'border-indigo-500/30',
    pillText: 'text-indigo-300',
    dotColor: 'bg-indigo-400',
    activeBg: 'bg-indigo-500/25',
    activeBorder: 'border-indigo-400',
    activeText: 'text-indigo-200',
    ringColor: 'ring-indigo-400/40',
    hoverBorder: 'hover:border-indigo-500/50',
    subtleBadge: 'bg-indigo-950/40 text-indigo-300 border-indigo-800/60',
  },
  cyan: {
    id: 'cyan',
    label: 'Бирюзовый',
    pillBg: 'bg-cyan-500/10',
    pillBorder: 'border-cyan-500/30',
    pillText: 'text-cyan-300',
    dotColor: 'bg-cyan-400',
    activeBg: 'bg-cyan-500/25',
    activeBorder: 'border-cyan-400',
    activeText: 'text-cyan-200',
    ringColor: 'ring-cyan-400/40',
    hoverBorder: 'hover:border-cyan-500/50',
    subtleBadge: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60',
  },
  slate: {
    id: 'slate',
    label: 'Графитовый',
    pillBg: 'bg-slate-500/10',
    pillBorder: 'border-slate-500/30',
    pillText: 'text-slate-300',
    dotColor: 'bg-slate-400',
    activeBg: 'bg-slate-500/25',
    activeBorder: 'border-slate-400',
    activeText: 'text-slate-200',
    ringColor: 'ring-slate-400/40',
    hoverBorder: 'hover:border-slate-500/50',
    subtleBadge: 'bg-slate-900 text-slate-300 border-slate-700/60',
  },
};

export const AVAILABLE_CATEGORY_ICONS: { id: string; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'Folder', label: 'Папка', icon: Folder },
  { id: 'MessageSquare', label: 'Диалог / Приветствие', icon: MessageSquare },
  { id: 'Truck', label: 'Доставка / Логистика', icon: Truck },
  { id: 'RotateCcw', label: 'Возврат / Обмен', icon: RotateCcw },
  { id: 'CreditCard', label: 'Оплата / Счета', icon: CreditCard },
  { id: 'Cpu', label: 'Техподдержка', icon: Cpu },
  { id: 'AlertTriangle', label: 'Эскалации / Претензии', icon: AlertTriangle },
  { id: 'CheckCircle', label: 'Завершение / Успех', icon: CheckCircle },
  { id: 'ShieldCheck', label: 'Гарантия / Безопасность', icon: ShieldCheck },
  { id: 'Package', label: 'Товары / Заказы', icon: Package },
  { id: 'Star', label: 'Избранное', icon: Star },
  { id: 'HeartHandshake', label: 'Лояльность / Клиенты', icon: HeartHandshake },
  { id: 'Headphones', label: 'Оператор / Чат', icon: Headphones },
  { id: 'Tag', label: 'Теги / Метки', icon: Tag },
  { id: 'Layers', label: 'Все коллекции', icon: Layers },
  { id: 'HelpCircle', label: 'Помощь / FAQ', icon: HelpCircle },
  { id: 'FileText', label: 'Документы / Инструкции', icon: FileText },
  { id: 'Sparkles', label: 'Специальное', icon: Sparkles },
  { id: 'LifeBuoy', label: 'SOS / Срочно', icon: LifeBuoy },
];

export function renderCategoryIcon(
  iconName?: string, 
  className: string = 'w-3.5 h-3.5',
  customIcons?: CustomIcon[]
): React.ReactNode {
  if (!iconName) return <Folder className={className} />;

  // 1. Direct Data URL or external image
  if (iconName.startsWith('data:image') || iconName.startsWith('http://') || iconName.startsWith('https://')) {
    return <img src={iconName} alt="" className={`${className} object-contain rounded-xs shrink-0`} />;
  }

  // 2. Direct SVG string
  if (iconName.startsWith('<svg')) {
    return (
      <span 
        className={`${className} inline-flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current`}
        dangerouslySetInnerHTML={{ __html: iconName }}
      />
    );
  }

  // 3. Custom icon ID from storage or passed list
  if (iconName.startsWith('custom_') || iconName.startsWith('ci_')) {
    const list = customIcons || storage.loadCustomIcons();
    const found = list.find((ci) => ci.id === iconName);
    if (found) {
      if (found.dataUrl.startsWith('<svg')) {
        return (
          <span 
            className={`${className} inline-flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current`}
            dangerouslySetInnerHTML={{ __html: found.dataUrl }}
          />
        );
      }
      return <img src={found.dataUrl} alt={found.name} className={`${className} object-contain rounded-xs shrink-0`} />;
    }
  }

  switch (iconName) {
    case 'MessageSquare':
      return <MessageSquare className={className} />;
    case 'Truck':
      return <Truck className={className} />;
    case 'RotateCcw':
      return <RotateCcw className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'CreditCard':
      return <CreditCard className={className} />;
    case 'AlertTriangle':
      return <AlertTriangle className={className} />;
    case 'CheckCircle':
      return <CheckCircle className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Package':
      return <Package className={className} />;
    case 'Star':
      return <Star className={className} />;
    case 'HeartHandshake':
      return <HeartHandshake className={className} />;
    case 'Headphones':
      return <Headphones className={className} />;
    case 'Tag':
      return <Tag className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'HelpCircle':
      return <HelpCircle className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'LifeBuoy':
      return <LifeBuoy className={className} />;
    case 'Folder':
    default:
      return <Folder className={className} />;
  }
}

/**
 * Returns color and icon metadata for a given category name
 */
export function getCategoryMeta(
  categoryName: string,
  customMap?: Record<string, CategoryMetadata>
): { color: CategoryColor; icon: string; style: CategoryColorDef } {
  // 1. Check custom overrides from map
  if (customMap && customMap[categoryName]) {
    const custom = customMap[categoryName];
    const colorKey = custom.color || getDefaultCategoryColor(categoryName);
    const iconKey = custom.icon || getDefaultCategoryIcon(categoryName);
    return {
      color: colorKey,
      icon: iconKey,
      style: CATEGORY_COLOR_DEFS[colorKey] || CATEGORY_COLOR_DEFS.slate,
    };
  }

  // 2. Intelligent defaults based on category name
  const colorKey = getDefaultCategoryColor(categoryName);
  const iconKey = getDefaultCategoryIcon(categoryName);

  return {
    color: colorKey,
    icon: iconKey,
    style: CATEGORY_COLOR_DEFS[colorKey] || CATEGORY_COLOR_DEFS.slate,
  };
}

function getDefaultCategoryColor(cat: string): CategoryColor {
  const norm = cat.toLowerCase();
  if (norm === 'все') return 'sky';
  if (norm.includes('избранн') || norm.includes('⭐')) return 'amber';
  if (norm.includes('привет') || norm.includes('начало') || norm.includes('старт')) return 'emerald';
  if (norm.includes('доставк') || norm.includes('заказ') || norm.includes('курьер') || norm.includes('логист')) return 'sky';
  if (norm.includes('возврат') || norm.includes('компенсац') || norm.includes('обмен')) return 'amber';
  if (norm.includes('техн') || norm.includes('сбой') || norm.includes('ошибк') || norm.includes('баг')) return 'indigo';
  if (norm.includes('оплат') || norm.includes('счет') || norm.includes('деньг') || norm.includes('чек') || norm.includes('банк')) return 'purple';
  if (norm.includes('эскалац') || norm.includes('претензи') || norm.includes('жалоб') || norm.includes('конфликт')) return 'rose';
  if (norm.includes('заверш') || norm.includes('прощан') || norm.includes('финал')) return 'cyan';
  if (norm.includes('гарант') || norm.includes('сертификат')) return 'emerald';
  return 'slate';
}

function getDefaultCategoryIcon(cat: string): string {
  const norm = cat.toLowerCase();
  if (norm === 'все') return 'Layers';
  if (norm.includes('избранн') || norm.includes('⭐')) return 'Star';
  if (norm.includes('привет') || norm.includes('начало')) return 'MessageSquare';
  if (norm.includes('доставк') || norm.includes('логист') || norm.includes('курьер')) return 'Truck';
  if (norm.includes('возврат') || norm.includes('обмен')) return 'RotateCcw';
  if (norm.includes('техн') || norm.includes('сбой') || norm.includes('ошибк')) return 'Cpu';
  if (norm.includes('оплат') || norm.includes('счет') || norm.includes('банк')) return 'CreditCard';
  if (norm.includes('эскалац') || norm.includes('претензи') || norm.includes('жалоб')) return 'AlertTriangle';
  if (norm.includes('заверш') || norm.includes('финал')) return 'CheckCircle';
  if (norm.includes('гарант') || norm.includes('безопасн')) return 'ShieldCheck';
  if (norm.includes('заказ') || norm.includes('товар')) return 'Package';
  if (norm.includes('помощ') || norm.includes('faq')) return 'HelpCircle';
  return 'Folder';
}
