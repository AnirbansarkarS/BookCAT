// src/services/exchangeService.js
import { supabase } from '../lib/supabase';

// ─── Exchange Offers ────────────────────────────────────────

/**
 * Create a new exchange offer
 */
export const createExchangeOffer = async (data) => {
    try {
        const { data: offer, error } = await supabase
            .from('exchange_offers')
            .insert([{
                initiator_id: data.initiatorId,
                recipient_id: data.recipientId,
                initiator_book_id: data.initiatorBookId,
                recipient_book_id: data.recipientBookId || null,
                initiator_message: data.message || null,
                delivery_method: data.deliveryMethod || 'meetup',
                meetup_location: data.meetupLocation || null,
                expiry_date: data.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending',
            }])
            .select()
            .single();

        if (error) throw error;
        return { data: offer, error: null };
    } catch (error) {
        console.error('Error creating exchange offer:', error);
        return { data: null, error };
    }
};

/**
 * Get all exchanges for a user (sent + received)
 * FIXED: Fetch separately to avoid PGRST200 foreign key errors
 */
export const getUserExchanges = async (userId) => {
    try {
        // 1. Get raw exchange data
        const { data: exchanges, error: exchangesError } = await supabase
            .from('exchange_offers')
            .select('*')
            .or(`initiator_id.eq.${userId},recipient_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (exchangesError) throw exchangesError;
        if (!exchanges || exchanges.length === 0) return [];

        // 2. Collect all unique IDs
        const profileIds = new Set();
        const bookIds = new Set();

        exchanges.forEach(ex => {
            profileIds.add(ex.initiator_id);
            profileIds.add(ex.recipient_id);
            if (ex.initiator_book_id) bookIds.add(ex.initiator_book_id);
            if (ex.recipient_book_id) bookIds.add(ex.recipient_book_id);
            if (ex.counter_offer_book_id) bookIds.add(ex.counter_offer_book_id);
        });

        // 3. Fetch profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', Array.from(profileIds));

        // 4. Fetch books
        const { data: books } = await supabase
            .from('books')
            .select('*')
            .in('id', Array.from(bookIds));

        // 5. Combine data
        const formatted = exchanges.map(ex => ({
            ...ex,
            initiator: (profiles || []).find(p => p.id === ex.initiator_id) || {},
            recipient: (profiles || []).find(p => p.id === ex.recipient_id) || {},
            initiator_book: (books || []).find(b => b.id === ex.initiator_book_id) || {},
            recipient_book: (books || []).find(b => b.id === ex.recipient_book_id) || {},
            counter_offer_book: ex.counter_offer_book_id 
                ? (books || []).find(b => b.id === ex.counter_offer_book_id) 
                : null,
        }));

        return formatted;
    } catch (error) {
        console.error('Error fetching user exchanges:', error);
        return [];
    }
};

/**
 * Get a single exchange by ID
 * FIXED: Fetch separately to avoid FK errors
 */
export const getExchangeById = async (exchangeId) => {
    try {
        // 1. Get exchange
        const { data: exchange, error: exchangeError } = await supabase
            .from('exchange_offers')
            .select('*')
            .eq('id', exchangeId)
            .single();

        if (exchangeError) throw exchangeError;

        // 2. Get profiles
        const profileIds = [exchange.initiator_id, exchange.recipient_id].filter(Boolean);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', profileIds);

        // 3. Get books
        const bookIds = [
            exchange.initiator_book_id,
            exchange.recipient_book_id,
            exchange.counter_offer_book_id
        ].filter(Boolean);
        
        const { data: books } = await supabase
            .from('books')
            .select('*')
            .in('id', bookIds);

        // 4. Combine
        return {
            ...exchange,
            initiator: (profiles || []).find(p => p.id === exchange.initiator_id) || {},
            recipient: (profiles || []).find(p => p.id === exchange.recipient_id) || {},
            initiator_book: (books || []).find(b => b.id === exchange.initiator_book_id) || {},
            recipient_book: (books || []).find(b => b.id === exchange.recipient_book_id) || {},
            counter_offer_book: exchange.counter_offer_book_id
                ? (books || []).find(b => b.id === exchange.counter_offer_book_id)
                : null,
        };
    } catch (error) {
        console.error('Error fetching exchange:', error);
        return null;
    }
};

/**
 * Accept an exchange offer
 */
export const acceptExchangeOffer = async (exchangeId, userId) => {
    try {
        const { data, error } = await supabase
            .from('exchange_offers')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString(),
            })
            .eq('id', exchangeId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error accepting exchange:', error);
        return { data: null, error };
    }
};

/**
 * Reject an exchange offer
 */
export const rejectExchangeOffer = async (exchangeId, message = null) => {
    try {
        const { data, error } = await supabase
            .from('exchange_offers')
            .update({
                status: 'rejected',
                recipient_message: message,
            })
            .eq('id', exchangeId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error rejecting exchange:', error);
        return { data: null, error };
    }
};

/**
 * Counter-offer with a different book
 */
export const counterExchangeOffer = async (exchangeId, counterBookId, message) => {
    try {
        const { data, error } = await supabase
            .from('exchange_offers')
            .update({
                status: 'countered',
                counter_offer_book_id: counterBookId,
                recipient_message: message,
            })
            .eq('id', exchangeId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error countering exchange:', error);
        return { data: null, error };
    }
};

/**
 * Cancel an exchange
 */
export const cancelExchange = async (exchangeId) => {
    try {
        const { data, error } = await supabase
            .from('exchange_offers')
            .update({ status: 'cancelled' })
            .eq('id', exchangeId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error cancelling exchange:', error);
        return { data: null, error };
    }
};

/**
 * Update delivery status
 */
export const updateDeliveryStatus = async (exchangeId, updates) => {
    try {
        const { data, error } = await supabase
            .from('exchange_offers')
            .update(updates)
            .eq('id', exchangeId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating delivery status:', error);
        return { data: null, error };
    }
};

/**
 * Mark courier payment as done
 */
export const markCourierPaid = async (exchangeId, userId, isInitiator) => {
    try {
        const field = isInitiator ? 'courier_cost_paid_initiator' : 'courier_cost_paid_recipient';
        const { data, error } = await supabase
            .from('exchange_offers')
            .update({ [field]: true })
            .eq('id', exchangeId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error marking courier payment:', error);
        return { data: null, error };
    }
};

/**
 * Complete exchange (both received)
 */
export const completeExchange = async (exchangeId) => {
    try {
        const { data, error } = await supabase
            .from('exchange_offers')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                delivery_status: 'completed',
            })
            .eq('id', exchangeId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error completing exchange:', error);
        return { data: null, error };
    }
};

// ─── Exchange Messages ──────────────────────────────────────

/**
 * Send a message in an exchange
 */
export const sendExchangeMessage = async (exchangeId, senderId, message) => {
    try {
        const { data, error } = await supabase
            .from('exchange_messages')
            .insert([{
                exchange_id: exchangeId,
                sender_id: senderId,
                message,
            }])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error sending exchange message:', error);
        return { data: null, error };
    }
};

/**
 * Get all messages in an exchange
 */
export const getExchangeMessages = async (exchangeId) => {
    try {
        const { data, error } = await supabase
            .from('exchange_messages')
            .select('*')
            .eq('exchange_id', exchangeId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching exchange messages:', error);
        return [];
    }
};

// ─── Real-time Subscriptions ────────────────────────────────

/**
 * Subscribe to exchange updates
 */
export const subscribeToExchange = (exchangeId, callback) => {
    const channel = supabase
        .channel(`exchange-${exchangeId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'exchange_offers',
            filter: `id=eq.${exchangeId}`,
        }, (payload) => callback(payload))
        .subscribe();

    return channel;
};

/**
 * Subscribe to exchange messages
 */
export const subscribeToExchangeMessages = (exchangeId, callback) => {
    const channel = supabase
        .channel(`exchange-messages-${exchangeId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'exchange_messages',
            filter: `exchange_id=eq.${exchangeId}`,
        }, (payload) => callback(payload.new))
        .subscribe();

    return channel;
};

/**
 * Subscribe to user's exchange updates
 */
export const subscribeToUserExchanges = (userId, callback) => {
    if (!userId) return null;
    
    const channel = supabase
        .channel(`user-exchanges-${userId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'exchange_offers',
        }, (payload) => {
            const exchange = payload.new || payload.old;
            if (exchange?.initiator_id === userId || exchange?.recipient_id === userId) {
                callback(payload);
            }
        })
        .subscribe();

    return channel;
};