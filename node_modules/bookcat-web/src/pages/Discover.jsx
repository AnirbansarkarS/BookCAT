import React, { useState, useEffect, useRef } from 'react';
import {
    TrendingUp, Users, BookOpen, Sparkles, Lightbulb,
    Flame, BarChart3, Clock, Star, ExternalLink,
    RefreshCw, ChevronRight, Zap, Award, Coffee, Globe,
    Brain, CheckCircle, XCircle, Search, Wand2, Loader2, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getActiveReaders, getDailyQuiz, submitQuizAnswer, getUserQuizAnswer, triggerQuizGeneration } from '../services/discoverService';
import { getTodayBookFacts, triggerBookFactGeneration } from '../services/bookFactService';
import { getWeeklyTrendingBooks, triggerNYTFetch } from '../services/weeklyTrendingService';
import { moodSearch } from '../services/moodSearchService';
import { getTodayHotTakes, triggerHotTakesGeneration, voteOnHotTake, getUserVotes } from '../services/hotTakesService';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════
// MOCK DATA (Replace with real API calls)
// ═══════════════════════════════════════════════════════════

// TRENDING_BOOKS static mock removed — replaced by live NYT bestsellers

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

// Publisher brand colours for variety — kept only for reference
// (Publisher section removed)

export default function Discover() {
    const { user } = useAuth();
    const [bookFacts, setBookFacts] = useState([]);
    const [factsLoading, setFactsLoading] = useState(true);
    const [generatingFact, setGeneratingFact] = useState(false);

    // Hot Takes state (Groq-powered, realtime daily)
    const [hotTakes, setHotTakes] = useState([]);
    const [hotTakesLoading, setHotTakesLoading] = useState(true);
    const [generatingTakes, setGeneratingTakes] = useState(false);
    const [userVotes, setUserVotes] = useState({});

    // Active Readers state (realtime from Supabase)
    const [activeReaders, setActiveReaders] = useState([]);
    const [readersLoading, setReadersLoading] = useState(true);

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

    // Mood Search state
    const [moodInput, setMoodInput]             = useState('');
    const [moodSearching, setMoodSearching]     = useState(false);
    const [moodQuery, setMoodQuery]             = useState('');
    const [moodResults, setMoodResults]         = useState(null); // { ranked, allResults }
    const [moodError, setMoodError]             = useState(null);
    const moodInputRef = useRef(null);

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

        // Load Groq-powered hot takes
        (async () => {
            setHotTakesLoading(true);
            const takes = await getTodayHotTakes();
            setHotTakes(takes);
            setHotTakesLoading(false);

            // Load user's votes
            if (user) {
                const votes = await getUserVotes(user.id);
                setUserVotes(votes);
            }
        })();

        // Load active readers (realtime)
        (async () => {
            setReadersLoading(true);
            const readers = await getActiveReaders(8);
            setActiveReaders(readers);
            setReadersLoading(false);
        })();

        // Subscribe to realtime reading_sessions for live active readers
        const channel = supabase
            .channel('active-readers-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'reading_sessions',
            }, async () => {
                const readers = await getActiveReaders(8);
                setActiveReaders(readers);
            })
            .subscribe();

        // Refresh active readers every 60 seconds
        const readersInterval = setInterval(async () => {
            const readers = await getActiveReaders(8);
            setActiveReaders(readers);
        }, 60000);

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

        return () => {
            supabase.removeChannel(channel);
            clearInterval(readersInterval);
        };
    }, [user]);

    const handleGenerateHotTakes = async () => {
        if (generatingTakes) return;
        setGeneratingTakes(true);
        try {
            const result = await triggerHotTakesGeneration();
            if (result.success) {
                const takes = await getTodayHotTakes();
                setHotTakes(takes);
            }
        } catch (err) {
            console.error('Error generating hot takes:', err);
        } finally {
            setGeneratingTakes(false);
        }
    };

    const handleVote = async (hotTakeId, vote) => {
        if (!user) return;
        // Optimistic update
        setUserVotes(prev => ({ ...prev, [hotTakeId]: vote }));
        const result = await voteOnHotTake(user.id, hotTakeId, vote);
        if (result.success) {
            setHotTakes(prev => prev.map(t =>
                t.id === hotTakeId
                    ? { ...t, agree_count: result.agreeCount, disagree_count: result.disagreeCount }
                    : t
            ));
        }
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

    const handleMoodSearch = async (e, overrideInput) => {
        e?.preventDefault();
        const input = (overrideInput || moodInput).trim();
        if (!input || moodSearching) return;

        setMoodSearching(true);
        setMoodError(null);
        setMoodResults(null);
        setMoodQuery('');

        try {
            const { query, allResults, ranked } = await moodSearch(input, { maxResults: 10, topN: 5 });
            setMoodQuery(query);
            setMoodResults({ ranked, allResults });
        } catch (err) {
            console.error('Mood search error:', err);
            setMoodError('Something went wrong. Please try again.');
        } finally {
            setMoodSearching(false);
        }
    };

    const clearMoodSearch = () => {
        setMoodInput('');
        setMoodResults(null);
        setMoodQuery('');
        setMoodError(null);
        moodInputRef.current?.focus();
    };

    const MOOD_SUGGESTIONS = [
        'Something cozy and comforting',
        'A dark psychological thriller',
        'Light romance for the weekend',
        'Mind-bending sci-fi',
        'Non-fiction about the universe',
        'Short stories I can finish quickly',
    ];

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

            {/* ── Mood-Based Book Search ── */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-pink-400" />
                    <h2 className="text-xl font-bold text-white">What are you in the mood for?</h2>
                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full font-medium">AI Powered</span>
                </div>

                <form onSubmit={(e) => handleMoodSearch(e)} className="relative">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                            <input
                                ref={moodInputRef}
                                type="text"
                                value={moodInput}
                                onChange={(e) => setMoodInput(e.target.value)}
                                placeholder='Try "a cozy mystery for rainy days" or "epic fantasy with strong female lead"...'
                                className="w-full pl-12 pr-10 py-3.5 bg-surface border border-white/10 rounded-xl text-white placeholder-text-muted text-sm focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all"
                            />
                            {moodInput && (
                                <button
                                    type="button"
                                    onClick={clearMoodSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={!moodInput.trim() || moodSearching}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap",
                                moodSearching
                                    ? "bg-pink-500/30 text-pink-200 cursor-not-allowed"
                                    : moodInput.trim()
                                        ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600 shadow-lg shadow-pink-500/20"
                                        : "bg-white/5 text-text-muted cursor-not-allowed"
                            )}
                        >
                            {moodSearching ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                            ) : (
                                <><Wand2 className="w-4 h-4" /> Find Books</>
                            )}
                        </button>
                    </div>
                </form>

                {/* Quick mood suggestions */}
                {!moodResults && !moodSearching && (
                    <div className="flex flex-wrap gap-2">
                        {MOOD_SUGGESTIONS.map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => {
                                    setMoodInput(suggestion);
                                    handleMoodSearch({ preventDefault: () => {} }, suggestion);
                                }}
                                className="px-3 py-1.5 bg-white/5 hover:bg-pink-500/15 text-text-muted hover:text-pink-300 text-xs rounded-full border border-white/10 hover:border-pink-500/30 transition-all"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}

                {/* Searching animation */}
                {moodSearching && (
                    <div className="bg-surface border border-white/5 rounded-2xl p-8 text-center">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        <p className="text-sm text-text-muted">Understanding your mood and finding the perfect books...</p>
                    </div>
                )}

                {/* Error state */}
                {moodError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-300">
                        {moodError}
                    </div>
                )}

                {/* Results */}
                {moodResults && (
                    <div className="space-y-4">
                        {/* Generated query badge */}
                        {moodQuery && (
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                                <Sparkles className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                                <span>AI search query:</span>
                                <code className="bg-white/5 px-2 py-0.5 rounded text-pink-300 font-mono text-[11px]">{moodQuery}</code>
                            </div>
                        )}

                        {/* AI-Ranked Top Picks */}
                        {moodResults.ranked.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Award className="w-4 h-4 text-amber-400" />
                                    <h3 className="text-sm font-semibold text-white">
                                        Top {moodResults.ranked.length} Picks for You
                                    </h3>
                                </div>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                    {moodResults.ranked.map((book, idx) => (
                                        <a
                                            key={book.id}
                                            href={book.infoLink || book.previewLink || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group bg-surface border border-white/5 rounded-2xl p-4 hover:border-pink-500/40 transition-all flex flex-col"
                                        >
                                            <div className="relative mb-3">
                                                {book.thumbnail ? (
                                                    <img
                                                        src={book.thumbnail}
                                                        alt={book.title}
                                                        className="w-full h-48 object-cover rounded-xl bg-white/5"
                                                    />
                                                ) : (
                                                    <div className="w-full h-48 bg-gradient-to-br from-pink-500/10 to-violet-500/10 rounded-xl flex items-center justify-center">
                                                        <BookOpen className="w-10 h-10 text-text-muted opacity-30" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                                                    #{idx + 1}
                                                </div>
                                                {book.averageRating && (
                                                    <div className="absolute top-2 right-2 bg-black/70 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                        <Star className="w-2.5 h-2.5 fill-amber-400" /> {book.averageRating}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2 group-hover:text-pink-300 transition-colors flex-1">
                                                {book.title}
                                            </h3>
                                            <p className="text-text-muted text-xs mb-2 line-clamp-1">{book.authors}</p>
                                            {book.aiReason && (
                                                <p className="text-[11px] text-pink-300/80 bg-pink-500/10 border border-pink-500/20 rounded-lg px-2 py-1.5 line-clamp-2 leading-relaxed">
                                                    <Wand2 className="w-3 h-3 inline mr-1 -mt-0.5" />
                                                    {book.aiReason}
                                                </p>
                                            )}
                                            {book.pageCount && (
                                                <p className="text-[10px] text-text-muted mt-2">{book.pageCount} pages</p>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No results */}
                        {moodResults.ranked.length === 0 && moodResults.allResults.length === 0 && (
                            <div className="bg-surface border border-white/5 rounded-2xl p-8 text-center">
                                <Search className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
                                <p className="text-white font-semibold mb-1">No books found</p>
                                <p className="text-sm text-text-muted">Try rephrasing your mood or being more specific.</p>
                            </div>
                        )}

                        {/* Clear button */}
                        <div className="flex justify-center">
                            <button
                                onClick={clearMoodSearch}
                                className="text-xs text-text-muted hover:text-white transition-colors flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Clear results & search again
                            </button>
                        </div>
                    </div>
                )}
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

            {/* Active Readers — Realtime */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-sky-400" />
                    <h2 className="text-xl font-bold text-white">Active Readers</h2>
                    <div className="flex items-center gap-1.5 ml-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-xs text-emerald-400 font-medium">Live</span>
                    </div>
                </div>

                {readersLoading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="bg-surface/50 border border-white/5 rounded-2xl p-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-white/10 rounded w-2/3" />
                                        <div className="h-2 bg-white/10 rounded w-1/2" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeReaders.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {activeReaders.map((reader, idx) => {
                            const totalMin = Math.floor((reader.total_today_seconds || 0) / 60);
                            const hours = Math.floor(totalMin / 60);
                            const mins = totalMin % 60;
                            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                            const initial = (reader.username || '?')[0].toUpperCase();
                            const colors = [
                                'from-primary to-violet-600',
                                'from-emerald-500 to-teal-600',
                                'from-pink-500 to-rose-600',
                                'from-amber-500 to-orange-600',
                                'from-cyan-500 to-blue-600',
                                'from-red-500 to-pink-600',
                                'from-indigo-500 to-purple-600',
                                'from-lime-500 to-green-600',
                            ];
                            return (
                                <div key={reader.user_id + '-' + idx} className="bg-surface border border-white/5 rounded-2xl p-4 hover:border-sky-500/30 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        {reader.avatar_url ? (
                                            <img src={reader.avatar_url} alt={reader.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0", colors[idx % colors.length])}>
                                                {initial}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-white text-sm truncate">{reader.username}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                                <Clock size={10} />
                                                {timeStr} today
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-text-muted truncate mb-2">📖 {reader.book_title}</p>
                                    {reader.book_progress > 0 && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-sky-400 to-primary rounded-full transition-all" style={{ width: `${reader.book_progress}%` }} />
                                            </div>
                                            <span className="text-[10px] text-sky-400 font-semibold">{reader.book_progress}%</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-surface border border-white/5 rounded-2xl p-8 text-center">
                        <Users className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
                        <p className="text-white font-semibold mb-1">No active readers right now</p>
                        <p className="text-sm text-text-muted">Start a reading session to appear here!</p>
                    </div>
                )}
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

            {/* ── Hot Takes — Groq AI-powered daily debates ── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-400" />
                        <h2 className="text-xl font-bold text-white">Hot Takes</h2>
                        <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-medium">AI Daily</span>
                    </div>
                    {hotTakes.length === 0 && !hotTakesLoading && (
                        <button
                            onClick={handleGenerateHotTakes}
                            disabled={generatingTakes}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                generatingTakes
                                    ? "bg-white/5 text-text-muted cursor-not-allowed"
                                    : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                            )}
                        >
                            {generatingTakes ? (
                                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-3.5 h-3.5" /> Generate Takes</>
                            )}
                        </button>
                    )}
                </div>

                {hotTakesLoading ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="bg-surface/50 border border-white/5 rounded-2xl p-5 animate-pulse space-y-3">
                                <div className="h-4 bg-white/10 rounded w-3/4" />
                                <div className="h-3 bg-white/10 rounded w-1/2" />
                                <div className="h-8 bg-white/5 rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : hotTakes.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {hotTakes.map(take => {
                            const totalVotes = (take.agree_count || 0) + (take.disagree_count || 0);
                            const agreePercent = totalVotes > 0 ? Math.round((take.agree_count / totalVotes) * 100) : 50;
                            const userVote = userVotes[take.id];
                            const categoryColors = {
                                reading_habits: 'text-emerald-400 bg-emerald-500/15',
                                book_industry: 'text-blue-400 bg-blue-500/15',
                                pricing: 'text-amber-400 bg-amber-500/15',
                                technology: 'text-cyan-400 bg-cyan-500/15',
                                culture: 'text-pink-400 bg-pink-500/15',
                                debates: 'text-violet-400 bg-violet-500/15',
                            };

                            return (
                                <div key={take.id} className="bg-surface border border-white/5 rounded-2xl p-5 hover:border-orange-500/30 transition-all">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider", categoryColors[take.category] || 'text-text-muted bg-white/5')}>
                                            {take.category?.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] text-text-muted ml-auto">
                                            {take.topic}
                                        </span>
                                    </div>

                                    <p className="text-white font-medium mb-3 leading-relaxed text-sm">{take.take_text}</p>

                                    {/* Vote bar */}
                                    {totalVotes > 0 && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${agreePercent}%` }} />
                                            </div>
                                            <span className="text-[10px] font-semibold text-text-muted">{totalVotes} votes</span>
                                        </div>
                                    )}

                                    {/* Vote buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleVote(take.id, 'agree')}
                                            className={cn(
                                                "flex-1 py-2 text-xs font-semibold rounded-lg border transition-all",
                                                userVote === 'agree'
                                                    ? "bg-emerald-500/30 border-emerald-500/50 text-emerald-300"
                                                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                            )}
                                        >
                                            👍 Agree {totalVotes > 0 ? `${agreePercent}%` : ''}
                                        </button>
                                        <button
                                            onClick={() => handleVote(take.id, 'disagree')}
                                            className={cn(
                                                "flex-1 py-2 text-xs font-semibold rounded-lg border transition-all",
                                                userVote === 'disagree'
                                                    ? "bg-red-500/30 border-red-500/50 text-red-300"
                                                    : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                                            )}
                                        >
                                            👎 Disagree {totalVotes > 0 ? `${100 - agreePercent}%` : ''}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-8 text-center">
                        <Flame className="w-10 h-10 text-orange-400/40 mx-auto mb-3" />
                        <p className="text-white font-semibold mb-1">No hot takes today yet</p>
                        <p className="text-sm text-text-muted mb-4">Fresh AI-generated debates drop daily!</p>
                        <button
                            onClick={handleGenerateHotTakes}
                            disabled={generatingTakes}
                            className={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors",
                                generatingTakes
                                    ? "bg-white/5 text-text-muted cursor-not-allowed"
                                    : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                            )}
                        >
                            {generatingTakes ? (
                                <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Generate Today's Hot Takes</>
                            )}
                        </button>
                    </div>
                )}
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