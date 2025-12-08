/**
 * Simple caching service for faster data access
 * Provides in-memory caching with localStorage persistence
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

// Default cache TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

// In-memory cache for instant access
const memoryCache = new Map<string, CacheEntry<unknown>>();

export const cacheService = {
    /**
     * Get cached data if not expired
     */
    get: <T>(key: string): T | null => {
        // Try memory cache first (fastest)
        const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
        if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl) {
            return memEntry.data;
        }

        // Try localStorage as fallback
        try {
            const stored = localStorage.getItem(`cache_${key}`);
            if (stored) {
                const entry: CacheEntry<T> = JSON.parse(stored);
                if (Date.now() - entry.timestamp < entry.ttl) {
                    // Restore to memory cache
                    memoryCache.set(key, entry);
                    return entry.data;
                } else {
                    // Expired, remove it
                    localStorage.removeItem(`cache_${key}`);
                }
            }
        } catch {
            // Ignore localStorage errors
        }

        return null;
    },

    /**
     * Set data in cache with optional TTL
     */
    set: <T>(key: string, data: T, ttl: number = DEFAULT_TTL): void => {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl
        };

        // Store in memory (instant access)
        memoryCache.set(key, entry);

        // Persist to localStorage
        try {
            localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
        } catch {
            // Ignore localStorage errors (quota exceeded, etc.)
        }
    },

    /**
     * Clear specific key or all cache
     */
    clear: (key?: string): void => {
        if (key) {
            memoryCache.delete(key);
            try {
                localStorage.removeItem(`cache_${key}`);
            } catch {
                // Ignore
            }
        } else {
            memoryCache.clear();
            try {
                const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
                keys.forEach(k => localStorage.removeItem(k));
            } catch {
                // Ignore
            }
        }
    },

    /**
     * Invalidate cache when data changes
     */
    invalidate: (patterns: string[]): void => {
        patterns.forEach(pattern => {
            // Clear from memory
            for (const key of memoryCache.keys()) {
                if (key.includes(pattern)) {
                    memoryCache.delete(key);
                }
            }
            // Clear from localStorage
            try {
                const keys = Object.keys(localStorage).filter(k =>
                    k.startsWith('cache_') && k.includes(pattern)
                );
                keys.forEach(k => localStorage.removeItem(k));
            } catch {
                // Ignore
            }
        });
    }
};

// Cache keys constants
export const CACHE_KEYS = {
    STAFF: 'staff_data',
    ATTENDANCE: 'attendance_data',
    ADVANCES: 'advances_data',
    OLD_STAFF: 'old_staff_data',
    SALARY_HIKES: 'salary_hikes_data',
    LOCATIONS: 'locations_data'
};
