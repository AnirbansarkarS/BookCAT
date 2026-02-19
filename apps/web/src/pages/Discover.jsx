import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Users, BookOpen, Sparkles, Instagram, Lightbulb,
    Flame, BarChart3, Clock, Star, Heart, MessageCircle, ExternalLink,
    RefreshCw, ChevronRight, Zap, Award, Coffee, Globe
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

// ═══════════════════════════════════════════════════════════
// MOCK DATA (Replace with real API calls)
// ═══════════════════════════════════════════════════════════

const TRENDING_BOOKS = [
    {
        id: 1,
        title: 'Tomorrow, and Tomorrow, and Tomorrow',
        author: 'Gabrielle Zevin',
        cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1636978687i/58784475.jpg',
        rating: 4.3,
        trend: '+23%',
        readers: 1243,
        tags: ['Fiction', 'Contemporary']
    },
    {
        id: 2,
        title: 'Fourth Wing',
        author: 'Rebecca Yarros',
        cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1701980900i/61431922.jpg',
        rating: 4.5,
        trend: '+45%',
        readers: 2891,
        tags: ['Fantasy', 'Romance']
    },
    {
        id: 3,
        title: 'The Housemaid',
        author: 'Freida McFadden',
        cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1643228739i/60194514.jpg',
        rating: 4.2,
        trend: '+18%',
        readers: 987,
        tags: ['Thriller', 'Mystery']
    },
    {
        id: 4,
        title: 'Happy Place',
        author: 'Emily Henry',
        cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1667240965i/61718053.jpg',
        rating: 4.1,
        trend: '+12%',
        readers: 756,
        tags: ['Romance', 'Contemporary']
    }
];

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

const PENGUIN_POSTS = [
    {
        id: 1,
        image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=400&fit=crop',
        caption: '📚 New arrivals that will transport you to another world',
        likes: 12453,
        comments: 234
    },
    {
        id: 2,
        image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop',
        caption: 'Weekend reading goals 💫',
        likes: 8921,
        comments: 156
    },
    {
        id: 3,
        image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop',
        caption: 'Vintage vibes for your TBR pile 📖',
        likes: 15678,
        comments: 289
    },
];

const FUN_FACTS = [
    "The smell of old books is caused by the breakdown of chemical compounds in the paper.",
    "The longest novel ever written is 'Artamène ou le Grand Cyrus' at 13,095 pages.",
    "Iceland publishes more books per capita than any other country.",
    "The most expensive book ever sold was the Codex Leicester by Leonardo da Vinci for $30.8 million.",
    "Reading can reduce stress by up to 68% in just 6 minutes.",
];

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

export default function Discover() {
    const { user } = useAuth();
    const [funFact, setFunFact] = useState(FUN_FACTS[0]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        // Rotate fun fact daily
        const factIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % FUN_FACTS.length;
        setFunFact(FUN_FACTS[factIndex]);
    }, []);

    const refreshFunFact = () => {
        setRefreshing(true);
        const currentIndex = FUN_FACTS.indexOf(funFact);
        const nextIndex = (currentIndex + 1) % FUN_FACTS.length;
        setFunFact(FUN_FACTS[nextIndex]);
        setTimeout(() => setRefreshing(false), 500);
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

            {/* Fun Fact of the Day */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-amber-400 mb-2">📚 Book Fact of the Day</h3>
                            <p className="text-white text-sm leading-relaxed">{funFact}</p>
                        </div>
                    </div>
                    <button
                        onClick={refreshFunFact}
                        disabled={refreshing}
                        className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors flex-shrink-0"
                    >
                        <RefreshCw className={cn('w-4 h-4 text-amber-400', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Trending Books */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold text-white">Trending Now</h2>
                    </div>
                    <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                        View all <ChevronRight size={14} />
                    </button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TRENDING_BOOKS.map(book => (
                        <div key={book.id} className="group bg-surface border border-white/5 rounded-2xl p-4 hover:border-primary/40 transition-all cursor-pointer">
                            <div className="relative mb-3">
                                <img src={book.cover} alt={book.title} className="w-full h-48 object-cover rounded-xl" />
                                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <TrendingUp size={10} />
                                    {book.trend}
                                </div>
                            </div>
                            <h3 className="font-semibold text-white text-sm mb-1 line-clamp-1">{book.title}</h3>
                            <p className="text-text-muted text-xs mb-2">{book.author}</p>
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1 text-amber-400">
                                    <Star size={12} fill="currentColor" />
                                    <span>{book.rating}</span>
                                </div>
                                <div className="flex items-center gap-1 text-text-muted">
                                    <Users size={12} />
                                    <span>{book.readers}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 mt-2">
                                {book.tags.map(tag => (
                                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-white/5 text-text-muted rounded-full">{tag}</span>
                                ))}
                            </div>
                        </div>
                    ))}
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

            {/* Penguin Random House Instagram */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Instagram className="w-5 h-5 text-pink-400" />
                        <h2 className="text-xl font-bold text-white">From Penguin Random House</h2>
                    </div>
                    <a href="https://www.instagram.com/penguinrandomhouse/" target="_blank" rel="noopener noreferrer"
                        className="text-sm text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors">
                        Follow <ExternalLink size={14} />
                    </a>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                    {PENGUIN_POSTS.map(post => (
                        <div key={post.id} className="group relative bg-surface border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-pink-500/40 transition-all">
                            <img src={post.image} alt="" className="w-full h-64 object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <p className="text-white text-sm mb-3">{post.caption}</p>
                                    <div className="flex items-center gap-4 text-xs text-white/80">
                                        <div className="flex items-center gap-1">
                                            <Heart size={14} />
                                            {post.likes.toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageCircle size={14} />
                                            {post.comments}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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