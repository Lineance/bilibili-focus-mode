import type { ThemeMode, ThemeColorScheme, ThemeColors, ThemeConfig } from '../types/theme';
import { THEMES } from '../theme/themes';

const STORAGE_KEY = 'focus-mode-theme';

export class ThemeService {
  private currentMode: ThemeMode = 'dark';
  private currentScheme: ThemeColorScheme = 'tokyo';
  private styleElement: HTMLStyleElement | null = null;
  private listeners: Set<(config: ThemeConfig) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.initializeStyleElement();
  }

  /**
   * Load theme configuration from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config: ThemeConfig = JSON.parse(stored);
        this.currentMode = config.mode || 'dark';
        this.currentScheme = config.colorScheme || 'tokyo';
      }
    } catch (error) {
      console.error('[ThemeService] Failed to load theme from storage:', error);
    }
  }

  /**
   * Save theme configuration to localStorage
   */
  private saveToStorage(): void {
    try {
      const config: ThemeConfig = {
        mode: this.currentMode,
        colorScheme: this.currentScheme,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('[ThemeService] Failed to save theme to storage:', error);
    }
  }

  /**
   * Initialize or get existing style element
   */
  private initializeStyleElement(): void {
    // Check if style element already exists
    this.styleElement = document.getElementById('focus-mode-theme-styles') as HTMLStyleElement;
    
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'focus-mode-theme-styles';
      document.head.appendChild(this.styleElement);
    }

    // Apply initial theme
    this.applyTheme();
  }

  /**
   * Get current theme colors based on mode and scheme
   */
  private getThemeColors(): ThemeColors {
    const theme = THEMES[this.currentScheme];
    return this.currentMode === 'light' ? theme.light : theme.dark;
  }

  /**
   * Generate CSS variables from theme colors
   */
  private generateCSSVariables(colors: ThemeColors): string {
    return `
      :root {
        /* Background colors */
        --fm-bg-primary: ${colors.bgPrimary};
        --fm-bg-secondary: ${colors.bgSecondary};
        --fm-bg-tertiary: ${colors.bgTertiary};
        --fm-bg-hover: ${colors.bgHover};
        
        /* Text colors */
        --fm-text-primary: ${colors.textPrimary};
        --fm-text-secondary: ${colors.textSecondary};
        --fm-text-tertiary: ${colors.textTertiary};
        --fm-text-muted: ${colors.textMuted};
        
        /* Border colors */
        --fm-border-primary: ${colors.borderPrimary};
        --fm-border-secondary: ${colors.borderSecondary};
        
        /* Accent colors */
        --fm-accent-primary: ${colors.accentPrimary};
        --fm-accent-hover: ${colors.accentHover};
        --fm-accent-active: ${colors.accentActive};
        
        /* Status colors */
        --fm-success: ${colors.success};
        --fm-warning: ${colors.warning};
        --fm-error: ${colors.error};
        --fm-info: ${colors.info};
        
        /* Special colors */
        --fm-overlay: ${colors.overlay};
        --fm-shadow: ${colors.shadow};
        
        /* Mode indicator */
        --fm-mode: "${this.currentMode}";
      }
    `;
  }

  /**
   * Generate base CSS styles that work with CSS variables
   */
  private generateBaseStyles(): string {
    return `
      /* Base styles using CSS variables */
      body {
        background-color: var(--fm-bg-primary);
        color: var(--fm-text-primary);
        transition: background-color 0.3s ease, color 0.3s ease;
      }

      /* Common components */
      .bg-primary { background-color: var(--fm-bg-primary) !important; }
      .bg-secondary { background-color: var(--fm-bg-secondary) !important; }
      .bg-tertiary { background-color: var(--fm-bg-tertiary) !important; }
      .bg-hover:hover { background-color: var(--fm-bg-hover) !important; }

      .text-primary { color: var(--fm-text-primary) !important; }
      .text-secondary { color: var(--fm-text-secondary) !important; }
      .text-tertiary { color: var(--fm-text-tertiary) !important; }
      .text-muted { color: var(--fm-text-muted) !important; }

      .border-primary { border-color: var(--fm-border-primary) !important; }
      .border-secondary { border-color: var(--fm-border-secondary) !important; }

      .accent-primary { color: var(--fm-accent-primary) !important; }
      .accent-hover:hover { color: var(--fm-accent-hover) !important; }

      .text-success { color: var(--fm-success) !important; }
      .text-warning { color: var(--fm-warning) !important; }
      .text-error { color: var(--fm-error) !important; }
      .text-info { color: var(--fm-info) !important; }

      /* Buttons and interactive elements */
      button, .btn {
        transition: all 0.3s ease;
      }

      button.bg-blue-600, .btn.bg-blue-600 {
        background-color: var(--fm-accent-primary) !important;
      }

      button.bg-blue-600:hover, .btn.bg-blue-600:hover {
        background-color: var(--fm-accent-hover) !important;
      }

      button.bg-blue-600:active, .btn.bg-blue-600:active {
        background-color: var(--fm-accent-active) !important;
      }

      /* Input fields */
      input, select, textarea {
        background-color: var(--fm-bg-secondary) !important;
        color: var(--fm-text-primary) !important;
        border-color: var(--fm-border-secondary) !important;
        transition: all 0.3s ease;
      }

      input:focus, select:focus, textarea:focus {
        border-color: var(--fm-accent-primary) !important;
        outline: none;
      }

      /* Cards and panels */
      .bg-gray-800 {
        background-color: var(--fm-bg-secondary) !important;
        border: 1px solid var(--fm-border-secondary);
      }

      /* Text colors in various contexts */
      .text-gray-400 { color: var(--fm-text-tertiary) !important; }
      .text-gray-500 { color: var(--fm-text-muted) !important; }
      .text-gray-300 { color: var(--fm-text-secondary) !important; }

      /* Background variations */
      .bg-black\\/20, .bg-black\\/30, .bg-black\\/40 {
        background-color: var(--fm-bg-tertiary) !important;
      }

      .bg-gray-700 {
        background-color: var(--fm-bg-tertiary) !important;
      }

      .bg-gray-900 {
        background-color: var(--fm-bg-secondary) !important;
      }

      /* Border colors */
      .border-gray-700 {
        border-color: var(--fm-border-secondary) !important;
      }

      .border-orange-900\\/50 {
        border-color: var(--fm-border-secondary) !important;
      }

      .border-orange-500\\/30 {
        border-color: var(--fm-accent-primary) !important;
        opacity: 0.3;
      }

      /* Status-specific backgrounds */
      .bg-green-900\\/30 {
        background-color: var(--fm-success) !important;
        opacity: 0.1;
      }

      .bg-red-900\\/30 {
        background-color: var(--fm-error) !important;
        opacity: 0.1;
      }

      .bg-green-600 {
        background-color: var(--fm-success) !important;
      }

      .bg-red-600 {
        background-color: var(--fm-error) !important;
      }

      .bg-orange-600 {
        background-color: var(--fm-accent-primary) !important;
      }

      .bg-orange-700 {
        background-color: var(--fm-accent-hover) !important;
      }

      /* Scrollbar styling */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: var(--fm-bg-tertiary);
      }

      ::-webkit-scrollbar-thumb {
        background: var(--fm-border-secondary);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: var(--fm-text-muted);
      }

      /* Selection color */
      ::selection {
        background-color: var(--fm-accent-primary);
        color: var(--fm-bg-primary);
      }
    `;
  }

  /**
   * Apply theme to the document
   */
  private applyTheme(): void {
    if (!this.styleElement) return;

    const colors = this.getThemeColors();
    const cssVariables = this.generateCSSVariables(colors);
    const baseStyles = this.generateBaseStyles();
    
    this.styleElement.textContent = cssVariables + baseStyles;

    // Apply body class for mode-specific styling
    document.body.setAttribute('data-fm-mode', this.currentMode);
    document.body.setAttribute('data-fm-scheme', this.currentScheme);

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Set theme mode (light/dark)
   */
  setMode(mode: ThemeMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.saveToStorage();
    this.applyTheme();
  }

  /**
   * Set color scheme
   */
  setScheme(scheme: ThemeColorScheme): void {
    if (this.currentScheme === scheme) return;
    this.currentScheme = scheme;
    this.saveToStorage();
    this.applyTheme();
  }

  /**
   * Get current theme configuration
   */
  getThemeConfig(): ThemeConfig {
    return {
      mode: this.currentMode,
      colorScheme: this.currentScheme,
    };
  }

  /**
   * Get available themes
   */
  getAvailableThemes() {
    return Object.values(THEMES).map(theme => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
    }));
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(callback: (config: ThemeConfig) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(): void {
    const config = this.getThemeConfig();
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('[ThemeService] Error in theme listener:', error);
      }
    });
  }

  /**
   * Toggle between light and dark mode
   */
  toggleMode(): void {
    this.setMode(this.currentMode === 'light' ? 'dark' : 'light');
  }

  /**
   * Initialize theme service and apply saved theme
   */
  initialize(): void {
    this.applyTheme();
  }
}
