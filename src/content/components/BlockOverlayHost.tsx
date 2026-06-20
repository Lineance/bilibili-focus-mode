/* eslint-disable react-refresh/only-export-components */

import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { sendMessage } from 'webext-bridge/content-script';
import { MANAGER_PAGE_PATH } from '@core/constants';
import type { VideoMetadata, VideoTag } from '@core/types';
import { BlockOverlay, type BlockOverlayProps } from './BlockOverlay';
import { TagSelectionDialog } from './TagSelectionDialog';

function OverlayShell(props: BlockOverlayProps) {
  return (
    <StrictMode>
      <BlockOverlay {...props} />
    </StrictMode>
  );
}

function TagDialogShell({
  metadata,
  onSelect,
}: {
  metadata: VideoMetadata;
  onSelect: (tag: VideoTag | null) => void;
}) {
  return (
    <StrictMode>
      <TagSelectionDialog metadata={metadata} onSelect={onSelect} />
    </StrictMode>
  );
}

export class BlockOverlayManager {
  private container: HTMLDivElement | null = null;
  private root: Root | null = null;
  private tagContainer: HTMLDivElement | null = null;
  private tagRoot: Root | null = null;

  show(
    metadata: VideoMetadata,
    reason: string,
    windowInfo: BlockOverlayProps['windowInfo'],
    fuseInfo: BlockOverlayProps['fuseInfo'],
    bypassInfo: BlockOverlayProps['bypassInfo'],
    onAddToLimbo: (metadata: VideoMetadata) => Promise<void>,
    onOpenManager: () => void,
    onDailyBypass: () => void
  ): void {
    this.applyHardBlock();
    this.remove();

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'bilibili-focus-mode-overlay-host';
      document.body.appendChild(this.container);
    }

    this.root = createRoot(this.container);
    this.root.render(
      <OverlayShell
        metadata={metadata}
        reason={reason}
        windowInfo={windowInfo}
        fuseInfo={fuseInfo}
        bypassInfo={bypassInfo}
        onAddToLimbo={onAddToLimbo}
        onOpenManager={onOpenManager}
        onDailyBypass={onDailyBypass}
      />
    );
  }

  remove(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  showTagSelectionDialog(metadata: VideoMetadata): Promise<VideoTag | null> {
    this.removeTagDialog();

    if (!this.tagContainer) {
      this.tagContainer = document.createElement('div');
      this.tagContainer.id = 'bilibili-focus-mode-tag-dialog-host';
      document.body.appendChild(this.tagContainer);
    }

    return new Promise<VideoTag | null>((resolve) => {
      this.tagRoot = createRoot(this.tagContainer!);
      this.tagRoot.render(
        <TagDialogShell
          metadata={metadata}
          onSelect={(tag) => {
            this.removeTagDialog();
            resolve(tag);
          }}
        />
      );
    });
  }

  async openManagerPage(): Promise<void> {
    if (!chrome.runtime?.id) {
      console.error('[Bilibili Focus Mode] Extension context invalidated');
      alert('扩展已失效，请刷新页面或重新加载扩展');
      return;
    }
    try {
      const result = await sendMessage('open-options-page', {}, 'background') as { success: boolean } | undefined;
      if (!result?.success) {
        window.open(chrome.runtime.getURL(MANAGER_PAGE_PATH), '_blank');
      }
    } catch (error) {
      console.error('[Bilibili Focus Mode] Failed to open manager:', error);
      window.open(chrome.runtime.getURL(MANAGER_PAGE_PATH), '_blank');
    }
  }

  private removeTagDialog(): void {
    if (this.tagRoot) {
      this.tagRoot.unmount();
      this.tagRoot = null;
    }
    if (this.tagContainer) {
      this.tagContainer.remove();
      this.tagContainer = null;
    }
  }

  private applyHardBlock(): void {
    const playerSelector = [
      '.bilibili-player',
      '.bpx-player-container',
      '#bilibili-player',
      '.player-container',
      '#live-player',
      '.live-player',
      '[class*="live-player"]',
      '#player',
    ].join(', ');

    document.querySelectorAll(playerSelector).forEach((player) => {
      (player as HTMLElement).style.display = 'none';
    });

    document.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
  }
}
