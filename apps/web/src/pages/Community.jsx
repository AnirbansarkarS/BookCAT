import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    UserPlus, UserCheck, MessageSquare, BookOpen, Users, TrendingUp,
    Check, X, Search, Send, ArrowLeft, Clock, CheckCircle, Loader2,
    Library, Zap, Hash, ChevronDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
    getAllUsers, getFriendBooks, sendFriendRequest, acceptFriendRequest, removeFriend,
    getFriends, getActivityFeed, sendMessage, getConversation,
    markMessagesAsRead, subscribeToMessages, subscribeToFriendRequests
} from '../services/communityService';
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
    finished:     { label: 'Finished',     cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    reading_now:  { label: 'Reading',      cls: 'text-sky-400    bg-sky-500/10    border-sky-500/20'    },
    want_to_read: { label: 'Want to Read', cls: 'text-amber-400  bg-amber-500/10  border-amber-500/20'  },
    abandoned:    { label: 'Abandoned',    cls: 'text-slate-400  bg-slate-500/10  border-slate-500/20'  },
    re_reading:   { label: 'Re-reading',   cls: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
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
                ? <img src={src} alt={name} className={cn(sz[size], 'rounded-full object-cover ring-2 ring-white/10')} />
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
// CHAT PANEL
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
// FRIEND LIBRARY PANEL
// ─────────────────────────────────────────────────────────────

function FriendLibraryPanel({ friend, onClose, onOpenChat }) {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [q, setQ] = useState('');
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const data = await getFriendBooks(friend.friend_id);
            setBooks(data || []);
            setLoading(false);
        })();
    }, [friend.friend_id]);

    const TABS = [
        { id: 'all',          label: 'All'     },
        { id: 'reading_now',  label: 'Reading' },
        { id: 'finished',     label: 'Done'    },
        { id: 'want_to_read', label: 'Want'    },
        { id: 'abandoned',    label: 'Dropped' },
    ];

    const count = id => id === 'all' ? books.length : books.filter(b => bookStatus(b) === id).length;

    const visible = books.filter(b => {
        if (filter !== 'all' && bookStatus(b) !== filter) return false;
        if (q) {
            const lq = q.toLowerCase();
            return b.title?.toLowerCase().includes(lq) || b.authors?.toLowerCase().includes(lq);
        }
        return true;
    });

    const stats = {
        reading:  count('reading_now'),
        finished: count('finished'),
        hours:    Math.round(books.reduce((s, b) => s + (b.reading_time_minutes || 0), 0) / 60),
        pages:    books.reduce((s, b) => s + (b.current_page || 0), 0),
    };

    return (
        <div className="flex flex-col h-full bg-surface">
            {/* Header */}
            <div className="px-3 sm:px-4 pt-3 pb-3 border-b border-white/[0.06] flex-shrink-0 space-y-3">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                    </button>
                    <Avatar name={friend.username || '?'} src={friend.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{friend.username}'s Library</p>
                        <p className="text-[11px] text-text-muted">{books.length} books · {stats.hours}h read</p>
                    </div>
                    <button onClick={onOpenChat}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg border border-primary/20 transition-all">
                        <MessageSquare size={12} />
                        <span className="hidden sm:inline">Chat</span>
                    </button>
                </div>

                {/* Stats grid — 2 cols mobile, 4 cols desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                        { label: 'Reading',  value: stats.reading,  color: 'text-sky-400'     },
                        { label: 'Finished', value: stats.finished, color: 'text-emerald-400' },
                        { label: 'Hours',    value: stats.hours,    color: 'text-violet-400'  },
                        { label: 'Pages',    value: stats.pages,    color: 'text-amber-400'   },
                    ].map(s => (
                        <div key={s.label} className="bg-white/[0.04] border border-white/[0.06] rounded-lg py-2 text-center">
                            <div className={cn('text-lg font-bold leading-none', s.color)}>{s.value}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted/40" />
                    <input type="text" value={q} onChange={e => setQ(e.target.value)}
                        placeholder="Search title or author…"
                        className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl text-sm text-white placeholder:text-text-muted/40 outline-none focus:border-primary/40 transition-all"
                    />
                </div>

                {/* Filter pills */}
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setFilter(t.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all',
                                filter === t.id
                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                    : 'bg-white/[0.05] text-text-muted hover:bg-white/10 hover:text-white border border-white/[0.07]'
                            )}>
                            {t.label}
                            <span className={cn('text-[10px] px-1 rounded-full', filter === t.id ? 'bg-white/20' : 'bg-white/10')}>
                                {count(t.id)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Book list */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 min-h-0">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                ) : books.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12 px-4">
                        <Library className="w-10 h-10 text-text-muted/30" />
                        <div>
                            <p className="text-white font-medium">No books found</p>
                            <p className="text-text-muted/60 text-sm mt-1">
                                Make sure you ran the RLS fix SQL in Supabase
                            </p>
                        </div>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
                        <Library className="w-10 h-10 text-text-muted/30" />
                        <p className="text-white font-medium">No books match this filter</p>
                    </div>
                ) : visible.map(book => {
                    const st = bookStatus(book);
                    const cfg = st ? STATUS[st] : null;
                    const progress = book.total_pages > 0
                        ? Math.min(100, Math.round((book.current_page || 0) / book.total_pages * 100))
                        : (book.progress || 0);
                    const isOpen = expanded === book.id;
                    const userTags = (book.tags || []).filter(t => !STATUS[t]);

                    return (
                        <div key={book.id}
                            onClick={() => setExpanded(isOpen ? null : book.id)}
                            className={cn(
                                'border rounded-xl transition-all cursor-pointer',
                                isOpen
                                    ? 'bg-primary/[0.04] border-primary/30'
                                    : 'bg-white/[0.03] hover:bg-white/[0.055] border-white/[0.06]'
                            )}>
                            <div className="flex gap-3 p-3">
                                {/* Cover */}
                                <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 ring-1 ring-white/10">
                                    {book.cover_url
                                        ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-violet-500/20">
                                            <BookOpen className="w-4 h-4 text-primary/60" />
                                          </div>
                                    }
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-white text-sm leading-snug line-clamp-2">{book.title}</p>
                                            <p className="text-[11px] text-text-muted truncate mt-0.5">{book.authors || 'Unknown'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {cfg && (
                                                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', cfg.cls)}>
                                                    {cfg.label}
                                                </span>
                                            )}
                                            <ChevronDown size={12} className={cn('text-text-muted/40 transition-transform', isOpen && 'rotate-180')} />
                                        </div>
                                    </div>
                                    {/* Progress for active reads */}
                                    {(st === 'reading_now' || st === 're_reading') && book.total_pages > 0 && (
                                        <div className="mt-2">
                                            <div className="flex justify-between text-[10px] text-text-muted mb-1">
                                                <span>p.{book.current_page || 0} / {book.total_pages}</span>
                                                <span className="text-primary font-semibold">{progress}%</span>
                                            </div>
                                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-700"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Expanded details */}
                            {isOpen && (
                                <div className="px-3 pb-3 border-t border-white/[0.05] pt-2.5 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/[0.04] rounded-lg p-2 text-center">
                                            <div className="text-sm font-bold text-white">{fmt.mins(book.reading_time_minutes)}</div>
                                            <div className="text-[10px] text-text-muted">Time Read</div>
                                        </div>
                                        <div className="bg-white/[0.04] rounded-lg p-2 text-center">
                                            <div className="text-sm font-bold text-white">{book.session_count || 0}</div>
                                            <div className="text-[10px] text-text-muted">Sessions</div>
                                        </div>
                                    </div>
                                    {userTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {userTags.map(t => (
                                                <span key={t} className="flex items-center gap-0.5 text-[10px] bg-white/5 text-text-muted px-1.5 py-0.5 rounded-full border border-white/[0.07]">
                                                    <Hash size={7} />{t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {book.last_session_at && (
                                        <p className="text-[10px] text-text-muted flex items-center gap-1">
                                            <Clock size={9} /> Last read {fmt.rel(book.last_session_at)} ago
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// COMMUNITY — MAIN
// ─────────────────────────────────────────────────────────────

export default function Community() {
    const { user } = useAuth();
    const [allUsers,  setAllUsers]  = useState([]);
    const [friends,   setFriends]   = useState([]);
    const [pendingIn, setPendingIn] = useState([]);
    const [activity,  setActivity]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [tab,       setTab]       = useState('discover');
    const [q,         setQ]         = useState('');

    // Panel state — null | 'chat' | 'library'
    const [panel,  setPanel]  = useState(null);
    const [active, setActive] = useState(null);

    // On mobile, panels cover the full screen
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'panel'

    const load = useCallback(async () => {
        if (!user) return;
        try {
            const [users, flist, acts] = await Promise.all([
                getAllUsers(user.id),
                getFriends(user.id),
                getActivityFeed(user.id),
            ]);
            setAllUsers(users.filter(u => u.id !== user.id));
            setFriends(flist.filter(f => f.status === 'accepted'));
            setPendingIn(flist.filter(f => f.status === 'pending' && !f.is_sender));
            setActivity(acts);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => {
        load();
        const iv = setInterval(load, 30000);
        const ch = subscribeToFriendRequests(user?.id, load);
        return () => { clearInterval(iv); ch?.unsubscribe?.(); };
    }, [load]);

    const openPanel = (type, friend) => {
        setPanel(type);
        setActive(friend);
        setMobileView('panel');
    };

    const closePanel = () => {
        setPanel(null);
        setActive(null);
        setMobileView('list');
    };

    const statusOf = uid => {
        if (friends.some(f => f.friend_id === uid)) return 'accepted';
        if (pendingIn.some(f => f.friend_id === uid)) return 'pending';
        return 'none';
    };

    const filtered = allUsers.filter(u =>
        !q || u.username?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())
    );

    if (loading) return (
        <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
    );

    // ── MOBILE: full-screen panel ──────────────────────────────
    if (mobileView === 'panel' && panel && active) {
        return (
            <div className="fixed inset-0 z-50 bg-surface lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {panel === 'chat' && (
                    <ChatPanel friend={active} me={user} onClose={closePanel}
                        onViewLibrary={() => openPanel('library', active)} />
                )}
                {panel === 'library' && (
                    <FriendLibraryPanel friend={active} onClose={closePanel}
                        onOpenChat={() => openPanel('chat', active)} />
                )}
            </div>
        );
    }

    return (
        <div className="flex gap-4 h-[calc(100vh-6rem)]">

            {/* ═══════════ LEFT / MAIN LIST ═══════════ */}
            <div className={cn(
                'flex flex-col gap-3 min-h-0 w-full transition-all duration-300',
                panel ? 'lg:w-[360px] lg:flex-shrink-0' : 'lg:flex-1'
            )}>
                {/* Title */}
                <div className="flex-shrink-0">
                    <h1 className="text-xl font-bold text-white">Community</h1>
                    <p className="text-xs text-text-muted mt-0.5">Connect with readers who share your taste</p>
                </div>

                {/* Stat pills */}
                <div className="flex gap-2 flex-wrap flex-shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 rounded-full text-xs text-sky-400">
                        <span className="font-bold">{friends.length}</span> Friends
                    </div>
                    <div className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs',
                        pendingIn.length
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-white/5 border-white/10 text-text-muted'
                    )}>
                        <span className="font-bold">{pendingIn.length}</span> Requests
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs text-violet-400">
                        <span className="font-bold">{allUsers.length}</span> Readers
                    </div>
                </div>

                {/* Pending friend requests */}
                {pendingIn.length > 0 && (
                    <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-3 flex-shrink-0 space-y-2">
                        <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                            <UserPlus size={12} /> Friend Requests ({pendingIn.length})
                        </p>
                        {pendingIn.map(r => (
                            <div key={r.friendship_id} className="flex items-center gap-2.5 bg-black/20 rounded-lg px-3 py-2">
                                <Avatar name={r.username || r.email} src={r.avatar_url} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{r.username || 'Reader'}</p>
                                    <p className="text-[10px] text-text-muted truncate">@{r.email?.split('@')[0]}</p>
                                </div>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={async () => { await acceptFriendRequest(r.friendship_id); load(); }}
                                        className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all active:scale-90">
                                        <Check size={13} />
                                    </button>
                                    <button
                                        onClick={async () => { await removeFriend(r.friendship_id); load(); }}
                                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all active:scale-90">
                                        <X size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex p-0.5 bg-white/[0.04] border border-white/[0.06] rounded-xl flex-shrink-0">
                    {[
                        { id: 'discover', icon: Search,     label: 'Discover' },
                        { id: 'friends',  icon: Users,      label: 'Friends'  },
                        { id: 'activity', icon: TrendingUp, label: 'Activity' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                                tab === t.id ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-white hover:bg-white/5'
                            )}>
                            <t.icon size={12} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                {tab === 'discover' && (
                    <div className="relative flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted/40" />
                        <input type="text" value={q} onChange={e => setQ(e.target.value)}
                            placeholder="Search readers…"
                            className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-sm text-white placeholder:text-text-muted/40 outline-none focus:border-primary/40 transition-all"
                        />
                    </div>
                )}

                {/* ── List ── */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-4">

                    {/* DISCOVER */}
                    {tab === 'discover' && (
                        filtered.length === 0
                            ? <p className="text-center text-text-muted text-sm py-10">No readers found</p>
                            : filtered.map(u => {
                                const st = statusOf(u.id);
                                const fr = friends.find(f => f.friend_id === u.id);
                                const isActive = active?.friend_id === u.id;
                                return (
                                    <div key={u.id} className={cn(
                                        'border rounded-2xl p-3 transition-all',
                                        isActive ? 'border-primary/40 bg-primary/[0.04]' : 'bg-white/[0.03] hover:bg-white/[0.055] border-white/[0.07]'
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={u.username || u.email} src={u.avatar_url} dot={st === 'accepted' ? 'online' : undefined} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-white text-sm truncate">{u.username || 'Reader'}</p>
                                                <p className="text-[11px] text-text-muted truncate">@{u.email?.split('@')[0]}</p>
                                            </div>
                                            {st === 'accepted'
                                                ? <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 flex-shrink-0">
                                                      <UserCheck size={9} /> Friends
                                                  </span>
                                                : st === 'pending'
                                                ? <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 flex-shrink-0">Pending</span>
                                                : <button
                                                      onClick={() => sendFriendRequest(user.id, u.id).then(load)}
                                                      className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-full border border-primary/20 transition-all hover:scale-105 active:scale-95 flex-shrink-0">
                                                      <UserPlus size={9} /> Add
                                                  </button>
                                            }
                                        </div>
                                        <div className="flex gap-4 mt-2 px-0.5">
                                            <span className="text-[11px] text-text-muted flex items-center gap-1">
                                                <BookOpen size={10} className="text-primary/60" /> {u.book_count || 0} books
                                            </span>
                                            <span className="text-[11px] text-text-muted flex items-center gap-1">
                                                <Clock size={10} className="text-violet-400/60" /> {u.total_reading_time || 0}h
                                            </span>
                                        </div>
                                        {st === 'accepted' && fr && (
                                            <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-white/[0.05]">
                                                <button onClick={() => openPanel('library', fr)}
                                                    className={cn(
                                                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                                                        panel === 'library' && isActive
                                                            ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30'
                                                            : 'bg-white/[0.05] hover:bg-white/10 text-text-muted hover:text-white border border-white/[0.07]'
                                                    )}>
                                                    <Library size={11} /> Library
                                                </button>
                                                <button onClick={() => openPanel('chat', fr)}
                                                    className={cn(
                                                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                                                        panel === 'chat' && isActive
                                                            ? 'bg-primary text-white border border-primary/50 shadow-md shadow-primary/20'
                                                            : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
                                                    )}>
                                                    <MessageSquare size={11} /> Chat
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                    )}

                    {/* FRIENDS */}
                    {tab === 'friends' && (
                        friends.length === 0
                            ? <div className="text-center py-14 px-4">
                                  <Users className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
                                  <p className="text-white font-semibold text-sm">No friends yet</p>
                                  <p className="text-text-muted text-xs mt-1 mb-4">Go to Discover to find readers</p>
                                  <button onClick={() => setTab('discover')}
                                      className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-xl">
                                      Discover Readers
                                  </button>
                              </div>
                            : friends.map(fr => (
                                <div key={fr.friend_id} className={cn(
                                    'border rounded-2xl p-3 transition-all',
                                    active?.friend_id === fr.friend_id
                                        ? 'border-primary/40 bg-primary/[0.04]'
                                        : 'bg-white/[0.03] border-white/[0.07] hover:border-white/[0.12]'
                                )}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Avatar name={fr.username || '?'} src={fr.avatar_url} dot="online" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-white text-sm truncate">{fr.username}</p>
                                            <p className="text-[10px] text-text-muted">
                                                Since {new Date(fr.friendship_since).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openPanel('library', fr)}
                                            className={cn(
                                                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all',
                                                panel === 'library' && active?.friend_id === fr.friend_id
                                                    ? 'bg-violet-500/25 text-violet-300 border-violet-500/30'
                                                    : 'bg-white/[0.05] hover:bg-white/10 text-text-muted hover:text-white border-white/[0.07]'
                                            )}>
                                            <Library size={11} /> Library
                                        </button>
                                        <button onClick={() => openPanel('chat', fr)}
                                            className={cn(
                                                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all',
                                                panel === 'chat' && active?.friend_id === fr.friend_id
                                                    ? 'bg-primary text-white border-primary/50 shadow-md shadow-primary/25'
                                                    : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                                            )}>
                                            <MessageSquare size={11} /> Chat
                                        </button>
                                    </div>
                                </div>
                            ))
                    )}

                    {/* ACTIVITY */}
                    {tab === 'activity' && (
                        activity.length === 0
                            ? <div className="text-center py-14 px-4">
                                  <TrendingUp className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
                                  <p className="text-white font-semibold text-sm">No activity yet</p>
                                  <p className="text-text-muted text-xs mt-1">Complete reading sessions to see activity</p>
                              </div>
                            : activity.map(a => (
                                <div key={a.id} className="flex gap-3 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl p-3 transition-all">
                                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                        a.activity_type === 'book_completed' ? 'bg-emerald-500/15' : 'bg-primary/15')}>
                                        {a.activity_type === 'book_completed'
                                            ? <CheckCircle size={14} className="text-emerald-400" />
                                            : <Zap size={14} className="text-primary" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white leading-snug">
                                            <span className="font-semibold">{a.username}</span>
                                            {a.activity_type === 'book_completed' && <> finished <span className="text-primary">{a.data?.book_title}</span></>}
                                            {a.activity_type === 'session_completed' && <> read for <span className="text-primary">{a.data?.duration_minutes}min</span></>}
                                        </p>
                                        <p className="text-[10px] text-text-muted mt-0.5">{fmt.rel(a.created_at)}</p>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>

            {/* ═══════════ RIGHT PANEL (desktop only) ═══════════ */}
            <div className="hidden lg:flex flex-1 min-w-0">
                {panel && active ? (
                    <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl">
                        {panel === 'chat' && (
                            <ChatPanel friend={active} me={user} onClose={closePanel}
                                onViewLibrary={() => openPanel('library', active)} />
                        )}
                        {panel === 'library' && (
                            <FriendLibraryPanel friend={active} onClose={closePanel}
                                onOpenChat={() => openPanel('chat', active)} />
                        )}
                    </div>
                ) : friends.length > 0 ? (
                    <div className="flex-1 rounded-2xl border border-dashed border-white/[0.07] flex flex-col items-center justify-center text-center p-8 gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                            <MessageSquare className="w-7 h-7 text-text-muted/30" />
                        </div>
                        <div>
                            <p className="font-semibold text-white text-sm">Pick a friend to start</p>
                            <p className="text-text-muted text-xs mt-1">Chat or browse their reading library</p>
                        </div>
                        <div className="flex gap-3 flex-wrap justify-center">
                            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-full text-xs text-text-muted">
                                <MessageSquare size={10} className="text-primary" /> Real-time chat
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-full text-xs text-text-muted">
                                <Library size={10} className="text-violet-400" /> View their books
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}