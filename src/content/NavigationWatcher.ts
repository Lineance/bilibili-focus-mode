export class NavigationWatcher {
  private lastUrl: string;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onChange: () => void;
  private titleObserver: MutationObserver | null = null;

  constructor(onChange: () => void) {
    this.lastUrl = window.location.href;
    this.onChange = onChange;
  }

  start(): void {
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(this, args);
      this.onUrlChange();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = (...args) => {
      originalReplaceState.apply(this, args);
      this.onUrlChange();
    };

    window.addEventListener('popstate', this.onUrlChange);

    const titleEl = document.querySelector('title');
    if (titleEl) {
      this.titleObserver = new MutationObserver(() => this.onUrlChange());
      this.titleObserver.observe(titleEl, { childList: true });
    }
  }

  private onUrlChange = (): void => {
    const currentUrl = window.location.href;
    if (currentUrl !== this.lastUrl) {
      this.lastUrl = currentUrl;
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.onChange();
      }, 300);
    }
  };

  destroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.titleObserver) this.titleObserver.disconnect();
    window.removeEventListener('popstate', this.onUrlChange);
  }
}
