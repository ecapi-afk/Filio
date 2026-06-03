export const EVENT_XERO_SYNC_START = 'xero-sync-started';
export const EVENT_XERO_SYNC_COMPLETE = 'xero-sync-completed';

export function emitXeroSyncStart() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT_XERO_SYNC_START));
}

export function emitXeroSyncComplete(payload: { error?: string, lastSync?: string, added?: number, updated?: number }) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT_XERO_SYNC_COMPLETE, { detail: payload }));
}
