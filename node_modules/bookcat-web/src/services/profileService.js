// src/services/profileService.js
import { supabase } from '../lib/supabase';

export const profileService = {
    /**
     * Get user profile
     */
    async getProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching profile:', error);
            return { data: null, error };
        }
    },

    /**
     * Update profile with all new enhanced fields
     */
    async updateProfile(userId, updates) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    username: updates.username,
                    bio: updates.bio,
                    favorite_book: updates.favorite_book,
                    favorite_author: updates.favorite_author,
                    reading_goal_yearly: updates.reading_goal_yearly,
                    favorite_genre: updates.favorite_genre,
                    reading_speed: updates.reading_speed,
                    preferred_format: updates.preferred_format,
                    location: updates.location,
                    fun_fact: updates.fun_fact,
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating profile:', error);
            return { data: null, error };
        }
    },

    /**
     * Upload avatar image
     */
    async uploadAvatar(userId, file) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            return { data: publicUrl, error: null };
        } catch (error) {
            console.error('Error uploading avatar:', error);
            return { data: null, error };
        }
    },

    /**
     * Get reading preferences
     */
    async getReadingPreferences(userId) {
        try {
            const { data, error } = await supabase
                .from('reading_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching reading preferences:', error);
            return { data: null, error };
        }
    },

    /**
     * Update reading preferences
     */
    async updateReadingPreferences(userId, preferences) {
        try {
            const { data, error } = await supabase
                .from('reading_preferences')
                .upsert({
                    user_id: userId,
                    ...preferences,
                })
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating reading preferences:', error);
            return { data: null, error };
        }
    },
};