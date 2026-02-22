// src/services/bookFactService.js
import { supabase } from '../lib/supabase';

/**
 * Fetch today's book facts from the database.
 * Returns up to 2 facts for the current UTC date.
 */
export const getTodayBookFacts = async () => {
    try {
        const todayUTC = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_book_facts')
            .select('*')
            .eq('fact_date', todayUTC)
            .order('generated_at', { ascending: true })
            .limit(2);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching book facts:', error);
        return [];
    }
};

/**
 * Trigger generation of a new book fact via the Edge Function.
 * The Edge Function enforces max 2 per day.
 */
export const triggerBookFactGeneration = async () => {
    try {
        const { data, error } = await supabase.functions.invoke('generate-book-fact');
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
        console.error('Error triggering book fact generation:', error);
        return { success: false, error };
    }
};
