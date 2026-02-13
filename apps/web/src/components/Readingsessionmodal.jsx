import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Check, Clock, BookOpen, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { logReadingSession } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';

export default function ReadingSessionModal({ book, intent, onClose, onComplete }) {
    const { user } = useAuth();
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [startPage, setStartPage] = useState(book.current_page || 0);
    const [currentPage, setCurrentPage] = useState(book.current_page || 0);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [showPageInput, setShowPageInput] = useState(false);
    const intervalRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    // Auto-pause after 5 minutes of inactivity (optional)
    const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    useEffect(() => {
        // Track user activity
        const handleActivity = () => {
            lastActivityRef.current = Date.now();
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
        };
    }, []);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                // Check for inactivity
                const timeSinceActivity = Date.now() - lastActivityRef.current;
                if (timeSinceActivity > INACTIVITY_THRESHOLD) {
                    handlePause();
                    return;
                }

                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning]);

    const handleStart = () => {
        setIsRunning(true);
        if (!sessionStartTime) {
            setSessionStartTime(new Date());
        }
        lastActivityRef.current = Date.now();
    };

    const handlePause = () => {
        setIsRunning(false);
    };

    const handlePageIncrement = () => {
        if (book.total_pages && currentPage >= book.total_pages) return;
        setCurrentPage(prev => prev + 1);
    };

    const handlePageDecrement = () => {
        if (currentPage <= startPage) return;
        setCurrentPage(prev => prev - 1);
    };

