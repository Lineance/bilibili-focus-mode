/**
 * Get today's date key in YYYY-MM-DD format
 */
export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
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
