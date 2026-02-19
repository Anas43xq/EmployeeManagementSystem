/**
 * API Cache - Provides request deduplication and caching for Supabase queries
 * Prevents duplicate requests during rapid navigation
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

// In-flight requests for deduplication
const pendingRequests = new Map<string, Promise<any>>();

// Cache storage
const cache = new Map<string, CacheEntry<any>>();

// Default TTL: 30 seconds for most data
const DEFAULT_TTL_MS = 30 * 1000;

// Short TTL: 5 seconds for frequently changing data
const SHORT_TTL_MS = 5 * 1000;

// Long TTL: 5 minutes for rarely changing data
const LONG_TTL_MS = 5 * 60 * 1000;

export type CacheTTL = 'short' | 'default' | 'long' | number;

function getTTLMs(ttl: CacheTTL): number {
  if (typeof ttl === 'number') return ttl;
  switch (ttl) {
    case 'short': return SHORT_TTL_MS;
    case 'long': return LONG_TTL_MS;
    default: return DEFAULT_TTL_MS;
  }
}

/**
 * Generate a cache key from query parameters
 */
export function createCacheKey(table: string, query: Record<string, any>): string {
  const sortedQuery = Object.keys(query)
    .sort()
    .reduce((acc, key) => {
      acc[key] = query[key];
      return acc;
    }, {} as Record<string, any>);
  
  return `${table}:${JSON.stringify(sortedQuery)}`;
}

/**
 * Get cached data if valid
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Set data in cache
 */
export function setCache<T>(key: string, data: T, ttl: CacheTTL = 'default'): void {
  const now = Date.now();
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + getTTLMs(ttl),
  });
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern?: string | RegExp): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalidate cache for a specific table (use after mutations)
 */
export function invalidateTable(table: string): void {
  invalidateCache(new RegExp(`^${table}:`));
}

/**
 * Execute a query with caching and deduplication
 * Prevents duplicate in-flight requests for the same data
 */
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: { ttl?: CacheTTL; forceRefresh?: boolean } = {}
): Promise<T> {
  const { ttl = 'default', forceRefresh = false } = options;
  
  // Check cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = getCached<T>(key);
    if (cached !== null) {
      return cached;
    }
  }
  
  // Check for in-flight request
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }
  
  // Execute the query
  const promise = queryFn()
    .then((result) => {
      setCache(key, result, ttl);
      pendingRequests.delete(key);
      return result;
    })
    .catch((error) => {
      pendingRequests.delete(key);
      throw error;
    });
  
  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Batch multiple queries efficiently
 * Waits a short time to collect requests, then executes them together
 */
const batchQueue = new Map<string, {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}[]>();

let batchTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_DELAY_MS = 10;

export function batchedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: { ttl?: CacheTTL } = {}
): Promise<T> {
  // Check cache first
  const cached = getCached<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }
  
  return new Promise((resolve, reject) => {
    // Add to batch queue
    if (!batchQueue.has(key)) {
      batchQueue.set(key, []);
    }
    batchQueue.get(key)!.push({ resolve, reject });
    
    // Schedule batch execution
    if (!batchTimeout) {
      batchTimeout = setTimeout(async () => {
        batchTimeout = null;
        
        // Execute all pending queries
        const entries = Array.from(batchQueue.entries());
        batchQueue.clear();
        
        await Promise.all(
          entries.map(async ([batchKey, callbacks]) => {
            try {
              // Only execute once per key
              const result = await cachedQuery(batchKey, queryFn, options);
              callbacks.forEach(cb => cb.resolve(result));
            } catch (error) {
              callbacks.forEach(cb => cb.reject(error));
            }
          })
        );
      }, BATCH_DELAY_MS);
    }
  });
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
  pendingRequests: number;
} {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    pendingRequests: pendingRequests.size,
  };
}

/**
 * Clear all caches and pending requests
 * Use when signing out or on critical errors
 */
export function clearAllCache(): void {
  cache.clear();
  pendingRequests.clear();
}
