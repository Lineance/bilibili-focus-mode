import { useEffect, useState } from 'react';
import { sendMessage } from 'webext-bridge/content-script';
import type { PermissionResult } from '@core/types';
import type { ProtocolMap } from '@core/protocol';

export function usePermission(bvid: string | null) {
  const [result, setResult] = useState<PermissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!bvid) {
      setLoading(false);
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        const res = await sendMessage('check-permission', { bvid } as ProtocolMap['check-permission']['req']) as PermissionResult;
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [bvid]);

  return { result, loading, error };
}
