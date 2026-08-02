import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BookOpen, CheckCircle, Clock, Plus, Loader2, Save, Timer,
    X, Star, ChevronLeft, ChevronRight, RefreshCw, Trash2,
    Edit2, ArrowLeftRight, Sparkles, List, RotateCcw, Target,
    Brain, Coffee, Zap, BookMarked, Tag, SlidersHorizontal,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    getUserBooks, updateBookDetails, deleteBook,
    logReadingSession, fetchPageCount,
} from '../services/bookService';
import AddBookModal from '../components/AddBookModal';
import ReadingSessionModal from '../components/Readingsessionmodal';
import { eventBus, EVENTS } from '../utils/eventBus';
import { logBookCompletion } from '../services/activityService';

// ─── Section definitions ────────────────────────────────────────────────────────
const SECTIONS = [
    {
        id: 'all',
        label: 'All Books',
        emoji: '☰',
        color: 'text-white',
        bg: 'bg-white/10',
        activeBg: 'bg-white/20',
        filter: () => true,
    },
    {
        id: 'best',
        label: 'Best Reads',
        emoji: '🌟',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        activeBg: 'bg-yellow-500/20',
        filter: (b) => (b.rating ?? 0) >= 4,
    },
    {
        id: 'reading',
        label: 'Currently Reading',
        emoji: '📖',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        activeBg: 'bg-blue-500/20',
        filter: (b) => b.status === 'Reading',
    },
    {
        id: 'completed',
        label: 'Completed',
        emoji: '✅',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        activeBg: 'bg-emerald-500/20',
        filter: (b) => b.status === 'Completed',
    },
    {
        id: 'upcoming',
        label: 'To Read Next',
        emoji: '📚',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        activeBg: 'bg-amber-500/20',
        filter: (b) => b.status === 'Want to Read',
    },
    {
        id: 'someday',
        label: 'Someday',
        emoji: '☰',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        activeBg: 'bg-purple-500/20',
        filter: (b) => b.status === 'Re-reading',
    },
];

const STATUS_OPTIONS = [
    { value: 'Reading', label: '📖 Currently Reading' },
    { value: 'Completed', label: '✅ Completed' },
    { value: 'Want to Read', label: '📚 To Read Next' },
    { value: 'Re-reading', label: '☰ Someday (Wishlist)' },
    { value: 'Abandoned', label: '🚫 Half Read' },
];

const READING_INTENTS = [
    { id: 'study', label: 'Study', icon: Brain, color: 'text-blue-400' },
    { id: 'relax', label: 'Relax', icon: Coffee, color: 'text-amber-400' },
    { id: 'research', label: 'Research', icon: Target, color: 'text-purple-400' },
    { id: 'habit', label: 'Habit', icon: Zap, color: 'text-emerald-400' },
];

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ value = 0, onChange, readonly = false, size = 'sm' }) {
    const [hover, setHover] = useState(null);
    const stars = [1, 2, 3, 4, 5];
    const iconSize = size === 'sm' ? 12 : 16;

    const display = hover ?? value;

    return (
        <div
            className="flex items-center gap-0.5"
            onMouseLeave={() => !readonly && setHover(null)}
        >
            {(stars ?? []).map((s) => {
                const full = display >= s;
                const half = !full && display >= s - 0.5;
                return (
                    <button
                        key={s}
                        type="button"
                        disabled={readonly}
                        className={cn('relative transition-transform', !readonly && 'hover:scale-110 cursor-pointer', readonly && 'cursor-default')}
                        onMouseEnter={() => !readonly && setHover(s)}
                        onClick={() => !readonly && onChange && onChange(hover ?? s)}
                    >
                        <Star
                            size={iconSize}
                            className={cn(
                                full ? 'text-yellow-400 fill-yellow-400' :
                                    half ? 'text-yellow-400' : 'text-white/20 fill-transparent',
                            )}
                        />
                    </button>
                );
            })}
            {value > 0 && (
                <span className="text-[10px] text-yellow-400 ml-1 font-medium">
                    {Number(value).toFixed(1)}
                </span>
            )}
        </div>
    );
}

