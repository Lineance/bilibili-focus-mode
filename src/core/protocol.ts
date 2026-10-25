import type { NativeConnectionSnapshot } from '@core/nativeMessaging';
import type { ExtensionConfig, PermissionResult, VideoMetadata, VideoTag } from '@core/types';

export interface ProtocolMap {
  'native-monitor-status': {
    req: { refresh?: boolean };
    res: NativeConnectionSnapshot;
  };
  'check-permission': {
    req: { bvid: string; uploaderName?: string; title?: string };
    res: PermissionResult & {
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
        | 'collectionDetectionEnabled'
      >;
    };
  };
  'add-to-permanent': {
    req: { metadata: VideoMetadata };
    res: { success: boolean; permanentCount: number; message?: string };
  };
  'update-debt': {
    req: { minutes: number; tag: VideoTag; bvid: string };
    res: { currentDebt: number; bankruptcyEndTime: number | null };
  };
  'watch-ended': {
    req: { bvid: string; endedAt: number; title?: string; uploader?: string; tag?: VideoTag };
    res: { success: boolean; cooldownUntil: number | null };
  };
  'get-full-config': {
    req: {};
    res: { config: ExtensionConfig };
  };
  'sync-debt': {
    req: {};
    res: { currentDebt: number; bankruptcyEndTime: number | null };
  };
  'daily-bypass': {
    req: {};
    res: { success: boolean; message: string; expiresAt?: number };
  };
  'open-options-page': {
    req: {};
    res: { success: boolean; tabId?: number; error?: string };
  };
}
