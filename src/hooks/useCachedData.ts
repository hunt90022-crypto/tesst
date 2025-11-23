import { useState, useEffect, useCallback } from 'react';

interface CacheData<T> {
    data: T;
    timestamp: number;
}

interface UseCachedDataOptions<T> {
    cacheKey: string;
    fetchFn: () => Promise<T>;
    expirationMs?: number; // Default 5 minutes
    enabled?: boolean;
}

export function useCachedData<T>({
    cacheKey,
    fetchFn,
    expirationMs = 5 * 60 * 1000, // 5 minutes default
    enabled = true,
}: UseCachedDataOptions<T>) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getFromCache = useCallback((): T | null => {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const cacheData: CacheData<T> = JSON.parse(cached);
            const now = Date.now();

            // Check if cache is still valid
            if (now - cacheData.timestamp < expirationMs) {
                console.log(`📦 Cache HIT for ${cacheKey} (age: ${Math.round((now - cacheData.timestamp) / 1000)}s)`);
                return cacheData.data;
            } else {
                console.log(`⏰ Cache EXPIRED for ${cacheKey} (age: ${Math.round((now - cacheData.timestamp) / 1000)}s)`);
                localStorage.removeItem(cacheKey);
                return null;
            }
        } catch (err) {
            console.warn(`Failed to read cache for ${cacheKey}:`, err);
            return null;
        }
    }, [cacheKey, expirationMs]);

    const saveToCache = useCallback((data: T) => {
        try {
            const cacheData: CacheData<T> = {
                data,
                timestamp: Date.now(),
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log(`💾 Saved to cache: ${cacheKey}`);
        } catch (err) {
            console.warn(`Failed to save cache for ${cacheKey}:`, err);
        }
    }, [cacheKey]);

    const fetchData = useCallback(async (useCache = true) => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Try to get from cache first
            if (useCache) {
                const cachedData = getFromCache();
                if (cachedData !== null) {
                    setData(cachedData);
                    setLoading(false);
                    return;
                }
            }

            // Fetch fresh data
            console.log(`🌐 Fetching fresh data for ${cacheKey}...`);
            const freshData = await fetchFn();
            setData(freshData);
            saveToCache(freshData);
        } catch (err: any) {
            console.error(`Error fetching data for ${cacheKey}:`, err);
            setError(err.message || 'Failed to fetch data');

            // On error, try to use stale cache as fallback
            const cachedData = getFromCache();
            if (cachedData !== null) {
                console.log(`Using stale cache as fallback for ${cacheKey}`);
                setData(cachedData);
            }
        } finally {
            setLoading(false);
        }
    }, [enabled, cacheKey, fetchFn, getFromCache, saveToCache]);

    const refetch = useCallback(() => {
        return fetchData(false); // Force refresh, bypass cache
    }, [fetchData]);

    const clearCache = useCallback(() => {
        try {
            localStorage.removeItem(cacheKey);
            console.log(`🗑️ Cleared cache: ${cacheKey}`);
        } catch (err) {
            console.warn(`Failed to clear cache for ${cacheKey}:`, err);
        }
    }, [cacheKey]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refetch,
        clearCache,
    };
}
