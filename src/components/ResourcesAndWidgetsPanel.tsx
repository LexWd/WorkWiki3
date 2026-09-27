import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  ExternalLink, 
  RotateCw, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Pin, 
  Copy, 
  Check, 
  MapPin, 
  Calculator, 
  BookOpen, 
  Truck, 
  Layers, 
  Sparkles,
  X,
  Package,
  MessageSquare,
  Headphones,
  FileText,
  ShieldCheck,
  Database,
  ChevronDown,
  ChevronUp,
  Columns,
  Square,
  Sliders,
  Maximize2,
  AlertCircle,
  FolderCog,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  LayoutGrid
} from 'lucide-react';
import { ResourceWidget, WidgetType, WidgetIconType, GuiSettings, CustomIcon } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';
import { storage } from '../utils/storage';
import { renderCategoryIcon as renderMetaCategoryIcon } from '../utils/categoryMeta';
import { copyToClipboard } from '../utils/clipboard';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { DEFAULT_RESOURCE_CATEGORIES } from '../data/defaultData';
import { ResourceCategoryManagerModal } from './ResourceCategoryManagerModal';

interface ResourcesAndWidgetsPanelProps {
  widgets: ResourceWidget[];
  onAddWidget: (widget: ResourceWidget) => void;
  onUpdateWidget: (widget: ResourceWidget) => void;
  onDeleteWidget: (id: string) => void;
  categories?: string[];
  onAddCategory?: (category: string) => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onDeleteCategory?: (category: string, reassignTo?: string) => void;
  onResetCategories?: () => void;
  onUpdateSettings?: (partial: Partial<GuiSettings>) => void;
  customIcons?: CustomIcon[];
  settings: GuiSettings;
}

const AVAILABLE_ICONS: { id: WidgetIconType; label: string }[] = [
  { id: 'truck', label: 'Доставка' },
  { id: 'package', label: 'Посылка' },
  { id: 'map-pin', label: 'Карты / ПВЗ' },
  { id: 'globe', label: 'Веб-сервис' },
  { id: 'book-open', label: 'База знаний' },
  { id: 'headphones', label: 'Поддержка' },
  { id: 'message-square', label: 'Чат / Связь' },
  { id: 'file-text', label: 'Документы' },
  { id: 'calculator', label: 'Калькулятор' },
  { id: 'shield-check', label: 'Правила' },
  { id: 'database', label: 'База данных' },
  { id: 'sparkles', label: 'Инструмент' },
];

