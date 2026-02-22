import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Users, BookOpen, Sparkles, Lightbulb,
    Flame, BarChart3, Clock, Star, ExternalLink, Newspaper,
    RefreshCw, ChevronRight, Zap, Award, Coffee, Globe, Building2,
    Brain, CheckCircle, XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import ActivityFeed from '../components/AcitvityFeed';
import { getTrendingBooks } from '../services/activityService';
import { getPublisherUpdates, getDailyQuiz, submitQuizAnswer, getUserQuizAnswer, triggerQuizGeneration } from '../services/discoverService';
import { getTodayBookFacts, triggerBookFactGeneration } from '../services/bookFactService';
import { getWeeklyTrendingBooks, triggerNYTFetch } from '../services/weeklyTrendingService';

// ═══════════════════════════════════════════════════════════
// MOCK DATA (Replace with real API calls)
// ═══════════════════════════════════════════════════════════

// TRENDING_BOOKS static mock removed — replaced by live NYT bestsellers

const ACTIVE_READERS = [
    { id: 1, name: 'Sarah Chen', avatar: null, currentBook: 'Atomic Habits', progress: 67, readingTime: '2h today' },
    { id: 2, name: 'Marcus Lee', avatar: null, currentBook: 'Project Hail Mary', progress: 89, readingTime: '45m today' },
    { id: 3, name: 'Emma Wilson', avatar: null, currentBook: 'The Midnight Library', progress: 34, readingTime: '1h 20m today' },
    { id: 4, name: 'David Park', avatar: null, currentBook: 'Dune', progress: 52, readingTime: '3h today' },
];