// ─── Move To Modal ────────────────────────────────────────────────────────────
function MoveToModal({ book, onMove, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-base">Move "{book.title.slice(0, 24)}{book.title.length > 24 ? '…' : ''}"</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={16} className="text-text-muted" />
                    </button>
                </div>
                <div className="space-y-2">
                    {STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => onMove(opt.value)}
                            disabled={book.status === opt.value}
                            className={cn(
                                'w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                                book.status === opt.value
                                    ? 'bg-primary/20 text-primary cursor-default'
                                    : 'bg-white/5 hover:bg-white/10 text-white',
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ book, onConfirm, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trash2 className="w-7 h-7 text-red-400" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">Delete Book?</h3>
                    <p className="text-text-muted text-sm">
                        Remove <span className="text-white font-medium">"{book.title}"</span> from your library? This cannot be undone.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Book Card ────────────────────────────────────────────────────────────────
function BookCard({
    book, isFirst, isLast, index, sectionId,
    onMoveLeft, onMoveRight, onMoveTo, onEdit, onDelete,
    onOpenSession, isOpening, isExpanded, draft, onDraftChange,
    onSave, isSaving, onCancelEdit, fetchingPages,
}) {
    const progress = book.total_pages
        ? Math.min(100, Math.round(((book.current_page || 0) / book.total_pages) * 100))
        : (book.progress || 0);

    const isReading = book.status === 'Reading';
    const startDate = book.started_at
        ? new Date(book.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : book.created_at
            ? new Date(book.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null;

    return (
        <div
            className={cn(
                'book-card group relative rounded-t-xl overflow-visible transition-all duration-300',
                isOpening ? 'scale-105 z-50' : '',
                isExpanded ? 'z-40' : 'z-10',
            )}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Book Cover */}
            <div className="aspect-[2/3] overflow-hidden relative rounded-t-xl shadow-lg">
                {book.cover_url ? (
                    <img
                        src={book.cover_url}
                        alt={book.title}
                        className={cn('w-full h-full object-cover transition-all duration-500', isOpening ? 'scale-110 blur-sm' : 'group-hover:scale-105')}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-900/40 to-amber-800/20 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-amber-200/30" />
                    </div>
                )}

                {/* Progress flash strip at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                    <div
                        className={cn('h-full transition-all duration-700', progress > 0 ? 'bg-primary shadow-[0_0_6px_rgba(99,102,241,0.7)]' : 'bg-white/10')}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Opening overlay */}
                {isOpening && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-center animate-pulse">
                            <BookOpen className="w-10 h-10 text-primary mx-auto" />
                            <p className="text-white text-xs mt-1">Opening…</p>
                        </div>
                    </div>
                )}

                {/* Hover actions overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 gap-1">
                    <button
                        onClick={() => onOpenSession(book)}
                        className="w-full py-1.5 bg-primary text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 translate-y-3 group-hover:translate-y-0 transition-transform duration-300"
                    >
                        <Timer size={11} /> Start Reading
                    </button>
                    {/* Reorder row */}
                    <div className="flex gap-1 translate-y-3 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                        <button
                            disabled={isFirst}
                            onClick={() => onMoveLeft(book)}
                            className="flex-1 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-lg text-xs flex items-center justify-center transition-colors"
                        >
                            <ChevronLeft size={12} />
                        </button>
                        <button
                            disabled={isLast}
                            onClick={() => onMoveRight(book)}
                            className="flex-1 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-lg text-xs flex items-center justify-center transition-colors"
                        >
                            <ChevronRight size={12} />
                        </button>
                        <button
                            onClick={() => onMoveTo(book)}
                            className="flex-1 py-1 bg-white/10 hover:bg-emerald-500/30 text-white rounded-lg text-xs flex items-center justify-center transition-colors"
                            title="Move to section"
                        >
                            <RefreshCw size={11} />
                        </button>
                        <button
                            onClick={() => onEdit(book)}
                            className="flex-1 py-1 bg-white/10 hover:bg-blue-500/30 text-white rounded-lg text-xs flex items-center justify-center transition-colors"
                        >
                            <Edit2 size={11} />
                        </button>
                        <button
                            onClick={() => onDelete(book)}
                            className="flex-1 py-1 bg-white/10 hover:bg-red-500/30 text-white rounded-lg text-xs flex items-center justify-center transition-colors"
                        >
                            <Trash2 size={11} />
                        </button>
                    </div>
                </div>

                <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
            </div>

            {/* Info Panel */}
            <div className="bg-surface/95 backdrop-blur-sm border-x border-white/5 px-2 py-2 space-y-1.5">
                <h3 className="font-semibold text-white leading-snug text-xs truncate" title={book.title}>{book.title}</h3>
                <p className="text-[10px] text-text-muted truncate">{book.authors || 'Unknown'}</p>

                {/* Rating */}
                <StarRating value={book.rating ?? 0} readonly size="sm" />

                {/* Progress for Currently Reading */}
                {isReading && (
                    <div className="space-y-1">
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-primary rounded-full reading-progress-bar"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] text-text-muted">
                            <span>{book.current_page || 0}/{book.total_pages || '?'} pg</span>
                            <span className="font-semibold text-blue-400">{progress}%</span>
                        </div>
                        {startDate && (
                            <p className="text-[9px] text-blue-400/70">📅 Started {startDate}</p>
                        )}
                    </div>
                )}

                {/* Mobile controls */}
                <div className="flex gap-1 md:hidden">
                    <button disabled={isFirst} onClick={() => onMoveLeft(book)} className="flex-1 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white rounded text-[9px] flex items-center justify-center">
                        <ChevronLeft size={10} />
                    </button>
                    <button disabled={isLast} onClick={() => onMoveRight(book)} className="flex-1 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white rounded text-[9px] flex items-center justify-center">
                        <ChevronRight size={10} />
                    </button>
                    <button onClick={() => onMoveTo(book)} className="flex-1 py-1 bg-white/5 hover:bg-emerald-500/20 text-white rounded text-[9px] flex items-center justify-center">
                        <RefreshCw size={9} />
                    </button>
                    <button onClick={() => onEdit(book)} className="flex-1 py-1 bg-white/5 hover:bg-blue-500/20 text-white rounded text-[9px] flex items-center justify-center">
                        <Edit2 size={9} />
                    </button>
                    <button onClick={() => onDelete(book)} className="flex-1 py-1 bg-white/5 hover:bg-red-500/20 text-white rounded text-[9px] flex items-center justify-center">
                        <Trash2 size={9} />
                    </button>
                </div>

                {/* Expanded Edit Panel */}
                {isExpanded && draft && (
                    <div className="border-t border-white/10 pt-2 space-y-2 mt-1">
                        {/* Status */}
                        <div>
                            <label className="text-[10px] text-text-secondary font-medium">Status</label>
                            <select
                                value={draft.status}
                                onChange={(e) => onDraftChange({ status: e.target.value })}
                                className="w-full mt-0.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:border-primary/50"
                            >
                                {STATUS_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value} className="bg-background">{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Rating */}
                        <div>
                            <label className="text-[10px] text-text-secondary font-medium">Rating</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="5"
                                    value={draft.rating ?? ''}
                                    onChange={(e) => onDraftChange({ rating: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                    placeholder="4.5"
                                    className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white text-center focus:outline-none focus:border-primary/50"
                                />
                                <span className="text-[10px] text-text-muted">/ 5.0</span>
                                <StarRating value={draft.rating ?? 0} readonly size="sm" />
                            </div>
                        </div>

                        {/* Pages */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-text-secondary font-medium">Current Page</label>
                                <input
                                    type="number"
                                    value={draft.current_page ?? ''}
                                    onChange={(e) => onDraftChange({ current_page: e.target.value })}
                                    className="w-full mt-0.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:border-primary/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-text-secondary font-medium">
                                    Total Pages {fetchingPages && <Loader2 className="inline w-2 h-2 animate-spin ml-1" />}
                                </label>
                                <input
                                    type="number"
                                    value={draft.total_pages ?? ''}
                                    onChange={(e) => onDraftChange({ total_pages: e.target.value })}
                                    className="w-full mt-0.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:border-primary/50"
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="text-[10px] text-text-secondary font-medium">Tags</label>
                            <input
                                type="text"
                                value={draft.tagsInput ?? ''}
                                onChange={(e) => onDraftChange({ tagsInput: e.target.value })}
                                placeholder="fiction, classic…"
                                className="w-full mt-0.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:border-primary/50"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => onSave(book)}
                                disabled={isSaving}
                                className="flex-1 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                            >
                                {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                                Save
                            </button>
                            <button
                                onClick={onCancelEdit}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Library Component ───────────────────────────────────────────────────
export default function Library() {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('all');
    const [books, setBooks] = useState([]);
    const [shelfOrder, setShelfOrder] = useState({}); // sectionId -> bookId[]
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState(null);

    // Edit state
    const [expandedId, setExpandedId] = useState(null);
    const [drafts, setDrafts] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [fetchingPages, setFetchingPages] = useState({});

    // Move & Delete modals
    const [movingBook, setMovingBook] = useState(null);
    const [deletingBook, setDeletingBook] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Reading session
    const [openingBookId, setOpeningBookId] = useState(null);
    const [readingSessionBook, setReadingSessionBook] = useState(null);
    const [showIntentModal, setShowIntentModal] = useState(false);
    const [selectedIntent, setSelectedIntent] = useState(null);

    // Quick-add
    const [quickTitle, setQuickTitle] = useState('');
    const [quickCover, setQuickCover] = useState('');
    const [isQuickAdding, setIsQuickAdding] = useState(false);

    // ── Load books ──────────────────────────────────────────────────────────────
    const loadBooks = useCallback(async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            setError(null);
            const data = await getUserBooks(user.id);
            setBooks(data);
            // Build initial shelf orders per section
            const orders = {};
            SECTIONS.forEach(sec => {
                orders[sec.id] = data.filter(sec.filter).map(b => b.id);
            });
            setShelfOrder(orders);
        } catch (err) {
            setError('Failed to load books.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => { loadBooks(); }, [loadBooks]);

    // ── Get ordered books for active section ────────────────────────────────────
    const section = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

    const sectionBooks = (() => {
        const filtered = books.filter(section.filter);
        const order = shelfOrder[activeSection] || filtered.map(b => b.id);
        const bookMap = Object.fromEntries(filtered.map(b => [b.id, b]));
        return order.filter(id => bookMap[id]).map(id => bookMap[id]);
    })();

    // ── Reorder helpers ─────────────────────────────────────────────────────────
    const swapInSection = (book, direction) => {
        setShelfOrder(prev => {
            const order = [...(prev[activeSection] || sectionBooks.map(b => b.id))];
            const idx = order.indexOf(book.id);
            if (idx < 0) return prev;
            const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= order.length) return prev;
            [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
            return { ...prev, [activeSection]: order };
        });
    };

    // ── Draft helpers ───────────────────────────────────────────────────────────
    const buildDraft = (book) => ({
        status: book.status || 'Want to Read',
        current_page: book.current_page ?? 0,
        total_pages: book.total_pages ?? '',
        rating: book.rating ?? null,
        tagsInput: Array.isArray(book.tags) ? book.tags.filter(t => !['best_read'].includes(t)).join(', ') : '',
    });

    const handleEdit = async (book) => {
        if (expandedId === book.id) {
            setExpandedId(null);
            return;
        }
        setDrafts(prev => ({ ...prev, [book.id]: buildDraft(book) }));
        setExpandedId(book.id);
        // Auto-fetch pages if missing
        if (!book.total_pages) {
            setFetchingPages(prev => ({ ...prev, [book.id]: true }));
            const pages = await fetchPageCount(book.title, book.authors);
            if (pages) setDrafts(prev => ({ ...prev, [book.id]: { ...prev[book.id], total_pages: String(pages) } }));
            setFetchingPages(prev => ({ ...prev, [book.id]: false }));
        }
    };

    const handleDraftChange = (bookId, patch) => {
        setDrafts(prev => ({ ...prev, [bookId]: { ...prev[bookId], ...patch } }));
    };

    const handleSave = async (book) => {
        if (!user) return;
        const draft = drafts[book.id] || buildDraft(book);
        const parsedTotal = parseInt(draft.total_pages, 10);
        const totalPages = Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : null;
        let currentPage = Math.max(0, parseInt(draft.current_page, 10) || 0);
        if (totalPages) currentPage = Math.min(currentPage, totalPages);

        let progress = 0;
        if (totalPages) progress = Math.round((currentPage / totalPages) * 100);
        if (draft.status === 'Completed') { progress = 100; if (totalPages) currentPage = totalPages; }

        const userTags = draft.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const allTags = [...userTags];

        const updates = {
            status: draft.status,
            progress,
            current_page: currentPage,
            total_pages: totalPages,
            tags: allTags,
            rating: draft.rating !== null && draft.rating !== '' ? parseFloat(draft.rating) : null,
        };

        if (draft.status === 'Reading' && !book.started_at) {
            updates.started_at = new Date().toISOString();
        }

        setSavingId(book.id);
        try {
            const { error: updateError } = await updateBookDetails(book.id, updates);
            if (updateError) throw updateError;

            if (draft.status === 'Completed' && book.status !== 'Completed') {
                await logBookCompletion(user.id, book.id, book.title);
            }

            setBooks(prev => prev.map(b => b.id === book.id ? { ...b, ...updates } : b));
            // Update shelf orders for all sections affected
            setShelfOrder(prev => {
                const next = { ...prev };
                SECTIONS.forEach(sec => {
                    const newFiltered = [...books]
                        .map(b => b.id === book.id ? { ...b, ...updates } : b)
                        .filter(sec.filter)
                        .map(b => b.id);
                    const existing = prev[sec.id] || [];
                    // Keep existing order, add new, remove old
                    const kept = existing.filter(id => newFiltered.includes(id));
                    const added = newFiltered.filter(id => !existing.includes(id));
                    next[sec.id] = [...kept, ...added];
                });
                return next;
            });

            eventBus.emit(EVENTS.BOOK_UPDATED, { bookId: book.id, updates });
            eventBus.emit(EVENTS.STATS_REFRESH);
            setExpandedId(null);
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSavingId(null);
        }
    };

    // ── Move between sections ───────────────────────────────────────────────────
    const handleMoveConfirm = async (newStatus) => {
        if (!movingBook) return;
        const updates = { status: newStatus };
        if (newStatus === 'Reading' && !movingBook.started_at) {
            updates.started_at = new Date().toISOString();
        }
        await updateBookDetails(movingBook.id, updates);
        setBooks(prev => prev.map(b => b.id === movingBook.id ? { ...b, ...updates } : b));
        // refresh shelf orders
        setShelfOrder(prev => {
            const next = { ...prev };
            const updatedBooks = books.map(b => b.id === movingBook.id ? { ...b, ...updates } : b);
            SECTIONS.forEach(sec => {
                const filtered = updatedBooks.filter(sec.filter).map(b => b.id);
                const existing = prev[sec.id] || [];
                const kept = existing.filter(id => filtered.includes(id));
                const added = filtered.filter(id => !existing.includes(id));
                next[sec.id] = [...kept, ...added];
            });
            return next;
        });
        eventBus.emit(EVENTS.STATS_REFRESH);
        setMovingBook(null);
    };

    // ── Delete ──────────────────────────────────────────────────────────────────
    const handleDeleteConfirm = async () => {
        if (!deletingBook) return;
        setDeletingId(deletingBook.id);
        await deleteBook(deletingBook.id);
        setBooks(prev => prev.filter(b => b.id !== deletingBook.id));
        setShelfOrder(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { next[k] = next[k].filter(id => id !== deletingBook.id); });
            return next;
        });
        eventBus.emit(EVENTS.STATS_REFRESH);
        setDeletingBook(null);
        setDeletingId(null);
    };

    // ── Quick Add ───────────────────────────────────────────────────────────────
    const handleQuickAdd = async (e) => {
        e.preventDefault();
        if (!quickTitle.trim() || !user) return;
        setIsQuickAdding(true);
        const statusMap = {
            all: 'Want to Read', best: 'Completed', reading: 'Reading',
            completed: 'Completed', upcoming: 'Want to Read', someday: 'Re-reading',
        };
        const status = statusMap[activeSection] || 'Want to Read';
        try {
            const { addBook } = await import('../services/bookService');
            const { data } = await addBook(user.id, {
                title: quickTitle.trim(),
                cover_url: quickCover.trim() || null,
                status,
                progress: 0,
                started_at: status === 'Reading' ? new Date().toISOString() : null,
            });
            if (data) {
                setBooks(prev => [data, ...prev]);
                setShelfOrder(prev => {
                    const next = { ...prev };
                    SECTIONS.forEach(sec => {
                        if (sec.filter(data)) next[sec.id] = [data.id, ...(prev[sec.id] || [])];
                    });
                    return next;
                });
            }
            setQuickTitle('');
            setQuickCover('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsQuickAdding(false);
        }
    };

    // ── Reading session ─────────────────────────────────────────────────────────
    const handleOpenSession = (book) => {
        setOpeningBookId(book.id);
        setTimeout(() => { setShowIntentModal(true); setReadingSessionBook(book); }, 800);
    };

    const handleStartReading = (intent) => {
        setSelectedIntent(intent);
        setShowIntentModal(false);
        setOpeningBookId(null);
    };

    const handleSessionProgressSave = async (progressData) => {
        if (!readingSessionBook) return;
        const nextPage = progressData.currentPage ?? (readingSessionBook.current_page || 0);
        const nextProgress = readingSessionBook.total_pages
            ? Math.min(100, Math.round((nextPage / readingSessionBook.total_pages) * 100))
            : readingSessionBook.progress || 0;
        await updateBookDetails(readingSessionBook.id, { current_page: nextPage, progress: nextProgress });
        setBooks(prev => prev.map(b => b.id === readingSessionBook.id ? { ...b, current_page: nextPage, progress: nextProgress } : b));
        eventBus.emit(EVENTS.STATS_REFRESH);
    };

    const handleSessionComplete = async (sessionData) => {
        if (readingSessionBook) {
            const safePage = sessionData.currentPage ?? (readingSessionBook.current_page || 0);
            const safeProgress = readingSessionBook.total_pages
                ? Math.min(100, Math.round((safePage / readingSessionBook.total_pages) * 100))
                : readingSessionBook.progress || 0;
            await updateBookDetails(readingSessionBook.id, { current_page: safePage, progress: safeProgress });
            setBooks(prev => prev.map(b => b.id === readingSessionBook.id ? { ...b, current_page: safePage, progress: safeProgress } : b));
            eventBus.emit(EVENTS.SESSION_COMPLETED, sessionData);
            eventBus.emit(EVENTS.STATS_REFRESH);
        }
        setReadingSessionBook(null);
        setSelectedIntent(null);
    };

    // ── Wooden shelf rows ───────────────────────────────────────────────────────
    const COLS = typeof window !== 'undefined'
        ? window.innerWidth < 480 ? 2 : window.innerWidth < 768 ? 3 : window.innerWidth < 1024 ? 4 : window.innerWidth < 1280 ? 5 : 6
        : 4;

    const shelves = [];
    for (let i = 0; i < sectionBooks.length; i += COLS) shelves.push(sectionBooks.slice(i, i + COLS));

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-10">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-0.5">My Library</h1>
                    <p className="text-sm text-text-muted">Organise your reading journey</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/wheel"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
                    >
                        <span>🎡</span> Spin the Wheel
                    </Link>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium text-sm shadow-lg shadow-primary/20 transition-all"
                    >
                        <Plus size={16} /> Add Book
                    </button>
                </div>
            </div>

            {/* ── Section Tabs ── */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {SECTIONS.map(sec => (
                    <button
                        key={sec.id}
                        onClick={() => setActiveSection(sec.id)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all',
                            activeSection === sec.id
                                ? `${sec.activeBg} ${sec.color} shadow-md`
                                : `${sec.bg} text-text-secondary hover:text-white hover:bg-white/10`,
                        )}
                    >
                        <span>{sec.emoji}</span>
                        <span>{sec.label}</span>
                        <span className="bg-white/10 rounded-full px-1.5 py-0.5 text-[9px]">
                            {books.filter(sec.filter).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Quick Add ── */}
            <form onSubmit={handleQuickAdd} className="flex gap-2 flex-wrap">
                <input
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    placeholder={`Quick add to ${section.label}…`}
                    className="flex-1 min-w-[160px] px-3 py-2 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50"
                />
                <input
                    value={quickCover}
                    onChange={e => setQuickCover(e.target.value)}
                    placeholder="Cover image URL (optional)"
                    className="flex-1 min-w-[160px] px-3 py-2 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50"
                />
                <button
                    type="submit"
                    disabled={!quickTitle.trim() || isQuickAdding}
                    className="px-4 py-2 bg-primary disabled:opacity-50 hover:bg-primary/90 text-white rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all"
                >
                    {isQuickAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add
                </button>
            </form>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* ── Loading ── */}
            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center space-y-3">
                        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                        <p className="text-text-muted text-sm">Loading your library…</p>
                    </div>
                </div>
            )}

            {/* ── Empty ── */}
            {!isLoading && books.length === 0 && (
                <div className="text-center py-20 px-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Your library is empty</h3>
                    <p className="text-text-muted text-sm mb-6">Start building your collection</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all"
                    >
                        <Plus size={18} /> Add Your First Book
                    </button>
                </div>
            )}

            {/* ── Shelves ── */}
            {!isLoading && sectionBooks.length > 0 && (
                <div className="space-y-0">
                    {shelves.map((shelfBooks, shelfIdx) => (
                        <div key={shelfIdx} className="wooden-shelf-wrapper">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-2 pb-0">
                                {shelfBooks.map((book, bookIdx) => {
                                    const globalIdx = shelfIdx * COLS + bookIdx;
                                    const totalInSection = sectionBooks.length;
                                    return (
                                        <BookCard
                                            key={book.id}
                                            book={book}
                                            index={globalIdx}
                                            sectionId={activeSection}
                                            isFirst={globalIdx === 0}
                                            isLast={globalIdx === totalInSection - 1}
                                            onMoveLeft={(b) => swapInSection(b, 'left')}
                                            onMoveRight={(b) => swapInSection(b, 'right')}
                                            onMoveTo={(b) => setMovingBook(b)}
                                            onEdit={handleEdit}
                                            onDelete={(b) => setDeletingBook(b)}
                                            onOpenSession={handleOpenSession}
                                            isOpening={openingBookId === book.id}
                                            isExpanded={expandedId === book.id}
                                            draft={drafts[book.id] || null}
                                            onDraftChange={(patch) => handleDraftChange(book.id, patch)}
                                            onSave={handleSave}
                                            isSaving={savingId === book.id}
                                            onCancelEdit={() => setExpandedId(null)}
                                            fetchingPages={!!fetchingPages[book.id]}
                                        />
                                    );
                                })}
                            </div>
                            <div className="wooden-shelf" />
                            <div className="shelf-shadow" />
                        </div>
                    ))}
                </div>
            )}

            {/* ── No results in section ── */}
            {!isLoading && books.length > 0 && sectionBooks.length === 0 && (
                <div className="text-center py-16 px-4">
                    <div className="text-4xl mb-3">{section.emoji}</div>
                    <h3 className="text-lg font-bold text-white mb-1">No books in {section.label}</h3>
                    <p className="text-text-muted text-sm">Use the quick-add bar above to add one!</p>
                </div>
            )}

            {/* ── Modals ── */}
            <AddBookModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onBookAdded={loadBooks} />

            {movingBook && (
                <MoveToModal book={movingBook} onMove={handleMoveConfirm} onClose={() => setMovingBook(null)} />
            )}

            {deletingBook && (
                <DeleteModal book={deletingBook} onConfirm={handleDeleteConfirm} onClose={() => setDeletingBook(null)} />
            )}

            {showIntentModal && readingSessionBook && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Brain className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Why are you reading?</h3>
                            <p className="text-text-muted text-sm">Track contextual patterns</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {READING_INTENTS.map(intent => (
                                <button
                                    key={intent.id}
                                    onClick={() => handleStartReading(intent.id)}
                                    className="p-4 rounded-xl border-2 bg-white/5 border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all hover:scale-105"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        {React.createElement(intent.icon, { size: 22, className: intent.color })}
                                        <span className="text-sm font-medium text-white">{intent.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => { setShowIntentModal(false); setOpeningBookId(null); setReadingSessionBook(null); }}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {readingSessionBook && selectedIntent && (
                <ReadingSessionModal
                    book={readingSessionBook}
                    intent={selectedIntent}
                    onProgressSave={handleSessionProgressSave}
                    onClose={() => { setReadingSessionBook(null); setSelectedIntent(null); }}
                    onComplete={handleSessionComplete}
                />
            )}

            {/* ── Styles ── */}
            <style dangerouslySetInnerHTML={{
                __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        .wooden-shelf-wrapper { position: relative; margin-bottom: 10px; }

        .wooden-shelf {
          height: 20px;
          background: linear-gradient(180deg, #8B6914 0%, #A0752E 15%, #6B4E0A 50%, #5C3D08 70%, #4A2F06 100%);
          border-radius: 0 0 6px 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3),
                      inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.3);
          position: relative; z-index: 5;
        }
        .wooden-shelf::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit;
          background: repeating-linear-gradient(90deg, transparent, rgba(255,200,100,0.03) 2px, transparent 4px),
                      repeating-linear-gradient(90deg, transparent, rgba(0,0,0,0.04) 8px, transparent 16px);
        }
        .wooden-shelf::after {
          content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 5px;
          background: linear-gradient(180deg, #5C3D08 0%, #3D2805 100%);
          border-radius: 0 0 4px 4px;
          box-shadow: 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .shelf-shadow {
          height: 12px;
          background: linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 100%);
          margin: 4px 16px 0;
          border-radius: 50%;
        }

        @keyframes book-rise {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .book-card {
          animation: book-rise 0.45s ease-out both;
          transform-origin: bottom center;
          cursor: default;
        }
        .book-card:hover {
          transform: translateY(-10px) scale(1.025);
          z-index: 20 !important;
        }

        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .reading-progress-bar {
          background-size: 200% 100%;
          animation: shimmer 2.5s linear infinite;
          background-image: linear-gradient(90deg, #3b82f6 0%, #818cf8 40%, #3b82f6 60%, #6366f1 100%);
        }
      `}} />
        </div>
    );
}