import { useState, useEffect } from 'react';

/**
 * Hook that returns the current time, updating at a specified interval
 */
export function useNow(interval: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);

  return now;
}
