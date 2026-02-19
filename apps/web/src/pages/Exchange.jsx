import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeftRight, Package, Clock, CheckCircle, XCircle, AlertCircle,
    Send, Loader2, MapPin, Truck, BookOpen, Plus, Eye, ChevronRight,
    X, Check, Ban, Repeat, Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
    getUserExchanges, getExchangeById, createExchangeOffer,
    acceptExchangeOffer, rejectExchangeOffer, cancelExchange,
    sendExchangeMessage, getExchangeMessages,
    subscribeToExchange, subscribeToExchangeMessages, subscribeToUserExchanges
} from '../services/exchangeService';
import { getFriends, getFriendBooks } from '../services/communityService';
import { getUserBooks } from '../services/bookService';
import { cn } from '../lib/utils';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const STATUS_CONFIG = {
    pending:   { label: 'Pending',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',   icon: Clock },
    countered: { label: 'Countered', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',      icon: Repeat },
    accepted:  { label: 'Accepted',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
    rejected:  { label: 'Rejected',  color: 'bg-red-500/10 text-red-400 border-red-500/30',         icon: XCircle },
    expired:   { label: 'Expired',   color: 'bg-slate-500/10 text-slate-400 border-slate-500/30',   icon: AlertCircle },
    completed: { label: 'Completed', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: Package },
    cancelled: { label: 'Cancelled', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30',   icon: Ban },
};

function relTime(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(d).toLocaleDateString();
}

function timeLeft(expiry) {
    const ms = new Date(expiry) - Date.now();
    if (ms < 0) return 'Expired';
    const days = Math.floor(ms / 86400000);
    const hrs = Math.floor((ms % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hrs}h left`;
    if (hrs > 0) return `${hrs}h left`;
    return `${Math.floor(ms / 60000)}m left`;
}

// ═══════════════════════════════════════════════════════════
// NEW EXCHANGE MODAL
// ═══════════════════════════════════════════════════════════

function NewExchangeModal({ isOpen, onClose, onSuccess }) {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [friends, setFriends] = useState([]);
    const [myBooks, setMyBooks] = useState([]);
    const [friendBooks, setFriendBooks] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedFriend, setSelectedFriend] = useState(null);
    const [myBookId, setMyBookId] = useState(null);
    const [theirBookId, setTheirBookId] = useState(null);
    const [deliveryMethod, setDeliveryMethod] = useState('meetup');
    const [meetupLocation, setMeetupLocation] = useState('');
    const [message, setMessage] = useState('');
    const [expiryDays, setExpiryDays] = useState(7);

    useEffect(() => {
        if (isOpen && user) {
            (async () => {
                const flist = await getFriends(user.id);
                setFriends(flist.filter(f => f.status === 'accepted'));
                const books = await getUserBooks(user.id);
                setMyBooks(books);
            })();
        }
    }, [isOpen, user]);

    const handleFriendSelect = async (friend) => {
        setSelectedFriend(friend);
        setLoading(true);
        const books = await getFriendBooks(friend.friend_id);
        setFriendBooks(books);
        setLoading(false);
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!myBookId || !selectedFriend) return;
        setLoading(true);
        const { error } = await createExchangeOffer({
            initiatorId: user.id,
            recipientId: selectedFriend.friend_id,
            initiatorBookId: myBookId,
            recipientBookId: theirBookId,
            message,
            deliveryMethod,
            meetupLocation: deliveryMethod === 'meetup' ? meetupLocation : null,
            expiryDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
        });
        setLoading(false);
        if (!error) {
            onSuccess?.();
            reset();
            onClose();
        }
    };

    const reset = () => {
        setStep(1);
        setSelectedFriend(null);
        setMyBookId(null);
        setTheirBookId(null);
        setDeliveryMethod('meetup');
        setMeetupLocation('');
        setMessage('');
        setExpiryDays(7);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white">Propose Exchange</h2>
                        <p className="text-xs text-text-muted mt-0.5">Step {step} of 4</p>
                    </div>
                    <button onClick={() => { reset(); onClose(); }} className="p-2 hover:bg-white/5 rounded-lg">
                        <X size={18} className="text-text-muted" />
                    </button>
                </div>

                <div className="flex gap-2 px-6 py-3 bg-white/[0.02]">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={cn('flex-1 h-1 rounded-full', s <= step ? 'bg-primary' : 'bg-white/10')} />
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {step === 1 && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-white mb-4">Select a friend</h3>
                            {friends.length === 0 ? (
                                <p className="text-center text-text-muted py-12">No friends. Add friends first!</p>
                            ) : friends.map(f => (
                                <button key={f.friend_id} onClick={() => handleFriendSelect(f)}
                                    className="w-full flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-primary/40 rounded-xl transition-all text-left">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                                        {(f.username || f.email)?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white text-sm truncate">{f.username || 'Friend'}</p>
                                        <p className="text-xs text-text-muted truncate">{f.email}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-text-muted" />
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-white">Which book will you give?</h3>
                                <button onClick={() => setStep(1)} className="text-xs text-text-muted hover:text-white">← Back</button>
                            </div>
                            {myBooks.length === 0 ? (
                                <p className="text-center text-text-muted py-12">No books in library</p>
                            ) : myBooks.map(b => (
                                <button key={b.id} onClick={() => { setMyBookId(b.id); setStep(3); }}
                                    className={cn('w-full flex items-center gap-3 p-3 border rounded-xl transition-all text-left',
                                        myBookId === b.id ? 'bg-primary/10 border-primary/40' : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.07]')}>
                                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                        {b.cover_url ? <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-text-muted" /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white text-sm truncate">{b.title}</p>
                                        <p className="text-xs text-text-muted truncate">{b.authors || 'Unknown'}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-text-muted" />
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-white">Which book do you want?</h3>
                                <button onClick={() => setStep(2)} className="text-xs text-text-muted hover:text-white">← Back</button>
                            </div>
                            <p className="text-xs text-text-muted mb-4">Optional — leave blank to let them choose</p>
                            <button onClick={() => { setTheirBookId(null); setStep(4); }}
                                className="w-full p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-primary/40 rounded-xl text-sm text-text-muted text-left">
                                Let them choose →
                            </button>
                            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                                : friendBooks.length === 0 ? <p className="text-center text-text-muted py-12">No books</p>
                                : friendBooks.map(b => (
                                    <button key={b.id} onClick={() => { setTheirBookId(b.id); setStep(4); }}
                                        className={cn('w-full flex items-center gap-3 p-3 border rounded-xl transition-all text-left',
                                            theirBookId === b.id ? 'bg-primary/10 border-primary/40' : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.07]')}>
                                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                            {b.cover_url ? <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-text-muted" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white text-sm truncate">{b.title}</p>
                                            <p className="text-xs text-text-muted truncate">{b.authors || 'Unknown'}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-text-muted" />
                                    </button>
                                ))}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-white">Details</h3>
                                <button onClick={() => setStep(3)} className="text-xs text-text-muted hover:text-white">← Back</button>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-text-secondary block mb-2">Delivery Method</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['meetup', 'courier', 'post'].map(m => (
                                        <button key={m} onClick={() => setDeliveryMethod(m)}
                                            className={cn('p-3 rounded-lg border text-sm font-medium transition-all',
                                                deliveryMethod === m ? 'bg-primary/20 border-primary text-primary' : 'bg-white/[0.03] border-white/10 text-text-muted hover:border-primary/40')}>
                                            {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {deliveryMethod === 'meetup' && (
                                <div>
                                    <label className="text-sm font-medium text-text-secondary block mb-2">Location</label>
                                    <input type="text" value={meetupLocation} onChange={e => setMeetupLocation(e.target.value)}
                                        placeholder="e.g., Central Library"
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-text-muted outline-none focus:border-primary/50" />
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-text-secondary block mb-2">Valid For</label>
                                <select value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white outline-none focus:border-primary/50">
                                    <option value={1}>1 day</option>
                                    <option value={3}>3 days</option>
                                    <option value={7}>7 days</option>
                                    <option value={14}>14 days</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-text-secondary block mb-2">Message (Optional)</label>
                                <textarea value={message} onChange={e => setMessage(e.target.value)}
                                    placeholder="Say something..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-text-muted outline-none focus:border-primary/50 resize-none" />
                            </div>
                        </div>
                    )}
                </div>

                {step === 4 && (
                    <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                        <button onClick={() => { reset(); onClose(); }}
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={loading || !myBookId}
                            className={cn('flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2',
                                myBookId && !loading ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25' : 'bg-white/5 text-text-muted cursor-not-allowed')}>
                            {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send Offer'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// DETAIL MODAL
// ═══════════════════════════════════════════════════════════

function ExchangeDetailModal({ exchangeId, isOpen, onClose, onUpdate }) {
    const { user } = useAuth();
    const [exchange, setExchange] = useState(null);
    const [messages, setMessages] = useState([]);
    const [msgDraft, setMsgDraft] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!exchangeId) return;
        const data = await getExchangeById(exchangeId);
        setExchange(data);
        const msgs = await getExchangeMessages(exchangeId);
        setMessages(msgs);
        setLoading(false);
    }, [exchangeId]);

    useEffect(() => {
        if (isOpen && exchangeId) {
            load();
            const ch1 = subscribeToExchange(exchangeId, load);
            const ch2 = subscribeToExchangeMessages(exchangeId, msg => setMessages(p => [...p, msg]));
            return () => { ch1?.unsubscribe(); ch2?.unsubscribe(); };
        }
    }, [isOpen, exchangeId, load]);

    const isInitiator = exchange?.initiator_id === user?.id;

    const handleAccept = async () => { await acceptExchangeOffer(exchangeId, user.id); load(); onUpdate?.(); };
    const handleReject = async () => { await rejectExchangeOffer(exchangeId); load(); onUpdate?.(); };
    const handleCancel = async () => { await cancelExchange(exchangeId); load(); onUpdate?.(); };
    const sendMsg = async () => { if (!msgDraft.trim()) return; await sendExchangeMessage(exchangeId, user.id, msgDraft); setMsgDraft(''); };

    if (!isOpen || !exchange) return null;

    const cfg = STATUS_CONFIG[exchange.status] || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Exchange Details</h2>
                        <p className="text-xs text-text-muted mt-0.5">Created {relTime(exchange.created_at)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
                        <X size={18} className="text-text-muted" />
                    </button>
                </div>

                <div className="px-6 py-3 bg-white/[0.02] flex items-center justify-between">
                    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border', cfg.color)}>
                        {cfg.icon && React.createElement(cfg.icon, { size: 14 })}
                        {cfg.label}
                    </div>
                    {exchange.expiry_date && exchange.status === 'pending' && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                            <Clock size={12} />
                            {timeLeft(exchange.expiry_date)}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <p className="text-xs text-text-muted">From {isInitiator ? 'You' : exchange.initiator?.username}</p>
                            <div className="flex gap-3 p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                                <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                    {exchange.initiator_book?.cover_url
                                        ? <img src={exchange.initiator_book.cover_url} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-text-muted" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white text-sm line-clamp-2">{exchange.initiator_book?.title}</p>
                                    <p className="text-xs text-text-muted truncate">{exchange.initiator_book?.authors}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs text-text-muted">To {isInitiator ? exchange.recipient?.username : 'You'}</p>
                            {exchange.recipient_book ? (
                                <div className="flex gap-3 p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                        {exchange.recipient_book.cover_url
                                            ? <img src={exchange.recipient_book.cover_url} alt="" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-text-muted" /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white text-sm line-clamp-2">{exchange.recipient_book.title}</p>
                                        <p className="text-xs text-text-muted truncate">{exchange.recipient_book.authors}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-white/[0.03] border border-dashed border-white/[0.07] rounded-xl text-center">
                                    <p className="text-xs text-text-muted">Your choice</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {exchange.delivery_method && (
                        <div className="p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                {exchange.delivery_method === 'meetup' && <MapPin size={14} className="text-emerald-400" />}
                                {exchange.delivery_method === 'courier' && <Truck size={14} className="text-blue-400" />}
                                {exchange.delivery_method === 'post' && <Package size={14} className="text-purple-400" />}
                                <span className="text-sm font-medium text-white">{exchange.delivery_method.charAt(0).toUpperCase() + exchange.delivery_method.slice(1)}</span>
                            </div>
                            {exchange.meetup_location && <p className="text-xs text-text-muted">{exchange.meetup_location}</p>}
                        </div>
                    )}

                    {(exchange.initiator_message || exchange.recipient_message) && (
                        <div>
                            <p className="text-sm font-semibold text-white mb-3">Messages</p>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {exchange.initiator_message && (
                                    <div className="p-3 bg-white/[0.03] border border-white/[0.07] rounded-lg">
                                        <p className="text-xs text-text-muted mb-1">{exchange.initiator?.username}:</p>
                                        <p className="text-sm text-white">{exchange.initiator_message}</p>
                                    </div>
                                )}
                                {exchange.recipient_message && (
                                    <div className="p-3 bg-white/[0.03] border border-white/[0.07] rounded-lg">
                                        <p className="text-xs text-text-muted mb-1">{exchange.recipient?.username}:</p>
                                        <p className="text-sm text-white">{exchange.recipient_message}</p>
                                    </div>
                                )}
                                {messages.map(m => (
                                    <div key={m.id} className="p-3 bg-white/[0.03] border border-white/[0.07] rounded-lg">
                                        <p className="text-xs text-text-muted mb-1">{m.sender_id === user.id ? 'You' : 'Them'} · {relTime(m.created_at)}</p>
                                        <p className="text-sm text-white">{m.message}</p>
                                    </div>
                                ))}
                            </div>

                            {exchange.status === 'accepted' && (
                                <div className="mt-3 flex gap-2">
                                    <input type="text" value={msgDraft} onChange={e => setMsgDraft(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') sendMsg(); }}
                                        placeholder="Send a message..."
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-text-muted outline-none focus:border-primary/50" />
                                    <button onClick={sendMsg} disabled={!msgDraft.trim()}
                                        className="p-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Send size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                    {exchange.status === 'pending' && !isInitiator && (
                        <>
                            <button onClick={handleReject}
                                className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg font-medium">
                                Reject
                            </button>
                            <button onClick={handleAccept}
                                className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg font-medium">
                                Accept
                            </button>
                        </>
                    )}
                    {exchange.status === 'pending' && isInitiator && (
                        <button onClick={handleCancel}
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium">
                            Cancel Offer
                        </button>
                    )}
                    {['rejected', 'expired', 'completed', 'cancelled'].includes(exchange.status) && (
                        <button onClick={onClose}
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium">
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

export default function Exchange() {
    const { user } = useAuth();
    const [exchanges, setExchanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [newModalOpen, setNewModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedExchangeId, setSelectedExchangeId] = useState(null);

    const loadExchanges = useCallback(async () => {
        if (!user) return;
        const data = await getUserExchanges(user.id);
        setExchanges(data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        loadExchanges();
        const ch = subscribeToUserExchanges(user?.id, loadExchanges);
        return () => ch?.unsubscribe?.();
    }, [user, loadExchanges]);

    const filtered = exchanges.filter(ex => {
        if (filter === 'sent') return ex.initiator_id === user.id;
        if (filter === 'received') return ex.recipient_id === user.id;
        if (filter === 'active') return ['pending', 'countered', 'accepted'].includes(ex.status);
        return true;
    });

    const stats = {
        active: exchanges.filter(e => ['pending', 'countered', 'accepted'].includes(e.status)).length,
        completed: exchanges.filter(e => e.status === 'completed').length,
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Book Exchange</h1>
                    <p className="text-sm text-text-muted mt-1">Trade books with friends</p>
                </div>
                <button onClick={() => setNewModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/25">
                    <Plus size={18} />
                    Propose Exchange
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Active', value: stats.active, color: 'from-amber-500/20 to-amber-500/5 border-amber-500/30' },
                    { label: 'Completed', value: stats.completed, color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30' },
                    { label: 'Sent', value: exchanges.filter(e => e.initiator_id === user.id).length, color: 'from-blue-500/20 to-blue-500/5 border-blue-500/30' },
                    { label: 'Received', value: exchanges.filter(e => e.recipient_id === user.id).length, color: 'from-purple-500/20 to-purple-500/5 border-purple-500/30' },
                ].map(s => (
                    <div key={s.label} className={cn('bg-gradient-to-br border rounded-xl p-4 text-center', s.color)}>
                        <div className="text-2xl font-bold text-white">{s.value}</div>
                        <div className="text-xs text-text-muted mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 flex-wrap">
                {['all', 'active', 'sent', 'received'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all',
                            filter === f ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white border border-white/10')}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <ArrowLeftRight className="w-8 h-8 text-text-muted" />
                        </div>
                        <p className="text-white font-semibold mb-1">No exchanges yet</p>
                        <p className="text-text-muted text-sm mb-4">Start trading books with friends</p>
                        <button onClick={() => setNewModalOpen(true)}
                            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium">
                            Propose Exchange
                        </button>
                    </div>
                ) : filtered.map(ex => {
                    const cfg = STATUS_CONFIG[ex.status] || {};
                    const isInitiator = ex.initiator_id === user.id;
                    const otherPerson = isInitiator ? ex.recipient : ex.initiator;

                    return (
                        <button key={ex.id} onClick={() => { setSelectedExchangeId(ex.id); setDetailModalOpen(true); }}
                            className="w-full flex items-center gap-4 p-4 bg-surface hover:bg-white/[0.04] border border-white/10 hover:border-primary/40 rounded-2xl transition-all text-left">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                    {ex.initiator_book?.cover_url ? <img src={ex.initiator_book.cover_url} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-text-muted" /></div>}
                                </div>
                                <ArrowLeftRight size={16} className="text-text-muted" />
                                <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                    {ex.recipient_book?.cover_url ? <img src={ex.recipient_book.cover_url} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted">?</div>}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-white text-sm truncate">
                                        {isInitiator ? `To ${otherPerson?.username || 'Friend'}` : `From ${otherPerson?.username || 'Friend'}`}
                                    </p>
                                    <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border', cfg.color)}>
                                        {cfg.icon && React.createElement(cfg.icon, { size: 10 })}
                                        {cfg.label}
                                    </div>
                                </div>
                                <p className="text-xs text-text-muted">{relTime(ex.created_at)}</p>
                            </div>
                            <Eye size={16} className="text-text-muted" />
                        </button>
                    );
                })}
            </div>

            <NewExchangeModal isOpen={newModalOpen} onClose={() => setNewModalOpen(false)} onSuccess={loadExchanges} />
            <ExchangeDetailModal exchangeId={selectedExchangeId} isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} onUpdate={loadExchanges} />
        </div>
    );
}