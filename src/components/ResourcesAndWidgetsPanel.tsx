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
  Maximize2
} from 'lucide-react';
import { ResourceWidget, WidgetType, WidgetIconType, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { soundService } from '../utils/sound';

interface ResourcesAndWidgetsPanelProps {
  widgets: ResourceWidget[];
  onAddWidget: (widget: ResourceWidget) => void;
  onUpdateWidget: (widget: ResourceWidget) => void;
  onDeleteWidget: (id: string) => void;
  settings: GuiSettings;
}

const CATEGORIES = [
  'Все',
  'Логистика и трекинг',
  'Карты и гео',
  'Базы знаний',
  'CRM и системы',
  'Утилиты'
];

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
  settings,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'links' | 'iframes'>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<ResourceWidget | null>(null);

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
  const renderWidgetIcon = (iconType?: WidgetIconType, className = 'w-4 h-4') => {
    switch (iconType) {
      case 'truck':
        return <Truck className={className} />;
      case 'package':
        return <Package className={className} />;
      case 'map-pin':
        return <MapPin className={className} />;
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
        return <Globe className={className} />;
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
  const linkCards = useMemo(() => {
    return filteredWidgets.filter((w) => w.type === 'link');
  }, [filteredWidgets]);

  const iframeWidgets = useMemo(() => {
    return filteredWidgets.filter((w) => w.type === 'iframe');
  }, [filteredWidgets]);

  // Copy link handler
  const handleCopyLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
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
    setFormCategory(selectedCategory === 'Все' ? 'Логистика и трекинг' : selectedCategory);
    setFormDescription('');
    setFormTags('');
    setFormIcon(defaultType === 'iframe' ? 'map-pin' : 'truck');
    setFormIconColor(defaultType === 'iframe' ? 'emerald' : 'sky');
    setFormIframeHeight(420);
    setFormIframeWidth('full');
    setFormIsPinned(false);
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
    setFormDescription(widget.description || '');
    setFormTags(widget.tags.join(', '));
    setFormIcon(widget.icon || 'globe');
    setFormIconColor(widget.iconColor || 'sky');
    setFormIframeHeight(widget.iframeHeight || 420);
    setFormIframeWidth(widget.iframeWidth || 'full');
    setFormIsPinned(!!widget.isPinned);
    setIsModalOpen(true);
  };

  // Save Modal
  const handleSaveModal = () => {
    if (!formTitle.trim() || !formUrl.trim()) {
      alert('Заполните название и URL ссылку');
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

    if (editingWidget) {
      const updated: ResourceWidget = {
        ...editingWidget,
        title: formTitle.trim(),
        url: cleanUrl,
        type: formType,
        category: formCategory,
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
        category: formCategory,
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
    if (confirm(`Удалить «${widget.title}» из дэшборда?`)) {
      onDeleteWidget(widget.id);
      soundService.playClick(settings.soundEffects);
    }
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
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-0.5 rounded-full text-xs transition-colors shrink-0 font-medium ${
              selectedCategory === cat
                ? `${accent.primaryMuted} font-bold ring-1 ring-sky-400/50 text-slate-100`
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Dashboard Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* SECTION 1: Active Link Cards */}
        {(viewFilter === 'all' || viewFilter === 'links') && linkCards.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Активные карточки быстрого перехода
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                  {linkCards.length}
                </span>
              </div>
              <span className="text-[10.5px] text-slate-400 hidden sm:inline">
                Клик по карточке открывает сервис в браузере по умолчанию
              </span>
            </div>

            {/* Link Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {linkCards.map((card) => {
                const colorConfig = getColorClasses(card.iconColor);
                return (
                  <div
                    key={card.id}
                    onClick={() => handleOpenInBrowser(card.url)}
                    className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${theme.panelHeader} border-slate-800 hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5`}
                  >
                    <div>
                      {/* Top Row: Icon, Title, Actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {/* Custom Styled Icon */}
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`}
                          >
                            {renderWidgetIcon(card.icon, 'w-4.5 h-4.5')}
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
                        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleTogglePin(card, e)}
                            className={`p-1 rounded hover:bg-slate-800 ${card.isPinned ? 'text-amber-400' : 'text-slate-400'}`}
                            title={card.isPinned ? 'Открепить' : 'Закрепить'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEditModal(card, e)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400"
                            title="Редактировать карточку"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(card, e)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                            title="Удалить карточку"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {card.description && (
                        <p className="text-xs text-slate-300 mb-2.5 line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                      )}

                      {/* Tags */}
                      {card.tags.length > 0 && (
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
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px] text-slate-400 mt-1">
                      <div className="flex items-center gap-1 truncate max-w-[70%] font-mono text-[10px]">
                        <span className="truncate group-hover:text-sky-400 transition-colors">
                          {card.url.replace(/^https?:\/\//, '')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
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
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Категория
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${theme.input}`}
                  >
                    <option value="Логистика и трекинг">Логистика и трекинг</option>
                    <option value="Карты и гео">Карты и гео</option>
                    <option value="Базы знаний">Базы знаний</option>
                    <option value="CRM и системы">CRM и системы</option>
                    <option value="Утилиты">Утилиты</option>
                  </select>
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
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Выбор иконки карточки
                </label>
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
    </div>
  );
};