const NEW_RELEASES = [
    { id: 1, title: 'Holly', author: 'Stephen King', cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1674418461i/65916344.jpg', releaseDate: '2024-02-15' },
    { id: 2, title: 'The Woman in Me', author: 'Britney Spears', cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1689342806i/123420946.jpg', releaseDate: '2024-02-10' },
    { id: 3, title: 'The Heaven & Earth Grocery Store', author: 'James McBride', cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1670520732i/65213659.jpg', releaseDate: '2024-02-08' },
];

// FUN_FACTS removed — replaced by AI-generated daily_book_facts from Groq

const HOT_TAKES = [
    { id: 1, text: "E-readers are better than physical books for the environment", agree: 67, disagree: 33, author: 'BookLover23' },
    { id: 2, text: "You should finish every book you start, no matter what", agree: 42, disagree: 58, author: 'ReadingRebel' },
    { id: 3, text: "Audio books are just as legitimate as reading", agree: 78, disagree: 22, author: 'AudioFan99' },
    { id: 4, text: "Spoilers actually enhance the reading experience", agree: 23, disagree: 77, author: 'SpoilerKing' },
];

const GENRE_TRENDS = [
    { genre: 'Fantasy', percentage: 28, change: '+5%', color: 'from-purple-500 to-pink-500' },
    { genre: 'Mystery', percentage: 22, change: '+2%', color: 'from-blue-500 to-cyan-500' },
    { genre: 'Romance', percentage: 18, change: '-1%', color: 'from-rose-500 to-pink-500' },
    { genre: 'Sci-Fi', percentage: 15, change: '+8%', color: 'from-emerald-500 to-teal-500' },
    { genre: 'Non-Fiction', percentage: 12, change: '+3%', color: 'from-amber-500 to-orange-500' },
    { genre: 'Horror', percentage: 5, change: '-2%', color: 'from-red-500 to-rose-500' },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

// Quiz type meta (same as Quiz.jsx, kept local so no import needed)
const QUIZ_TYPE_META = {
    quote:  { label: 'Guess the Book',  color: 'from-violet-500 to-purple-600' },
    author: { label: 'Who Wrote This?', color: 'from-blue-500 to-indigo-600'  },
    genre:  { label: 'What Genre?',     color: 'from-emerald-500 to-teal-600'  },
    era:    { label: 'Which Era?',      color: 'from-amber-500 to-orange-600'  },
    plot:   { label: 'Match the Plot',  color: 'from-pink-500 to-rose-600'     },
    trivia: { label: 'Literary Trivia', color: 'from-cyan-500 to-sky-600'      },
};

// Publisher brand colours for variety
const PUBLISHER_COLORS = {
    penguin:         'from-orange-500 to-red-600',
    harpercollins:   'from-blue-500 to-indigo-600',
    hachette:        'from-emerald-500 to-teal-600',
    simonschuster:   'from-violet-500 to-purple-600',
    macmillan:       'from-cyan-500 to-blue-600',
    tor:             'from-amber-500 to-orange-600',
    bookpage:        'from-pink-500 to-rose-600',
    publishersweekly:'from-slate-500 to-gray-600',
};

export default function Discover() {
    const { user } = useAuth();
    const [bookFacts, setBookFacts] = useState([]);
    const [factsLoading, setFactsLoading] = useState(true);
    const [generatingFact, setGeneratingFact] = useState(false);
    const [trendingBooks, setTrendingBooks] = useState([]);
    const [loadingTrending, setLoadingTrending] = useState(true);
    const [publisherUpdates, setPublisherUpdates] = useState([]);
    const [loadingPublisher, setLoadingPublisher] = useState(true);
    const [activePublisher, setActivePublisher] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    // NYT Bestsellers state
    const [nytBooks, setNytBooks]           = useState([]);
    const [loadingNYT, setLoadingNYT]       = useState(true);
    const [refreshingNYT, setRefreshingNYT] = useState(false);
    const [nytList, setNytList]             = useState('hardcover-fiction');
    const [nytWeekStart, setNytWeekStart]   = useState(null);

    // Quiz state
    const [dailyQuiz, setDailyQuiz]             = useState(null);
    const [loadingQuiz, setLoadingQuiz]         = useState(true);
    const [quizSelected, setQuizSelected]       = useState(null);
    const [quizRevealed, setQuizRevealed]       = useState(false);
    const [quizSubmitting, setQuizSubmitting]   = useState(false);
    const [generatingQuiz, setGeneratingQuiz]   = useState(false);
    const [quizGenError, setQuizGenError]       = useState(null);

    useEffect(() => {
        // Load NYT weekly bestsellers
        (async () => {
            setLoadingNYT(true);
            const { data, weekStart } = await getWeeklyTrendingBooks('all', 20);
            setNytBooks(data);
            setNytWeekStart(weekStart);
            setLoadingNYT(false);
        })();

        // Load AI-generated book facts
        (async () => {
            setFactsLoading(true);
            const facts = await getTodayBookFacts();
            setBookFacts(facts);
            setFactsLoading(false);
        })();

        // Load trending books based on activity
        (async () => {
            setLoadingTrending(true);
            const { data } = await getTrendingBooks(10);
            setTrendingBooks(data || []);
            setLoadingTrending(false);
        })();

        // Load publisher updates
        (async () => {
            setLoadingPublisher(true);
            const data = await getPublisherUpdates(24);
            setPublisherUpdates(data);
            setLoadingPublisher(false);
        })();

        // Load today's quiz
        (async () => {
            setLoadingQuiz(true);
            const quiz = await getDailyQuiz();
            setDailyQuiz(quiz);
            setLoadingQuiz(false);

            // Check if user already answered today
            if (quiz && user) {
                const existing = await getUserQuizAnswer(user.id, quiz.id);
                if (existing) {
                    setQuizSelected(existing.selected_answer);
                    setQuizRevealed(true);
                }
            }
        })();
    }, [user]);

    const handleRefreshPublisher = async () => {
        setRefreshing(true);
        const data = await getPublisherUpdates(24);
        setPublisherUpdates(data);
        setRefreshing(false);
    };

    const handleGenerateQuiz = async () => {
        setGeneratingQuiz(true);
        setQuizGenError(null);
        const result = await triggerQuizGeneration();
        if (result.success) {
            const quiz = await getDailyQuiz();
            setDailyQuiz(quiz);
            setQuizSelected(null);
            setQuizRevealed(false);
        } else {
            setQuizGenError('Failed to generate quiz. Make sure the edge function is deployed and GEMINI_API_KEY is set.');
        }
        setGeneratingQuiz(false);
    };

    const handleQuizSelect = async (idx) => {
        if (quizRevealed || quizSubmitting || !dailyQuiz) return;
        setQuizSelected(idx);
        setQuizSubmitting(true);
        if (user) {
            await submitQuizAnswer(user.id, dailyQuiz.id, idx, dailyQuiz.correct_answer);
        }
        setQuizRevealed(true);
        setQuizSubmitting(false);
    };

    const filteredPublisher = activePublisher === 'all'
        ? publisherUpdates
        : publisherUpdates.filter(u => u.publisher_slug === activePublisher);

    // Unique publishers in the loaded data
    const loadedPublishers = [...new Set(publisherUpdates.map(u => u.publisher_slug))];

    const handleRefreshNYT = async () => {
        if (refreshingNYT) return;
        setRefreshingNYT(true);
        try {
            await triggerNYTFetch();
            const { data, weekStart } = await getWeeklyTrendingBooks('all', 20);
            setNytBooks(data);
            setNytWeekStart(weekStart);
        } catch (err) {
            console.error('NYT refresh error:', err);
        } finally {
            setRefreshingNYT(false);
        }
    };

    const handleGenerateDiscoverFact = async () => {
        if (generatingFact) return;
        setGeneratingFact(true);
        try {
            const result = await triggerBookFactGeneration();
            if (result.success) {
                const facts = await getTodayBookFacts();
                setBookFacts(facts);
            }
        } catch (err) {
            console.error('Error generating fact:', err);
        } finally {
            setGeneratingFact(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-violet-600 to-pink-600 p-8 md:p-12">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-6 h-6 text-white animate-pulse" />
                        <span className="text-white/90 text-sm font-medium">Welcome back, {user?.email?.split('@')[0] || 'Reader'}!</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                        Discover Your Next<br />Great Read
                    </h1>
                    <p className="text-white/80 text-lg max-w-2xl">
                        Explore trending books, connect with readers, and find recommendations tailored just for you.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            </div>

            {/* Book Fact of the Day — AI-generated via Groq */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-semibold text-white">Book Fact of the Day</h2>
                    </div>
                    {bookFacts.length < 2 && (
                        <button
                            onClick={handleGenerateDiscoverFact}
                            disabled={generatingFact}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                generatingFact
                                    ? "bg-white/5 text-text-muted cursor-not-allowed"
                                    : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                            )}
                        >
                            {generatingFact ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    New Fact ({bookFacts.length}/2)
                                </>
                            )}
                        </button>
                    )}
                </div>

                {factsLoading ? (
                    <div className="grid md:grid-cols-2 gap-3">
                        {[1, 2].map(i => (
                            <div key={i} className="bg-surface/50 border border-white/10 rounded-xl p-5 animate-pulse">
                                <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
                                <div className="h-3 bg-white/10 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : bookFacts.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-3">
                        {bookFacts.map((fact) => (
                            <div
                                key={fact.id}
                                className={cn(
                                    "bg-gradient-to-br from-amber-500/10 to-orange-500/5",
                                    "border border-amber-500/20 rounded-xl p-5",
                                    "hover:border-amber-500/40 transition-all duration-300"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl flex-shrink-0 mt-0.5">{fact.emoji || '📚'}</span>
                                    <div className="min-w-0">
                                        <p className="text-white text-sm leading-relaxed">{fact.fact_text}</p>
                                        {fact.book_title && fact.book_title !== 'General' && (
                                            <p className="text-xs text-amber-400/80 mt-2 font-medium">
                                                — {fact.book_title}{fact.book_author ? ` by ${fact.book_author}` : ''}
                                            </p>
                                        )}
                                        <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/15 text-amber-400/70 rounded-full text-[10px] uppercase tracking-wider font-medium">
                                            {fact.category}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6 text-center">
                        <Lightbulb className="w-10 h-10 text-amber-400/40 mx-auto mb-3" />
                        <p className="text-text-muted text-sm mb-3">No facts yet today</p>
                        <button
                            onClick={handleGenerateDiscoverFact}
                            disabled={generatingFact}
                            className={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors",
                                generatingFact
                                    ? "bg-white/5 text-text-muted cursor-not-allowed"
                                    : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                            )}
                        >
                            {generatingFact ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate First Fact
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* NYT Weekly Bestsellers */}
            <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold text-white">NYT Bestsellers</h2>
                        {nytWeekStart && (
                            <span className="text-xs text-text-muted bg-white/5 px-2 py-0.5 rounded-full">
                                Week of {new Date(nytWeekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* List switcher */}
                        <div className="flex bg-surface border border-white/10 rounded-lg p-0.5 text-xs">
                            {[
                                { key: 'hardcover-fiction',    label: 'Fiction'     },
                                { key: 'hardcover-nonfiction', label: 'Non-Fiction' },
                                { key: 'all',                  label: 'All'         },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setNytList(tab.key)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-md transition-all font-medium',
                                        nytList === tab.key
                                            ? 'bg-primary text-white'
                                            : 'text-text-muted hover:text-white'
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleRefreshNYT}
                            disabled={refreshingNYT}
                            title="Fetch latest NYT list"
                            className={cn(
                                'p-2 rounded-lg border transition-all',
                                refreshingNYT
                                    ? 'border-white/10 text-text-muted cursor-not-allowed'
                                    : 'border-white/10 text-text-muted hover:border-primary/50 hover:text-primary'
                            )}
                        >
                            <RefreshCw className={cn('w-4 h-4', refreshingNYT && 'animate-spin')} />
                        </button>
                    </div>
                </div>

                {loadingNYT ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-surface/50 border border-white/5 rounded-2xl p-4 animate-pulse">
                                <div className="w-full h-48 bg-white/5 rounded-xl mb-3" />
                                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                                <div className="h-3 bg-white/10 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : (() => {
                    const filtered = nytList === 'all'
                        ? nytBooks
                        : nytBooks.filter(b => b.list_name === nytList);

                    if (filtered.length === 0) {
                        return (
                            <div className="bg-surface/50 border border-white/10 rounded-2xl p-10 text-center">
                                <TrendingUp className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
                                <p className="text-text-muted text-sm mb-4">No bestsellers loaded yet for this week.</p>
                                <button
                                    onClick={handleRefreshNYT}
                                    disabled={refreshingNYT}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-xl font-medium text-sm transition-colors"
                                >
                                    {refreshingNYT ? (
                                        <><RefreshCw className="w-4 h-4 animate-spin" /> Fetching...</>
                                    ) : (
                                        <><RefreshCw className="w-4 h-4" /> Fetch NYT Bestsellers</>
                                    )}
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {filtered.slice(0, 8).map(book => (
                                <a
                                    key={book.id}
                                    href={book.amazon_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group bg-surface border border-white/5 rounded-2xl p-4 hover:border-primary/40 transition-all cursor-pointer block"
                                >
                                    <div className="relative mb-3">
                                        {book.image_url ? (
                                            <img
                                                src={book.image_url}
                                                alt={book.title}
                                                className="w-full h-48 object-cover rounded-xl"
                                            />
                                        ) : (
                                            <div className="w-full h-48 bg-white/5 rounded-xl flex items-center justify-center">
                                                <BookOpen className="w-10 h-10 text-text-muted opacity-30" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                                            #{book.rank}
                                        </div>
                                        <div className="absolute top-2 right-2 bg-primary/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full capitalize">
                                            {book.list_name === 'hardcover-fiction' ? 'Fiction' : book.list_name === 'hardcover-nonfiction' ? 'Non-Fiction' : book.list_name}
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors" title={book.title}>
                                        {book.title}
                                    </h3>
                                    <p className="text-text-muted text-xs mb-2 line-clamp-1">{book.author}</p>
                                    {book.description && (
                                        <p className="text-[11px] text-text-muted/70 line-clamp-2 leading-relaxed">{book.description}</p>
                                    )}
                                    <div className="flex items-center gap-1 mt-2 text-[10px] text-primary/60">
                                        <ExternalLink size={10} />
                                        <span>View on Amazon</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    );
                })()}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Trending Books from Activity */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Flame className="w-5 h-5 text-orange-400" />
                        <h2 className="text-xl font-bold text-white">Hot This Week</h2>
                    </div>
                    <div className="bg-surface border border-white/5 rounded-2xl p-4 space-y-3">
                        {loadingTrending ? (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                            </div>
                        ) : trendingBooks.length > 0 ? (
                            trendingBooks.slice(0, 5).map((book, index) => (
                                <div key={book.book_id || index} className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {index + 1}
                                    </div>
                                    {book.cover_url && (
                                        <img src={book.cover_url} alt={book.title} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white text-sm line-clamp-1">{book.title}</p>
                                        <p className="text-xs text-text-muted">{book.authors}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-orange-400">
                                            <TrendingUp size={10} />
                                            <span>{book.activity_count || book.reader_count || 0} readers this week</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                                <TrendingUp size={24} className="text-text-muted opacity-40" />
                                <p className="text-sm text-text-muted">No trending data yet</p>
                                <p className="text-xs text-text-muted opacity-60">Community activity will appear here</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Feed */}
                <div>
                    <ActivityFeed />
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Active Readers */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-sky-400" />
                        <h2 className="text-xl font-bold text-white">Active Readers</h2>
                    </div>
                    <div className="bg-surface border border-white/5 rounded-2xl p-4 space-y-3">
                        {ACTIVE_READERS.map(reader => (
                            <div key={reader.id} className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {reader.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white text-sm">{reader.name}</p>
                                    <p className="text-xs text-text-muted truncate">{reader.currentBook}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full" style={{ width: `${reader.progress}%` }} />
                                        </div>
                                        <span className="text-[10px] text-primary font-semibold">{reader.progress}%</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-text-muted flex-shrink-0">
                                    <Clock size={10} />
                                    {reader.readingTime}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* New Releases */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-violet-400" />
                        <h2 className="text-xl font-bold text-white">New Releases</h2>
                    </div>
                    <div className="bg-surface border border-white/5 rounded-2xl p-4 space-y-3">
                        {NEW_RELEASES.map(book => (
                            <div key={book.id} className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer">
                                <img src={book.cover} alt={book.title} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white text-sm line-clamp-1">{book.title}</p>
                                    <p className="text-xs text-text-muted">{book.author}</p>
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-violet-400">
                                        <Sparkles size={10} />
                                        Released {new Date(book.releaseDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Daily Quiz Card ── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-violet-400" />
                        <h2 className="text-xl font-bold text-white">Daily Quiz</h2>
                        <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-medium">AI Generated</span>
                    </div>
                    <Link
                        to="/quiz"
                        className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                    >
                        View all <ChevronRight size={14} />
                    </Link>
                </div>

                {loadingQuiz ? (
                    <div className="bg-surface border border-white/5 rounded-2xl p-6 animate-pulse space-y-4">
                        <div className="h-4 bg-white/5 rounded w-1/2" />
                        <div className="h-5 bg-white/5 rounded w-3/4" />
                        {[1,2,3,4].map(i => <div key={i} className="h-11 bg-white/5 rounded-xl" />)}
                    </div>
                ) : dailyQuiz ? (() => {
                    const meta = QUIZ_TYPE_META[dailyQuiz.question_type] || QUIZ_TYPE_META.trivia;
                    const isCorrect = quizSelected === dailyQuiz.correct_answer;
                    return (
                        <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                            {/* Type banner */}
                            <div className={cn('bg-gradient-to-r px-5 py-3 flex items-center justify-between', meta.color)}>
                                <span className="text-white font-semibold text-sm">{meta.label}</span>
                                <span className="text-white/80 text-xs">
                                    {new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                            </div>

                            <div className="p-5">
                                <p className="text-xs text-text-muted mb-2">
                                    📖 {dailyQuiz.book_title}{dailyQuiz.book_author ? ` · ${dailyQuiz.book_author}` : ''}
                                </p>
                                <p className="text-white font-semibold text-sm leading-snug mb-4">
                                    {dailyQuiz.question}
                                </p>

                                <div className="grid sm:grid-cols-2 gap-2">
                                    {(dailyQuiz.options || []).map((opt, idx) => {
                                        const isChosen     = quizSelected === idx;
                                        const isCorrectOpt = idx === dailyQuiz.correct_answer;
                                        let style = 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:border-white/20';
                                        if (quizRevealed) {
                                            if (isCorrectOpt)             style = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
                                            else if (isChosen)            style = 'bg-red-500/20 border-red-500/40 text-red-300';
                                            else                          style = 'bg-white/[0.02] border-white/5 text-text-muted opacity-60';
                                        }
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleQuizSelect(idx)}
                                                disabled={quizRevealed || quizSubmitting}
                                                className={cn(
                                                    'flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl border transition-all text-xs font-medium',
                                                    style,
                                                    !quizRevealed && 'cursor-pointer',
                                                )}
                                            >
                                                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                                <span className="line-clamp-1">{opt}</span>
                                                {quizRevealed && isCorrectOpt && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-auto flex-shrink-0" />}
                                                {quizRevealed && isChosen && !isCorrectOpt && <XCircle className="w-3.5 h-3.5 text-red-400 ml-auto flex-shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                {quizRevealed && (
                                    <div className={cn(
                                        'mt-4 p-3 rounded-xl border text-xs',
                                        isCorrect
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                            : 'bg-red-500/10 border-red-500/20 text-red-300',
                                    )}>
                                        <p className="font-semibold mb-1">{isCorrect ? '✅ Correct!' : '❌ Nice try!'}</p>
                                        {dailyQuiz.explanation && (
                                            <p className="text-white/70 leading-relaxed">{dailyQuiz.explanation}</p>
                                        )}
                                    </div>
                                )}

                                {!quizRevealed && (
                                    <p className="mt-3 text-center text-xs text-text-muted">Pick an option above to answer today's quiz</p>
                                )}
                            </div>
                        </div>
                    );
                })() : (
                    <div className="bg-surface border border-white/5 rounded-2xl p-8 text-center">
                        <Brain className="w-10 h-10 text-text-muted mx-auto mb-3" />
                        <p className="text-white font-semibold mb-1">No quiz today yet</p>
                        <p className="text-sm text-text-muted mb-4">A new AI quiz drops every day at midnight UTC.</p>
                        {quizGenError && (
                            <p className="text-xs text-red-400 mb-3 max-w-xs mx-auto">{quizGenError}</p>
                        )}
                        <button
                            onClick={handleGenerateQuiz}
                            disabled={generatingQuiz}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                        >
                            <RefreshCw className={cn('w-4 h-4', generatingQuiz && 'animate-spin')} />
                            {generatingQuiz ? 'Generating…' : 'Generate Today\'s Quiz'}
                        </button>
                    </div>
                )}
            </div>

            {/* Publisher & Industry News */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-sky-400" />
                        <h2 className="text-xl font-bold text-white">Publisher & Industry News</h2>
                    </div>
                    <button
                        onClick={handleRefreshPublisher}
                        disabled={refreshing || loadingPublisher}
                        className="flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cn('w-4 h-4', (refreshing || loadingPublisher) && 'animate-spin')} />
                        Refresh
                    </button>
                </div>

                {/* Publisher filter pills */}
                {!loadingPublisher && loadedPublishers.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
                        <button
                            onClick={() => setActivePublisher('all')}
                            className={cn(
                                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                                activePublisher === 'all'
                                    ? 'bg-sky-500 text-white'
                                    : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                            )}
                        >
                            All Sources
                        </button>
                        {loadedPublishers.map(slug => {
                            const sample = publisherUpdates.find(u => u.publisher_slug === slug);
                            return (
                                <button
                                    key={slug}
                                    onClick={() => setActivePublisher(slug)}
                                    className={cn(
                                        'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                                        activePublisher === slug
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                                    )}
                                >
                                    {sample?.publisher || slug}
                                </button>
                            );
                        })}
                    </div>
                )}

                {loadingPublisher ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-surface border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                                <div className="w-full h-36 bg-white/5" />
                                <div className="p-4 space-y-2">
                                    <div className="h-3 bg-white/5 rounded w-1/3" />
                                    <div className="h-4 bg-white/5 rounded w-full" />
                                    <div className="h-3 bg-white/5 rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredPublisher.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPublisher.slice(0, 9).map(update => {
                            const gradient = PUBLISHER_COLORS[update.publisher_slug] || 'from-slate-500 to-gray-600';
                            return (
                                <a
                                    key={update.id}
                                    href={update.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group bg-surface border border-white/5 rounded-2xl overflow-hidden hover:border-sky-500/40 transition-all flex flex-col"
                                >
                                    {/* Image or gradient fallback */}
                                    {update.image_url ? (
                                        <img
                                            src={update.image_url}
                                            alt={update.title}
                                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                        />
                                    ) : null}
                                    <div
                                        className={cn(
                                            'w-full h-36 bg-gradient-to-br items-center justify-center',
                                            gradient,
                                            update.image_url ? 'hidden' : 'flex'
                                        )}
                                    >
                                        <Building2 className="w-10 h-10 text-white/40" />
                                    </div>

                                    <div className="p-4 flex flex-col flex-1">
                                        {/* Publisher badge */}
                                        <span className={cn(
                                            'self-start text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 bg-gradient-to-r text-white',
                                            gradient
                                        )}>
                                            {update.publisher}
                                        </span>

                                        <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1 group-hover:text-sky-300 transition-colors">
                                            {update.title}
                                        </h3>

                                        {update.summary && (
                                            <p className="text-xs text-text-muted line-clamp-2 mb-3 flex-1">
                                                {update.summary}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-[10px] text-text-muted mt-auto">
                                            <span>
                                                {update.published_at
                                                    ? new Date(update.published_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : 'Recent'}
                                            </span>
                                            <span className="flex items-center gap-1 text-sky-400 group-hover:gap-2 transition-all">
                                                Read more <ExternalLink size={10} />
                                            </span>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty state — feed not yet populated */
                    <div className="bg-surface border border-white/5 rounded-2xl p-8 text-center">
                        <Newspaper className="w-10 h-10 text-text-muted mx-auto mb-3" />
                        <p className="text-white font-semibold mb-1">No publisher news yet</p>
                        <p className="text-sm text-text-muted mb-4">
                            The feed is populated by a scheduled background job every 6 hours.
                            Deploy your Supabase Edge Function to start receiving articles.
                        </p>
                        <button
                            onClick={handleRefreshPublisher}
                            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                            Check again
                        </button>
                    </div>
                )}
            </div>

            {/* Hot Takes */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <h2 className="text-xl font-bold text-white">Hot Takes</h2>
                    <span className="text-xs text-text-muted">What do you think?</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    {HOT_TAKES.map(take => (
                        <div key={take.id} className="bg-surface border border-white/5 rounded-2xl p-5 hover:border-orange-500/30 transition-colors">
                            <p className="text-white font-medium mb-3 leading-relaxed">{take.text}</p>
                            <p className="text-xs text-text-muted mb-3">— {take.author}</p>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all" style={{ width: `${take.agree}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-emerald-400">{take.agree}%</span>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-500/20 transition-colors">
                                    👍 Agree
                                </button>
                                <button className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-colors">
                                    👎 Disagree
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Reading Trends */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-bold text-white">Reading Trends</h2>
                    <span className="text-xs text-text-muted">What's popular this month</span>
                </div>
                <div className="bg-surface border border-white/5 rounded-2xl p-6">
                    <div className="space-y-4">
                        {GENRE_TRENDS.map(trend => (
                            <div key={trend.genre}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white text-sm">{trend.genre}</span>
                                        <span className={cn(
                                            'text-xs font-semibold',
                                            trend.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'
                                        )}>
                                            {trend.change}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-white">{trend.percentage}%</span>
                                </div>
                                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', trend.color)}
                                        style={{ width: `${trend.percentage * 3}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20 rounded-2xl p-6 text-center">
                    <BookOpen className="w-8 h-8 text-primary mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">2,845</div>
                    <p className="text-sm text-text-muted">Books in Community</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
                    <Users className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">456</div>
                    <p className="text-sm text-text-muted">Active Readers Today</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6 text-center">
                    <Coffee className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">12.5k</div>
                    <p className="text-sm text-text-muted">Hours Read This Week</p>
                </div>
            </div>
        </div>
    );
}