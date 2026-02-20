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
     * Update profile with all enhanced fields
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
     * Upload avatar image (FIXED: simpler approach)
     */
    async uploadAvatar(userId, file) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = fileName; // Simple path, no subfolder

            console.log('📤 Uploading avatar:', filePath);

            // Upload to storage (upsert overwrites existing)
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { 
                    upsert: true,
                    contentType: file.type,
                    cacheControl: '3600'
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                
                // If bucket doesn't exist, provide helpful message
                if (uploadError.message?.includes('Bucket not found') || uploadError.statusCode === '404') {
                    throw new Error('Avatars bucket not found. Please create it in Supabase:\n\n1. Go to Storage\n2. Click "New Bucket"\n3. Name: avatars\n4. Public: YES\n5. Create');
                }
                
                throw uploadError;
            }

            console.log('✅ Upload successful:', uploadData);

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;
            console.log('🔗 Public URL:', publicUrl);

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) {
                console.error('Profile update error:', updateError);
                throw updateError;
            }

            console.log('✅ Profile updated with avatar URL');
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
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;
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