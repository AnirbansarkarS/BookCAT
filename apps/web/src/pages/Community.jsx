import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    UserPlus, UserCheck, MessageSquare, BookOpen, Users, TrendingUp,
    Check, X, Search, Send, ArrowLeft, Clock, CheckCircle, Loader2,
    Library, Zap, Hash, ChevronDown, ArrowLeftRight, PackagePlus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
    getAllUsers, getFriendBooks, sendFriendRequest, acceptFriendRequest, removeFriend,
    getFriends, getActivityFeed, sendMessage, getConversation,
    markMessagesAsRead, subscribeToMessages, subscribeToFriendRequests
} from '../services/communityService';
import { createExchangeOffer } from '../services/exchangeService';
import { getUserBooks } from '../services/bookService';
import { cn } from '../lib/utils';

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

const fmt = {
    rel(d) {
        const s = Math.floor((Date.now() - new Date(d)) / 1000);
        if (s < 60) return 'now';
        if (s < 3600) return `${Math.floor(s / 60)}m`;
        if (s < 86400) return `${Math.floor(s / 3600)}h`;
        return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    },
    time(d) {
        return new Date(d).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    },
    day(d) {
        const s = new Date(d).toDateString();
        if (s === new Date().toDateString()) return 'Today';
        if (s === new Date(Date.now() - 86400000).toDateString()) return 'Yesterday';
        return new Date(d).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
    },
    mins(m) {
        if (!m) return '—';
        const h = Math.floor(m / 60), r = m % 60;
        return h > 0 ? `${h}h ${r}m` : `${r}m`;
    }
};

