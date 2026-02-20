import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, Plus, Loader2, Tag, SlidersHorizontal, Save, Play, Timer, Pause, ChevronRight, X, Target, Brain, BookMarked, Coffee, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { getUserBooks, updateBookDetails, logReadingSession } from '../services/bookService';
import AddBookModal from '../components/AddBookModal';
import ReadingSessionModal from '../components/ReadingSessionModal';
import { eventBus, EVENTS } from '../utils/eventBus';

// System tags for book states
const SYSTEM_TAGS = {
    'reading_now': { label: 'Reading Now', color: 'bg-blue-500/20 text-blue-400', icon: BookOpen },
    'want_to_read': { label: 'Want to Read', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
    'finished': { label: 'Finished', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
    'abandoned': { label: 'Abandoned', color: 'bg-slate-500/20 text-slate-400', icon: X },
    're_reading': { label: 'Re-reading', color: 'bg-purple-500/20 text-purple-400', icon: BookMarked },
};

// Reading intent options
const READING_INTENTS = [
    { id: 'study', label: 'Study', icon: Brain, color: 'text-blue-400' },
    { id: 'relax', label: 'Relax', icon: Coffee, color: 'text-amber-400' },
    { id: 'research', label: 'Research', icon: Target, color: 'text-purple-400' },
    { id: 'habit', label: 'Habit', icon: Zap, color: 'text-emerald-400' },
];

const statusConfig = {
    'Reading': { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: BookOpen, systemTag: 'reading_now' },
    'Completed': { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle, systemTag: 'finished' },
    'Want to Read': { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock, systemTag: 'want_to_read' },
    'Abandoned': { color: 'text-slate-400', bg: 'bg-slate-400/10', icon: X, systemTag: 'abandoned' },
    'Re-reading': { color: 'text-purple-400', bg: 'bg-purple-400/10', icon: BookMarked, systemTag: 're_reading' },
};

export default function Library() {
    const { user } = useAuth();
    const [filter, setFilter] = useState('All');
    const [books, setBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [drafts, setDrafts] = useState({});
    const [savingId, setSavingId] = useState(null);

    // Reading session states
    const [openingBookId, setOpeningBookId] = useState(null);
    const [readingSessionBook, setReadingSessionBook] = useState(null);
    const [showIntentModal, setShowIntentModal] = useState(false);
    const [selectedIntent, setSelectedIntent] = useState(null);

    const loadBooks = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            setError(null);
            const data = await getUserBooks(user.id);
            setBooks(data);
        } catch (err) {
            console.error('Error loading books:', err);
            setError('Failed to load books. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBooks();
    }, [user]);

    const handleBookAdded = () => {
        loadBooks();
    };

    const buildDraft = (book) => ({
        status: book.status || 'Want to Read',
        current_page: book.current_page ?? 0,
        total_pages: book.total_pages ?? '',
        tagsInput: Array.isArray(book.tags) ? book.tags.filter(tag => !Object.keys(SYSTEM_TAGS).includes(tag)).join(', ') : '',
        systemTag: book.status ? statusConfig[book.status]?.systemTag : 'want_to_read',
    });

    const ensureDraft = (book) => {
        setDrafts(prev => (prev[book.id] ? prev : { ...prev, [book.id]: buildDraft(book) }));
    };

    const updateDraft = (bookId, patch) => {
        setDrafts(prev => ({ ...prev, [bookId]: { ...prev[bookId], ...patch } }));
    };

    const parseTags = (input) => input
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

    const handleSaveDetails = async (book) => {
        if (!user) return;

        const draft = drafts[book.id] || buildDraft(book);
        const parsedTotal = parseInt(draft.total_pages);
        const totalPages = Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : null;
        let parsedCurrent = parseInt(draft.current_page);
        if (!Number.isFinite(parsedCurrent)) {
            parsedCurrent = book.current_page || 0;
        }
        const maxPages = totalPages || book.total_pages;
        let currentPage = Math.max(0, parsedCurrent);
        if (maxPages) {
            currentPage = Math.min(currentPage, maxPages);
        }

        let progress = book.progress || 0;
        if (maxPages) {
            progress = Math.min(100, Math.round((currentPage / maxPages) * 100));
        }
        if (draft.status === 'Completed') {
            progress = 100;
            if (maxPages) currentPage = maxPages;
        }

        // Combine user tags with system tag
        const userTags = parseTags(draft.tagsInput);
        const systemTag = draft.systemTag || statusConfig[draft.status]?.systemTag || 'want_to_read';
        const allTags = [systemTag, ...userTags];

        const updates = {
            status: draft.status,
            progress,
            current_page: currentPage,
            total_pages: totalPages,
            tags: allTags,
        };

        setSavingId(book.id);
        try {
            const { error: updateError } = await updateBookDetails(book.id, updates);
            if (updateError) {
                throw updateError;
            }

            if (currentPage > (book.current_page || 0)) {
                const { error: sessionError } = await logReadingSession(user.id, book.id, 0, currentPage - (book.current_page || 0));
                if (sessionError) {
                    console.error('Failed to log session from manual page update:', sessionError);
                }
            }

            setBooks(prev => prev.map(b => b.id === book.id ? { ...b, ...updates } : b));
            eventBus.emit(EVENTS.BOOK_UPDATED, { bookId: book.id, updates });
            eventBus.emit(EVENTS.STATS_REFRESH);
            setExpandedId(null);
        } catch (err) {
            console.error('Failed to update book details:', err);
        } finally {
            setSavingId(null);
        }
    };

    // Handle book opening animation
    const handleOpenBook = (book) => {
        setOpeningBookId(book.id);

        // Show opening animation
        setTimeout(() => {
            setShowIntentModal(true);
            setReadingSessionBook(book);
        }, 800);
    };

    // Handle intent selection and start reading
    const handleStartReading = (intent) => {
        setSelectedIntent(intent);
        setShowIntentModal(false);
        setOpeningBookId(null);
        // ReadingSessionModal will handle the actual session
    };

    const handleSessionProgressSave = async (progressData) => {
        if (!readingSessionBook) return;

        const nextCurrentPage = Number.isFinite(progressData.currentPage)
            ? progressData.currentPage
            : (readingSessionBook.current_page || 0);
        if (nextCurrentPage === (readingSessionBook.current_page || 0)) return;

        const nextProgress = readingSessionBook.total_pages
            ? Math.min(100, Math.round((nextCurrentPage / readingSessionBook.total_pages) * 100))
            : (readingSessionBook.progress || 0);

        try {
            const { error: updateError } = await updateBookDetails(readingSessionBook.id, {
                current_page: nextCurrentPage,
                progress: nextProgress,
            });

            if (updateError) {
                console.error('Failed to save live progress:', updateError);
                return;
            }

            setReadingSessionBook(prev => (
                prev && prev.id === readingSessionBook.id
                    ? { ...prev, current_page: nextCurrentPage, progress: nextProgress }
                    : prev
            ));
            setBooks(prev => prev.map(b => (
                b.id === readingSessionBook.id
                    ? { ...b, current_page: nextCurrentPage, progress: nextProgress }
                    : b
            )));

            eventBus.emit(EVENTS.BOOK_UPDATED, {
                bookId: readingSessionBook.id,
                currentPage: nextCurrentPage,
                progress: nextProgress,
                source: 'session_progress',
            });
            eventBus.emit(EVENTS.STATS_REFRESH);
        } catch (err) {
            console.error('Failed to update live reading progress:', err);
        }
    };

    // Handle session completion
    const handleSessionComplete = async (sessionData) => {
        // Update book progress
        if (readingSessionBook) {
            const safeCurrentPage = Number.isFinite(sessionData.currentPage)
                ? sessionData.currentPage
                : (readingSessionBook.current_page || 0) + Math.max(0, sessionData.pagesRead || 0);
            const updatedBook = {
                ...readingSessionBook,
                current_page: safeCurrentPage,
            };

            if (updatedBook.total_pages) {
                updatedBook.progress = Math.min(100, Math.round((updatedBook.current_page / updatedBook.total_pages) * 100));
            }

            const { error: updateError } = await updateBookDetails(updatedBook.id, {
                current_page: updatedBook.current_page,
                progress: updatedBook.progress,
            });

            if (updateError) {
                console.error('Failed to finalize book progress after session:', updateError);
            }

            setBooks(prev => prev.map(b =>
                b.id === updatedBook.id ? updatedBook : b
            ));

            eventBus.emit(EVENTS.BOOK_UPDATED, {
                bookId: updatedBook.id,
                currentPage: updatedBook.current_page,
                progress: updatedBook.progress,
                source: 'session_complete',
            });
        }

        // Emit event to update stats
        console.log('🎉 Session completed - emitting event');
        eventBus.emit(EVENTS.SESSION_COMPLETED, sessionData);
        eventBus.emit(EVENTS.STATS_REFRESH);

        setReadingSessionBook(null);
        setSelectedIntent(null);
    };

    const filteredBooks = filter === 'All' ? books : books.filter(b => b.status === filter);

    // Get system tag for a book
    const getSystemTag = (book) => {
        if (!book.tags || !Array.isArray(book.tags)) return null;
        return book.tags.find(tag => Object.keys(SYSTEM_TAGS).includes(tag));
    };

    // Get user tags (non-system tags)
    const getUserTags = (book) => {
        if (!book.tags || !Array.isArray(book.tags)) return [];
        return book.tags.filter(tag => !Object.keys(SYSTEM_TAGS).includes(tag));
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
                    <p className="text-text-muted">Track your reading journey with time, effort, and context.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2 p-1 bg-surface rounded-xl border border-white/5 w-fit overflow-x-auto scrollbar-hide">
                        {['All', 'Reading', 'Want to Read', 'Completed', 'Re-reading'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                                    filter === tab
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-text-secondary hover:text-white hover:bg-white/5"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
                    >
                        <Plus size={20} />
                        Add Book
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                        <p className="text-text-muted">Loading your library...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && books.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Your library is empty</h3>
                    <p className="text-text-muted mb-6">Start building your collection by adding your first book</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all"
                    >
                        <Plus size={20} />
                        Add Your First Book
                    </button>
                </div>
            )}

            {/* Books Grid */}
            {!isLoading && filteredBooks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {filteredBooks.map((book) => {
                        const StatusIcon = statusConfig[book.status]?.icon || BookOpen;
                        const draft = drafts[book.id] || buildDraft(book);
                        const isExpanded = expandedId === book.id;
                        const isOpening = openingBookId === book.id;
                        const totalPagesDisplay = book.total_pages || '?';
                        const computedProgress = book.total_pages
                            ? Math.min(100, Math.round(((book.current_page || 0) / book.total_pages) * 100))
                            : (book.progress || 0);
                        const progressValue = Number.isFinite(computedProgress) ? computedProgress : 0;
                        const parsedMaxPages = parseInt(draft.total_pages);
                        const maxPages = Number.isFinite(parsedMaxPages) && parsedMaxPages > 0
                            ? parsedMaxPages
                            : (book.total_pages || 100);
                        const draftCurrent = Number.isFinite(parseInt(draft.current_page))
                            ? parseInt(draft.current_page)
                            : (book.current_page || 0);

                        const systemTag = getSystemTag(book);
                        const userTags = getUserTags(book);

                        return (
                            <div
                                key={book.id}
                                className={cn(
                                    "group relative bg-surface rounded-2xl overflow-hidden border border-white/5 transition-all duration-200",
                                    "hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2",
                                    "hover:border-primary/50",
                                    isOpening
                                        ? "scale-105 shadow-2xl shadow-primary/30 z-50"
                                        : ""
                                )}
                                style={{
                                    transformStyle: 'preserve-3d',
                                    transition: 'all 0.2s ease-out'
                                }}
                                onMouseMove={(e) => {
                                    if (isOpening) return;
                                    const card = e.currentTarget;
                                    const rect = card.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    const centerX = rect.width / 2;
                                    const centerY = rect.height / 2;
                                    const rotateX = (y - centerY) / 20;
                                    const rotateY = (centerX - x) / 20;

                                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
                                }}
                                onMouseLeave={(e) => {
                                    if (isOpening) return;
                                    e.currentTarget.style.transform = '';
                                }}
                            >
                                <div className="aspect-[2/3] overflow-hidden relative">
                                    {book.cover_url ? (
                                        <img
                                            src={book.cover_url}
                                            alt={book.title}
                                            className={cn(
                                                "w-full h-full object-cover transition-all duration-500",
                                                isOpening ? "scale-110 blur-sm" : "group-hover:scale-105"
                                            )}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                            <BookOpen className="w-12 h-12 text-text-muted" />
                                        </div>
                                    )}

                                    {/* Progress bar under cover */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-500",
                                                progressValue > 0 ? "bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" : "bg-white/20"
                                            )}
                                            style={{ width: `${progressValue}%` }}
                                        />
                                    </div>

                                    {/* Opening animation overlay */}
                                    {isOpening && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-fade-in">
                                            <div className="text-center space-y-2 animate-pulse">
                                                <BookOpen className="w-12 h-12 text-primary mx-auto" />
                                                <p className="text-white font-medium">Opening...</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                        <button
                                            onClick={() => handleOpenBook(book)}
                                            className="w-full py-2 bg-primary text-white font-semibold rounded-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 hover:bg-primary/90 text-center flex items-center justify-center gap-2"
                                        >
                                            <Timer size={16} />
                                            Start Reading
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 space-y-3">
                                    {/* System Tag Badge */}
                                    {systemTag && SYSTEM_TAGS[systemTag] && (
                                        <div className={cn(
                                            "flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-xs font-medium",
                                            SYSTEM_TAGS[systemTag].color
                                        )}>
                                            {React.createElement(SYSTEM_TAGS[systemTag].icon, { size: 10 })}
                                            {SYSTEM_TAGS[systemTag].label}
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white leading-tight truncate" title={book.title}>{book.title}</h3>
                                            <p className="text-sm text-text-muted truncate">{book.authors || 'Unknown Author'}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                ensureDraft(book);
                                                setExpandedId(isExpanded ? null : book.id);
                                            }}
                                            className={cn(
                                                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0",
                                                isExpanded
                                                    ? "bg-primary/20 text-primary"
                                                    : "bg-white/5 text-text-secondary hover:text-white hover:bg-white/10"
                                            )}
                                            title="Edit Options"
                                        >
                                            <SlidersHorizontal size={12} />
                                            Edit
                                        </button>
                                    </div>

                                    {/* User Tags */}
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <Tag size={12} />
                                        {userTags.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {userTags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-text-secondary">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {userTags.length > 3 && (
                                                    <span className="text-[10px] text-text-muted">+{userTags.length - 3}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-text-muted">No tags yet</span>
                                        )}
                                    </div>

                                    {/* Progress Stats */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-text-muted">
                                            <span>{book.current_page || 0} / {totalPagesDisplay} pages</span>
                                            <span className="font-semibold">{progressValue}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-700 ease-out",
                                                    progressValue === 100
                                                        ? "bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse-glow"
                                                        : "bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.4)]"
                                                )}
                                                style={{ width: `${progressValue}%` }}
                                            />
                                        </div>
                                        {progressValue === 100 && (
                                            <div className="text-xs text-emerald-400 font-semibold animate-fade-in flex items-center gap-1">
                                                <CheckCircle size={12} />
                                                Completed!
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenBook(book)}
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors"
                                        >
                                            <Timer size={14} />
                                            Start Timer
                                        </button>
                                    </div>

                                    {/* Expanded Edit Section */}
                                    {isExpanded && (
                                        <div className="mt-2 border-t border-white/10 pt-3 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-text-secondary">Status</label>
                                                    <select
                                                        value={draft.status}
                                                        onChange={(e) => {
                                                            const newStatus = e.target.value;
                                                            const newSystemTag = statusConfig[newStatus]?.systemTag;
                                                            updateDraft(book.id, {
                                                                status: newStatus,
                                                                systemTag: newSystemTag
                                                            });
                                                        }}
                                                        className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary/50"
                                                    >
                                                        {['Reading', 'Want to Read', 'Completed', 'Re-reading', 'Abandoned'].map(status => (
                                                            <option key={status} value={status} className="bg-background text-white">
                                                                {status}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-text-secondary">Total Pages</label>
                                                    <input
                                                        type="number"
                                                        value={draft.total_pages}
                                                        onChange={(e) => updateDraft(book.id, { total_pages: e.target.value })}
                                                        placeholder="e.g. 320"
                                                        className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary/50"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-text-secondary">Pages Read</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={maxPages}
                                                    value={draftCurrent}
                                                    onChange={(e) => updateDraft(book.id, { current_page: e.target.value })}
                                                    className="w-full accent-primary"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={draft.current_page}
                                                        onChange={(e) => updateDraft(book.id, { current_page: e.target.value })}
                                                        className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-center focus:outline-none focus:border-primary/50"
                                                    />
                                                    <span className="text-xs text-text-muted">/ {maxPages} pages</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-text-secondary">Intent Tags (Context)</label>
                                                <input
                                                    type="text"
                                                    value={draft.tagsInput}
                                                    onChange={(e) => updateDraft(book.id, { tagsInput: e.target.value })}
                                                    placeholder="exam, self-growth, slow-read"
                                                    className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary/50"
                                                />
                                                <p className="text-[10px] text-text-muted">Add context tags (not genres). Separate with commas.</p>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveDetails(book)}
                                                    disabled={savingId === book.id}
                                                    className={cn(
                                                        "flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                                                        savingId === book.id
                                                            ? "bg-white/5 text-text-muted cursor-not-allowed"
                                                            : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                                                    )}
                                                >
                                                    <Save size={14} />
                                                    Save Changes
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDrafts(prev => ({ ...prev, [book.id]: buildDraft(book) }));
                                                        setExpandedId(null);
                                                    }}
                                                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* No results for filter */}
            {!isLoading && books.length > 0 && filteredBooks.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-text-muted">No books found with status "{filter}"</p>
                </div>
            )}

            {/* Add Book Modal */}
            <AddBookModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onBookAdded={handleBookAdded}
            />

            {/* Reading Intent Modal */}
            {showIntentModal && readingSessionBook && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Brain className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Why are you reading today?</h3>
                            <p className="text-sm text-text-muted">This helps track contextual reading patterns</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {READING_INTENTS.map((intent) => (
                                <button
                                    key={intent.id}
                                    onClick={() => handleStartReading(intent.id)}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all hover:scale-105",
                                        "bg-white/5 border-white/10 hover:border-primary/50 hover:bg-white/10"
                                    )}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        {React.createElement(intent.icon, {
                                            size: 24,
                                            className: intent.color
                                        })}
                                        <span className="text-sm font-medium text-white">{intent.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                setShowIntentModal(false);
                                setOpeningBookId(null);
                                setReadingSessionBook(null);
                            }}
                            className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Reading Session Modal */}
            {readingSessionBook && selectedIntent && (
                <ReadingSessionModal
                    book={readingSessionBook}
                    intent={selectedIntent}
                    onProgressSave={handleSessionProgressSave}
                    onClose={() => {
                        setReadingSessionBook(null);
                        setSelectedIntent(null);
                    }}
                    onComplete={handleSessionComplete}
                />
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scale-in {
                    from { 
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to { 
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes pulse-glow {
                    0%, 100% { 
                        box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);
                    }
                    50% { 
                        box-shadow: 0 0 20px rgba(16, 185, 129, 1);
                    }
                }
                @keyframes book-open {
                    0% {
                        transform: scale(1);
                        border-radius: 1rem;
                    }
                    50% {
                        transform: scale(1.1) translateZ(50px);
                        border-radius: 0.5rem;
                    }
                    100% {
                        transform: scale(1.2) scaleX(1.5);
                        border-radius: 0;
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
                .animate-pulse-glow {
                    animation: pulse-glow 2s ease-in-out infinite;
                }
                .animate-book-open {
                    animation: book-open 0.8s ease-out forwards;
                }
            `}} />
        </div>
    );
}
