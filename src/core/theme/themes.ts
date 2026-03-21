import type { ThemeDefinition } from '../types/theme';

export const MINIMAL_THEME: ThemeDefinition = {
  id: 'minimal',
  name: '极简黑白',
  description: '高对比度、简洁线条的极简主义设计',
  light: {
    // Background
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F5F5F5',
    bgTertiary: '#E8E8E8',
    bgHover: '#D0D0D0',
    
    // Text
    textPrimary: '#000000',
    textSecondary: '#333333',
    textTertiary: '#666666',
    textMuted: '#999999',
    
    // Border
    borderPrimary: '#000000',
    borderSecondary: '#CCCCCC',
    
    // Accent
    accentPrimary: '#000000',
    accentHover: '#333333',
    accentActive: '#666666',
    
    // Status
    success: '#000000',
    warning: '#666666',
    error: '#000000',
    info: '#333333',
    
    // Special
    overlay: 'rgba(0, 0, 0, 0.8)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    // Background
    bgPrimary: '#000000',
    bgSecondary: '#1A1A1A',
    bgTertiary: '#2D2D2D',
    bgHover: '#3D3D3D',
    
    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#E0E0E0',
    textTertiary: '#B0B0B0',
    textMuted: '#808080',
    
    // Border
    borderPrimary: '#FFFFFF',
    borderSecondary: '#404040',
    
    // Accent
    accentPrimary: '#FFFFFF',
    accentHover: '#CCCCCC',
    accentActive: '#999999',
    
    // Status
    success: '#FFFFFF',
    warning: '#B0B0B0',
    error: '#FFFFFF',
    info: '#E0E0E0',
    
    // Special
    overlay: 'rgba(255, 255, 255, 0.1)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
};

export const TOKYO_THEME: ThemeDefinition = {
  id: 'tokyo',
  name: 'Tokyo Nights',
  description: '深邃的东京之夜配色方案',
  light: {
    // Background
    bgPrimary: '#F8F9FA',
    bgSecondary: '#E9ECEF',
    bgTertiary: '#DEE2E6',
    bgHover: '#CED4DA',
    
    // Text
    textPrimary: '#212529',
    textSecondary: '#495057',
    textTertiary: '#6C757D',
    textMuted: '#ADB5BD',
    
    // Border
    borderPrimary: '#6F42C1',
    borderSecondary: '#DEE2E6',
    
    // Accent - Tokyo purple
    accentPrimary: '#6F42C1',
    accentHover: '#593499',
    accentActive: '#442875',
    
    // Status
    success: '#28A745',
    warning: '#FFC107',
    error: '#DC3545',
    info: '#17A2B8',
    
    // Special
    overlay: 'rgba(33, 37, 41, 0.5)',
    shadow: 'rgba(111, 66, 193, 0.15)',
  },
  dark: {
    // Background - Deep Tokyo night
    bgPrimary: '#1A1B26',
    bgSecondary: '#24283B',
    bgTertiary: '#2F3549',
    bgHover: '#414868',
    
    // Text
    textPrimary: '#C0CAF5',
    textSecondary: '#A9B1D6',
    textTertiary: '#787C99',
    textMuted: '#565F89',
    
    // Border
    borderPrimary: '#7AA2F7',
    borderSecondary: '#414868',
    
    // Accent - Tokyo night purple
    accentPrimary: '#7AA2F7',
    accentHover: '#5D87E5',
    accentActive: '#3F6BC9',
    
    // Status
    success: '#9ECE6A',
    warning: '#E0AF68',
    error: '#F7768E',
    info: '#7DCFFF',
    
    // Special
    overlay: 'rgba(26, 27, 38, 0.9)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

export const THEMES: Record<string, ThemeDefinition> = {
  minimal: MINIMAL_THEME,
  tokyo: TOKYO_THEME,
};
