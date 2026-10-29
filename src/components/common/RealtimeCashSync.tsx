/**
 * Realtime sync disabled for now — causes cascade invalidation lag.
 * Instead: staleTime + manual refetch on user action.
 * Enable when: dedicated WebSocket monitoring, or user explicitly requests realtime.
 */
export function RealtimeCashSync() {
  return null;
}