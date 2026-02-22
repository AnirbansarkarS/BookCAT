// src/services/weeklyTrendingService.js
import { supabase } from '../lib/supabase';

/**
 * Fetch the current week's NYT bestseller list from the DB.
 * @param {string} listName - 'hardcover-fiction' | 'hardcover-nonfiction' | 'all'
 * @param {number} limit
 */
export const getWeeklyTrendingBooks = async (listName = 'all', limit = 10) => {
    try {
        // Compute the Monday of the current week
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);
        const weekStart = monday.toISOString().split('T')[0];

        let query = supabase
            .from('weekly_trending_books')
            .select('*')
            .eq('week_start', weekStart)
            .order('rank', { ascending: true })
            .limit(limit);

        if (listName !== 'all') {
            query = query.eq('list_name', listName);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { data: data || [], weekStart };
    } catch (error) {
        console.error('Error fetching weekly trending books:', error);
        return { data: [], weekStart: null };
    }
};

/**
 * Manually trigger the NYT bestseller fetch Edge Function.
 * Useful for the "Refresh" button in the UI.
 */
export const triggerNYTFetch = async (lists = ['hardcover-fiction', 'hardcover-nonfiction']) => {
    try {
        const { data, error } = await supabase.functions.invoke('fetch-nyt-bestsellers', {
            body: { lists },
        });
        if (error) {
            if (error.context && typeof error.context.json === 'function') {
                try {
                    const body = await error.context.json();
                    console.error('Edge Function error body:', body);
                } catch (_) { /* ignore */ }
            }
            throw error;
        }
        return { success: true, data };
    } catch (error) {
        console.error('Error triggering NYT fetch:', error);
        return { success: false, error };
    }
};
