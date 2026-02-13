/**
 * Offline Database — IndexedDB via Dexie.js
 *
 * Stores:
 *  1. apiCache   — cached GET responses for offline reads
 *  2. syncQueue  — queued mutations (POST/PUT/DELETE) to replay when online
 *  3. userData   — persisted user session for offline access
 */
import Dexie from 'dexie';

const db = new Dexie('SchoolManagerOffline');

db.version(1).stores({
  // Cached API responses — key = request URL, value = response data
  apiCache: 'url, cachedAt',

  // Offline mutation queue — auto-increment id, ordered replay
  syncQueue: '++id, method, url, createdAt, status',

  // User session data — single row per userId
  userData: 'userId',
});

export default db;

/* ────────────────────────────────────────────
 *  API Cache helpers
 * ──────────────────────────────────────────── */

/**
 * Save a GET response into the cache
 */
export const cacheResponse = async (url, data) => {
  try {
    await db.apiCache.put({
      url,
      data,
      cachedAt: Date.now(),
    });
  } catch (e) {
    console.warn('[OfflineDB] Failed to cache response:', e);
  }
};

/**
 * Retrieve a cached response for a URL
 * @param {string} url
 * @param {number} maxAgeMs - max cache age in ms (default 24h)
 */
export const getCachedResponse = async (url, maxAgeMs = 24 * 60 * 60 * 1000) => {
  try {
    const entry = await db.apiCache.get(url);
    if (!entry) return null;
    // Check staleness
    if (Date.now() - entry.cachedAt > maxAgeMs) {
      return entry.data; // Still return stale data but let caller know
    }
    return entry.data;
  } catch (e) {
    console.warn('[OfflineDB] Failed to read cache:', e);
    return null;
  }
};

/**
 * Clear all cached responses (e.g. on logout)
 */
export const clearCache = async () => {
  try {
    await db.apiCache.clear();
  } catch (e) {
    console.warn('[OfflineDB] Failed to clear cache:', e);
  }
};

/* ────────────────────────────────────────────
 *  Sync Queue helpers
 * ──────────────────────────────────────────── */

/**
 * Add a failed mutation to the sync queue
 */
export const addToSyncQueue = async (method, url, data, headers = {}) => {
  try {
    await db.syncQueue.add({
      method,
      url,
      data,
      headers,
      createdAt: Date.now(),
      status: 'pending',   // pending | syncing | failed
      retries: 0,
    });
  } catch (e) {
    console.warn('[OfflineDB] Failed to queue sync item:', e);
  }
};

/**
 * Get all pending items in the sync queue (ordered by creation)
 */
export const getPendingSyncItems = async () => {
  try {
    return await db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('createdAt');
  } catch (e) {
    console.warn('[OfflineDB] Failed to read sync queue:', e);
    return [];
  }
};

/**
 * Get total count of pending sync items
 */
export const getPendingSyncCount = async () => {
  try {
    return await db.syncQueue.where('status').equals('pending').count();
  } catch (e) {
    return 0;
  }
};

/**
 * Update the status of a sync queue item
 */
export const updateSyncItemStatus = async (id, status) => {
  try {
    await db.syncQueue.update(id, { status });
  } catch (e) {
    console.warn('[OfflineDB] Failed to update sync item:', e);
  }
};

/**
 * Remove a successfully synced item from the queue
 */
export const removeSyncItem = async (id) => {
  try {
    await db.syncQueue.delete(id);
  } catch (e) {
    console.warn('[OfflineDB] Failed to remove sync item:', e);
  }
};

/**
 * Clear entire sync queue (e.g. on logout)
 */
export const clearSyncQueue = async () => {
  try {
    await db.syncQueue.clear();
  } catch (e) {
    console.warn('[OfflineDB] Failed to clear sync queue:', e);
  }
};

/* ────────────────────────────────────────────
 *  User Session helpers
 * ──────────────────────────────────────────── */

/**
 * Save user session for offline access
 */
export const saveUserSession = async (user, tokens) => {
  try {
    await db.userData.put({
      userId: user.id,
      user,
      tokens,
      savedAt: Date.now(),
    });
  } catch (e) {
    console.warn('[OfflineDB] Failed to save user session:', e);
  }
};

/**
 * Get saved user session
 */
export const getUserSession = async () => {
  try {
    const sessions = await db.userData.toArray();
    return sessions.length > 0 ? sessions[0] : null;
  } catch (e) {
    console.warn('[OfflineDB] Failed to get user session:', e);
    return null;
  }
};

/**
 * Clear user session (on logout)
 */
export const clearUserSession = async () => {
  try {
    await db.userData.clear();
  } catch (e) {
    console.warn('[OfflineDB] Failed to clear user session:', e);
  }
};

