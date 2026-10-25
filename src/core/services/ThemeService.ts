import type { ThemeMode, ThemeColorScheme, ThemeConfig } from '../types/theme';
import { THEMES } from '../theme/themes';

const STORAGE_KEY = 'focus-mode-theme';

/**
 * Theme source of truth.
 *
 * Palettes are static CSS (see `src/styles/tokens.css`); this service only
 * flips `data-fm-mode` / `data-fm-scheme` on <html> and persists the choice.
 * No style element is created, so there is no flash of unstyled theme and no
 * runtime `!important` CSS to drift out of sync with the build.
 */
export class ThemeService {
  private static instance: ThemeService | null = null;

  private currentMode: ThemeMode = 'dark';
  private currentScheme: ThemeColorScheme = 'tokyo';
  private listeners: Set<(config: ThemeConfig) => void> = new Set();

  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  constructor() {
    this.loadFromStorage();
    this.applyTheme();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const config = JSON.parse(stored) as Partial<ThemeConfig>;
      if (config.mode === 'light' || config.mode === 'dark') {
        this.currentMode = config.mode;
      }
      if (config.colorScheme && config.colorScheme in THEMES) {
        this.currentScheme = config.colorScheme;
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

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.setAttribute('data-fm-mode', this.currentMode);
    root.setAttribute('data-fm-scheme', this.currentScheme);

    const theme = THEMES[this.currentScheme];
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && theme) {
      meta.setAttribute('content', this.currentMode === 'light' ? theme.light.bgPrimary : theme.dark.bgPrimary);
    }

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
    return Object.values(THEMES).map((theme) => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
    }));
  }

  subscribe(callback: (config: ThemeConfig) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const config = this.getThemeConfig();
    this.listeners.forEach((listener) => {
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