const handleFinishSession = async () => {
    const pagesRead = currentPage - startPage;
    const durationMinutes = Math.max(0, Math.floor(elapsedSeconds / 60));

    console.log('💾 Attempting to save session:', {
        elapsedSeconds,
        durationMinutes,
        pagesRead,
        intent
    });

    // Save if there's either time spent OR pages read
    if (user && (durationMinutes > 0 || pagesRead > 0)) {
        try {
            // Use at least 1 minute for database constraint
            const dbDuration = durationMinutes > 0 ? durationMinutes : (pagesRead > 0 ? 1 : 0);
            
            if (dbDuration > 0) {
                console.log('💾 Saving to database:', {
                    userId: user.id,
                    bookId: book.id,
                    durationMinutes: dbDuration,
                    pagesRead,
                    intent
                });

                const result = await logReadingSession(
                    user.id,
                    book.id,
                    dbDuration,
                    pagesRead,
                    intent
                );

                if (result.error) {
                    console.error('❌ Failed to save session:', result.error);
                } else {
                    console.log('✅ Session saved successfully');
                }
            }
        } catch (err) {
            console.error('Failed to log reading session:', err);
        }
    } else {
        console.log('ℹ️ No time or pages to save');
    }

    // Always complete the session and emit events
    const sessionData = {
        pagesRead,
        duration: elapsedSeconds,
        durationMinutes,
        intent,
        startTime: sessionStartTime,
        endTime: new Date(),
    };

    console.log('📤 Calling onComplete with:', sessionData);
    onComplete(sessionData);

    onClose();
};

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const pagesRead = currentPage - startPage;
    const progressPercent = book.total_pages 
        ? Math.min(100, Math.round((currentPage / book.total_pages) * 100))
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            {/* Background with book cover blur */}
            {book.cover_url && (
                <div 
                    className="absolute inset-0 opacity-10 blur-3xl"
                    style={{
                        backgroundImage: `url(${book.cover_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
            )}

            <div className="relative bg-gradient-to-br from-surface/95 to-background/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                            {book.cover_url && (
                                <img 
                                    src={book.cover_url} 
                                    alt={book.title}
                                    className="w-16 h-24 object-cover rounded-lg shadow-lg"
                                />
                            )}
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{book.title}</h2>
                                <p className="text-text-muted">{book.authors || 'Unknown Author'}</p>
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium">
                                    <BookOpen size={12} />
                                    {intent} mode
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-text-muted" />
                        </button>
                    </div>
                </div>

                {/* Timer Display */}
                <div className="p-8 text-center">
                    <div className="mb-6">
                        <div className="inline-flex items-center justify-center w-32 h-32 bg-primary/10 rounded-full mb-4 relative">
                            <Clock size={48} className={cn(
                                "text-primary transition-all",
                                isRunning && "animate-pulse"
                            )} />
                            {isRunning && (
                                <div className="absolute inset-0 border-4 border-primary/30 rounded-full animate-ping" />
                            )}
                        </div>
                        <div className="text-6xl font-bold text-white mb-2 font-mono">
                            {formatTime(elapsedSeconds)}
                        </div>
                        <p className="text-text-muted">
                            {elapsedSeconds < 60 
                                ? 'Just started...' 
                                : `${Math.floor(elapsedSeconds / 60)} minute${Math.floor(elapsedSeconds / 60) !== 1 ? 's' : ''} of focused reading`
                            }
                        </p>
                    </div>

                    {/* Timer Controls */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {!isRunning ? (
                            <button
                                onClick={handleStart}
                                className="flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-lg shadow-lg shadow-primary/30 transition-all hover:scale-105"
                            >
                                <Play size={24} />
                                {sessionStartTime ? 'Resume' : 'Start Reading'}
                            </button>
                        ) : (
                            <button
                                onClick={handlePause}
                                className="flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
                            >
                                <Pause size={24} />
                                Pause
                            </button>
                        )}
                    </div>
                </div>

                {/* Page Progress */}
                <div className="px-8 pb-8">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Page Progress</h3>
                            <button
                                onClick={() => setShowPageInput(!showPageInput)}
                                className="text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                                {showPageInput ? 'Quick Controls' : 'Manual Input'}
                            </button>
                        </div>

                        {!showPageInput ? (
                            <>
                                {/* Quick Page Controls */}
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <button
                                        onClick={handlePageDecrement}
                                        disabled={currentPage <= startPage}
                                        className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors"
                                    >
                                        <ChevronUp size={24} className="text-white rotate-180" />
                                    </button>
                                    
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-white mb-1">
                                            {currentPage}
                                        </div>
                                        <div className="text-sm text-text-muted">
                                            of {book.total_pages || '?'} pages
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePageIncrement}
                                        disabled={book.total_pages && currentPage >= book.total_pages}
                                        className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors"
                                    >
                                        <ChevronUp size={24} className="text-white" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Manual Page Input */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                        Current Page
                                    </label>
                                    <input
                                        type="number"
                                        value={currentPage}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value) || 0;
                                            const maxPage = book.total_pages || 9999;
                                            setCurrentPage(Math.max(startPage, Math.min(value, maxPage)));
                                        }}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-bold focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                            </>
                        )}

                        {/* Session Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-emerald-400">
                                    +{pagesRead}
                                </div>
                                <div className="text-xs text-text-muted mt-1">Pages Read</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-400">
                                    {progressPercent}%
                                </div>
                                <div className="text-xs text-text-muted mt-1">Complete</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-amber-400">
                                    {Math.floor(elapsedSeconds / 60)}m
                                </div>
                                <div className="text-xs text-text-muted mt-1">Time Spent</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {book.total_pages && (
                            <div className="mt-4">
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 bg-black/20">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
                        >
                            Cancel (Don't Save)
                        </button>
                        <button
                            onClick={handleFinishSession}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:scale-105"
                        >
                            <Check size={20} />
                            Save & Exit
                        </button>
                    </div>
                    <div className="text-center text-xs text-text-muted mt-3">
                        {elapsedSeconds > 0 ? (
                            <p>
                                Will save: <span className="text-white font-semibold">{formatTime(elapsedSeconds)}</span> • <span className="text-white font-semibold">{pagesRead} pages</span>
                            </p>
                        ) : (
                            <p>
                                Start the timer or add pages, then click Save & Exit
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes ping {
                    75%, 100% {
                        transform: scale(1.1);
                        opacity: 0;
                    }
                }
                .animate-ping {
                    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
}