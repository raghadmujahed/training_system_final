// src/services/apiCache.js
// Centralized in-memory cache with TTL + request deduplication.
// Usage: wrap any API call with apiCache.get(key, fetcher, ttlMs)

const DEFAULT_TTL_MS = 60_000; // 1 minute

class ApiCache {
  constructor() {
    this._cache = new Map(); // key → { data, expiresAt }
    this._inflight = new Map(); // key → Promise (deduplication)
  }

  /**
   * Get cached data or fetch fresh.
   * If a request with the same key is already in-flight, reuse its promise.
   *
   * @param {string} key      - Unique cache key
   * @param {() => Promise} fetcher - Function that returns the API promise
   * @param {number} ttlMs    - Cache lifetime in ms (default 60s)
   * @returns {Promise<any>}
   */
  async get(key, fetcher, ttlMs = DEFAULT_TTL_MS) {
    // 1. Serve from cache if still fresh
    const cached = this._cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    // 2. Reuse in-flight promise (deduplication)
    if (this._inflight.has(key)) {
      return this._inflight.get(key);
    }

    // 3. New fetch
    const promise = fetcher()
      .then((data) => {
        this._cache.set(key, { data, expiresAt: Date.now() + ttlMs });
        this._inflight.delete(key);
        return data;
      })
      .catch((err) => {
        this._inflight.delete(key);
        throw err;
      });

    this._inflight.set(key, promise);
    return promise;
  }

  /** Invalidate a specific key so the next call re-fetches. */
  invalidate(key) {
    this._cache.delete(key);
    // Don't cancel in-flight; it will settle normally but won't be re-cached stale.
  }

  /** Invalidate all keys that start with a prefix. */
  invalidatePrefix(prefix) {
    for (const key of this._cache.keys()) {
      if (key.startsWith(prefix)) this._cache.delete(key);
    }
  }

  /** Wipe everything (e.g. on logout). */
  clear() {
    this._cache.clear();
    this._inflight.clear();
  }
}

export const apiCache = new ApiCache();
