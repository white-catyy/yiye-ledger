/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export type LedgerPalette = {
  seed: string;
  paper: string;
  paperDeep: string;
  card: string;
  ink: string;
  inkSoft: string;
  muted: string;
  frost: string;
  skyDeep: string;
  aqua: string;
  line: string;
  input: string;
  danger: string;
  white: string;
};

export const THEME_PRESETS = [
  { name: '雾蓝', color: '#4C9FC4' },
  { name: '海盐', color: '#6FAEB7' },
  { name: '薄荷', color: '#5B9A7B' },
  { name: '丁香', color: '#8B7BC1' },
  { name: '玫瑰', color: '#C47A8A' },
  { name: '暖杏', color: '#C9975A' },
] as const;

function parseHex(color: string) {
  const normalized = color.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function mix(base: string, target: string, amount: number) {
  const first = parseHex(base);
  const second = parseHex(target);
  if (!first || !second) {
    return base;
  }
  const channel = (start: number, end: number) =>
    Math.round(start + (end - start) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(first.r, second.r)}${channel(first.g, second.g)}${channel(first.b, second.b)}`.toUpperCase();
}

export function normalizeThemeColor(value: string) {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return parseHex(withHash) ? withHash.toUpperCase() : null;
}

export function createLedgerPalette(seed: string): LedgerPalette {
  const safeSeed = normalizeThemeColor(seed) ?? '#4C9FC4';
  return {
    seed: safeSeed,
    paper: mix(safeSeed, '#FFFFFF', 0.9),
    paperDeep: mix(safeSeed, '#FFFFFF', 0.78),
    card: mix(safeSeed, '#FFFFFF', 0.975),
    ink: mix(safeSeed, '#102D39', 0.72),
    inkSoft: mix(safeSeed, '#102D39', 0.42),
    muted: mix(safeSeed, '#82949D', 0.58),
    frost: mix(safeSeed, '#FFFFFF', 0.66),
    skyDeep: mix(safeSeed, '#FFFFFF', 0.3),
    aqua: safeSeed,
    line: mix(safeSeed, '#FFFFFF', 0.82),
    input: mix(safeSeed, '#FFFFFF', 0.93),
    danger: '#B85F66',
    white: '#FFFFFF',
  };
}

export const ledgerColors = createLedgerPalette('#4C9FC4');

export const Colors = {
  light: {
    text: ledgerColors.ink,
    background: ledgerColors.paper,
    backgroundElement: ledgerColors.card,
    backgroundSelected: ledgerColors.frost,
    textSecondary: ledgerColors.inkSoft,
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