const STATUS = {
    finished: { label: 'Finished', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    reading_now: { label: 'Reading', cls: 'text-sky-400    bg-sky-500/10    border-sky-500/20' },
    want_to_read: { label: 'Want to Read', cls: 'text-amber-400  bg-amber-500/10  border-amber-500/20' },
    abandoned: { label: 'Half Read', cls: 'text-slate-400  bg-slate-500/10  border-slate-500/20' },
    re_reading: { label: 'Re-reading', cls: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
};

function bookStatus(book) {
    for (const k of Object.keys(STATUS)) {
        if ((book.tags || []).includes(k)) return k;
    }
    return {
        'Completed': 'finished', 'Reading': 'reading_now',
        'Want to Read': 'want_to_read', 'Abandoned': 'abandoned', 'Re-reading': 're_reading'
    }[book.status] || null;
}

// ─────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────

function Avatar({ name = '?', src, size = 'md', dot }) {
    const sz = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
    return (
        <div className="relative flex-shrink-0">
            {src
                ? <img src={src} alt={name} className={cn(sz[size], 'rounded-full object-cover ring-2 ring-white/10')} loading="lazy" decoding="async" width="40" height="40" />
                : <div className={cn(sz[size], 'rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center font-bold text-white ring-2 ring-white/10 select-none')}>
                    {name[0].toUpperCase()}
                </div>
            }
            {dot && (
                <span className={cn(
                    'absolute bottom-0 right-0 rounded-full border-2 border-background',
                    size === 'xs' ? 'w-1.5 h-1.5' : size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5',
                    dot === 'online' ? 'bg-emerald-400' : 'bg-slate-600'
                )} />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// CHAT PANEL (FIXED: Always full height)
// ─────────────────────────────────────────────────────────────

function ChatPanel({ friend, me, onClose, onViewLibrary }) {
    const [msgs, setMsgs] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const endRef = useRef(null);
    const taRef = useRef(null);

    const scrollDown = useCallback((smooth = true) =>
        endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }), []);

    useEffect(() => {
        let ch;
        (async () => {
            setLoading(true);
            const data = await getConversation(me.id, friend.friend_id);
            setMsgs(data);
            setLoading(false);
            setTimeout(() => scrollDown(false), 50);
            await markMessagesAsRead(me.id, friend.friend_id);
            ch = subscribeToMessages(me.id, (msg) => {
                if (msg.sender_id === friend.friend_id) {
                    setMsgs(p => [...p, msg]);
                    setTimeout(scrollDown, 50);
                    markMessagesAsRead(me.id, friend.friend_id);
                }
            });
        })();
        setTimeout(() => taRef.current?.focus(), 100);
        return () => ch?.unsubscribe?.();
    }, [friend.friend_id, me.id, scrollDown]);

    const doSend = async () => {
        const text = draft.trim();
        if (!text || sending) return;
        setSending(true);
        const tmp = {
            id: `tmp-${Date.now()}`, sender_id: me.id, receiver_id: friend.friend_id,
            content: text, created_at: new Date().toISOString(), _tmp: true
        };
        setMsgs(p => [...p, tmp]);
        setDraft('');
        if (taRef.current) taRef.current.style.height = 'auto';
        setTimeout(scrollDown, 50);
        const { data } = await sendMessage(me.id, friend.friend_id, text);
        setMsgs(p => p.map(m => m.id === tmp.id ? (data || tmp) : m));
        setSending(false);
    };

    const days = msgs.reduce((acc, m) => {
        const k = new Date(m.created_at).toDateString();
        if (!acc.length || acc[acc.length - 1].key !== k)
            acc.push({ key: k, label: fmt.day(m.created_at), items: [] });
        acc[acc.length - 1].items.push(m);
        return acc;
    }, []);

    return (
        <div className="flex flex-col h-full bg-surface">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
                <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-colors">
                    <ArrowLeft size={16} />
                </button>
                <Avatar name={friend.username || '?'} src={friend.avatar_url} size="md" dot="online" />
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{friend.username}</p>
                    <p className="text-[11px] text-emerald-400">● Active reader</p>
                </div>
                <button onClick={onViewLibrary}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs font-medium rounded-lg border border-violet-500/20 transition-all">
                    <Library size={12} />
                    <span className="hidden sm:inline">Library</span>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4 min-h-0">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                ) : msgs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                            <BookOpen className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">Start the conversation</p>
                            <p className="text-text-muted text-sm mt-1">Ask {friend.username} what they're reading 📚</p>
                        </div>
                    </div>
                ) : days.map(({ key, label, items }) => (
                    <div key={key}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1 h-px bg-white/[0.05]" />
                            <span className="text-[10px] text-text-muted/50 font-medium">{label}</span>
                            <div className="flex-1 h-px bg-white/[0.05]" />
                        </div>
                        <div className="space-y-0.5">
                            {items.map((msg, i) => {
                                const isMe = msg.sender_id === me.id;
                                const prev = items[i - 1], next = items[i + 1];
                                const samePrev = prev?.sender_id === msg.sender_id;
                                const sameNext = next?.sender_id === msg.sender_id;
                                return (
                                    <div key={msg.id} className={cn(
                                        'flex items-end gap-1.5',
                                        isMe ? 'flex-row-reverse' : 'flex-row',
                                        !sameNext && 'mb-2'
                                    )}>
                                        {!isMe && (
                                            !sameNext
                                                ? <Avatar name={friend.username} src={friend.avatar_url} size="xs" />
                                                : <div className="w-6 flex-shrink-0" />
                                        )}
                                        <div className={cn('flex flex-col max-w-[80%] sm:max-w-[70%]', isMe ? 'items-end' : 'items-start')}>
                                            <div className={cn(
                                                'px-3 py-2 text-sm break-words leading-relaxed',
                                                isMe ? 'bg-primary text-white' : 'bg-white/[0.08] text-white',
                                                isMe
                                                    ? cn(!samePrev ? 'rounded-t-2xl' : 'rounded-tr-2xl', 'rounded-l-2xl', !sameNext ? 'rounded-br-sm' : 'rounded-br-2xl')
                                                    : cn(!samePrev ? 'rounded-t-2xl' : 'rounded-tl-2xl', 'rounded-r-2xl', !sameNext ? 'rounded-bl-sm' : 'rounded-bl-2xl'),
                                                msg._tmp && 'opacity-60'
                                            )}>
                                                {msg.content}
                                            </div>
                                            {!sameNext && (
                                                <span className={cn('text-[10px] text-text-muted/40 mt-1 px-1', isMe ? 'text-right' : 'text-left')}>
                                                    {fmt.time(msg.created_at)}{isMe && msg._tmp && ' · …'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            {/* Composer */}
            <div className="px-3 sm:px-4 py-3 border-t border-white/[0.06] flex-shrink-0">
                <div className="flex items-end gap-2 bg-white/[0.05] rounded-2xl px-3 sm:px-4 py-2.5 border border-white/[0.07] focus-within:border-primary/40 transition-colors">
                    <textarea
                        ref={taRef} value={draft} rows={1}
                        placeholder={`Message ${friend.username}…`}
                        onChange={e => {
                            setDraft(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px';
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } }}
                        className="flex-1 bg-transparent text-white text-sm placeholder:text-text-muted/50 resize-none outline-none leading-relaxed max-h-[90px] py-0.5"
                    />
                    <button onClick={doSend} disabled={!draft.trim() || sending}
                        className={cn(
                            'p-2 rounded-xl flex-shrink-0 transition-all',
                            draft.trim() && !sending
                                ? 'bg-primary text-white hover:bg-primary/90 active:scale-90 shadow-lg shadow-primary/25'
                                : 'bg-white/5 text-text-muted/30 cursor-not-allowed'
                        )}>
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>
                <p className="hidden sm:block text-[10px] text-text-muted/30 text-center mt-1.5">
                    Enter to send · Shift+Enter for newline
                </p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// REQUEST BOOK MODAL
// ─────────────────────────────────────────────────────────────

function RequestBookModal({ isOpen, onClose, friend, targetBook }) {
    const { user } = useAuth();
    const [myBooks, setMyBooks] = useState([]);
    const [selectedBookId, setSelectedBookId] = useState(null);
    const [message, setMessage] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('meetup');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            getUserBooks(user.id).then(setMyBooks);
            .catch(err => console.error(err))