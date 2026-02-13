// src/utils/statsCache.js
// Simple cache system for reading stats

const CACHE_KEYS = {
    STATS: 'bookcat_stats_cache',
    BOOKS: 'bookcat_books_cache',
    SESSIONS: 'bookcat_sessions_cache',
    LAST_UPDATE: 'bookcat_last_update',
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class StatsCache {
    // Save stats to cache
    saveStats(stats) {
        try {
            const cacheData = {
                data: stats,
                timestamp: Date.now(),
            };
            localStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(cacheData));
            console.log('💾 Stats cached:', stats);
        } catch (error) {
            console.error('Failed to cache stats:', error);
        }
    }

    // Get stats from cache
    getStats() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.STATS);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            // Return cached data if less than 5 minutes old
            if (age < CACHE_DURATION) {
                console.log('📦 Using cached stats (age: ' + Math.floor(age / 1000) + 's)');
                return data;
            }

            console.log('🕐 Cache expired (age: ' + Math.floor(age / 1000) + 's)');
            return null;
        } catch (error) {
            console.error('Failed to get cached stats:', error);
            return null;
        }
    }

    // Save books to cache
    saveBooks(books) {
        try {
            const cacheData = {
                data: books,
                timestamp: Date.now(),
            };
            localStorage.setItem(CACHE_KEYS.BOOKS, JSON.stringify(cacheData));
            console.log('💾 Books cached:', books.length, 'books');
        } catch (error) {
            console.error('Failed to cache books:', error);
        }
    }

    // Get books from cache
    getBooks() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.BOOKS);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            if (age < CACHE_DURATION) {
                console.log('📦 Using cached books (age: ' + Math.floor(age / 1000) + 's)');
                return data;
            }

            return null;
        } catch (error) {
            console.error('Failed to get cached books:', error);
            return null;
        }
    }

    // Save sessions to cache
    saveSessions(sessions) {
        try {
            const cacheData = {
                data: sessions,
                timestamp: Date.now(),
            };
            localStorage.setItem(CACHE_KEYS.SESSIONS, JSON.stringify(cacheData));
            console.log('💾 Sessions cached:', sessions.length, 'sessions');
        } catch (error) {
            console.error('Failed to cache sessions:', error);
        }
    }

    // Get sessions from cache
    getSessions() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.SESSIONS);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            if (age < CACHE_DURATION) {
                console.log('📦 Using cached sessions (age: ' + Math.floor(age / 1000) + 's)');
                return data;
            }

            return null;
        } catch (error) {
            console.error('Failed to get cached sessions:', error);
            return null;
        }
    }

    // Invalidate all cache (force refresh)
    invalidate() {
        console.log('🗑️ Invalidating all cache');
        localStorage.removeItem(CACHE_KEYS.STATS);
        localStorage.removeItem(CACHE_KEYS.BOOKS);
        localStorage.removeItem(CACHE_KEYS.SESSIONS);
    }

    // Update last update timestamp
    setLastUpdate() {
        localStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
    }

    // Get last update timestamp
    getLastUpdate() {
        const timestamp = localStorage.getItem(CACHE_KEYS.LAST_UPDATE);
        return timestamp ? parseInt(timestamp) : null;
    }

    // Check if cache is fresh (updated in last minute)
    isFresh() {
        const lastUpdate = this.getLastUpdate();
        if (!lastUpdate) return false;
        
        const age = Date.now() - lastUpdate;
        return age < 60000; // 1 minute
    }
}

export const statsCache = new StatsCache();

