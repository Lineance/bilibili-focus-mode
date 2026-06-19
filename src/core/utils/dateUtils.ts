/**
 * Get today's date key in YYYY-MM-DD format (local time)
 */
export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Reset quota if needed - returns true if reset was performed
 */
export function resetQuotaIfNeeded(
  lastResetDate: string,
  todayKey: string
): boolean {
  return lastResetDate !== todayKey;
}
