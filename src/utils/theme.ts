import { AppTheme, AccentColor, InterfaceDensity, FontSizeScale } from '../types';

export function getThemeClasses(theme: AppTheme) {
  switch (theme) {
    case 'obsidian':
      return {
        bgApp: 'bg-black text-zinc-100',
        panel: 'bg-zinc-950/90 border-zinc-800/80 text-zinc-100',
        panelHeader: 'bg-zinc-900/70 border-zinc-800',
        panelSubtle: 'bg-zinc-900/40 border-zinc-800/50',
        input: 'bg-zinc-900 text-zinc-100 border-zinc-800 placeholder-zinc-500 focus:border-zinc-500',
        card: 'bg-zinc-900/60 border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-900/90 text-zinc-200',
        cardActive: 'bg-zinc-900 border-zinc-600 ring-1 ring-zinc-500/50',
        textMuted: 'text-zinc-400',
        textFaint: 'text-zinc-500',
        border: 'border-zinc-800',
        badge: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
      };
    case 'light-minimal':
      return {
        bgApp: 'bg-slate-100 text-slate-800',
        panel: 'bg-white border-slate-200/90 text-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.05)]',
        panelHeader: 'bg-slate-50/95 border-slate-200 text-slate-800',
        panelSubtle: 'bg-slate-50/80 border-slate-200/80',
        input: 'bg-white text-slate-800 border-slate-300 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500/20',
        card: 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
        cardActive: 'bg-sky-50/80 border-sky-400 text-slate-900 ring-1 ring-sky-300/60 shadow-[0_1px_3px_rgba(14,165,233,0.1)]',
        textMuted: 'text-slate-600',
        textFaint: 'text-slate-400',
        border: 'border-slate-200',
        badge: 'bg-slate-100 text-slate-700 border-slate-200/90',
      };
    case 'cyber-espresso':
      return {
        bgApp: 'bg-[#181412] text-[#f4ede4]',
        panel: 'bg-[#221c19]/90 border-[#38302a] text-[#f4ede4]',
        panelHeader: 'bg-[#2a231f] border-[#38302a]',
        panelSubtle: 'bg-[#26201c]/50 border-[#38302a]/60',
        input: 'bg-[#28211d] text-[#f4ede4] border-[#423730] placeholder-[#8c7e73] focus:border-[#d97706]',
        card: 'bg-[#26201c]/70 border-[#38302a] hover:border-[#52443c] hover:bg-[#2c2420] text-[#ebe2d8]',
        cardActive: 'bg-[#2c2420] border-[#b45309] ring-1 ring-[#b45309]/50',
        textMuted: 'text-[#ab9d91]',
        textFaint: 'text-[#7d7065]',
        border: 'border-[#38302a]',
        badge: 'bg-[#2c2420] text-[#d6c7b8] border-[#473c33]',
      };
    case 'dark-slate':
    default:
      return {
        bgApp: 'bg-slate-950 text-slate-100',
        panel: 'bg-slate-900/90 border-slate-800/80 text-slate-100',
        panelHeader: 'bg-slate-900/95 border-slate-800',
        panelSubtle: 'bg-slate-900/50 border-slate-800/60',
        input: 'bg-slate-900 text-slate-100 border-slate-700/80 placeholder-slate-500 focus:border-slate-500',
        card: 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50 text-slate-200',
        cardActive: 'bg-slate-800/90 border-slate-600 ring-1 ring-slate-500/40',
        textMuted: 'text-slate-400',
        textFaint: 'text-slate-500',
        border: 'border-slate-800',
        badge: 'bg-slate-800/80 text-slate-300 border-slate-700/50',
      };
  }
}

