export class StyleInjector {
  private globalStyleEl: HTMLStyleElement | null = null;
  private pageStyleEl: HTMLStyleElement | null = null;

  injectGlobal(css: string): void {
    this.removeGlobal();
    this.globalStyleEl = document.createElement('style');
    this.globalStyleEl.id = 'bilibili-focus-mode-global-styles';
    this.globalStyleEl.textContent = css;
    document.head.appendChild(this.globalStyleEl);
  }

  injectPage(css: string): void {
    this.removePage();
    this.pageStyleEl = document.createElement('style');
    this.pageStyleEl.id = 'bilibili-focus-mode-page-styles';
    this.pageStyleEl.textContent = css;
    document.head.appendChild(this.pageStyleEl);
  }

  removePage(): void {
    if (this.pageStyleEl) {
      this.pageStyleEl.remove();
      this.pageStyleEl = null;
    }
  }

  removeGlobal(): void {
    if (this.globalStyleEl) {
      this.globalStyleEl.remove();
      this.globalStyleEl = null;
    }
  }

  cleanup(): void {
    this.removePage();
    this.removeGlobal();
  }
}
