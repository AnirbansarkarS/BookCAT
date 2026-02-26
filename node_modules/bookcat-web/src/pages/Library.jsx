import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, Plus, Loader2, Tag, SlidersHorizontal, Save, Play, Timer, Pause, ChevronRight, X, Target, Brain, BookMarked, Coffee, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { getUserBooks, updateBookDetails, logReadingSession, fetchPageCount } from '../services/bookService';
import AddBookModal from '../components/AddBookModal';
import ReadingSessionModal from '../components/Readingsessionmodal';
import { eventBus, EVENTS } from '../utils/eventBus';
import { logBookCompletion } from '../services/activityService';

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
    const [visibleCount, setVisibleCount] = useState(12);

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

    const [fetchingPages, setFetchingPages] = useState({});

    const ensureDraft = (book) => {
        setDrafts(prev => (prev[book.id] ? prev : { ...prev, [book.id]: buildDraft(book) }));
    };

    // Auto-fetch page count when expanding a book with no total_pages
    const handleExpandBook = async (book) => {
        ensureDraft(book);
        const isExpanded = expandedId === book.id;
        setExpandedId(isExpanded ? null : book.id);

        if (!isExpanded && !book.total_pages) {
            setFetchingPages(prev => ({ ...prev, [book.id]: true }));
            const pages = await fetchPageCount(book.title, book.authors);
            if (pages) {
                updateDraft(book.id, { total_pages: String(pages) });
            }
            setFetchingPages(prev => ({ ...prev, [book.id]: false }));
        }
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

            // Log activity when book is marked as completed
            if (draft.status === 'Completed' && book.status !== 'Completed') {
                await logBookCompletion(user.id, book.id, book.title);
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

    const handleOpenBook = (book) => {
        setOpeningBookId(book.id);
        setTimeout(() => {
            setShowIntentModal(true);
            setReadingSessionBook(book);
        }, 800);
    };

    const handleStartReading = (intent) => {
        setSelectedIntent(intent);
        setShowIntentModal(false);
        setOpeningBookId(null);
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

    const handleSessionComplete = async (sessionData) => {
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

        console.log('🎉 Session completed - emitting event');
        eventBus.emit(EVENTS.SESSION_COMPLETED, sessionData);
        eventBus.emit(EVENTS.STATS_REFRESH);

        setReadingSessionBook(null);
        setSelectedIntent(null);
    };

    const filteredBooks = filter === 'All' ? books : books.filter(b => b.status === filter);
    const visibleBooks = filteredBooks.slice(0, visibleCount);
    const hasMoreBooks = filteredBooks.length > visibleCount;

    const getSystemTag = (book) => {
        if (!book.tags || !Array.isArray(book.tags)) return null;
        return book.tags.find(tag => Object.keys(SYSTEM_TAGS).includes(tag));
    };

    const getUserTags = (book) => {
        if (!book.tags || !Array.isArray(book.tags)) return [];
        return book.tags.filter(tag => !Object.keys(SYSTEM_TAGS).includes(tag));
    };

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header - Mobile optimized */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">My Library</h1>
                    <p className="text-sm md:text-base text-text-muted">Track your reading journey</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Filter tabs - horizontal scroll on mobile */}
                    <div className="flex gap-2 p-1 bg-surface rounded-xl border border-white/5 overflow-x-auto scrollbar-hide">
                        {['All', 'Reading', 'Want to Read', 'Completed', 'Re-reading'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setFilter(tab); setVisibleCount(12); }}
                                className={cn(
                                    "px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                                    filter === tab
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-text-secondary hover:text-white hover:bg-white/5"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Add book button */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all text-sm md:text-base"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Add Book</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12 md:py-20">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-primary animate-spin mx-auto" />
                        <p className="text-text-muted text-sm md:text-base">Loading your library...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && books.length === 0 && (
                <div className="text-center py-12 md:py-20 px-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                        <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2">Your library is empty</h3>
                    <p className="text-sm md:text-base text-text-muted mb-4 md:mb-6">Start building your collection</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all text-sm md:text-base"
                    >
                        <Plus size={18} />
                        Add Your First Book
                    </button>
                </div>
            )}

            {/* Wooden Bookshelf */}
            {!isLoading && filteredBooks.length > 0 && (() => {
                // Group books into shelf rows
                const BOOKS_PER_SHELF = typeof window !== 'undefined' && window.innerWidth < 640 ? 2
                    : typeof window !== 'undefined' && window.innerWidth < 768 ? 3
                    : typeof window !== 'undefined' && window.innerWidth < 1024 ? 4
                    : typeof window !== 'undefined' && window.innerWidth < 1280 ? 5 : 6;
                const shelves = [];
                for (let i = 0; i < visibleBooks.length; i += BOOKS_PER_SHELF) {
                    shelves.push(visibleBooks.slice(i, i + BOOKS_PER_SHELF));
                }

                return (
                    <div className="space-y-0">
                        {shelves.map((shelfBooks, shelfIdx) => (
                            <div key={shelfIdx} className="wooden-shelf-wrapper">
                                {/* Books on this shelf */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5 px-2 md:px-4 pb-0">
                                    {shelfBooks.map((book, index) => {
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
                                        const globalIndex = shelfIdx * BOOKS_PER_SHELF + index;

                                        return (
                                            <div
                                                key={book.id}
                                                className={cn(
                                                    "book-on-shelf group relative rounded-t-lg md:rounded-t-xl overflow-hidden transition-all duration-300",
                                                    "hover:shadow-xl md:hover:shadow-2xl hover:shadow-amber-900/30",
                                                    isOpening ? "scale-105 shadow-2xl shadow-primary/30 z-50" : "",
                                                    isExpanded ? "z-40" : ""
                                                )}
                                                style={{
                                                    transformStyle: 'preserve-3d',
                                                    animationDelay: `${globalIndex * 60}ms`
                                                }}
                                            >
                                                {/* Book Cover */}
                                                <div className="aspect-[2/3] overflow-hidden relative rounded-t-lg shadow-md">
                                                    {book.cover_url ? (
                                                        <img
                                                            src={book.cover_url}
                                                            alt={book.title}
                                                            className={cn(
                                                                "w-full h-full object-cover transition-all duration-500",
                                                                isOpening ? "scale-110 blur-sm" : "group-hover:scale-105"
                                                            )}
                                                            loading="lazy"
                                                            decoding="async"
                                                            width="200"
                                                            height="300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-amber-900/40 to-amber-800/20 flex items-center justify-center">
                                                            <BookOpen className="w-8 h-8 md:w-12 md:h-12 text-amber-200/30" />
                                                        </div>
                                                    )}

                                                    {/* Progress bar */}
                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                                        <div
                                                            className={cn(
                                                                "h-full transition-all duration-500",
                                                                progressValue > 0 ? "bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.6)]" : "bg-white/20"
                                                            )}
                                                            style={{ width: `${progressValue}%` }}
                                                        />
                                                    </div>

                                                    {/* Opening animation */}
                                                    {isOpening && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-fade-in">
                                                            <div className="text-center space-y-2 animate-pulse">
                                                                <BookOpen className="w-8 h-8 md:w-12 md:h-12 text-primary mx-auto" />
                                                                <p className="text-white font-medium text-xs md:text-sm">Opening...</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Hover overlay */}
                                                    <div className="hidden md:flex absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col justify-end p-3 lg:p-4">
                                                        <button
                                                            onClick={() => handleOpenBook(book)}
                                                            className="w-full py-2 bg-primary text-white font-semibold rounded-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 hover:bg-primary/90 text-xs lg:text-sm flex items-center justify-center gap-2"
                                                        >
                                                            <Timer size={14} />
                                                            Start Reading
                                                        </button>
                                                    </div>

                                                    {/* Book spine shadow on left edge */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
                                                </div>

                                                {/* Book Info - below cover */}
                                                <div className="bg-surface/90 backdrop-blur-sm p-2 md:p-3 space-y-1.5 md:space-y-2 border-x border-white/5">
                                                    {/* System Tag */}
                                                    {systemTag && SYSTEM_TAGS[systemTag] && (
                                                        <div className={cn(
                                                            "flex items-center gap-1 w-fit px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium",
                                                            SYSTEM_TAGS[systemTag].color
                                                        )}>
                                                            {React.createElement(SYSTEM_TAGS[systemTag].icon, { size: 8, className: "md:w-2.5 md:h-2.5" })}
                                                            <span className="hidden sm:inline">{SYSTEM_TAGS[systemTag].label}</span>
                                                        </div>
                                                    )}

                                                    {/* Title & Author */}
                                                    <div className="flex items-start justify-between gap-1 md:gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-white leading-tight truncate text-xs md:text-sm" title={book.title}>
                                                                {book.title}
                                                            </h3>
                                                            <p className="text-[10px] md:text-xs text-text-muted truncate">{book.authors || 'Unknown'}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleExpandBook(book)}
                                                            className={cn(
                                                                "flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-1 rounded-lg text-[10px] md:text-xs font-medium transition-all flex-shrink-0",
                                                                isExpanded ? "bg-primary/20 text-primary" : "bg-white/5 text-text-secondary hover:text-white hover:bg-white/10"
                                                            )}
                                                        >
                                                            <SlidersHorizontal size={10} className="md:w-3 md:h-3" />
                                                            <span className="hidden sm:inline">Edit</span>
                                                        </button>
                                                    </div>

                                                    {/* Tags */}
                                                    <div className="flex items-center gap-1 text-[10px] md:text-xs text-text-muted">
                                                        <Tag size={10} className="md:w-3 md:h-3 flex-shrink-0" />
                                                        {userTags.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {userTags.slice(0, 2).map(tag => (
                                                                    <span key={tag} className="px-1.5 py-0.5 bg-white/5 rounded-full text-[9px] md:text-[10px] text-text-secondary truncate max-w-[60px]">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                                {userTags.length > 2 && (
                                                                    <span className="text-[9px] md:text-[10px] text-text-muted">+{userTags.length - 2}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-text-muted text-[9px] md:text-[10px]">No tags</span>
                                                        )}
                                                    </div>

                                                    {/* Progress */}
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[10px] md:text-xs text-text-muted">
                                                            <span>{book.current_page || 0}/{totalPagesDisplay}</span>
                                                            <span className="font-semibold">{progressValue}%</span>
                                                        </div>
                                                        <div className="w-full h-1 md:h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn(
                                                                    "h-full transition-all duration-700 ease-out",
                                                                    progressValue === 100 ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-primary"
                                                                )}
                                                                style={{ width: `${progressValue}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Mobile start reading */}
                                                    <button
                                                        onClick={() => handleOpenBook(book)}
                                                        className="w-full md:hidden flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors"
                                                    >
                                                        <Timer size={12} />
                                                        Start
                                                    </button>

                                                    {/* Expanded Edit Section */}
                                                    {isExpanded && (
                                                        <div className="mt-2 border-t border-white/10 pt-2 md:pt-3 space-y-2 md:space-y-3">
                                                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] md:text-xs font-medium text-text-secondary">Status</label>
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
                                                                        className="w-full px-2 py-1.5 md:py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] md:text-xs text-white focus:outline-none focus:border-primary/50"
                                                                    >
                                                                        {['Reading', 'Want to Read', 'Completed', 'Re-reading', 'Abandoned'].map(status => (
                                                                            <option key={status} value={status} className="bg-background text-white">
                                                                                {status}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] md:text-xs font-medium text-text-secondary">Total Pages</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            value={draft.total_pages}
                                                                            onChange={(e) => updateDraft(book.id, { total_pages: e.target.value })}
                                                                            placeholder={fetchingPages[book.id] ? 'Fetching...' : '320'}
                                                                            className="w-full px-2 py-1.5 md:py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] md:text-xs text-white focus:outline-none focus:border-primary/50"
                                                                        />
                                                                        {fetchingPages[book.id] && (
                                                                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary animate-spin" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1 md:space-y-2">
                                                                <label className="text-[10px] md:text-xs font-medium text-text-secondary">Pages Read</label>
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
                                                                        className="w-12 md:w-16 px-1 md:px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] md:text-xs text-center focus:outline-none focus:border-primary/50"
                                                                    />
                                                                    <span className="text-[10px] md:text-xs text-text-muted">/ {maxPages}</span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <label className="text-[10px] md:text-xs font-medium text-text-secondary">Tags</label>
                                                                <input
                                                                    type="text"
                                                                    value={draft.tagsInput}
                                                                    onChange={(e) => updateDraft(book.id, { tagsInput: e.target.value })}
                                                                    placeholder="exam, study..."
                                                                    className="w-full px-2 py-1.5 md:py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] md:text-xs text-white focus:outline-none focus:border-primary/50"
                                                                />
                                                            </div>

                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleSaveDetails(book)}
                                                                    disabled={savingId === book.id}
                                                                    className={cn(
                                                                        "flex-1 inline-flex items-center justify-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-semibold transition-all",
                                                                        savingId === book.id
                                                                            ? "bg-white/5 text-text-muted cursor-not-allowed"
                                                                            : "bg-primary text-white hover:bg-primary/90"
                                                                    )}
                                                                >
                                                                    <Save size={12} />
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setDrafts(prev => ({ ...prev, [book.id]: buildDraft(book) }));
                                                                        setExpandedId(null);
                                                                    }}
                                                                    className="px-2 md:px-3 py-1.5 md:py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] md:text-xs font-medium transition-colors"
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

                                {/* Wooden Shelf */}
                                <div className="wooden-shelf" />
                                {/* Shelf bracket shadows */}
                                <div className="shelf-shadow" />
                            </div>
                        ))}
                    </div>
                );
            })()}
            {/* Load More Button */}
            {!isLoading && hasMoreBooks && (
                <div className="flex justify-center py-8">
                    <button
                        onClick={() => setVisibleCount(prev => prev + 12)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl font-medium transition-all hover:scale-105"
                    >
                        <Plus size={20} />
                        Load More Books ({filteredBooks.length - visibleCount} remaining)
                    </button>
                </div>
            )}
            {/* Load More Button */}
            {!isLoading && hasMoreBooks && (
                <div className="flex justify-center pt-4 pb-2">
                    <button
                        onClick={() => setVisibleCount(prev => prev + 12)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/10 hover:border-white/20"
                    >
                        <ChevronRight size={16} />
                        Load More ({filteredBooks.length - visibleCount} remaining)
                    </button>
                </div>
            )}

            {/* No results */}
            {!isLoading && books.length > 0 && filteredBooks.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-text-muted text-sm">No books with status "{filter}"</p>
                </div>
            )}

            {/* Modals */}
            <AddBookModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onBookAdded={handleBookAdded}
            />

            {showIntentModal && readingSessionBook && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-surface border border-white/10 rounded-2xl p-4 md:p-6 max-w-md w-full shadow-2xl animate-scale-in">
                        <div className="text-center mb-4 md:mb-6">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                                <Brain className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-white mb-2">Why are you reading?</h3>
                            <p className="text-xs md:text-sm text-text-muted">Track contextual patterns</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
                            {READING_INTENTS.map((intent) => (
                                <button
                                    key={intent.id}
                                    onClick={() => handleStartReading(intent.id)}
                                    className="p-3 md:p-4 rounded-xl border-2 transition-all hover:scale-105 bg-white/5 border-white/10 hover:border-primary/50 hover:bg-white/10"
                                >
                                    <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                        {React.createElement(intent.icon, {
                                            size: 20,
                                            className: cn(intent.color, "md:w-6 md:h-6")
                                        })}
                                        <span className="text-xs md:text-sm font-medium text-white">{intent.label}</span>
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
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slide-up-book {
                    from {
                        opacity: 0;
                        transform: translateY(30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                .animate-scale-in { animation: scale-in 0.3s ease-out; }

                /* ── Wooden Shelf Styles ── */
                .wooden-shelf-wrapper {
                    position: relative;
                    margin-bottom: 8px;
                }

                .wooden-shelf {
                    height: 18px;
                    background: linear-gradient(
                        180deg,
                        #8B6914 0%,
                        #A0752E 15%,
                        #6B4E0A 50%,
                        #5C3D08 70%,
                        #4A2F06 100%
                    );
                    border-radius: 0 0 6px 6px;
                    position: relative;
                    box-shadow:
                        0 4px 12px rgba(0,0,0,0.5),
                        0 2px 4px rgba(0,0,0,0.3),
                        inset 0 1px 0 rgba(255,255,255,0.15),
                        inset 0 -2px 4px rgba(0,0,0,0.3);
                    z-index: 5;
                }

                /* Wood grain texture */
                .wooden-shelf::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    background:
                        repeating-linear-gradient(
                            90deg,
                            transparent,
                            rgba(255,200,100,0.03) 2px,
                            transparent 4px
                        ),
                        repeating-linear-gradient(
                            90deg,
                            transparent,
                            rgba(0,0,0,0.04) 8px,
                            transparent 16px
                        );
                }

                /* Front lip of shelf */
                .wooden-shelf::after {
                    content: '';
                    position: absolute;
                    bottom: -4px;
                    left: 0;
                    right: 0;
                    height: 5px;
                    background: linear-gradient(
                        180deg,
                        #5C3D08 0%,
                        #3D2805 100%
                    );
                    border-radius: 0 0 4px 4px;
                    box-shadow:
                        0 3px 8px rgba(0,0,0,0.4),
                        inset 0 1px 0 rgba(255,255,255,0.1);
                }

                /* Shadow under shelf */
                .shelf-shadow {
                    height: 12px;
                    background: linear-gradient(
                        180deg,
                        rgba(0,0,0,0.25) 0%,
                        transparent 100%
                    );
                    margin-top: 4px;
                    border-radius: 50%;
                    margin-left: 16px;
                    margin-right: 16px;
                }

                @media (min-width: 768px) {
                    .wooden-shelf {
                        height: 22px;
                    }
                    .wooden-shelf-wrapper {
                        margin-bottom: 12px;
                    }
                }

                /* Book hover lift off shelf */
                .book-on-shelf {
                    animation: slide-up-book 0.5s ease-out both;
                    transform-origin: bottom center;
                    position: relative;
                    z-index: 1;
                }
                .book-on-shelf:hover {
                    transform: translateY(-8px) scale(1.02);
                    z-index: 10;
                }
                @media (min-width: 768px) {
                    .book-on-shelf:hover {
                        transform: translateY(-14px) scale(1.03);
                    }
                }

                /* Subtle book shadow sitting on shelf */
                .book-on-shelf::after {
                    content: '';
                    position: absolute;
                    bottom: -3px;
                    left: 10%;
                    right: 10%;
                    height: 6px;
                    background: radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, transparent 70%);
                    border-radius: 50%;
                    pointer-events: none;
                    transition: opacity 0.3s;
                }
                .book-on-shelf:hover::after {
                    opacity: 0.2;
                }

                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}} />
        </div>
    );
}