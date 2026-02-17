// src/services/communityService.js
import { supabase } from '../lib/supabase';

// ─── Users ──────────────────────────────────────────────────

export const getAllUsers = async (currentUserId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, email, avatar_url, bio, created_at')
            .neq('id', currentUserId);
        if (error) throw error;

        const enriched = await Promise.all((data || []).map(async (user) => {
            const { count: bookCount } = await supabase
                .from('books').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
            const { data: sessions } = await supabase
                .from('reading_sessions').select('duration_minutes').eq('user_id', user.id);
            const totalMinutes = (sessions || []).reduce((s, r) => s + (r.duration_minutes || 0), 0);
            return { ...user, book_count: bookCount || 0, total_reading_time: Math.round(totalMinutes / 60) };
        }));
        return enriched;
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};

// ─── Friends ─────────────────────────────────────────────────

export const getFriends = async (userId) => {
    try {
        const { data: friendships, error: fe } = await supabase
            .from('friendships').select('*')
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
        if (fe) throw fe;

        const userIds = new Set();
        (friendships || []).forEach(f => userIds.add(f.user_id === userId ? f.friend_id : f.user_id));

        const { data: profiles, error: pe } = await supabase
            .from('profiles').select('*').in('id', Array.from(userIds));
        if (pe) throw pe;

        return (friendships || []).map(f => {
            const isSender = f.user_id === userId;
            const friendId = isSender ? f.friend_id : f.user_id;
            const profile = (profiles || []).find(p => p.id === friendId);
            return {
                friendship_id: f.id,
                friend_id: friendId,
                username: profile?.username || 'User',
                email: profile?.email || '',
                avatar_url: profile?.avatar_url || null,
                status: f.status,
                friendship_since: f.created_at,
                is_sender: isSender,
            };
        });
    } catch (error) {
        console.error('Error fetching friends:', error);
        return [];
    }
};

export const sendFriendRequest = async (userId, friendId) => {
    try {
        const { data: existing } = await supabase.from('friendships').select('*')
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
            .single();
        if (existing) return { data: existing, error: null };
        const { data, error } = await supabase.from('friendships')
            .insert([{ user_id: userId, friend_id: friendId, status: 'pending' }])
            .select().single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error sending friend request:', error);
        return { data: null, error };
    }
};

export const acceptFriendRequest = async (friendshipId) => {
    try {
        const { data, error } = await supabase.from('friendships')
            .update({ status: 'accepted' }).eq('id', friendshipId).select().single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error accepting friend request:', error);
        return { data: null, error };
    }
};

export const removeFriend = async (friendshipId) => {
    try {
        const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error removing friend:', error);
        return { error };
    }
};

// ─── Friend Books ─────────────────────────────────────────────
// NOTE: Requires FIX_friend_library_rls.sql to be run in Supabase first!

export const getFriendBooks = async (friendUserId) => {
    try {
        console.log('📚 Fetching books for friend:', friendUserId);
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', friendUserId)
            .order('created_at', { ascending: false }); // ✅ created_at NOT updated_at
        if (error) {
            console.error('❌ getFriendBooks error:', error.message);
            if (error.code === '42501') console.error('⚠️ RLS blocking. Run FIX_friend_library_rls.sql in Supabase!');
            return [];
        }
        console.log('✅ Got', data?.length || 0, 'books');
        return data || [];
    } catch (error) {
        console.error('Error fetching friend books:', error);
        return [];
    }
};

// ─── Activity Feed ────────────────────────────────────────────

export const getActivityFeed = async (userId) => {
    try {
        const { data: activities, error: ae } = await supabase
            .from('activity_feed').select('*')
            .order('created_at', { ascending: false }).limit(50);
        if (ae) throw ae;

        const userIds = new Set((activities || []).map(a => a.user_id));
        const { data: profiles } = await supabase
            .from('profiles').select('*').in('id', Array.from(userIds));

        return (activities || []).map(a => {
            const p = (profiles || []).find(p => p.id === a.user_id);
            return { ...a, username: p?.username || 'A reader', avatar_url: p?.avatar_url || null };
        });
    } catch (error) {
        console.error('Error fetching activity feed:', error);
        return [];
    }
};

// ─── Messages ────────────────────────────────────────────────

export const sendMessage = async (senderId, receiverId, content) => {
    try {
        const { data, error } = await supabase.from('messages')
            .insert([{ sender_id: senderId, receiver_id: receiverId, content, read: false }])
            .select().single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error sending message:', error);
        return { data: null, error };
    }
};

export const getConversation = async (userId, otherUserId) => {
    try {
        const { data, error } = await supabase.from('messages').select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching conversation:', error);
        return [];
    }
};

export const markMessagesAsRead = async (userId, senderId) => {
    try {
        const { error } = await supabase.from('messages')
            .update({ read: true })
            .eq('receiver_id', userId).eq('sender_id', senderId).eq('read', false);
        if (error) throw error;
        return { error: null };
    } catch (error) {
        return { error };
    }
};

export const getUnreadCount = async (userId) => {
    try {
        const { count, error } = await supabase.from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId).eq('read', false);
        if (error) throw error;
        return count || 0;
    } catch (error) {
        return 0;
    }
};

// ─── Realtime Subscriptions ──────────────────────────────────

export const subscribeToMessages = (userId, callback) => {
    return supabase.channel(`messages-${userId}`)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages',
            filter: `receiver_id=eq.${userId}`
        }, (payload) => callback(payload.new))
        .subscribe();
};

export const subscribeToFriendRequests = (userId, callback) => {
    if (!userId) return null;
    return supabase.channel(`friendships-${userId}`)
        .on('postgres_changes', {
            event: '*', schema: 'public', table: 'friendships',
            filter: `friend_id=eq.${userId}`
        }, () => callback())
        .subscribe();
};

export const subscribeToActivityFeed = (callback) => {
    return supabase.channel('activity_feed')
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'activity_feed'
        }, (payload) => callback(payload.new))
        .subscribe();
};