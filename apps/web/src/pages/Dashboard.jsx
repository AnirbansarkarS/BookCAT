import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, TrendingUp, Plus, Play, BarChart3, Lightbulb, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getUserBooks } from '../services/bookService';
import { getTodayBookFacts, triggerBookFactGeneration } from '../services/bookFactService';
import RealtimeStatsWidget from '../components/RealtimeStatsWidget';
import { cn } from '../lib/utils';
import { eventBus, EVENTS } from '../utils/eventBus';

export default function Dashboard() {
    const { user } = useAuth();
    const [recentBooks, setRecentBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [bookFacts, setBookFacts] = useState([]);
    const [factsLoading, setFactsLoading] = useState(true);
    const [generatingFact, setGeneratingFact] = useState(false);

    const loadRecentBooks = async () => {
        if (!user) return;

        try {
            const books = await getUserBooks(user.id);
            // Get books that are currently being read
            const reading = books
                .filter(b => b.status === 'Reading' || b.tags?.includes('reading_now'))
                .sort((a, b) => (b.progress || 0) - (a.progress || 0))
                .slice(0, 4);
            
            setRecentBooks(reading);
        } catch (err) {
            console.error('Error loading books:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBookFacts = async () => {
        setFactsLoading(true);
        try {
            const facts = await getTodayBookFacts();
            setBookFacts(facts);
        } catch (err) {
            console.error('Error loading book facts:', err);
        } finally {
            setFactsLoading(false);
        }
    };

    const handleGenerateFact = async () => {
        if (generatingFact) return;
        setGeneratingFact(true);
        try {
            const result = await triggerBookFactGeneration();
            if (result.success) {
                await loadBookFacts();
            }
        } catch (err) {
            console.error('Error generating fact:', err);
        } finally {
            setGeneratingFact(false);
        }
    };

    useEffect(() => {
        loadRecentBooks();
        loadBookFacts();

        // Listen for session completion events
        const handleRefresh = () => {
            console.log('📚 Dashboard refreshing books');
            loadRecentBooks();
        };

        eventBus.on(EVENTS.SESSION_COMPLETED, handleRefresh);
        eventBus.on(EVENTS.BOOK_UPDATED, handleRefresh);
        eventBus.on(EVENTS.STATS_REFRESH, handleRefresh);

        return () => {
            eventBus.off(EVENTS.SESSION_COMPLETED, handleRefresh);
            eventBus.off(EVENTS.BOOK_UPDATED, handleRefresh);
            eventBus.off(EVENTS.STATS_REFRESH, handleRefresh);
        };
    }, [user]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                    Welcome back, {user?.user_metadata?.username || 'Reader'}
                </h1>
                <p className="text-text-muted">Track your reading journey in real-time</p>
            </div>

            {/* Real-time Stats Widget */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Today's Progress
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        Live
                    </div>
                </div>
                <RealtimeStatsWidget />
            </div>

            {/* Book Fact of the Day */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        Book Fact of the Day
                    </h2>
                    {bookFacts.length < 2 && (
                        <button
                            onClick={handleGenerateFact}
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
                    <div className="bg-surface/50 border border-white/10 rounded-xl p-6 text-center">
                        <Lightbulb className="w-10 h-10 text-amber-400/40 mx-auto mb-3" />
                        <p className="text-text-muted text-sm mb-3">No facts yet today</p>
                        <button
                            onClick={handleGenerateFact}
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

            {/* Currently Reading */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Continue Reading
                    </h2>
                    <Link 
                        to="/library" 
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                        View All →
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-surface/50 border border-white/10 rounded-xl animate-pulse">
                                <div className="aspect-[2/3] bg-white/5" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 bg-white/10 rounded" />
                                    <div className="h-3 bg-white/10 rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : recentBooks.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {recentBooks.map((book) => {
                            const progressValue = book.total_pages
                                ? Math.min(100, Math.round(((book.current_page || 0) / book.total_pages) * 100))
                                : (book.progress || 0);

                            return (
                                <Link
                                    key={book.id}
                                    to={`/library`}
                                    className={cn(
                                        "group bg-surface rounded-xl overflow-hidden border border-white/5",
                                        "transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/20",
                                        "hover:border-primary/50"
                                    )}
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    <div className="aspect-[2/3] overflow-hidden relative">
                                        {book.cover_url ? (
                                            <img
                                                src={book.cover_url}
                                                alt={book.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                <BookOpen className="w-8 h-8 text-text-muted" />
                                            </div>
                                        )}
                                        
                                        {/* Progress overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                            <div className="text-white font-semibold text-sm mb-1">
                                                {progressValue}% complete
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-white/80">
                                                <Play size={12} />
                                                Continue
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                            <div 
                                                className={cn(
                                                    "h-full transition-all duration-700",
                                                    progressValue === 100 
                                                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" 
                                                        : "bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.6)]"
                                                )}
                                                style={{ width: `${progressValue}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3">
                                        <h3 className="font-semibold text-white text-sm truncate" title={book.title}>
                                            {book.title}
                                        </h3>
                                        <p className="text-xs text-text-muted truncate mt-1">
                                            {book.authors || 'Unknown Author'}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-surface/50 border border-white/10 rounded-xl p-8 text-center">
                        <BookOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-white font-semibold mb-2">No books in progress</h3>
                        <p className="text-text-muted text-sm mb-4">Start reading to see your books here</p>
                        <Link
                            to="/library"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
                        >
                            <Plus size={16} />
                            Browse Library
                        </Link>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-4">
                <Link
                    to="/library"
                    className={cn(
                        "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-6",
                        "hover:shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all duration-300",
                        "group cursor-pointer"
                    )}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-white">Library</h3>
                    </div>
                    <p className="text-sm text-text-muted mb-3">
                        Browse your collection and start reading
                    </p>
                    <div className="text-sm text-primary font-medium group-hover:gap-2 flex items-center gap-1 transition-all">
                        View Library
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Link>

                <Link
                    to="/stats"
                    className={cn(
                        "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-6",
                        "hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-105 transition-all duration-300",
                        "group cursor-pointer"
                    )}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h3 className="font-semibold text-white">Stats</h3>
                    </div>
                    <p className="text-sm text-text-muted mb-3">
                        View your reading analytics and insights
                    </p>
                    <div className="text-sm text-emerald-400 font-medium group-hover:gap-2 flex items-center gap-1 transition-all">
                        View Stats
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Link>

                <div
                    className={cn(
                        "bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-xl p-6",
                        "hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300",
                        "group cursor-pointer"
                    )}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <h3 className="font-semibold text-white">Reading Sessions</h3>
                    </div>
                    <p className="text-sm text-text-muted mb-3">
                        Start a timed reading session with any book
                    </p>
                    <div className="text-sm text-amber-400 font-medium group-hover:gap-2 flex items-center gap-1 transition-all">
                        Start Session
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
