import type { VideoMetadata, PermissionResult } from '@core/types';

export interface ProtocolMap {
  'check-permission': {
    req: { bvid: string; uploaderName?: string };
    res: PermissionResult & {
      inReviewWindow?: boolean;
      timeUntilWindow?: number;
      uploaderAllowed?: boolean;
    };
  };
  'add-to-limbo': {
    req: { metadata: VideoMetadata; sourceUrl: string };
    res: { success: boolean; limboCount: number };
  };
  'update-debt': {
    req: { minutes: number; type: 'accrue' | 'repay' };
    res: { currentDebt: number };
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
}
