import type { ThemeDefinition } from '../types/theme';

/**
 * Palette metadata.
 *
 * The values mirror `src/styles/tokens.css`, which is the rendering source of
 * truth. They are duplicated here only so the theme picker can render accurate
 * color swatches without reading computed styles.
 */
export const PAPER_INK_THEME: ThemeDefinition = {
  id: 'minimal',
  name: '纸墨',
  description: '暖白纸张、朱砂强调，编辑排版式的克制美学',
  light: {
    bgPrimary: '#F6F2E9',
    bgSecondary: '#FCF9F2',
    bgTertiary: '#EEE7D8',
    bgHover: '#E3DAC8',

    textPrimary: '#1A1714',
    textSecondary: '#4A443B',
    textTertiary: '#766E60',
    textMuted: '#9A9182',

    borderPrimary: '#B4442E',
    borderSecondary: '#D9CFBD',

    accentPrimary: '#B4442E',
    accentHover: '#9C3724',
    accentActive: '#812C1C',
    accentText: '#FCF9F2',

    success: '#3F6F4E',
    warning: '#A9741F',
    error: '#B4442E',
    info: '#3B5C7A',

    overlay: 'rgba(26, 23, 20, 0.9)',
    shadow: 'rgba(26, 23, 20, 0.16)',
  },
  dark: {
    bgPrimary: '#14110E',
    bgSecondary: '#1B1713',
    bgTertiary: '#241F19',
    bgHover: '#322A22',

    textPrimary: '#F0E8D9',
    textSecondary: '#C6BBA6',
    textTertiary: '#968C7A',
    textMuted: '#6F6759',

    borderPrimary: '#E2704F',
    borderSecondary: '#2F2821',

    accentPrimary: '#E2704F',
    accentHover: '#F08A6A',
    accentActive: '#C75C3D',
    accentText: '#171310',

    success: '#86BE93',
    warning: '#E0B45C',
    error: '#EC7A6B',
    info: '#8FB6D6',

    overlay: 'rgba(10, 8, 6, 0.95)',
    shadow: 'rgba(0, 0, 0, 0.55)',
  },
};

export const TOKYO_NIGHT_THEME: ThemeDefinition = {
  id: 'tokyo',
  name: '夜幕',
  description: '深靛底色与电光蓝强调，夜间专注的低亮度方案',
  light: {
    bgPrimary: '#F3F6FC',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#E9EEF8',
    bgHover: '#DCE4F3',

    textPrimary: '#101625',
    textSecondary: '#38435A',
    textTertiary: '#5D6980',
    textMuted: '#8590A5',

    borderPrimary: '#2F5FBF',
    borderSecondary: '#C9D4E7',

    accentPrimary: '#2F5FBF',
    accentHover: '#254E9F',
    accentActive: '#1D3F82',
    accentText: '#FFFFFF',

    success: '#1F7A52',
    warning: '#A6651B',
    error: '#C23B48',
    info: '#166D9E',

    overlay: 'rgba(246, 248, 252, 0.92)',
    shadow: 'rgba(16, 22, 37, 0.14)',
  },
  dark: {
    bgPrimary: '#0A0D13',
    bgSecondary: '#11161F',
    bgTertiary: '#171D28',
    bgHover: '#212A38',

    textPrimary: '#E8EDF7',
    textSecondary: '#A6B2C6',
    textTertiary: '#7B879E',
    textMuted: '#5A657C',

    borderPrimary: '#7AA2F7',
    borderSecondary: '#232B3A',

    accentPrimary: '#7AA2F7',
    accentHover: '#9BBBFB',
    accentActive: '#5D87E5',
    accentText: '#08101F',

    success: '#5FD1A0',
    warning: '#E8B15C',
    error: '#F0737B',
    info: '#7DD3FC',

    overlay: 'rgba(6, 9, 14, 0.94)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
};

export const THEMES: Record<string, ThemeDefinition> = {
  tokyo: TOKYO_NIGHT_THEME,
  minimal: PAPER_INK_THEME,
};