export function getAccentClasses(color: AccentColor, isLightOrTheme?: boolean | AppTheme) {
  const isL = isLightOrTheme === true || isLightOrTheme === 'light-minimal';
  switch (color) {
    case 'indigo':
      return {
        primary: isL ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs' : 'bg-indigo-600 hover:bg-indigo-500 text-white',
        primaryMuted: isL ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30',
        activeText: isL ? 'text-indigo-700 font-semibold' : 'text-indigo-400',
        activeBorder: isL ? 'border-indigo-400' : 'border-indigo-500',
        ring: 'ring-indigo-500',
        dot: 'bg-indigo-500',
      };
    case 'emerald':
      return {
        primary: isL ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'bg-emerald-600 hover:bg-emerald-500 text-white',
        primaryMuted: isL ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
        activeText: isL ? 'text-emerald-700 font-semibold' : 'text-emerald-400',
        activeBorder: isL ? 'border-emerald-400' : 'border-emerald-500',
        ring: 'ring-emerald-500',
        dot: 'bg-emerald-500',
      };
    case 'amber':
      return {
        primary: isL ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs' : 'bg-amber-600 hover:bg-amber-500 text-white',
        primaryMuted: isL ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
        activeText: isL ? 'text-amber-800 font-semibold' : 'text-amber-400',
        activeBorder: isL ? 'border-amber-400' : 'border-amber-500',
        ring: 'ring-amber-500',
        dot: 'bg-amber-500',
      };
    case 'rose':
      return {
        primary: isL ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs' : 'bg-rose-600 hover:bg-rose-500 text-white',
        primaryMuted: isL ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
        activeText: isL ? 'text-rose-700 font-semibold' : 'text-rose-400',
        activeBorder: isL ? 'border-rose-400' : 'border-rose-500',
        ring: 'ring-rose-500',
        dot: 'bg-rose-500',
      };
    case 'violet':
      return {
        primary: isL ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-xs' : 'bg-violet-600 hover:bg-violet-500 text-white',
        primaryMuted: isL ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-violet-500/10 text-violet-400 border border-violet-500/30',
        activeText: isL ? 'text-violet-700 font-semibold' : 'text-violet-400',
        activeBorder: isL ? 'border-violet-400' : 'border-violet-500',
        ring: 'ring-violet-500',
        dot: 'bg-violet-500',
      };
    case 'sky':
    default:
      return {
        primary: isL ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs' : 'bg-sky-600 hover:bg-sky-500 text-white',
        primaryMuted: isL ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-sky-500/10 text-sky-400 border border-sky-500/30',
        activeText: isL ? 'text-sky-700 font-semibold' : 'text-sky-400',
        activeBorder: isL ? 'border-sky-400' : 'border-sky-500',
        ring: 'ring-sky-500',
        dot: 'bg-sky-500',
      };
  }
}

export function getDensityPadding(density: InterfaceDensity) {
  switch (density) {
    case 'compact':
      return {
        container: 'p-2',
        card: 'p-1.5',
        cardInner: 'py-1.5 px-2',
        tableRow: 'py-1 px-2.5 text-xs',
        input: 'p-1.5 text-xs',
        button: 'px-2 py-1 text-xs',
        gap: 'gap-1.5',
        spaceY: 'space-y-1',
        headerHeight: 'min-h-[2.25rem] py-1',
        badge: 'py-0.2 px-1 text-[10px]',
      };
    case 'spacious':
      return {
        container: 'p-4',
        card: 'p-3.5',
        cardInner: 'py-3.5 px-4',
        tableRow: 'py-3 px-4 text-sm',
        input: 'p-3 text-sm',
        button: 'px-4 py-2 text-sm',
        gap: 'gap-3.5',
        spaceY: 'space-y-3',
        headerHeight: 'min-h-[3.25rem] py-2',
        badge: 'py-1 px-2 text-xs',
      };
    case 'comfortable':
    default:
      return {
        container: 'p-3',
        card: 'p-2.5',
        cardInner: 'py-2.5 px-3',
        tableRow: 'py-2 px-3 text-xs',
        input: 'p-2 text-xs',
        button: 'px-3 py-1.5 text-xs',
        gap: 'gap-2.5',
        spaceY: 'space-y-2',
        headerHeight: 'min-h-[2.75rem] py-1.5',
        badge: 'py-0.5 px-1.5 text-[10.5px]',
      };
  }
}

export function getFontScaleStyle(scale: FontSizeScale) {
  switch (scale) {
    case 'sm':
      return 'text-[13px]';
    case 'lg':
      return 'text-[17px]';
    case 'base':
    default:
      return 'text-[14.5px]';
  }
}
