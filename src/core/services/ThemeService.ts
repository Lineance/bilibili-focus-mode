import type { ThemeMode, ThemeColorScheme, ThemeColors, ThemeConfig } from '../types/theme';
import { THEMES } from '../theme/themes';
import { ThemeCSSGenerator } from './css/ThemeCSSGenerator';

const STORAGE_KEY = 'focus-mode-theme';

export class ThemeService {
  private currentMode: ThemeMode = 'dark';
  private currentScheme: ThemeColorScheme = 'tokyo';
  private styleElement: HTMLStyleElement | null = null;
  private listeners: Set<(config: ThemeConfig) => void> = new Set();
  private cssGenerator = new ThemeCSSGenerator();

  constructor() {
    this.loadFromStorage();
    this.initializeStyleElement();
  }

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

  private initializeStyleElement(): void {
    this.styleElement = document.getElementById('focus-mode-theme-styles') as HTMLStyleElement;
    
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'focus-mode-theme-styles';
      document.head.appendChild(this.styleElement);
    }

    this.applyTheme();
  }

  private getThemeColors(): ThemeColors {
    const theme = THEMES[this.currentScheme];
    return this.currentMode === 'light' ? theme.light : theme.dark;
  }

  private applyTheme(): void {
    if (!this.styleElement) return;

    const colors = this.getThemeColors();
    const cssVariables = this.cssGenerator.generateCSSVariables(colors, this.currentMode);
    const baseStyles = this.cssGenerator.generateBaseStyles();
    
    this.styleElement.textContent = cssVariables + baseStyles;

    document.body.setAttribute('data-fm-mode', this.currentMode);
    document.body.setAttribute('data-fm-scheme', this.currentScheme);

    this.notifyListeners();
  }

  setMode(mode: ThemeMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.saveToStorage();
    this.applyTheme();
  }

  setScheme(scheme: ThemeColorScheme): void {
    if (this.currentScheme === scheme) return;
    this.currentScheme = scheme;
    this.saveToStorage();
    this.applyTheme();
  }

  getThemeConfig(): ThemeConfig {
    return {
      mode: this.currentMode,
      colorScheme: this.currentScheme,
    };
  }

  getAvailableThemes() {
    return Object.values(THEMES).map(theme => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
    }));
  }

  subscribe(callback: (config: ThemeConfig) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

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

  toggleMode(): void {
    this.setMode(this.currentMode === 'light' ? 'dark' : 'light');
  }

  initialize(): void {
    this.applyTheme();
  }
}
