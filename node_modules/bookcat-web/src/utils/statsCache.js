// src/utils/statsCache.js
// BACKWARD COMPATIBLE VERSION - works with old imports
import { supabase } from '../lib/supabase';

const CACHE_KEYS = {
    ACTIVE_SESSION: 'activeReadingSession',
    STATS: 'readingStats',
    LAST_SYNC: 'lastStatsSync',
};

const SYNC_INTERVAL = 5 * 60 * 1000;

// ═══════════════════════════════════════════════════════════
// ACTIVE SESSION (Supabase + localStorage)
// ═══════════════════════════════════════════════════════════

export const startReadingSession = async (userId, bookId, bookData) => {
    const sessionData = {
        bookId,
        bookTitle: bookData.title,
        bookCover: bookData.cover_url,
        startTime: Date.now(),
        elapsedSeconds: 0,
        durationMinutes: 0,
        currentPage: bookData.current_page || 0,
        totalPages: bookData.total_pages || 0,
    };

    localStorage.setItem(CACHE_KEYS.ACTIVE_SESSION, JSON.stringify(sessionData));

    try {
        await supabase.from('active_sessions').upsert({
            user_id: userId,
            book_id: bookId,
            started_at: new Date(sessionData.startTime).toISOString(),
            elapsed_seconds: 0,
            current_page: sessionData.currentPage,
            session_data: sessionData,
        }, { onConflict: 'user_id,book_id' });
    } catch (err) {
        console.warn('Could not sync to DB:', err);
    }

    console.log('📖 Reading session started:', bookData.title);
    return sessionData;
};

export const getActiveSession = async (userId) => {
    try {
        const { data } = await supabase
            .from('active_sessions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (data) {
            const session = {
                bookId: data.book_id,
                bookTitle: data.session_data?.bookTitle || '',
                bookCover: data.session_data?.bookCover || '',
                startTime: new Date(data.started_at).getTime(),
                elapsedSeconds: data.elapsed_seconds || 0,
                durationMinutes: Math.floor((data.elapsed_seconds || 0) / 60),
                currentPage: data.current_page || 0,
                totalPages: data.session_data?.totalPages || 0,
            };
            localStorage.setItem(CACHE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
            console.log('📦 Retrieved active session from DB');
            return session;
        }
    } catch (err) {
        console.warn('DB fetch failed, using localStorage:', err);
    }

    const cached = localStorage.getItem(CACHE_KEYS.ACTIVE_SESSION);
    if (cached) {
        console.log('📦 Retrieved active session from localStorage');
        return JSON.parse(cached);
    }
    return null;
};

export const updateActiveSession = async (userId, updates) => {
    const session = await getActiveSession(userId);
    if (!session) return null;

    const updated = { ...session, ...updates };
    localStorage.setItem(CACHE_KEYS.ACTIVE_SESSION, JSON.stringify(updated));

    try {
        await supabase.from('active_sessions').update({
            elapsed_seconds: updated.elapsedSeconds,
            current_page: updated.currentPage,
            session_data: updated,
            last_updated: new Date().toISOString(),
        }).eq('user_id', userId).eq('book_id', session.bookId);
    } catch (err) {
        console.warn('Could not sync update:', err);
    }

    return updated;
};

export const endReadingSession = async (userId) => {
    const session = await getActiveSession(userId);
    if (!session) return null;

    const durationMinutes = Math.max(1, session.durationMinutes);

    try {
        const { data } = await supabase.from('reading_sessions').insert([{
            user_id: userId,
            book_id: session.bookId,
            duration_minutes: durationMinutes,
            pages_read: 0,
            start_time: new Date(session.startTime).toISOString(),
            end_time: new Date().toISOString(),
            elapsed_seconds: session.elapsedSeconds,
            session_data: session,
        }]).select().single();

        await supabase.from('active_sessions')
            .delete()
            .eq('user_id', userId)
            .eq('book_id', session.bookId);

        localStorage.removeItem(CACHE_KEYS.ACTIVE_SESSION);
        console.log('✅ Reading session ended');
        return data;
    } catch (error) {
        console.error('Error ending session:', error);
        return null;
    }
};

export const cancelActiveSession = async (userId) => {
    const session = await getActiveSession(userId);
    if (!session) return;

    try {
        await supabase.from('active_sessions')
            .delete()
            .eq('user_id', userId)
            .eq('book_id', session.bookId);
    } catch (err) {
        console.warn('Could not delete from DB:', err);
    }

    localStorage.removeItem(CACHE_KEYS.ACTIVE_SESSION);
    console.log('🗑️ Active session cancelled');
};

export const getCachedStats = async (userId, fetchFn) => {
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    const now = Date.now();

    if (lastSync && (now - parseInt(lastSync)) < SYNC_INTERVAL) {
        const cached = localStorage.getItem(CACHE_KEYS.STATS);
        if (cached) {
            console.log('📊 Using cached stats');
            return JSON.parse(cached);
        }
    }

    console.log('🔄 Fetching fresh stats...');
    const stats = await fetchFn();
    localStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(stats));
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, now.toString());
    return stats;
};

export const invalidateStatsCache = () => {
    localStorage.removeItem(CACHE_KEYS.STATS);
    localStorage.removeItem(CACHE_KEYS.LAST_SYNC);
    console.log('🗑️ Stats cache invalidated');
};

let syncInterval = null;

export const startAutoSync = (userId) => {
    if (syncInterval) return;

    syncInterval = setInterval(async () => {
        const session = await getActiveSession(userId);
        if (session) {
            await updateActiveSession(userId, {
                elapsedSeconds: Math.floor((Date.now() - session.startTime) / 1000),
                durationMinutes: Math.floor((Date.now() - session.startTime) / 60000),
            });
            console.log('🔄 Auto-synced active session');
        }
    }, 30000);

    console.log('🚀 Auto-sync started');
};

export const stopAutoSync = () => {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('🛑 Auto-sync stopped');
    }
};

export const recoverActiveSession = async (userId) => {
    try {
        const { data } = await supabase
            .from('active_sessions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (!data) return null;

        const lastUpdated = new Date(data.last_updated).getTime();
        if (Date.now() - lastUpdated > 24 * 60 * 60 * 1000) {
            await supabase.from('active_sessions').delete().eq('id', data.id);
            return null;
        }

        const session = {
            bookId: data.book_id,
            bookTitle: data.session_data?.bookTitle || '',
            bookCover: data.session_data?.bookCover || '',
            startTime: new Date(data.started_at).getTime(),
            elapsedSeconds: data.elapsed_seconds || 0,
            durationMinutes: Math.floor((data.elapsed_seconds || 0) / 60),
            currentPage: data.current_page || 0,
            totalPages: data.session_data?.totalPages || 0,
        };

        localStorage.setItem(CACHE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
        console.log('🔄 Recovered active session from DB');
        return session;
    } catch (err) {
        console.error('Error recovering session:', err);
        return null;
    }
};

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY - OLD API
// ═══════════════════════════════════════════════════════════

export const statsCache = {
    startSession: startReadingSession,
    getActive: getActiveSession,
    updateActive: updateActiveSession,
    endSession: endReadingSession,
    cancelSession: cancelActiveSession,
    getCached: getCachedStats,
    invalidate: invalidateStatsCache,
    startSync: startAutoSync,
    stopSync: stopAutoSync,
    recover: recoverActiveSession,
};

// Also export as default for compatibility
export default statsCache;