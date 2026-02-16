// src/services/communityService.js
import { supabase } from '../lib/supabase';

/**
 * Get all users with their stats
 */
export const getAllUsers = async (currentUserId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                username,
                email,
                avatar_url,
                bio,
                created_at
            `)
            .neq('id', currentUserId);

        if (error) throw error;

        // Enrich with book and reading stats
        const enrichedUsers = await Promise.all(
            (data || []).map(async (user) => {
                // Get book count
                const { count: bookCount } = await supabase
                    .from('books')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                // Get total reading time
                const { data: sessions } = await supabase
                    .from('reading_sessions')
                    .select('duration_minutes')
                    .eq('user_id', user.id);

                const totalMinutes = (sessions || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
                const totalHours = Math.round(totalMinutes / 60);

                return {
                    ...user,
                    book_count: bookCount || 0,
                    total_reading_time: totalHours
                };
            })
        );

        return enrichedUsers;
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};

/**
 * Get friends list with status
 */
export const getFriends = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                id,
                user_id,
                friend_id,
                status,
                created_at,
                friend:profiles!friendships_friend_id_fkey(
                    id,
                    username,
                    email,
                    avatar_url
                ),
                requester:profiles!friendships_user_id_fkey(
                    id,
                    username,
                    email,
                    avatar_url
                )
            `)
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        if (error) throw error;

        // Format the data
        const formatted = (data || []).map(friendship => {
            const isSender = friendship.user_id === userId;
            const otherPerson = isSender ? friendship.friend : friendship.requester;
            
            return {
                friendship_id: friendship.id,
                friend_id: isSender ? friendship.friend_id : friendship.user_id,
                username: otherPerson.username,
                email: otherPerson.email,
                avatar_url: otherPerson.avatar_url,
                status: friendship.status,
                friendship_since: friendship.created_at,
                is_sender: isSender
            };
        });

        return formatted;
    } catch (error) {
        console.error('Error fetching friends:', error);
        return [];
    }
};

/**
 * Send friend request
 */
export const sendFriendRequest = async (userId, friendId) => {
    try {
        // Check if friendship already exists
        const { data: existing } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
            .single();

        if (existing) {
            console.log('Friendship already exists');
            return { data: existing, error: null };
        }

        const { data, error } = await supabase
            .from('friendships')
            .insert([
                {
                    user_id: userId,
                    friend_id: friendId,
                    status: 'pending'
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error sending friend request:', error);
        return { data: null, error };
    }
};

/**
 * Accept friend request
 */
export const acceptFriendRequest = async (friendshipId) => {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', friendshipId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error accepting friend request:', error);
        return { data: null, error };
    }
};

/**
 * Reject/remove friend
 */
export const removeFriend = async (friendshipId) => {
    try {
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error removing friend:', error);
        return { error };
    }
};

/**
 * Get activity feed
 */
export const getActivityFeed = async (userId) => {
    try {
        // Get user's own activities and friends' activities
        const { data, error } = await supabase
            .from('activity_feed')
            .select(`
                id,
                user_id,
                activity_type,
                data,
                is_public,
                created_at,
                user:profiles(username, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Format the data
        const formatted = (data || []).map(activity => ({
            ...activity,
            username: activity.user?.username || 'A reader'
        }));

        return formatted;
    } catch (error) {
        console.error('Error fetching activity feed:', error);
        return [];
    }
};

/**
 * Send message
 */
export const sendMessage = async (senderId, receiverId, content) => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert([
                {
                    sender_id: senderId,
                    receiver_id: receiverId,
                    content: content,
                    read: false
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error sending message:', error);
        return { data: null, error };
    }
};

/**
 * Get conversation with a user
 */
export const getConversation = async (userId, otherUserId) => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching conversation:', error);
        return [];
    }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (userId, senderId) => {
    try {
        const { error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('receiver_id', userId)
            .eq('sender_id', senderId)
            .eq('read', false);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return { error };
    }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (userId) => {
    try {
        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId)
            .eq('read', false);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

/**
 * Subscribe to real-time messages
 */
export const subscribeToMessages = (userId, callback) => {
    const channel = supabase
        .channel('messages')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${userId}`
            },
            (payload) => {
                callback(payload.new);
            }
        )
        .subscribe();

    return channel;
};

/**
 * Subscribe to real-time friend requests
 */
export const subscribeToFriendRequests = (userId, callback) => {
    const channel = supabase
        .channel('friendships')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'friendships',
                filter: `friend_id=eq.${userId}`
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();

    return channel;
};

/**
 * Subscribe to real-time activity feed
 */
export const subscribeToActivityFeed = (callback) => {
    const channel = supabase
        .channel('activity_feed')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'activity_feed'
            },
            (payload) => {
                callback(payload.new);
            }
        )
        .subscribe();

    return channel;
};