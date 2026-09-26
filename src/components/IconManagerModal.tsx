import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Trash2, 
  Plus, 
  X, 
  Image as ImageIcon, 
  RotateCcw, 
  Sparkles, 
  Check, 
  Eye,
  Folder
} from 'lucide-react';
import { CustomIcon, GuiSettings } from '../types';
import { getThemeClasses, getAccentClasses } from '../utils/theme';
import { storage } from '../utils/storage';
import { soundService } from '../utils/sound';
import { AVAILABLE_CATEGORY_ICONS, renderCategoryIcon } from '../utils/categoryMeta';

interface IconManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GuiSettings;
  customIcons: CustomIcon[];
  onUpdateCustomIcons: (icons: CustomIcon[]) => void;
  hiddenIconIds: string[];
  onUpdateHiddenIconIds: (ids: string[]) => void;
  onSelectIcon?: (iconId: string) => void;
  selectedIconId?: string;
}

export const IconManagerModal: React.FC<IconManagerModalProps> = ({
  isOpen,
  onClose,
  settings,
  customIcons,
  onUpdateCustomIcons,
  hiddenIconIds,
  onUpdateHiddenIconIds,
  onSelectIcon,
  selectedIconId,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [newIconName, setNewIconName] = useState('');
  const [newIconDataUrl, setNewIconDataUrl] = useState<string | null>(null);
  const [svgCodeInput, setSvgCodeInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'svg'>('file');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const theme = getThemeClasses(settings.theme);
  const accent = getAccentClasses(settings.accentColor);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('svg') && !file.type.includes('image')) {
      setErrorMsg('Пожалуйста, выберите файл изображения (SVG, PNG, WebP, JPG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Размер файла не должен превышать 2 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setNewIconDataUrl(result);
      if (!newIconName) {
        // Suggest file name without extension
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setNewIconName(cleanName);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Ошибка чтения файла');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUploadedIcon = () => {
    setErrorMsg(null);
    const rawData = uploadMode === 'file' ? newIconDataUrl : svgCodeInput.trim();
    if (!rawData) {
      setErrorMsg('Загрузите изображение или вставьте SVG-код');
      return;
    }

    const name = newIconName.trim() || 'Пользовательская иконка';
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const newIcon: CustomIcon = {
      id,
      name,
      dataUrl: rawData,
      createdAt: Date.now(),
    };

    const updated = [newIcon, ...customIcons];
    onUpdateCustomIcons(updated);
    storage.saveCustomIcons(updated);
    soundService.playSuccess(settings.soundEffects);

    // Reset form
    setNewIconName('');
    setNewIconDataUrl(null);
    setSvgCodeInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (onSelectIcon) {
      onSelectIcon(id);
    }
    setActiveTab('manage');
  };

  const handleDeleteCustomIcon = (id: string) => {
    const updated = customIcons.filter((i) => i.id !== id);
    onUpdateCustomIcons(updated);
    storage.saveCustomIcons(updated);
    soundService.playClick(settings.soundEffects);
  };

  const handleToggleHideBuiltinIcon = (id: string) => {
    let updated: string[];
    if (hiddenIconIds.includes(id)) {
      updated = hiddenIconIds.filter((h) => h !== id);
    } else {
      updated = [...hiddenIconIds, id];
    }
    onUpdateHiddenIconIds(updated);
    storage.saveHiddenIcons(updated);
    soundService.playClick(settings.soundEffects);
  };

  const handleRestoreAllBuiltin = () => {
    onUpdateHiddenIconIds([]);
    storage.saveHiddenIcons([]);
    soundService.playSuccess(settings.soundEffects);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-xl rounded-2xl border ${theme.border} ${theme.panel} shadow-2xl flex flex-col max-h-[92vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-3.5 border-b ${theme.border} ${theme.panelHeader} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent.primary} shadow-xs`}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Управление иконками</h2>
              <p className="text-[11px] text-slate-400">
                Загрузка собственных иконок (SVG / картинки) и настройка набора
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

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/60 px-5 pt-2 gap-2 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Загрузить свою иконку</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`pb-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Все иконки ({customIcons.length} своих, {AVAILABLE_CATEGORY_ICONS.length - hiddenIconIds.length} станд.)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Upload method selector */}
              <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800 w-fit">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                    uploadMode === 'file' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Файл (SVG / PNG / WebP)
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('svg')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                    uploadMode === 'svg' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SVG Код / Разметка
                </button>
              </div>

              {uploadMode === 'file' ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-sky-500/70 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-900/40 hover:bg-slate-900/70 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/svg+xml,image/png,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400 mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-slate-200">
                    Нажмите для выбора файла или перетащите сюда
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Поддерживаются SVG, PNG, WebP, JPG (до 2 МБ)
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium block">
                    Вставьте код &lt;svg&gt;...&lt;/svg&gt;:
                  </label>
                  <textarea
                    rows={4}
                    value={svgCodeInput}
                    onChange={(e) => setSvgCodeInput(e.target.value)}
                    placeholder="<svg viewBox='0 0 24 24' ...>...</svg>"
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 font-mono text-[11px] text-slate-200 outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Preview and Name Form */}
              {(newIconDataUrl || svgCodeInput.trim()) && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 p-2 overflow-hidden shadow-inner">
                      {renderCategoryIcon(newIconDataUrl || svgCodeInput, 'w-7 h-7')}
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="font-semibold text-slate-200 block text-xs">
                        Название / метка иконки:
                      </label>
                      <input
                        type="text"
                        value={newIconName}
                        onChange={(e) => setNewIconName(e.target.value)}
                        placeholder="Например: СДЭК, WB, Telegram, Озон..."
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewIconDataUrl(null);
                        setSvgCodeInput('');
                        setNewIconName('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveUploadedIcon}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs text-white shadow-md cursor-pointer ${accent.primary}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Сохранить иконку</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-5">
              {/* 1. Custom Uploaded Icons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Загруженные свои иконки ({customIcons.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Добавить еще</span>
                  </button>
                </div>

                {customIcons.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
                    Вы пока не загрузили ни одной своей иконки. Нажмите «Загрузить свою иконку», чтобы добавить SVG или изображение.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {customIcons.map((icon) => (
                      <div
                        key={icon.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          selectedIconId === icon.id
                            ? 'bg-sky-950/40 border-sky-400'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div 
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            if (onSelectIcon) {
                              onSelectIcon(icon.id);
                              soundService.playClick(settings.soundEffects);
                            }
                          }}
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 p-1">
                            {renderCategoryIcon(icon.id, 'w-4 h-4', customIcons)}
                          </div>
                          <span className="text-xs text-slate-200 truncate font-medium">
                            {icon.name}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCustomIcon(icon.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                          title={`Удалить иконку «${icon.name}»`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Built-in Icons Management */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 uppercase text-[11px] tracking-wider">
                    Стандартные иконки ({AVAILABLE_CATEGORY_ICONS.length - hiddenIconIds.length} активных)
                  </span>

                  {hiddenIconIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRestoreAllBuiltin}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Восстановить скрытые ({hiddenIconIds.length})</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-2 bg-slate-950/60 rounded-xl border border-slate-800 max-h-56 overflow-y-auto">
                  {AVAILABLE_CATEGORY_ICONS.map((item) => {
                    const isHidden = hiddenIconIds.includes(item.id);
                    const isSelected = selectedIconId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`group relative p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          isHidden 
                            ? 'opacity-35 bg-slate-900/30 border-slate-800/40 line-through' 
                            : isSelected
                            ? 'bg-sky-500/25 border-sky-400 text-sky-300'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div 
                          className="w-full flex flex-col items-center cursor-pointer"
                          onClick={() => {
                            if (!isHidden && onSelectIcon) {
                              onSelectIcon(item.id);
                              soundService.playClick(settings.soundEffects);
                            }
                          }}
                        >
                          {renderCategoryIcon(item.id, 'w-4 h-4')}
                          <span className="text-[10px] text-center truncate max-w-full mt-1">
                            {item.label.split('/')[0].trim()}
                          </span>
                        </div>

                        {/* Hide / Delete Icon Trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleHideBuiltinIcon(item.id);
                          }}
                          className={`absolute top-0.5 right-0.5 p-0.5 rounded text-slate-400 hover:text-white transition-opacity cursor-pointer ${
                            isHidden ? 'opacity-90 text-amber-400' : 'opacity-0 group-hover:opacity-100 hover:bg-slate-800'
                          }`}
                          title={isHidden ? 'Вернуть иконку в список' : 'Скрыть / удалить из выбора'}
                        >
                          {isHidden ? <Plus className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t ${theme.border} ${theme.panelHeader} flex items-center justify-end shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${accent.primary}`}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
