import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, BookOpen, CheckCircle, Pause, Play, StopCircle, Save, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { getUserBooks, updateBookStatus, logReadingSession } from '../services/bookService';
import { supabase } from '../lib/supabase';

export default function ReadingMode() {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [book, setBook] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timer, setTimer] = useState(0);
    const [sessionState, setSessionState] = useState('opening'); // opening, reading, saving, finished
    const [endPage, setEndPage] = useState('');
    const [note, setNote] = useState('');
    const [startTime, setStartTime] = useState(null);

    // Animation refs
    const bookRef = useRef(null);

    useEffect(() => {
        loadBook();
    }, [bookId, user]);

    useEffect(() => {
        let interval;
        if (isTimerActive && sessionState === 'reading') {
            interval = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerActive, sessionState]);

    const loadBook = async () => {
        if (!user) return;
        try {
            // Fetch directly to get single book (simulating with list fetch for now or adding getBookById)
            // For now, let's use the existing getUserBooks which returns all, and filter. 
            // Better to add getBookById but this works for MVP.
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('id', bookId)
                .single();

            if (error) throw error;
            setBook(data);
            setEndPage(data.current_page || 0);

            // Start "opening" animation sequence
            setTimeout(() => {
                setSessionState('reading');
                setIsTimerActive(true);
                setStartTime(new Date());
            }, 1500);
        } catch (err) {
            console.error('Error loading book:', err);
            // navigate('/library');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleStopSession = () => {
        setIsTimerActive(false);
        setSessionState('saving');
    };

    const handleSaveSession = async () => {
        if (!book) return;

        try {
            const pagesRead = Math.max(0, parseInt(endPage) - (book.current_page || 0));

            // 1. Log Session
            await logReadingSession(user.id, book.id, timer, pagesRead);

            // 2. Update Book Status
            const newProgress = book.total_pages
                ? Math.min(100, Math.round((parseInt(endPage) / book.total_pages) * 100))
                : book.progress;

            const newStatus = parseInt(endPage) >= (book.total_pages || 999999)
                ? 'Completed'
                : 'Reading';

            await updateBookStatus(book.id, newStatus, newProgress, parseInt(endPage));

            setSessionState('finished');
            setTimeout(() => navigate('/library'), 2000);
        } catch (err) {
            console.error('Error saving session:', err);
            alert('Failed to save session');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!book) return null;

    return (
        <div className="min-h-screen bg-background text-text-primary flex flex-col relative overflow-hidden">

            {/* Background Atmosphere */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 p-6 flex items-center justify-between border-b border-white/5 bg-background/50 backdrop-blur-sm">
                <Link to="/library" className="flex items-center gap-2 text-text-muted hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                    <span>Back to Library</span>
                </Link>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <span className={`w-2 h-2 rounded-full ${isTimerActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-sm font-mono text-text-secondary">
                        {isTimerActive ? 'Recording Session' : 'Session Paused'}
                    </span>
                </div>
            </header>

            <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6">

                {/* Book Opening Animation / Visual */}
                <div className={cn(
                    "relative transition-all duration-1000 ease-in-out transform",
                    sessionState === 'opening' ? "scale-95 opacity-50" : "scale-100 opacity-100"
                )}>
                    <div className="relative w-48 h-72 md:w-64 md:h-96 rounded-r-2xl rounded-l-md shadow-2xl bg-white/5 border-l-4 border-white/10 flex items-center justify-center overflow-hidden mb-8 group">
                        {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                            <BookOpen className="w-16 h-16 text-text-muted" />
                        )}

                        {/* Lighting Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-white/10 pointer-events-none" />
                    </div>
                </div>

                {/* Session Info & Controls */}
                <div className="text-center space-y-6 max-w-md w-full">

                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold text-white">{book.title}</h1>
                        <p className="text-text-muted">{book.authors}</p>
                    </div>

                    {sessionState !== 'saving' && sessionState !== 'finished' && (
                        <div className="space-y-8">
                            <div className="font-mono text-6xl md:text-7xl font-light text-white tracking-widest tabular-nums from-primary to-accent bg-clip-text">
                                {formatTime(timer)}
                            </div>

                            <div className="flex items-center justify-center gap-6">
                                <button
                                    onClick={() => setIsTimerActive(!isTimerActive)}
                                    className={cn(
                                        "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                                        isTimerActive
                                            ? "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                            : "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
                                    )}
                                >
                                    {isTimerActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                                </button>

                                <button
                                    onClick={handleStopSession}
                                    className="w-16 h-16 rounded-full flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-white border border-white/10 hover:border-red-500/50 transition-all group"
                                >
                                    <StopCircle size={28} className="text-text-muted group-hover:text-red-400" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Saving State */}
                    {sessionState === 'saving' && (
                        <div className="bg-surface p-6 rounded-2xl border border-white/10 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-semibold text-white">Session Summary</h3>

                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="p-3 bg-background rounded-lg border border-white/5">
                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Time Read</p>
                                    <p className="text-lg font-mono">{formatTime(timer)}</p>
                                </div>
                                <div className="p-3 bg-background rounded-lg border border-white/5">
                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Started At</p>
                                    <p className="text-lg font-mono">{book.current_page || 0}</p>
                                </div>
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="text-sm font-medium text-text-secondary block">
                                    I stopped at page...
                                </label>
                                <input
                                    type="number"
                                    value={endPage}
                                    onChange={(e) => setEndPage(e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                                    placeholder={book.current_page || "0"}
                                    autoFocus
                                />
                                {book.total_pages && (
                                    <div className="flex justify-between text-xs text-text-muted px-1">
                                        <span>Current: {book.current_page}</span>
                                        <span>Total: {book.total_pages}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setSessionState('reading');
                                        setIsTimerActive(true);
                                    }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
                                >
                                    Resume Reading
                                </button>
                                <button
                                    onClick={handleSaveSession}
                                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Save Progress
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Finished State */}
                    {sessionState === 'finished' && (
                        <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 space-y-4 animate-in zoom-in-95">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white">Session Saved!</h3>
                            <p className="text-text-muted">Great job! Your reading progress has been updated.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
