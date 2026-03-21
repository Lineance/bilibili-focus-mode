export type ThemeMode = 'light' | 'dark';
export type ThemeColorScheme = 'minimal' | 'tokyo';

export interface ThemeColors {
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  
  // Border colors
  borderPrimary: string;
  borderSecondary: string;
  
  // Accent colors
  accentPrimary: string;
  accentHover: string;
  accentActive: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Special colors
  overlay: string;
  shadow: string;
}

export interface ThemeConfig {
  mode: ThemeMode;
  colorScheme: ThemeColorScheme;
}

export interface ThemeDefinition {
  id: ThemeColorScheme;
  name: string;
  description: string;
  light: ThemeColors;
  dark: ThemeColors;
}
