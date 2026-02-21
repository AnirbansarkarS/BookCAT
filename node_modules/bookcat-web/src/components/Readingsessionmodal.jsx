import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Check, Clock, BookOpen, ChevronUp, ChevronDown, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { logReadingSession } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { eventBus, EVENTS } from '../utils/eventBus';
import { statsCache } from '../utils/statsCache';

export default function ReadingSessionModal({ book, intent, onClose, onComplete, onProgressSave }) {
    const { user } = useAuth();
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [startPage, setStartPage] = useState(book.current_page || 0);
    const [currentPage, setCurrentPage] = useState(book.current_page || 0);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [showPageInput, setShowPageInput] = useState(false);
    const [showSavedNotification, setShowSavedNotification] = useState(false);
    const intervalRef = useRef(null);
    const lastActivityRef = useRef(Date.now());
    const autoSaveRef = useRef(null);

    // Auto-pause after 5 minutes of inactivity (optional)
    const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const AUTO_SAVE_INTERVAL = 30 * 1000; // Auto-save every 30 seconds

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

    // Auto-save function
    const autoSaveProgress = useCallback(() => {
        if (elapsedSeconds === 0 && currentPage === startPage) return;
        
        const pagesRead = currentPage - startPage;
        const durationMinutes = Math.max(0, Math.floor(elapsedSeconds / 60));

        const sessionData = {
            bookId: book.id,
            bookTitle: book.title,
            bookCover: book.cover_url,
            elapsedSeconds,
            durationMinutes,
            pagesRead,
            currentPage,
            startPage,
            intent,
            sessionStartTime: sessionStartTime ? sessionStartTime.toISOString() : new Date().toISOString(),
            lastSaved: new Date().toISOString(),
        };

        statsCache.saveActiveSession(sessionData);
        eventBus.emit(EVENTS.STATS_REFRESH);
        console.log('🔄 Auto-saved progress:', sessionData);
    }, [book, currentPage, startPage, elapsedSeconds, intent, sessionStartTime]);

    // Auto-save effect
    useEffect(() => {
        if (isRunning) {
            autoSaveRef.current = setInterval(() => {
                autoSaveProgress();
            }, AUTO_SAVE_INTERVAL);
        } else {
            if (autoSaveRef.current) {
                clearInterval(autoSaveRef.current);
            }
        }

        return () => {
            if (autoSaveRef.current) {
                clearInterval(autoSaveRef.current);
            }
        };
    }, [isRunning, autoSaveProgress]);

    // Handle back button - auto-save and close
    const handleBack = async () => {
        // Pause the timer
        setIsRunning(false);

        const pagesRead = currentPage - startPage;
        const durationMinutes = Math.max(0, Math.floor(elapsedSeconds / 60));

        // Auto-save to cache
        if (elapsedSeconds > 0 || pagesRead > 0) {
            const sessionData = {
                bookId: book.id,
                bookTitle: book.title,
                bookCover: book.cover_url,
                elapsedSeconds,
                durationMinutes,
                pagesRead,
                currentPage,
                startPage,
                intent,
                sessionStartTime: sessionStartTime ? sessionStartTime.toISOString() : new Date().toISOString(),
                lastSaved: new Date().toISOString(),
            };

            statsCache.saveActiveSession(sessionData);

            if (onProgressSave) {
                onProgressSave(sessionData);
            }

            eventBus.emit(EVENTS.STATS_REFRESH);
            console.log('💾 Auto-saved on back:', sessionData);
        }

        onClose();
    };

    const handlePageIncrement = () => {
        if (book.total_pages && currentPage >= book.total_pages) return;
        setCurrentPage(prev => prev + 1);
    };

    const handlePageDecrement = () => {
        if (currentPage <= startPage) return;
        setCurrentPage(prev => prev - 1);
    };

    const handleSaveProgress = () => {
        // Pause the timer
        setIsRunning(false);

        const pagesRead = currentPage - startPage;
        const durationMinutes = Math.max(0, Math.floor(elapsedSeconds / 60));

        // Save to cache
        const sessionData = {
            bookId: book.id,
            bookTitle: book.title,
            bookCover: book.cover_url,
            elapsedSeconds,
            durationMinutes,
            pagesRead,
            currentPage,
            startPage,
            intent,
            sessionStartTime: sessionStartTime ? sessionStartTime.toISOString() : new Date().toISOString(),
            lastSaved: new Date().toISOString(),
        };

        statsCache.saveActiveSession(sessionData);

        if (onProgressSave) {
            onProgressSave(sessionData);
        }

        // Emit event to refresh dashboard
        eventBus.emit(EVENTS.STATS_REFRESH);

        // Show notification
        setShowSavedNotification(true);
        setTimeout(() => setShowSavedNotification(false), 3000);

        console.log('💾 Progress saved to cache:', sessionData);
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
            bookId: book.id,
            pagesRead,
            currentPage,
            startPage,
            duration: elapsedSeconds,
            durationMinutes,
            intent,
            startTime: sessionStartTime,
            endTime: new Date(),
        };

        console.log('📤 Calling onComplete with:', sessionData);
        onComplete(sessionData);

        // Clear active session cache
        statsCache.clearActiveSession();

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
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

            <div className="relative bg-gradient-to-br from-surface/95 to-background/95 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full my-2 sm:my-4 overflow-hidden max-h-[98vh] sm:max-h-[95vh] flex flex-col">
                {/* Header with Back Button */}
                <div className="p-3 sm:p-6 border-b border-white/10 flex-shrink-0">
                    {/* Back Button Row */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg sm:rounded-xl font-medium transition-colors text-sm sm:text-base"
                        >
                            <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Back</span>
                            <span className="text-xs text-text-muted ml-1">(auto-saves)</span>
                        </button>
                        
                        {/* Auto-save indicator */}
                        {isRunning && (
                            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="hidden sm:inline">Auto-saving</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-start gap-3 sm:gap-4">
                        {book.cover_url && (
                            <img
                                src={book.cover_url}
                                alt={book.title}
                                className="w-12 h-18 sm:w-16 sm:h-24 object-cover rounded-lg shadow-lg flex-shrink-0"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1 truncate">{book.title}</h2>
                            <p className="text-text-muted text-sm sm:text-base truncate">{book.authors || 'Unknown Author'}</p>
                            <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/20 text-primary rounded-full text-xs font-medium">
                                <BookOpen size={10} className="sm:w-3 sm:h-3" />
                                {intent} mode
                            </div>
                        </div>
                    </div>

                    {/* Save Notification */}
                    {showSavedNotification && (
                        <div className="mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-xs sm:text-sm text-emerald-400 font-medium">Progress saved!</span>
                        </div>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Timer Display */}
                    <div className="p-4 sm:p-8 text-center">
                        <div className="mb-4 sm:mb-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-32 sm:h-32 bg-primary/10 rounded-full mb-3 sm:mb-4 relative">
                                <Clock size={32} className={cn(
                                    "sm:w-12 sm:h-12 text-primary transition-all",
                                    isRunning && "animate-pulse"
                                )} />
                                {isRunning && (
                                    <div className="absolute inset-0 border-2 sm:border-4 border-primary/30 rounded-full animate-ping" />
                                )}
                            </div>
                            <div className="text-4xl sm:text-6xl font-bold text-white mb-1 sm:mb-2 font-mono">
                                {formatTime(elapsedSeconds)}
                            </div>
                            <p className="text-text-muted text-xs sm:text-base">
                                {elapsedSeconds < 60
                                    ? 'Just started...'
                                    : `${Math.floor(elapsedSeconds / 60)} min${Math.floor(elapsedSeconds / 60) !== 1 ? 's' : ''} of reading`
                                }
                            </p>
                        </div>

                        {/* Timer Controls */}
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-8">
                            {!isRunning ? (
                                <button
                                    onClick={handleStart}
                                    className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-8 py-3 sm:py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-sm sm:text-lg shadow-lg shadow-primary/30 transition-all hover:scale-105"
                                >
                                    <Play size={18} className="sm:w-6 sm:h-6" />
                                    {sessionStartTime ? 'Resume' : 'Start'}
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handlePause}
                                        className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm sm:text-lg shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
                                    >
                                        <Pause size={18} className="sm:w-6 sm:h-6" />
                                        Pause
                                    </button>
                                    <button
                                        onClick={handleSaveProgress}
                                        disabled={elapsedSeconds === 0 && currentPage === startPage}
                                        className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm sm:text-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
                                    >
                                        <Save size={18} className="sm:w-6 sm:h-6" />
                                        <span className="hidden sm:inline">Save Progress</span>
                                        <span className="sm:hidden">Save</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Page Progress */}
                    <div className="px-3 sm:px-8 pb-4 sm:pb-8">
                        <div className="bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <h3 className="text-base sm:text-lg font-semibold text-white">Page Progress</h3>
                                <button
                                    onClick={() => setShowPageInput(!showPageInput)}
                                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                    {showPageInput ? 'Quick' : 'Manual'}
                                </button>
                            </div>

                            {!showPageInput ? (
                                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                                    <button
                                        onClick={handlePageDecrement}
                                        disabled={currentPage <= startPage}
                                        className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg sm:rounded-xl transition-colors"
                                    >
                                        <ChevronDown size={20} className="sm:w-6 sm:h-6 text-white" />
                                    </button>

                                    <div className="text-center min-w-[80px]">
                                        <div className="text-3xl sm:text-4xl font-bold text-white mb-0.5 sm:mb-1">
                                            {currentPage}
                                        </div>
                                        <div className="text-xs sm:text-sm text-text-muted">
                                            of {book.total_pages || '?'}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePageIncrement}
                                        disabled={book.total_pages && currentPage >= book.total_pages}
                                        className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg sm:rounded-xl transition-colors"
                                    >
                                        <ChevronUp size={20} className="sm:w-6 sm:h-6 text-white" />
                                    </button>
                                </div>
                            ) : (
                                <div className="mb-3 sm:mb-4">
                                    <input
                                        type="number"
                                        value={currentPage}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value) || 0;
                                            const maxPage = book.total_pages || 9999;
                                            setCurrentPage(Math.max(startPage, Math.min(value, maxPage)));
                                        }}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white text-center text-xl sm:text-2xl font-bold focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                            )}

                            {/* Session Stats */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-white/10">
                                <div className="text-center">
                                    <div className="text-lg sm:text-2xl font-bold text-emerald-400">
                                        +{pagesRead}
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-text-muted mt-0.5 sm:mt-1">Pages</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg sm:text-2xl font-bold text-blue-400">
                                        {progressPercent}%
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-text-muted mt-0.5 sm:mt-1">Done</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg sm:text-2xl font-bold text-amber-400">
                                        {Math.floor(elapsedSeconds / 60)}m
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-text-muted mt-0.5 sm:mt-1">Time</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {book.total_pages && (
                                <div className="mt-3 sm:mt-4">
                                    <div className="w-full h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 sm:p-6 border-t border-white/10 bg-black/20 flex-shrink-0">
                    <div className="flex gap-2 sm:gap-3">
                        <button
                            onClick={handleBack}
                            className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg sm:rounded-xl font-medium transition-colors text-sm sm:text-base"
                        >
                            <span className="hidden sm:inline">Cancel</span>
                            <span className="sm:hidden">Exit</span>
                        </button>
                        <button
                            onClick={handleFinishSession}
                            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 text-sm sm:text-base"
                        >
                            <Check size={16} className="sm:w-5 sm:h-5" />
                            Save & Exit
                        </button>
                    </div>
                    <div className="text-center text-[10px] sm:text-xs text-text-muted mt-2 sm:mt-3">
                        {elapsedSeconds > 0 ? (
                            <p>
                                <span className="text-white font-semibold">{formatTime(elapsedSeconds)}</span> • <span className="text-white font-semibold">{pagesRead} pages</span>
                            </p>
                        ) : (
                            <p>Start timer or add pages</p>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
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
