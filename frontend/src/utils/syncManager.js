/**
 * Sync Manager — handles replaying offline mutations when connectivity returns.
 *
 * Flow:
 *  1. User performs action while offline → mutation queued in IndexedDB (syncQueue)
 *  2. Device comes back online → syncManager.processQueue() replays mutations in order
 *  3. Successful items are removed; failed items stay for retry
 *  4. Listeners are notified of sync progress (for UI updates)
 */
import axios from 'axios';
import {
  getPendingSyncItems,
  getPendingSyncCount,
  updateSyncItemStatus,
  removeSyncItem,
} from './offlineDb';

// ── Listeners ──
const listeners = new Set();

export const onSyncChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = (event) => {
  listeners.forEach((fn) => {
    try { fn(event); } catch { /* ignore */ }
  });
};

// ── State ──
let isSyncing = false;

/**
 * Process the entire pending sync queue.
 * Called automatically when going online, or manually by user.
 */
export const processQueue = async () => {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  const pendingCount = await getPendingSyncCount();
  if (pendingCount === 0) return;

  isSyncing = true;
  notify({ type: 'sync-start', pending: pendingCount });

  const items = await getPendingSyncItems();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await updateSyncItemStatus(item.id, 'syncing');

      // Get the current access token (may have been refreshed)
      const token = localStorage.getItem('access_token');
      const headers = {
        ...item.headers,
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
      const fullUrl = item.url.startsWith('http') ? item.url : `${API_BASE}${item.url}`;

      // Replay the mutation
      await axios({
        method: item.method,
        url: fullUrl,
        data: item.data,
        headers,
        timeout: 30000,
      });

      // Success — remove from queue
      await removeSyncItem(item.id);
      synced++;
      notify({ type: 'sync-item-done', synced, failed, total: items.length });
    } catch (err) {
      // If it's a 4xx client error, the request is malformed — remove it to avoid infinite retry
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        console.warn(`[SyncManager] Dropping item ${item.id} — server returned ${err.response.status}:`, err.response.data);
        await removeSyncItem(item.id);
        failed++;
      } else {
        // Server error or network still flaky — keep in queue for next attempt
        await updateSyncItemStatus(item.id, 'pending');
        item.retries = (item.retries || 0) + 1;
        failed++;
      }
      notify({ type: 'sync-item-failed', synced, failed, total: items.length, error: err.message });
    }
  }

  isSyncing = false;
  notify({
    type: 'sync-complete',
    synced,
    failed,
    remaining: await getPendingSyncCount(),
  });
};

/**
 * Get current sync status
 */
export const getSyncStatus = async () => {
  const pending = await getPendingSyncCount();
  return {
    isSyncing,
    pending,
    isOnline: navigator.onLine,
  };
};

/* ────────────────────────────────────────────
 *  Auto-sync: listen for connectivity changes
 * ──────────────────────────────────────────── */
let autoSyncSetup = false;

export const setupAutoSync = () => {
  if (autoSyncSetup) return;
  autoSyncSetup = true;

  // When device goes online, process the queue
  window.addEventListener('online', () => {
    notify({ type: 'online' });
    // Small delay to let network stabilise
    setTimeout(() => processQueue(), 2000);
  });

  window.addEventListener('offline', () => {
    notify({ type: 'offline' });
  });

  // Also check periodically (every 60s) in case 'online' event was missed
  setInterval(async () => {
    if (navigator.onLine && !isSyncing) {
      const count = await getPendingSyncCount();
      if (count > 0) {
        processQueue();
      }
    }
  }, 60000);

  // Process queue on startup if we're already online
  if (navigator.onLine) {
    setTimeout(() => processQueue(), 3000);
  }
};

