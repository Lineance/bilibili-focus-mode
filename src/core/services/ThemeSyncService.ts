import { logger } from '@core/utils/logger';

export class ThemeSyncService {
  private mediaQuery: MediaQueryList | null = null;
  private handler: ((e: MediaQueryListEvent) => void) | null = null;
  private styleEl: HTMLStyleElement | null = null;

  start(): void {
    if (this.mediaQuery) return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.handler = (e: MediaQueryListEvent) => this.applyTheme(e.matches);
    
    this.applyTheme(this.mediaQuery.matches);
    this.mediaQuery.addEventListener('change', this.handler);
    
    logger.debug('ThemeSync', 'Started, dark mode:', this.mediaQuery.matches);
  }

  stop(): void {
    if (this.mediaQuery && this.handler) {
      this.mediaQuery.removeEventListener('change', this.handler);
    }
    this.mediaQuery = null;
    this.handler = null;
    this.removeTheme();
    logger.debug('ThemeSync', 'Stopped');
  }

  private applyTheme(isDark: boolean): void {
    this.removeTheme();

    if (isDark) {
      this.styleEl = document.createElement('style');
      this.styleEl.id = 'bilibili-focus-mode-dark-theme';
      this.styleEl.textContent = `
        html {
          filter: invert(1) hue-rotate(180deg) !important;
        }
        html img,
        html video,
        html .bili-video-card__cover,
        html .bili-video-card__image--wrap,
        html .v-img,
        html picture,
        html canvas {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `;
      document.head.appendChild(this.styleEl);
      document.documentElement.setAttribute('data-fm-dark-mode', 'dark');
    } else {
      document.documentElement.removeAttribute('data-fm-dark-mode');
    }
  }

  private removeTheme(): void {
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
    document.documentElement.removeAttribute('data-fm-dark-mode');
  }
}
