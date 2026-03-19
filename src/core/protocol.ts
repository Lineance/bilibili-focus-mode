import type { ExtensionConfig, PermissionResult, VideoMetadata, VideoTag } from '@core/types';

export interface ProtocolMap {
  'check-permission': {
    req: { bvid: string; uploaderName?: string; title?: string };
    res: PermissionResult & {
      inReviewWindow?: boolean;
      timeUntilWindow?: number;
      uploaderAllowed?: boolean;
      videoTag?: VideoTag;
      config?: Pick<
        ExtensionConfig,
        | 'debtEnabled'
        | 'entertainmentRatio'
        | 'learningRepayRatio'
        | 'maxDebtMinutes'
        | 'bankruptcyLockHours'
        | 'postWatchCooldownMinutes'
        | 'instantBreakFuse'
        | 'collectionDetectionEnabled'
      >;
    };
  };
  'add-to-limbo': {
    req: { metadata: VideoMetadata; sourceUrl: string };
    res: { success: boolean; limboCount: number };
  };
  'update-debt': {
    req: { minutes: number; tag: VideoTag };
    res: { currentDebt: number; bankruptcyEndTime: number | null };
  };
  'get-storage': {
    req: { key: string };
    res: unknown;
  };
  'set-storage': {
    req: { key: string; value: unknown };
    res: { success: boolean };
  };
  'verify-fuse': {
    req: { bvid: string; fuseCode: string };
    res: { success: boolean; message: string };
  };
  'apply-fuse': {
    req: { metadata: { bvid: string; title: string; uploader: string; coverUrl: string; tag: VideoTag; addedAt: number }; isBankruptcy: boolean; remainingBankruptcyMinutes?: number };
    res: { success: boolean; message: string; fuseCode?: string; expiresAt?: number };
  };
  'watch-ended': {
    req: { bvid: string; endedAt: number };
    res: { success: boolean; cooldownUntil: number | null };
  };
  'get-full-config': {
    req: {};
    res: { config: ExtensionConfig };
  };
  'verify-time-window-fuse': {
    req: { fuseCode: string };
    res: { success: boolean; message: string; expiresAt?: number };
  };
  'apply-time-window-fuse': {
    req: {};
    res: { success: boolean; message: string; fuseCode?: string; expiresAt?: number };
  };
  'sync-debt': {
    req: {};
    res: { currentDebt: number; bankruptcyEndTime: number | null };
  };
}
