
type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

const pendingRequests = new Map<string, Promise<any>>();

const cache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL_MS = 30 * 1000;

const SHORT_TTL_MS = 5 * 1000;

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

export function createCacheKey(table: string, query: Record<string, any>): string {
  const sortedQuery = Object.keys(query)
    .sort()
    .reduce((acc, key) => {
      acc[key] = query[key];
      return acc;
    }, {} as Record<string, any>);
  
  return `${table}:${JSON.stringify(sortedQuery)}`;
}

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl: CacheTTL = 'default'): void {
  const now = Date.now();
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + getTTLMs(ttl),
  });
}

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

export function invalidateTable(table: string): void {
  invalidateCache(new RegExp(`^${table}:`));
}

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: { ttl?: CacheTTL; forceRefresh?: boolean } = {}
): Promise<T> {
  const { ttl = 'default', forceRefresh = false } = options;
  
  if (!forceRefresh) {
    const cached = getCached<T>(key);
    if (cached !== null) {
      return cached;
    }
  }
  
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }
  
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
  const cached = getCached<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }
  
  return new Promise((resolve, reject) => {
    if (!batchQueue.has(key)) {
      batchQueue.set(key, []);
    }
    batchQueue.get(key)!.push({ resolve, reject });
    
    if (!batchTimeout) {
      batchTimeout = setTimeout(async () => {
        batchTimeout = null;
        
        const entries = Array.from(batchQueue.entries());
        batchQueue.clear();
        
        await Promise.all(
          entries.map(async ([batchKey, callbacks]) => {
            try {
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

export function clearAllCache(): void {
  cache.clear();
  pendingRequests.clear();
}
