// src/services/hotTakesService.js
import { supabase } from '../lib/supabase';

/**
 * Fetch today's hot takes from the database.
 */
export const getTodayHotTakes = async () => {
    try {
        const todayUTC = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_hot_takes')
            .select('*')
            .eq('take_date', todayUTC)
            .order('generated_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching hot takes:', error);
        return [];
    }
};

/**
 * Trigger generation of today's hot takes via the Edge Function.
 */
export const triggerHotTakesGeneration = async () => {
    try {
        // By adding an empty body, we force the client to use POST, which includes the auth header.
        const { data, error } = await supabase.functions.invoke('generate-hot-takes', {
            body: {},
        });

        if (error) {
            console.error('Error triggering hot takes generation:', error);
            throw new Error(error.message);
        }
        return data;
    } catch (error) {
        console.error('An unexpected error occurred:', error);
        throw error;
    }
};

/**
 * Vote on a hot take (agree or disagree).
 * Uses upsert so a user can change their vote.
 */
export const voteOnHotTake = async (userId, hotTakeId, vote) => {
    try {
        // 1. Upsert the user's vote
        const { error: voteError } = await supabase
            .from('hot_take_votes')
            .upsert({
                user_id: userId,
                hot_take_id: hotTakeId,
                vote,
            }, { onConflict: 'user_id,hot_take_id' });

        if (voteError) throw voteError;

        // 2. Recalculate counts from votes table
        const { data: allVotes, error: countError } = await supabase
            .from('hot_take_votes')
            .select('vote')
            .eq('hot_take_id', hotTakeId);

        if (countError) throw countError;

        const agreeCount = (allVotes || []).filter(v => v.vote === 'agree').length;
        const disagreeCount = (allVotes || []).filter(v => v.vote === 'disagree').length;

        // 3. Update the hot take counts
        const { error: updateError } = await supabase
            .from('daily_hot_takes')
            .update({ agree_count: agreeCount, disagree_count: disagreeCount })
            .eq('id', hotTakeId);

        if (updateError) throw updateError;

        return { success: true, agreeCount, disagreeCount };
    } catch (error) {
        console.error('Error voting on hot take:', error);
        return { success: false, error };
    }
};

/**
 * Get the current user's votes for today's hot takes.
 */
export const getUserVotes = async (userId) => {
    try {
        const todayUTC = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('hot_take_votes')
            .select('hot_take_id, vote')
            .eq('user_id', userId);

        if (error) throw error;

        // Return as a map: { hotTakeId: 'agree' | 'disagree' }
        const voteMap = {};
        (data || []).forEach(v => {
            voteMap[v.hot_take_id] = v.vote;
        });
        return voteMap;
    } catch (error) {
        console.error('Error fetching user votes:', error);
        return {};
    }
};
