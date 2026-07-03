import { logger } from '@core/utils/logger';
import { extractBvid } from '@core/utils/videoUrl';

const VIDEO_SHOT_API = 'https://api.bilibili.com/x/player/videoshot';
const coverCache = new Map<string, string[]>();

export class CoverReplacementService {
  private observer: MutationObserver | null = null;
  private enabled = false;

  start(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.observeCards();
    this.replaceExistingCovers();
    logger.debug('CoverReplacement', 'Started');
  }

  stop(): void {
    this.enabled = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.restoreCovers();
    logger.debug('CoverReplacement', 'Stopped');
  }

  private observeCards(): void {
    this.observer = new MutationObserver((mutations) => {
      if (!this.enabled) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            this.processCard(node);
          }
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private replaceExistingCovers(): void {
    const cards = document.querySelectorAll('.bili-video-card');
    cards.forEach((card) => this.processCard(card as HTMLElement));
  }

  private processCard(card: HTMLElement): void {
    if (!this.enabled) return;

    const link = card.querySelector('a[href*="/video/"]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const bvid = extractBvid(href);
    if (!bvid) return;

    const img = card.querySelector('.bili-video-card__cover, .bili-video-card__image--wrap img') as HTMLImageElement;
    if (!img || img.dataset.bfmReplaced === 'true') return;

    this.replaceCover(img, bvid);
  }

  private async replaceCover(img: HTMLImageElement, bvid: string): Promise<void> {
    try {
      const shots = await this.getVideoShots(bvid);
      if (!shots || shots.length === 0) return;

      const randomShot = shots[Math.floor(Math.random() * shots.length)];
      
      img.dataset.bfmOriginal = img.src;
      img.dataset.bfmReplaced = 'true';
      img.src = randomShot;
      
      img.addEventListener('mouseenter', () => {
        if (img.dataset.bfmOriginal) {
          img.src = img.dataset.bfmOriginal;
        }
      }, { once: true });

      img.addEventListener('mouseleave', () => {
        if (img.dataset.bfmReplaced === 'true' && img.dataset.bfmOriginal) {
          img.src = randomShot;
        }
      });
    } catch (error) {
      logger.debug('CoverReplacement', 'Failed to replace cover:', error);
    }
  }

  private async getVideoShots(bvid: string): Promise<string[] | null> {
    if (coverCache.has(bvid)) {
      return coverCache.get(bvid)!;
    }

    try {
      const resp = await fetch(`${VIDEO_SHOT_API}?bvid=${bvid}`);
      const json = await resp.json();
      
      if (json.code !== 0 || !json.data?.image) {
        return null;
      }

      const shots: string[] = json.data.image.filter((url: string) => !!url);
      if (json.data?.pdata) {
        const pdataShots: string[] = json.data.pdata
          .flatMap((p: { image?: string[] }) => p.image || [])
          .filter((url: string) => !!url);
        shots.push(...pdataShots);
      }

      coverCache.set(bvid, shots);
      return shots;
    } catch {
      return null;
    }
  }

  private restoreCovers(): void {
    const replaced = document.querySelectorAll('[data-bfm-replaced]');
    replaced.forEach((el) => {
      const img = el as HTMLImageElement;
      if (img.dataset.bfmOriginal) {
        img.src = img.dataset.bfmOriginal;
      }
      delete img.dataset.bfmOriginal;
      delete img.dataset.bfmReplaced;
    });
  }
}
