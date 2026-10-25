export class StyleInjector {
  private globalStyleEl: HTMLStyleElement | null = null;
  private pageStyleEl: HTMLStyleElement | null = null;
  private namedElements = new Map<string, HTMLStyleElement>();

  injectGlobal(css: string): void {
    if (this.globalStyleEl?.textContent === css) return;
    this.removeGlobal();
    this.globalStyleEl = document.createElement('style');
    this.globalStyleEl.id = 'bilibili-focus-mode-global-styles';
    this.globalStyleEl.textContent = css;
    document.head.appendChild(this.globalStyleEl);
  }

  injectPage(css: string): void {
    if (this.pageStyleEl?.textContent === css) return;
    this.removePage();
    this.pageStyleEl = document.createElement('style');
    this.pageStyleEl.id = 'bilibili-focus-mode-page-styles';
    this.pageStyleEl.textContent = css;
    document.head.appendChild(this.pageStyleEl);
  }

  injectNamed(name: string, css: string): void {
    const existing = this.namedElements.get(name);
    if (existing?.textContent === css) return;
    this.removeNamed(name);
    const el = document.createElement('style');
    el.id = `bilibili-focus-mode-${name}`;
    el.textContent = css;
    document.head.appendChild(el);
    this.namedElements.set(name, el);
  }

  removeNamed(name: string): void {
    const el = this.namedElements.get(name);
    if (el) {
      el.remove();
      this.namedElements.delete(name);
    }
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
    for (const [, el] of this.namedElements) {
      el.remove();
    }
    this.namedElements.clear();
  }
}
