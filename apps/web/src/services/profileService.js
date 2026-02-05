import { supabase } from '../lib/supabase'

export const profileService = {
    async getProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    },

    async updateProfile(userId, updates) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    },

    async uploadAvatar(userId, file) {
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${userId}/${Math.random()}.${fileExt}`
            const filePath = fileName

            // Upload file to storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update profile with new avatar URL
            const { data, error } = await this.updateProfile(userId, {
                avatar_url: publicUrl,
            })

            if (error) throw error
            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    },
}
