import type {
  AppearanceEnhancementConfig,
  LiveEnhancementConfig,
  VideoPlayerEnhancementConfig,
  ThemeEnhancementConfig,
} from '@core/types';
import { StyleInjector } from './services/StyleInjector';
import { SpeedController } from './services/SpeedController';
import { CoverReplacementService } from '@core/services/CoverReplacementService';
import { ThemeSyncService } from '@core/services/ThemeSyncService';
import { AppearanceCSSGenerator } from '@core/services/css/migrated/AppearanceCSSGenerator';
import { logger } from '@core/utils/logger';
import {
  CSS_HIDE_PLAYER_BLUR,
  CSS_REMOVE_WATERMARK,
} from '@core/services/css/migrated/css-constants';

export class MigratedComponentOrchestrator {
  private appearanceGenerator = new AppearanceCSSGenerator();
  private maskPanelObserver: MutationObserver | null = null;
  private speedController = new SpeedController();
  private coverReplacement = new CoverReplacementService();
  private themeSync = new ThemeSyncService();

  constructor(private styleInjector: StyleInjector) {}

  applyAppearance(config: AppearanceEnhancementConfig): void {
    if (!config.enabled) {
      this.styleInjector.removeNamed('appearance-enhancement');
      return;
    }

    const css = this.appearanceGenerator.generate(config);
    if (css) {
      this.styleInjector.injectNamed('appearance-enhancement', css);
      logger.debug('MigratedOrchestrator', 'Appearance enhancement applied');
    } else {
      this.styleInjector.removeNamed('appearance-enhancement');
    }
  }

  applyLiveEnhancement(config: LiveEnhancementConfig): void {
    if (!config.enabled) {
      this.styleInjector.removeNamed('live-enhancement');
      this.stopMaskPanelRemoval();
      return;
    }

    const rules: string[] = [];
    if (config.hidePlayerBlur) rules.push(CSS_HIDE_PLAYER_BLUR);
    if (config.removeWatermark) rules.push(CSS_REMOVE_WATERMARK);

    if (rules.length > 0) {
      this.styleInjector.injectNamed('live-enhancement', rules.join('\n'));
    } else {
      this.styleInjector.removeNamed('live-enhancement');
    }

    if (config.removeMaskPanel) {
      this.startMaskPanelRemoval();
    } else {
      this.stopMaskPanelRemoval();
    }
  }

  applyVideoPlayerEnhancement(config: VideoPlayerEnhancementConfig): void {
    if (!config.enabled) {
      this.speedController.disable();
      return;
    }

    if (config.extendSpeed) {
      this.speedController.enableExtendedSpeed(0.0625, 16);
    }

    if (config.rememberSpeed) {
      this.speedController.enableSpeedMemory();
    }

    logger.debug('MigratedOrchestrator', 'Video player enhancement applied:', config);
  }

  applyThemeEnhancement(config: ThemeEnhancementConfig): void {
    if (config.darkModeFollowSystem) {
      this.themeSync.start();
    } else {
      this.themeSync.stop();
    }

    if (config.replaceCover) {
      this.coverReplacement.start();
    } else {
      this.coverReplacement.stop();
    }

    logger.debug('MigratedOrchestrator', 'Theme enhancement applied:', config);
  }

  private startMaskPanelRemoval(): void {
    if (this.maskPanelObserver) return;

    this.maskPanelObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.id === 'web-player-module-area-mask-panel' ||
                node.classList?.contains('player-mask-panel')) {
              node.remove();
            }
          }
        }
      }
    });

    this.maskPanelObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    logger.debug('MigratedOrchestrator', 'Mask panel removal started');
  }

  private stopMaskPanelRemoval(): void {
    if (this.maskPanelObserver) {
      this.maskPanelObserver.disconnect();
      this.maskPanelObserver = null;
      logger.debug('MigratedOrchestrator', 'Mask panel removal stopped');
    }
  }

  cleanup(): void {
    this.styleInjector.removeNamed('appearance-enhancement');
    this.styleInjector.removeNamed('live-enhancement');
    this.stopMaskPanelRemoval();
    this.speedController.disable();
    this.coverReplacement.stop();
    this.themeSync.stop();
  }
}