const COLOR_OPTIONS: { id: string; label: string; bg: string; text: string; border: string }[] = [
  { id: 'emerald', label: 'Изумрудный', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'sky', label: 'Голубой', bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
  { id: 'amber', label: 'Янтарный', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  { id: 'purple', label: 'Фиолетовый', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  { id: 'rose', label: 'Коралловый', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  { id: 'blue', label: 'Синий', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
];

export const ResourcesAndWidgetsPanel: React.FC<ResourcesAndWidgetsPanelProps> = ({
  widgets,
  onAddWidget,
  onUpdateWidget,
  onDeleteWidget,
  categories,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onResetCategories,
  customIcons = [],
  settings,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'links' | 'iframes'>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Customization & Ordering State
  const [customOrder, setCustomOrder] = useState<string[]>(() => storage.loadResourceOrder());
  const [sortMode, setSortMode] = useState<'custom' | 'pinned' | 'alpha' | 'newest'>('custom');
  const [gridCols, setGridCols] = useState<1 | 2 | 3 | 4>(() => {
    try {
      const saved = localStorage.getItem('quickreply_resource_grid_cols');
      if (saved) return Number(saved) as 1 | 2 | 3 | 4;
    } catch (_) {}
    return 3;
  });
  const [cardDensity, setCardDensity] = useState<'normal' | 'compact'>('normal');
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const [recentMovedCardId, setRecentMovedCardId] = useState<string | null>(null);
  
  // Category management modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCreatingNewCategoryInModal, setIsCreatingNewCategoryInModal] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Active categories list
  const activeCategories = useMemo(() => {
    const base = categories && categories.length > 0 ? categories : DEFAULT_RESOURCE_CATEGORIES;
    const widgetCats = widgets.map((w) => w.category).filter(Boolean);
    return Array.from(new Set([...base, ...widgetCats]));
  }, [categories, widgets]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<ResourceWidget | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [widgetToDelete, setWidgetToDelete] = useState<ResourceWidget | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('https://');
  const [formType, setFormType] = useState<WidgetType>('link');
  const [formCategory, setFormCategory] = useState('Логистика и трекинг');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formIcon, setFormIcon] = useState<WidgetIconType>('globe');
  const [formIconColor, setFormIconColor] = useState('sky');
  const [formIframeHeight, setFormIframeHeight] = useState(420);
  const [formIframeWidth, setFormIframeWidth] = useState<'full' | 'half'>('full');
  const [formIsPinned, setFormIsPinned] = useState(false);

  // Reload state tracker for iframes
  const [iframeReloadKeys, setIframeReloadKeys] = useState<Record<string, number>>({});

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  // Helper to render widget icon
  const renderWidgetIcon = (iconType?: string, className = 'w-4 h-4') => {
    if (!iconType) return <Globe className={className} />;
    
    // Check if it's a registered custom icon or image/svg
    const isCustom = customIcons.some((ci) => ci.id === iconType);
    if (isCustom || iconType.startsWith('custom_') || iconType.startsWith('ci_') || iconType.startsWith('data:image') || iconType.startsWith('<svg')) {
      return renderMetaCategoryIcon(iconType, className, customIcons);
    }

    switch (iconType) {
      case 'truck':
        return <Truck className={className} />;
      case 'package':
        return <Package className={className} />;
      case 'map-pin':
        return <MapPin className={className} />;
      case 'globe':
        return <Globe className={className} />;
      case 'book-open':
        return <BookOpen className={className} />;
      case 'headphones':
        return <Headphones className={className} />;
      case 'message-square':
        return <MessageSquare className={className} />;
      case 'file-text':
        return <FileText className={className} />;
      case 'calculator':
        return <Calculator className={className} />;
      case 'shield-check':
        return <ShieldCheck className={className} />;
      case 'database':
        return <Database className={className} />;
      case 'sparkles':
        return <Sparkles className={className} />;
      default:
        return renderMetaCategoryIcon(iconType, className, customIcons);
    }
  };

  const getColorClasses = (colorName?: string) => {
    const match = COLOR_OPTIONS.find((c) => c.id === colorName);
    return match || COLOR_OPTIONS[1]; // default sky
  };

  // Filter widgets by category, search and type
  const filteredWidgets = useMemo(() => {
    return widgets.filter((w) => {
      // Category filter
      if (selectedCategory !== 'Все' && w.category !== selectedCategory) {
        return false;
      }
      // View type filter
      if (viewFilter === 'links' && w.type !== 'link') return false;
      if (viewFilter === 'iframes' && w.type !== 'iframe') return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        w.title.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q)) ||
        w.url.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [widgets, selectedCategory, viewFilter, searchQuery]);

  // Separate links and iframes for dashboard sectioning
  const rawLinkCards = useMemo(() => {
    return filteredWidgets.filter((w) => w.type === 'link');
  }, [filteredWidgets]);

  // Sorted and custom-ordered link cards
  const sortedLinkCards = useMemo(() => {
    const list = [...rawLinkCards];
    if (sortMode === 'pinned') {
      return list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    }
    if (sortMode === 'alpha') {
      return list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    }
    if (sortMode === 'newest') {
      return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
    // 'custom' order
    return list.sort((a, b) => {
      // pinned stay at the very top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [rawLinkCards, sortMode, customOrder]);

  const handleMoveCard = (cardId: string, direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIds = sortedLinkCards.map((c) => c.id);
    const idx = currentIds.indexOf(cardId);
    if (idx === -1) return;
    const targetIdx = direction === 'prev' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentIds.length) return;

    const newOrder = [...currentIds];
    const [removed] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, removed);

    const allOtherIds = widgets.map((w) => w.id).filter((id) => !currentIds.includes(id));
    const fullOrder = [...newOrder, ...allOtherIds];

    setCustomOrder(fullOrder);
    storage.saveResourceOrder(fullOrder);
    setRecentMovedCardId(cardId);
    setTimeout(() => setRecentMovedCardId(null), 1800);
    soundService.playClick(settings.soundEffects);
  };

  const handleDragStart = (cardId: string, e: React.DragEvent) => {
    setDraggingCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCard = (targetCardId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggingCardId || draggingCardId === targetCardId) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const position = e.clientX < midX ? 'before' : 'after';
    if (!dropTarget || dropTarget.id !== targetCardId || dropTarget.position !== position) {
      setDropTarget({ id: targetCardId, position });
    }
  };

  const handleDragLeaveCard = (targetCardId: string, e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      if (dropTarget?.id === targetCardId) {
        setDropTarget(null);
      }
    }
  };

  const handleDropOnCard = (targetCardId: string, e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = draggingCardId || e.dataTransfer.getData('text/plain');
    const pos = dropTarget?.id === targetCardId ? dropTarget.position : 'before';
    setDraggingCardId(null);
    setDropTarget(null);
    if (!sourceId || sourceId === targetCardId) return;

    const currentIds = sortedLinkCards.map((c) => c.id);
    const sourceIdx = currentIds.indexOf(sourceId);
    if (sourceIdx === -1) return;

    const newOrder = [...currentIds];
    const [removed] = newOrder.splice(sourceIdx, 1);
    const targetIdx = newOrder.indexOf(targetCardId);
    if (targetIdx === -1) return;

    const insertIndex = pos === 'after' ? targetIdx + 1 : targetIdx;
    newOrder.splice(insertIndex, 0, removed);

    const allOtherIds = widgets.map((w) => w.id).filter((id) => !currentIds.includes(id));
    const fullOrder = [...newOrder, ...allOtherIds];

    setCustomOrder(fullOrder);
    storage.saveResourceOrder(fullOrder);
    setRecentMovedCardId(sourceId);
    setTimeout(() => setRecentMovedCardId(null), 1800);
    soundService.playSuccess(settings.soundEffects);
  };

  const iframeWidgets = useMemo(() => {
    return filteredWidgets.filter((w) => w.type === 'iframe');
  }, [filteredWidgets]);

  // Copy link handler
  const handleCopyLink = async (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(url);
    setCopiedUrl(url);
    soundService.playCopyChime(settings.soundEffects);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Open link card directly in default browser
  const handleOpenInBrowser = (url: string) => {
    soundService.playClick(settings.soundEffects);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Open modal for new widget
  const handleOpenCreateModal = (defaultType: WidgetType = 'link') => {
    setEditingWidget(null);
    setFormTitle('');
    setFormUrl('https://');
    setFormType(defaultType);
    setFormCategory(selectedCategory === 'Все' ? (activeCategories[0] || 'Логистика и трекинг') : selectedCategory);
    setIsCreatingNewCategoryInModal(false);
    setCustomCategoryInput('');
    setFormDescription('');
    setFormTags('');
    setFormIcon(defaultType === 'iframe' ? 'map-pin' : 'truck');
    setFormIconColor(defaultType === 'iframe' ? 'emerald' : 'sky');
    setFormIframeHeight(420);
    setFormIframeWidth('full');
    setFormIsPinned(false);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (widget: ResourceWidget, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWidget(widget);
    setFormTitle(widget.title);
    setFormUrl(widget.url);
    setFormType(widget.type);
    setFormCategory(widget.category);
    setIsCreatingNewCategoryInModal(false);
    setCustomCategoryInput('');
    setFormDescription(widget.description || '');
    setFormTags(widget.tags.join(', '));
    setFormIcon(widget.icon || 'globe');
    setFormIconColor(widget.iconColor || 'sky');
    setFormIframeHeight(widget.iframeHeight || 420);
    setFormIframeWidth(widget.iframeWidth || 'full');
    setFormIsPinned(!!widget.isPinned);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Save Modal
  const handleSaveModal = () => {
    if (!formTitle.trim() || !formUrl.trim()) {
      setModalError('Пожалуйста, укажите название и URL ссылку');
      return;
    }

    let cleanUrl = formUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const tags = formTags
      .split(/[,;\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    let finalCategory = formCategory;
    if (isCreatingNewCategoryInModal) {
      const trimmed = customCategoryInput.trim();
      if (!trimmed) {
        setModalError('Пожалуйста, введите название новой категории');
        return;
      }
      finalCategory = trimmed;
      if (onAddCategory) {
        onAddCategory(trimmed);
      }
    }

    if (editingWidget) {
      const updated: ResourceWidget = {
        ...editingWidget,
        title: formTitle.trim(),
        url: cleanUrl,
        type: formType,
        category: finalCategory,
        description: formDescription.trim(),
        tags,
        icon: formIcon,
        iconColor: formIconColor,
        iframeHeight: formIframeHeight,
        iframeWidth: formIframeWidth,
        isPinned: formIsPinned,
      };
      onUpdateWidget(updated);
    } else {
      const created: ResourceWidget = {
        id: 'res-' + Date.now(),
        title: formTitle.trim(),
        url: cleanUrl,
        type: formType,
        category: finalCategory,
        description: formDescription.trim(),
        tags,
        icon: formIcon,
        iconColor: formIconColor,
        iframeHeight: formIframeHeight,
        iframeWidth: formIframeWidth,
        isPinned: formIsPinned,
        createdAt: Date.now(),
      };
      onAddWidget(created);
    }

    setIsModalOpen(false);
    soundService.playCopyChime(settings.soundEffects);
  };

  // Toggle pin
  const handleTogglePin = (widget: ResourceWidget, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateWidget({ ...widget, isPinned: !widget.isPinned });
    soundService.playClick(settings.soundEffects);
  };

  // Delete widget
  const handleDelete = (widget: ResourceWidget, e: React.MouseEvent) => {
    e.stopPropagation();
    setWidgetToDelete(widget);
  };

  // Resize iframe height dynamically
  const handleAdjustHeight = (widget: ResourceWidget, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = widget.iframeHeight || 420;
    const nextHeight = Math.max(220, Math.min(900, current + delta));
    onUpdateWidget({ ...widget, iframeHeight: nextHeight });
  };

  // Toggle iframe width between half and full
  const handleToggleIframeWidth = (widget: ResourceWidget, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextWidth = widget.iframeWidth === 'half' ? 'full' : 'half';
    onUpdateWidget({ ...widget, iframeWidth: nextWidth });
  };

  // Toggle collapse
  const handleToggleCollapse = (widget: ResourceWidget, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateWidget({ ...widget, isCollapsed: !widget.isCollapsed });
  };

  // Reload iframe
  const handleReloadIframe = (widgetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIframeReloadKeys((prev) => ({ ...prev, [widgetId]: (prev[widgetId] || 0) + 1 }));
    soundService.playClick(settings.soundEffects);
  };

  return (
    <div className={`flex flex-col h-full ${theme.panel} overflow-hidden text-xs select-none`}>
      {/* Top Dashboard Header: View Modes, Search, Add buttons */}
      <div className={`p-2.5 border-b ${theme.border} ${theme.panelHeader} flex flex-wrap items-center justify-between gap-2 shrink-0`}>
        {/* Left: Section Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 shrink-0">
          <button
            onClick={() => setViewFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              viewFilter === 'all'
                ? `${accent.primary} shadow-xs`
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Весь дэшборд</span>
            <span className="font-mono text-[10px] opacity-70">({widgets.length})</span>
          </button>

          <button
            onClick={() => setViewFilter('links')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              viewFilter === 'links'
                ? `${accent.primary} shadow-xs`
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            <span>Карточки ссылок</span>
            <span className="font-mono text-[10px] opacity-70">
              ({widgets.filter((w) => w.type === 'link').length})
            </span>
          </button>

          <button
            onClick={() => setViewFilter('iframes')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              viewFilter === 'iframes'
                ? `${accent.primary} shadow-xs`
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-emerald-400" />
            <span>Iframe-виджеты</span>
            <span className="font-mono text-[10px] opacity-70">
              ({widgets.filter((w) => w.type === 'iframe').length})
            </span>
          </button>
        </div>

        {/* Right: Search & Create Actions */}
        <div className="flex items-center gap-2 flex-1 justify-end min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, тегам, ссылкам..."
              className={`w-full pl-8 pr-3 py-1 rounded-md text-xs border outline-none ${theme.input}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              >
                ×
              </button>
            )}
          </div>

          {/* Add Link Card Button */}
          <button
            onClick={() => handleOpenCreateModal('link')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold shadow-sm shrink-0 ${accent.primary}`}
            title="Добавить активную карточку-ссылку"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить карточку</span>
          </button>

          {/* Add Iframe Button */}
          <button
            onClick={() => handleOpenCreateModal('iframe')}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors shrink-0"
            title="Встроить новый интерактивный Iframe"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Iframe-виджет</span>
          </button>
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className={`px-3 py-1.5 border-b ${theme.border} ${theme.panelSubtle} flex items-center gap-1.5 overflow-x-auto shrink-0`}>
        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">
          Категории:
        </span>
        <button
          onClick={() => setSelectedCategory('Все')}
          className={`px-2.5 py-0.5 rounded-full text-xs transition-colors shrink-0 font-medium ${
            selectedCategory === 'Все'
              ? `${accent.primaryMuted} font-bold ring-1 ring-sky-400/50 text-slate-100`
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/50'
          }`}
        >
          Все ({widgets.length})
        </button>

        {activeCategories.map((cat) => {
          const count = widgets.filter((w) => w.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-0.5 rounded-full text-xs transition-colors shrink-0 font-medium flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? `${accent.primaryMuted} font-bold ring-1 ring-sky-400/50 text-slate-100`
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <span>{cat}</span>
              <span className="text-[10px] opacity-70 font-mono">({count})</span>
            </button>
          );
        })}

        {/* Category Customization Manager Button */}
        <button
          type="button"
          onClick={() => setIsCategoryModalOpen(true)}
          className="ml-auto px-2.5 py-0.5 rounded-full border border-slate-700 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors flex items-center gap-1.5 text-[11px] shrink-0"
          title="Настройка категорий ссылок (добавить, переименовать, удалить)"
        >
          <FolderCog className="w-3.5 h-3.5 text-sky-400" />
          <span>Настроить категории</span>
        </button>
      </div>

      {/* Main Dashboard Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* SECTION 1: Active Link Cards */}
        {(viewFilter === 'all' || viewFilter === 'links') && sortedLinkCards.length > 0 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Активные карточки быстрого перехода
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                  {sortedLinkCards.length}
                </span>
              </div>

              {/* Layout & Order Customization Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sort Mode Selector */}
                <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                  <ArrowUpDown className="w-3 h-3 text-slate-400 ml-1" />
                  <button
                    type="button"
                    onClick={() => setSortMode('custom')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      sortMode === 'custom'
                        ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-400/40 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Ручной порядок: перемещайте карточки стрелками или перетаскиванием"
                  >
                    Ручной
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortMode('pinned')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      sortMode === 'pinned'
                        ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-400/40 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Сначала закрепленные звездочкой"
                  >
                    ⭐ Важные
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortMode('alpha')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      sortMode === 'alpha'
                        ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-400/40 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="По названию (А-Я)"
                  >
                    А-Я
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortMode('newest')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      sortMode === 'newest'
                        ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-400/40 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Сначала новые"
                  >
                    Новые
                  </button>
                </div>

                {/* Columns Selector */}
                <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                  <span className="text-[10px] text-slate-500 px-1 font-mono">Колонки:</span>
                  {[1, 2, 3, 4].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        setGridCols(col as 1 | 2 | 3 | 4);
                        try {
                          localStorage.setItem('quickreply_resource_grid_cols', String(col));
                        } catch (_) {}
                      }}
                      className={`px-1.5 py-0.5 rounded font-mono text-[10.5px] transition-all cursor-pointer ${
                        gridCols === col
                          ? `${accent.primary} shadow-xs font-bold`
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={`Отображение в ${col} колонк${col === 1 ? 'у' : col < 5 ? 'и' : 'ок'}`}
                    >
                      {col}
                    </button>
                  ))}
                </div>

                {/* Density Switcher */}
                <button
                  type="button"
                  onClick={() => setCardDensity(cardDensity === 'normal' ? 'compact' : 'normal')}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                    cardDensity === 'compact'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200'
                  }`}
                  title={cardDensity === 'compact' ? 'Переключить на подробный вид' : 'Переключить на компактный вид'}
                >
                  {cardDensity === 'compact' ? 'Компактно' : 'Подробно'}
                </button>
              </div>
            </div>

            {/* Link Cards Grid */}
            <div
              className={`grid gap-3 ${
                gridCols === 1
                  ? 'grid-cols-1'
                  : gridCols === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : gridCols === 4
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {sortedLinkCards.map((card, cardIndex) => {
                const colorConfig = getColorClasses(card.iconColor);
                const isFirst = cardIndex === 0;
                const isLast = cardIndex === sortedLinkCards.length - 1;

                const isHoveredTarget = dropTarget?.id === card.id;
                const isJustMoved = recentMovedCardId === card.id;

                return (
                  <div
                    key={card.id}
                    draggable={sortMode === 'custom'}
                    onDragStart={(e) => handleDragStart(card.id, e)}
                    onDragOver={(e) => handleDragOverCard(card.id, e)}
                    onDragLeave={(e) => handleDragLeaveCard(card.id, e)}
                    onDrop={(e) => handleDropOnCard(card.id, e)}
                    onClick={() => handleOpenInBrowser(card.url)}
                    className={`group relative rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                      cardDensity === 'compact' ? 'p-2.5' : 'p-3.5'
                    } ${theme.panelHeader} ${
                      draggingCardId === card.id
                        ? 'opacity-35 border-sky-400 border-dashed scale-[0.98] bg-sky-950/20 shadow-none'
                        : isJustMoved
                        ? 'border-emerald-400 ring-2 ring-emerald-400/80 bg-emerald-500/10 shadow-lg scale-[1.01]'
                        : isHoveredTarget
                        ? 'border-sky-400 ring-2 ring-sky-400/50 shadow-xl'
                        : 'border-slate-800 hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Visual Insertion Line & Preview Badge of Future Placement */}
                    {isHoveredTarget && (
                      <>
                        {dropTarget.position === 'before' ? (
                          <div className="absolute -left-1.5 top-0 bottom-0 w-1.5 bg-gradient-to-b from-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_#38bdf8] animate-pulse z-30 pointer-events-none" />
                        ) : (
                          <div className="absolute -right-1.5 top-0 bottom-0 w-1.5 bg-gradient-to-b from-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_#38bdf8] animate-pulse z-30 pointer-events-none" />
                        )}
                        <div
                          className={`absolute -top-3.5 ${
                            dropTarget.position === 'before' ? 'left-1' : 'right-1'
                          } px-2 py-0.5 rounded-full bg-sky-500 text-white text-[9px] font-bold shadow-lg z-40 pointer-events-none flex items-center gap-1 animate-bounce`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{dropTarget.position === 'before' ? 'Вставить перед' : 'Вставить после'}</span>
                        </div>
                      </>
                    )}

                    <div>
                      {/* Top Row: Icon, Title, Actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {/* Reorder drag handle indicator in custom mode */}
                          {sortMode === 'custom' && (
                            <div
                              className="text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing p-0.5 -ml-1 mt-1 shrink-0"
                              title="Перетащите для изменения порядка"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Custom Styled Icon */}
                          <div
                            className={`rounded-lg border flex items-center justify-center shrink-0 ${
                              cardDensity === 'compact' ? 'w-7 h-7' : 'w-9 h-9'
                            } ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`}
                          >
                            {renderWidgetIcon(card.icon, cardDensity === 'compact' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5')}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-100 group-hover:text-sky-300 transition-colors flex items-center gap-1.5 leading-snug">
                              <span className="truncate">{card.title}</span>
                              {card.isPinned && (
                                <Pin className="w-2.5 h-2.5 text-amber-400 fill-current shrink-0" />
                              )}
                            </h4>
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                              {card.category}
                            </span>
                          </div>
                        </div>

                        {/* Top quick icon actions */}
                        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                          {/* Move up / down arrows in custom mode */}
                          {sortMode === 'custom' && (
                            <div className="flex items-center bg-slate-900/90 rounded border border-slate-700/60 p-0.2 mr-1">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={(e) => handleMoveCard(card.id, 'prev', e)}
                                className={`p-1 rounded transition-colors ${
                                  isFirst ? 'opacity-25 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
                                }`}
                                title="Переместить левее / выше"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={(e) => handleMoveCard(card.id, 'next', e)}
                                className={`p-1 rounded transition-colors ${
                                  isLast ? 'opacity-25 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
                                }`}
                                title="Переместить правее / ниже"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleTogglePin(card, e)}
                            className={`p-1 rounded hover:bg-slate-800 ${card.isPinned ? 'text-amber-400' : 'text-slate-400'}`}
                            title={card.isPinned ? 'Открепить' : 'Закрепить'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(card, e)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400"
                            title="Редактировать карточку"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(card, e)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                            title="Удалить карточку"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Description (hidden in compact mode) */}
                      {cardDensity === 'normal' && card.description && (
                        <p className="text-xs text-slate-300 mb-2.5 line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                      )}

                      {/* Tags (hidden in compact mode) */}
                      {cardDensity === 'normal' && card.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2.5">
                          {card.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-400 font-mono text-[9.5px] border border-slate-800"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Link Bar */}
                    <div className={`pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px] text-slate-400 ${cardDensity === 'compact' ? 'mt-0.5' : 'mt-1'}`}>
                      <div className="flex items-center gap-1 truncate max-w-[70%] font-mono text-[10px]">
                        <span className="truncate group-hover:text-sky-400 transition-colors">
                          {card.url.replace(/^https?:\/\//, '')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(card.url, e)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Скопировать ссылку в буфер"
                        >
                          {copiedUrl === card.url ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        <div className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800/80 group-hover:bg-sky-600 group-hover:text-white transition-colors font-medium text-[10.5px]">
                          <span>Перейти</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: Interactive Resizable Iframes */}
        {(viewFilter === 'all' || viewFilter === 'iframes') && iframeWidgets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Columns className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Встроенные интерактивные виджеты (с регулируемым размером)
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                  {iframeWidgets.length}
                </span>
              </div>
              <span className="text-[10.5px] text-slate-400 hidden sm:inline">
                Высота и ширина каждого виджета настраиваются индивидуально
              </span>
            </div>

            {/* Iframes Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {iframeWidgets.map((widget) => {
                const isFull = widget.iframeWidth === 'full';
                const height = widget.iframeHeight || 420;
                const isCollapsed = !!widget.isCollapsed;
                const colorConfig = getColorClasses(widget.iconColor);
                const reloadKey = iframeReloadKeys[widget.id] || 0;

                return (
                  <div
                    key={widget.id}
                    className={`rounded-xl border overflow-hidden transition-all flex flex-col ${theme.panelHeader} border-slate-800 shadow-md ${
                      isFull ? 'lg:col-span-2' : 'lg:col-span-1'
                    }`}
                  >
                    {/* Widget Header Toolbar */}
                    <div className={`p-2.5 border-b ${theme.border} bg-slate-900/90 flex flex-wrap items-center justify-between gap-2 shrink-0`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`}
                        >
                          {renderWidgetIcon(widget.icon, 'w-3.5 h-3.5')}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5 truncate">
                            <span className="truncate">{widget.title}</span>
                            {widget.isPinned && (
                              <Pin className="w-2.5 h-2.5 text-amber-400 fill-current shrink-0" />
                            )}
                          </h4>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">
                            {widget.category} • {height}px {isFull ? '(100% ширина)' : '(50% ширина)'}
                          </span>
                        </div>
                      </div>

                      {/* Iframe Control Buttons: Height presets, Width toggle, Reload, Browser open */}
                      <div className="flex items-center gap-1">
                        {/* Height Adjustment Buttons */}
                        <div className="flex items-center bg-slate-800 rounded border border-slate-700/80 p-0.5">
                          <button
                            onClick={(e) => handleAdjustHeight(widget, -60, e)}
                            className="px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 rounded font-mono font-bold"
                            title="Уменьшить высоту (-60px)"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-[10px] font-mono text-slate-400">
                            {height}px
                          </span>
                          <button
                            onClick={(e) => handleAdjustHeight(widget, 60, e)}
                            className="px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 rounded font-mono font-bold"
                            title="Увеличить высоту (+60px)"
                          >
                            +
                          </button>
                        </div>

                        {/* Width Toggle (Full vs Half) on large screens */}
                        <button
                          onClick={(e) => handleToggleIframeWidth(widget, e)}
                          className={`p-1.5 rounded border transition-colors hidden lg:flex items-center justify-center ${
                            isFull
                              ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
                              : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title={isFull ? 'Переключить на 50% ширины' : 'Развернуть на 100% ширины'}
                        >
                          {isFull ? <Square className="w-3 h-3" /> : <Columns className="w-3 h-3" />}
                        </button>

                        {/* Reload Iframe */}
                        <button
                          onClick={(e) => handleReloadIframe(widget.id, e)}
                          className="p-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Перезагрузить содержимое виджета"
                        >
                          <RotateCw className="w-3 h-3 text-sky-400" />
                        </button>

                        {/* Open directly in default browser */}
                        <button
                          onClick={() => handleOpenInBrowser(widget.url)}
                          className="flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                          title="Открыть сайт в браузере по умолчанию"
                        >
                          <ExternalLink className="w-3 h-3 text-emerald-400" />
                          <span className="hidden sm:inline">В браузере</span>
                        </button>

                        {/* Collapse/Expand */}
                        <button
                          onClick={(e) => handleToggleCollapse(widget, e)}
                          className="p-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title={isCollapsed ? 'Развернуть виджет' : 'Свернуть виджет'}
                        >
                          {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={(e) => handleOpenEditModal(widget, e)}
                          className="p-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Редактировать виджет"
                        >
                          <Edit3 className="w-3 h-3 text-amber-400" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={(e) => handleDelete(widget, e)}
                          className="p-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition-colors"
                          title="Удалить виджет"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Iframe View Container (if not collapsed) */}
                    {!isCollapsed && (
                      <div
                        className="w-full relative bg-slate-900 overflow-hidden transition-all"
                        style={{ height: `${height}px` }}
                      >
                        <iframe
                          key={reloadKey}
                          src={widget.url}
                          title={widget.title}
                          className="w-full h-full border-0 bg-white"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredWidgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <Globe className="w-12 h-12 text-slate-600 mb-3" />
            <h4 className="font-bold text-sm text-slate-200">Ничего не найдено</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              По текущему фильтру или поисковому запросу нет элементов. Вы можете добавить новую карточку или виджет.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => handleOpenCreateModal('link')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs ${accent.primary}`}
              >
                + Добавить карточку ссылки
              </button>
              <button
                onClick={() => handleOpenCreateModal('iframe')}
                className="px-3 py-1.5 rounded-lg font-bold text-xs border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                + Добавить Iframe виджет
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add or Edit Resource Widget */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-lg rounded-xl border shadow-2xl p-5 ${theme.panel} ${theme.border} max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-3 border-b pb-2.5 border-slate-800">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                {formType === 'iframe' ? (
                  <Columns className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ExternalLink className="w-4 h-4 text-sky-400" />
                )}
                {editingWidget ? 'Редактирование элемента' : 'Новый элемент дэшборда'}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-3 p-2 rounded-lg bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Тип элемента на дэшборде
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('link')}
                    className={`p-2 rounded-lg border text-left flex items-start gap-2 transition-all ${
                      formType === 'link'
                        ? 'border-sky-500 bg-sky-500/15 text-sky-200 font-bold'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4 mt-0.5 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Карточка ссылки</div>
                      <div className="text-[10px] opacity-75 font-normal">
                        Открывается в браузере по умолчанию
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('iframe')}
                    className={`p-2 rounded-lg border text-left flex items-start gap-2 transition-all ${
                      formType === 'iframe'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200 font-bold'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Columns className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Iframe виджет</div>
                      <div className="text-[10px] opacity-75 font-normal">
                        Встраивается прямо в дэшборд с регулировкой размера
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Например: СДЭК Трекинг или Яндекс Карты"
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-300">
                      Категория
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewCategoryInModal(!isCreatingNewCategoryInModal);
                        setCustomCategoryInput('');
                      }}
                      className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      {isCreatingNewCategoryInModal ? '← Выбрать из списка' : '+ Новая категория'}
                    </button>
                  </div>

                  {isCreatingNewCategoryInModal ? (
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Название новой категории..."
                      className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                      autoFocus
                    />
                  ) : (
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                    >
                      {activeCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  URL адрес (ссылка) *
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                />
              </div>

              {/* Custom Icon Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Выбор иконки карточки
                  </label>
                  {customIcons.length > 0 && (
                    <span className="text-[10px] text-sky-400 font-medium">
                      Своих иконок: {customIcons.length}
                    </span>
                  )}
                </div>

                {/* Standard icons */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-900/60 rounded-lg border border-slate-800">
                  {AVAILABLE_ICONS.map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setFormIcon(ic.id)}
                      className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all ${
                        formIcon === ic.id
                          ? 'border-sky-500 bg-sky-500/20 text-sky-200 shadow-xs'
                          : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={ic.label}
                    >
                      {renderWidgetIcon(ic.id, 'w-4 h-4 mb-0.5')}
                      <span className="text-[9px] truncate max-w-full text-center leading-tight">
                        {ic.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom user icons if available */}
                {customIcons.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                      Загруженные свои иконки ({customIcons.length})
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-900/60 rounded-lg border border-slate-800">
                      {customIcons.map((ci) => (
                        <button
                          key={ci.id}
                          type="button"
                          onClick={() => setFormIcon(ci.id)}
                          className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all ${
                            formIcon === ci.id
                              ? 'border-sky-500 bg-sky-500/20 text-sky-200 shadow-xs'
                              : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                          title={ci.name}
                        >
                          {renderWidgetIcon(ci.id, 'w-4 h-4 mb-0.5')}
                          <span className="text-[9px] truncate max-w-full text-center leading-tight">
                            {ci.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Color Accent Picker */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Цвет акцента иконки
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormIconColor(c.id)}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${c.bg} ${c.border} ${c.text} ${
                        formIconColor === c.id ? 'ring-2 ring-white shadow-sm scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {formIconColor === c.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Iframe size options if type is iframe */}
              {formType === 'iframe' && (
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <span className="font-bold text-[11px] text-slate-200 block">
                    Настройки регулируемого размера виджета
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Высота по умолчанию: <strong className="text-slate-200">{formIframeHeight}px</strong>
                      </label>
                      <input
                        type="range"
                        min={250}
                        max={800}
                        step={20}
                        value={formIframeHeight}
                        onChange={(e) => setFormIframeHeight(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>250px</span>
                        <span>420px</span>
                        <span>800px</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Ширина в сетке
                      </label>
                      <select
                        value={formIframeWidth}
                        onChange={(e) => setFormIframeWidth(e.target.value as 'full' | 'half')}
                        className={`w-full p-1.5 rounded border text-xs outline-none ${theme.input}`}
                      >
                        <option value="full">На всю ширину (100%)</option>
                        <option value="half">Колонка (50%)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Описание / подсказка для оператора
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Кратко опишите назначение ресурса..."
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Теги (через запятую)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="трек, сдэк, возврат, пвз"
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                />
              </div>

              {/* Pin */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalPinCheckbox"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <label htmlFor="modalPinCheckbox" className="text-slate-300 cursor-pointer">
                  Закрепить в начале дэшборда (избранное)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveModal}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs ${accent.primary}`}
              >
                {editingWidget ? 'Сохранить изменения' : 'Добавить на дэшборд'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Widget Deletion */}
      <ConfirmDialogModal
        isOpen={widgetToDelete !== null}
        title="Удалить ресурс из дэшборда?"
        description={
          widgetToDelete ? (
            <div>
              Вы действительно хотите удалить виджет <strong className="text-rose-300">«{widgetToDelete.title}»</strong> из панели быстрого доступа?
            </div>
          ) : null
        }
        confirmText="Удалить виджет"
        cancelText="Отмена"
        variant="danger"
        icon="trash"
        onConfirm={() => {
          if (widgetToDelete) {
            onDeleteWidget(widgetToDelete.id);
            soundService.playClick(settings.soundEffects);
            setWidgetToDelete(null);
          }
        }}
        onCancel={() => setWidgetToDelete(null)}
      />

      {/* Modal: Category Customization Manager */}
      <ResourceCategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={activeCategories}
        widgets={widgets}
        onAddCategory={(cat) => onAddCategory?.(cat)}
        onRenameCategory={(oldN, newN) => onRenameCategory?.(oldN, newN)}
        onDeleteCategory={(cat, reassign) => onDeleteCategory?.(cat, reassign)}
        onResetCategories={() => onResetCategories?.()}
        settings={settings}
      />
    </div>
  );
};
