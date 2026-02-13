import { useState, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { cacheResponse, getCachedResponse, addToSyncQueue } from '../utils/offlineDb';

/**
 * Custom hook for API calls with:
 *  - Loading and error state management
 *  - Offline GET fallback (serves cached data from IndexedDB)
 *  - Offline mutation queuing (POST/PUT/DELETE queued for sync)
 */
const useApi = () => {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (method, url, data = null, options = {}) => {
    setLoading(true);
    const isRead = method.toLowerCase() === 'get';

    try {
      const config = { method, url, ...options };
      if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
        config.data = data;
      }
      if (data && isRead) {
        config.params = data;
      }

      const response = await api(config);

      // ── Cache successful GET responses for offline use ──
      if (isRead && response.data) {
        const cacheKey = buildCacheKey(url, data);
        cacheResponse(cacheKey, response.data); // fire-and-forget
      }

      return response.data;
    } catch (error) {
      // ── Offline handling ──
      if (isNetworkError(error)) {
        if (isRead) {
          // Try to serve cached data
          const cacheKey = buildCacheKey(url, data);
          const cached = await getCachedResponse(cacheKey);
          if (cached) {
            if (!options.silent) {
              toast('You\'re offline — showing cached data', { icon: '📶' });
            }
            return cached;
          }
          // No cache available
          if (!options.silent) {
            toast.error('You\'re offline and no cached data is available');
          }
          throw error;
        } else {
          // Queue the mutation for later sync
          await addToSyncQueue(method, url, data);
          if (!options.silent) {
            toast('Saved offline — will sync when connected', { icon: '📥' });
          }
          // Return a mock success so the UI can update optimistically
          return {
            success: true,
            message: 'Queued for sync',
            data: data,
            _offline: true,
          };
        }
      }

      // ── Normal error handling ──
      const message = error.response?.data?.message || error.message || 'Something went wrong';
      if (!options.silent) {
        toast.error(message);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((url, params, options) => request('get', url, params, options), [request]);
  const post = useCallback((url, data, options) => request('post', url, data, options), [request]);
  const put = useCallback((url, data, options) => request('put', url, data, options), [request]);
  const del = useCallback((url, options) => request('delete', url, null, options), [request]);

  return { loading, get, post, put, del };
};

export default useApi;

/* ── Helpers ── */

/**
 * Build a consistent cache key from URL + query params
 */
function buildCacheKey(url, params) {
  if (!params || typeof params !== 'object') return url;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

/**
 * Detect if an error is a network/offline error (not a server response)
 */
function isNetworkError(error) {
  if (!navigator.onLine) return true;
  if (error.code === 'ERR_NETWORK') return true;
  if (error.message === 'Network Error') return true;
  if (!error.response && error.request) return true;
  return false;
}
