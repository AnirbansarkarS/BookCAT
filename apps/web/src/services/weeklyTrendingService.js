// src/services/weeklyTrendingService.js
import { supabase } from '../lib/supabase';

/**
 * Fetch the current week's NYT bestseller list from the DB.
 * @param {string} listName - 'hardcover-fiction' | 'hardcover-nonfiction' | 'all'
 * @param {number} limit
 */
export const getWeeklyTrendingBooks = async (listName = 'all', limit = 10) => {
    try {
        // First, find the most recent week_start in the table
        const { data: latestRow, error: latestErr } = await supabase
            .from('weekly_trending_books')
            .select('week_start')
            .order('week_start', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latestErr) throw latestErr;
        if (!latestRow) return { data: [], weekStart: null };

        const weekStart = latestRow.week_start;

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
export const triggerNYTFetch = async (lists = ['hardcover-fiction', 'hardcover-nonfiction', 'young-adult-hardcover', 'paperback-nonfiction']) => {
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
