// src/services/activityService.js
import { supabase } from '../lib/supabase';

/**
 * Activity types
 */
export const ACTIVITY_TYPES = {
    FINISHED_BOOK: 'FINISHED_BOOK',
    STARTED_BOOK: 'STARTED_BOOK',
    READING_SESSION: 'READING_SESSION',
    REVIEW_POSTED: 'REVIEW_POSTED',
    BOOK_ADDED: 'BOOK_ADDED',
    MILESTONE: 'MILESTONE', // e.g., "Read 100 pages", "10 books this year"
    FRIEND_ADDED: 'FRIEND_ADDED',
};

/**
 * Log an activity
 */
export const logActivity = async ({
    type,
    userId,
    bookId = null,
    content = null,
    metadata = {}
}) => {
    try {
        const { data, error } = await supabase
            .from('activities')
            .insert([{
                type,
                user_id: userId,
                book_id: bookId,
                content,
                metadata,
            }])
            .select()
            .single();

        if (error) throw error;
        console.log('📢 Activity logged:', type, data);
        return { data, error: null };
    } catch (error) {
        console.error('Error logging activity:', error);
        return { data: null, error };
    }
};

/**
 * Get recent activities (global feed)
 */
export const getRecentActivities = async (limit = 20) => {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select(`
                *,
                profiles!activities_user_id_fkey(id, username, avatar_url),
                books(id, title, authors, cover_url)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Flatten joins
        const formatted = (data || []).map(activity => ({
            ...activity,
            username: activity.profiles?.username,
            avatar_url: activity.profiles?.avatar_url,
            book_title: activity.books?.title,
            book_authors: activity.books?.authors,
            book_cover: activity.books?.cover_url,
        }));

        return { data: formatted, error: null };
    } catch (error) {
        console.error('Error fetching activities:', error);
        return { data: [], error };
    }
};

/**
 * Get user-specific feed (personalized - friends first)
 */
export const getUserFeed = async (userId, limit = 20) => {
    try {
        // Call the database function
        const { data, error } = await supabase
            .rpc('get_user_feed', {
                p_user_id: userId,
                p_limit: limit
            });

        if (error) {
            // Fallback to simple query if function doesn't exist
            console.warn('get_user_feed function not found, using fallback');
            return getRecentActivities(limit);
        }

        return { data: data || [], error: null };
    } catch (error) {
        console.error('Error fetching user feed:', error);
        return { data: [], error };
    }
};

/**
 * Get trending activities
 */
export const getTrendingActivities = async (limit = 10) => {
    try {
        const { data, error } = await supabase
            .from('trending_activities')
            .select('*')
            .limit(limit);

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Error fetching trending:', error);
        return { data: [], error };
    }
};

/**
 * Get trending books
 */
export const getTrendingBooks = async (limit = 10) => {
    try {
        const { data, error } = await supabase
            .from('trending_books')
            .select('*')
            .limit(limit);

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Error fetching trending books:', error);
        return { data: [], error };
    }
};

/**
 * Subscribe to realtime activities
 */
export const subscribeToActivities = (callback) => {
    const channel = supabase
        .channel('activities_channel')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'activities'
            },
            async (payload) => {
                console.log('🔔 New activity:', payload);
                
                // Fetch full activity with joins
                const { data } = await supabase
                    .from('activities')
                    .select(`
                        *,
                        profiles!activities_user_id_fkey(id, username, avatar_url),
                        books(id, title, authors, cover_url)
                    `)
                    .eq('id', payload.new.id)
                    .single();

                if (data) {
                    const formatted = {
                        ...data,
                        username: data.profiles?.username,
                        avatar_url: data.profiles?.avatar_url,
                        book_title: data.books?.title,
                        book_authors: data.books?.authors,
                        book_cover: data.books?.cover_url,
                    };
                    callback(formatted);
                }
            }
        )
        .subscribe();

    return channel;
};

/**
 * Get news feed
 */
export const getNewsFeed = async (limit = 10) => {
    try {
        const { data, error } = await supabase
            .from('news_feed')
            .select('*')
            .order('published_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Error fetching news:', error);
        return { data: [], error };
    }
};

/**
 * Helper: Log book completion
 */
export const logBookCompletion = async (userId, bookId, bookTitle) => {
    return logActivity({
        type: ACTIVITY_TYPES.FINISHED_BOOK,
        userId,
        bookId,
        content: `Finished reading "${bookTitle}"! 🎉`,
        metadata: { achievement: 'completed' }
    });
};

/**
 * Helper: Log reading session
 */
export const logReadingSessionActivity = async (userId, bookId, bookTitle, durationMinutes, pagesRead) => {
    return logActivity({
        type: ACTIVITY_TYPES.READING_SESSION,
        userId,
        bookId,
        content: `Read "${bookTitle}" for ${durationMinutes} minutes`,
        metadata: {
            duration_minutes: durationMinutes,
            pages_read: pagesRead
        }
    });
};

/**
 * Helper: Log book start
 */
export const logBookStart = async (userId, bookId, bookTitle) => {
    return logActivity({
        type: ACTIVITY_TYPES.STARTED_BOOK,
        userId,
        bookId,
        content: `Started reading "${bookTitle}"`,
        metadata: { action: 'started' }
    });
};

/**
 * Helper: Log milestone
 */
export const logMilestone = async (userId, milestoneText, metadata = {}) => {
    return logActivity({
        type: ACTIVITY_TYPES.MILESTONE,
        userId,
        content: milestoneText,
        metadata
    });
};