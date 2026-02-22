import React, { useState, useEffect, useRef } from 'react';
import { Clock, BookOpen, TrendingUp, Calendar, Tag, Zap, Award, BarChart3, PieChart, Activity } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getReadingSessions, getUserBooks } from '../services/bookService';
import { cn } from '../lib/utils';
import { eventBus, EVENTS } from '../utils/eventBus';
import { statsCache } from '../utils/statsCache';
import { logMilestone } from '../services/activityService';

// Milestone tracking utilities
const MILESTONES_STORAGE_KEY = 'bookcat_achieved_milestones';

const getAchievedMilestones = () => {
    try {
        return JSON.parse(localStorage.getItem(MILESTONES_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
};

const markMilestoneAchieved = (milestoneKey) => {
    const achieved = getAchievedMilestones();
    achieved[milestoneKey] = new Date().toISOString();
    localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(achieved));
};

const isMilestoneAchieved = (milestoneKey) => {
    return !!getAchievedMilestones()[milestoneKey];
};

export default function Stats() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [books, setBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('all'); // all, today, week, month
    const milestoneCheckRef = useRef(false);

    // Check and log milestones
    const checkMilestones = async (sessionsData, booksData) => {
        if (!user || milestoneCheckRef.current) return;
        milestoneCheckRef.current = true;

        const totalPages = sessionsData.reduce((total, s) => total + (s.pages_read || 0), 0);
        const completedBooks = booksData.filter(b => b.status === 'Completed' || b.tags?.includes('finished'));
        const booksThisYear = completedBooks.filter(b => {
            const completedDate = b.finished_at || b.updated_at;
            return completedDate && new Date(completedDate).getFullYear() === new Date().getFullYear();
        }).length;

        // Page milestones
        const pageMilestones = [100, 500, 1000, 5000, 10000];
        for (const milestone of pageMilestones) {
            const key = `pages_${milestone}`;
            if (totalPages >= milestone && !isMilestoneAchieved(key)) {
                await logMilestone(
                    user.id,
                    `🎉 Read ${milestone.toLocaleString()} pages total!`,
                    { milestone_type: 'pages', value: milestone }
                );
                markMilestoneAchieved(key);
            }
        }

        // Books completed milestones
        const bookMilestones = [1, 5, 10, 25, 50, 100];
        for (const milestone of bookMilestones) {
            const key = `books_completed_${milestone}`;
            if (completedBooks.length >= milestone && !isMilestoneAchieved(key)) {
                await logMilestone(
                    user.id,
                    `🏆 Completed ${milestone} book${milestone > 1 ? 's' : ''}!`,
                    { milestone_type: 'books_completed', value: milestone }
                );
                markMilestoneAchieved(key);
            }
        }

        // Yearly book milestones
        const yearlyMilestones = [5, 10, 20, 52];
        const currentYear = new Date().getFullYear();
        for (const milestone of yearlyMilestones) {
            const key = `yearly_books_${currentYear}_${milestone}`;
            if (booksThisYear >= milestone && !isMilestoneAchieved(key)) {
                await logMilestone(
                    user.id,
                    `🏆 Completed ${milestone} books in ${currentYear}!`,
                    { milestone_type: 'yearly_books', value: milestone, year: currentYear }
                );
                markMilestoneAchieved(key);
            }
        }
    };

    const loadData = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            const [sessionsData, booksData] = await Promise.all([
                getReadingSessions(user.id),
                getUserBooks(user.id)
            ]);

            const activeSession = statsCache.getActiveSession();
            const mergedSessions = activeSession
                ? [{
                    id: 'active-session',
                    book_id: activeSession.bookId || null,
                    created_at: activeSession.lastSaved || activeSession.sessionStartTime || new Date().toISOString(),
                    duration_minutes: activeSession.durationMinutes || 0,
                    duration_seconds: (activeSession.durationMinutes || 0) * 60,
                    pages_read: activeSession.pagesRead || 0,
                    intent: activeSession.intent || null,
                }, ...(sessionsData || [])]
                : (sessionsData || []);

            setSessions(mergedSessions);
            setBooks(booksData || []);

            // Check for milestones after loading data
            await checkMilestones(mergedSessions, booksData || []);
        } catch (err) {
            console.error('Error loading stats:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Real-time refresh every 30 seconds
        const refreshInterval = setInterval(() => {
            loadData();
        }, 30000);

        const handleStatsRefresh = () => {
            loadData();
        };

        eventBus.on(EVENTS.SESSION_COMPLETED, handleStatsRefresh);
        eventBus.on(EVENTS.BOOK_UPDATED, handleStatsRefresh);
        eventBus.on(EVENTS.STATS_REFRESH, handleStatsRefresh);

        return () => {
            clearInterval(refreshInterval);
            eventBus.off(EVENTS.SESSION_COMPLETED, handleStatsRefresh);
            eventBus.off(EVENTS.BOOK_UPDATED, handleStatsRefresh);
            eventBus.off(EVENTS.STATS_REFRESH, handleStatsRefresh);
        };
    }, [user]);

    const getSessionSeconds = (session) => {
        const seconds = Number(session.duration_seconds);
        if (Number.isFinite(seconds) && seconds > 0) {
            return seconds;
        }

        const minutes = Number(session.duration_minutes);
        if (Number.isFinite(minutes) && minutes > 0) {
            return Math.round(minutes * 60);
        }

        return 0;
    };

    // ============= TIME-BASED STATS =============
    
    const getTotalReadingTime = () => {
        return sessions.reduce((total, session) => total + getSessionSeconds(session), 0);
    };

    const getTimeForPeriod = (period) => {
        const now = new Date();
        let startDate;

        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === 'week') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
        }

        return sessions
            .filter(s => new Date(s.created_at) >= startDate)
            .reduce((total, s) => total + getSessionSeconds(s), 0);
    };

    const getAvgSessionLength = () => {
        if (sessions.length === 0) return 0;
        return Math.round(getTotalReadingTime() / sessions.length);
    };

    const getLongestSession = () => {
        if (sessions.length === 0) return 0;
        return Math.max(...sessions.map(s => getSessionSeconds(s)));
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const formatTimeDetailed = (seconds) => {
        const days = Math.floor(seconds / (60 * 60 * 24));
        const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
        const mins = Math.floor((seconds % (60 * 60)) / 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
        
        return parts.join(' ');
    };

    // ============= PAGE-BASED STATS =============

    const getTotalPagesRead = () => {
        return sessions.reduce((total, session) => total + (session.pages_read || 0), 0);
    };

    const getPagesPerDay = () => {
        if (sessions.length === 0) return 0;
        const firstSession = new Date(sessions[sessions.length - 1].created_at);
        const daysSince = Math.max(1, Math.ceil((new Date() - firstSession) / (1000 * 60 * 60 * 24)));
        return Math.round(getTotalPagesRead() / daysSince);
    };

    const getPagesPerHour = () => {
        const totalSeconds = getTotalReadingTime();
        const totalPages = getTotalPagesRead();
        if (totalSeconds === 0) return 0;
        return Math.round(totalPages / (totalSeconds / 3600));
    };

    // ============= BOOK COMPLETION STATS =============

    const getBooksByStatus = () => {
        const finished = books.filter(b => b.status === 'Completed' || b.tags?.includes('finished')).length;
        const reading = books.filter(b => b.status === 'Reading' || b.tags?.includes('reading_now')).length;
        const abandoned = books.filter(b => b.status === 'Abandoned' || b.tags?.includes('abandoned')).length;
        
        return { finished, reading, abandoned };
    };

    const getAvgTimePerBook = () => {
        const finishedBooks = books.filter(b => b.status === 'Completed' || b.tags?.includes('finished'));
        if (finishedBooks.length === 0) return 0;

        const totalTimeForFinished = sessions
            .filter(s => finishedBooks.some(b => b.id === s.book_id))
            .reduce((total, s) => total + getSessionSeconds(s), 0);

        return Math.round(totalTimeForFinished / finishedBooks.length);
    };

    // ============= TAG-BASED INSIGHTS =============

    const getTagStats = () => {
        const tagData = {};
        
        sessions.forEach(session => {
            const book = books.find(b => b.id === session.book_id);
            if (!book || !book.tags) return;

            book.tags.forEach(tag => {
                // Skip system tags for intent insights
                if (['reading_now', 'want_to_read', 'finished', 'abandoned', 're_reading'].includes(tag)) return;

                if (!tagData[tag]) {
                    tagData[tag] = {
                        time: 0,
                        pages: 0,
                        sessions: 0
                    };
                }
                tagData[tag].time += getSessionSeconds(session);
                tagData[tag].pages += session.pages_read || 0;
                tagData[tag].sessions += 1;
            });
        });

        return tagData;
    };

    const getIntentStats = () => {
        const intentData = {
            study: { time: 0, sessions: 0, color: 'text-blue-400' },
            relax: { time: 0, sessions: 0, color: 'text-amber-400' },
            research: { time: 0, sessions: 0, color: 'text-purple-400' },
            habit: { time: 0, sessions: 0, color: 'text-emerald-400' }
        };

        sessions.forEach(session => {
            if (session.intent && intentData[session.intent]) {
                intentData[session.intent].time += getSessionSeconds(session);
                intentData[session.intent].sessions += 1;
            }
        });

        return intentData;
    };

    // ============= CONSISTENCY & HABIT STATS =============

    const getReadingStreak = () => {
        if (sessions.length === 0) return 0;

        const dates = [...new Set(sessions.map(s => 
            new Date(s.created_at).toDateString()
        ))].sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        const today = new Date().toDateString();
        
        for (let i = 0; i < dates.length; i++) {
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - i);
            
            if (dates[i] === expectedDate.toDateString()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    };

    const getSessionsPerWeek = () => {
        const weekSessions = sessions.filter(s => {
            const sessionDate = new Date(s.created_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return sessionDate >= weekAgo;
        });
        return weekSessions.length;
    };

    const getBestReadingDay = () => {
        const dayCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        sessions.forEach(session => {
            const day = new Date(session.created_at).getDay();
            dayCount[day] += getSessionSeconds(session);
        });

        const bestDay = Object.keys(dayCount).reduce((a, b) => 
            dayCount[a] > dayCount[b] ? a : b
        );

        return dayNames[bestDay];
    };

    const getBestReadingTime = () => {
        const morningTime = sessions.filter(s => {
            const hour = new Date(s.created_at).getHours();
            return hour >= 6 && hour < 12;
        }).reduce((sum, s) => sum + getSessionSeconds(s), 0);

        const afternoonTime = sessions.filter(s => {
            const hour = new Date(s.created_at).getHours();
            return hour >= 12 && hour < 18;
        }).reduce((sum, s) => sum + getSessionSeconds(s), 0);

        const eveningTime = sessions.filter(s => {
            const hour = new Date(s.created_at).getHours();
            return hour >= 18 || hour < 6;
        }).reduce((sum, s) => sum + getSessionSeconds(s), 0);

        const max = Math.max(morningTime, afternoonTime, eveningTime);
        if (max === morningTime) return 'Morning';
        if (max === afternoonTime) return 'Afternoon';
        return 'Evening';
    };

    // ============= WEEKLY TIME GRAPH DATA =============

    const getWeeklyData = () => {
        const weekData = Array(7).fill(0);
        const today = new Date();
        
        sessions.forEach(session => {
            const sessionDate = new Date(session.created_at);
            const daysAgo = Math.floor((today - sessionDate) / (1000 * 60 * 60 * 24));
            
            if (daysAgo < 7) {
                weekData[6 - daysAgo] += Math.round(getSessionSeconds(session) / 60);
            }
        });

        return weekData;
    };

    // ============= RENDER =============

    const totalTime = getTotalReadingTime();
    const todayTime = getTimeForPeriod('today');
    const weekTime = getTimeForPeriod('week');
    const monthTime = getTimeForPeriod('month');
    const avgSession = getAvgSessionLength();
    const longestSession = getLongestSession();
    
    const totalPages = getTotalPagesRead();
    const pagesPerDay = getPagesPerDay();
    const pagesPerHour = getPagesPerHour();
    
    const bookStats = getBooksByStatus();
    const avgTimePerBook = getAvgTimePerBook();
    
    const tagStats = getTagStats();
    const intentStats = getIntentStats();
    
    const streak = getReadingStreak();
    const sessionsThisWeek = getSessionsPerWeek();
    const bestDay = getBestReadingDay();
    const bestTime = getBestReadingTime();
    
    const weeklyData = getWeeklyData();
    const maxWeeklyTime = Math.max(...weeklyData, 1);

    const topTags = Object.entries(tagStats)
        .sort((a, b) => b[1].time - a[1].time)
        .slice(0, 5);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                    <Activity className="w-12 h-12 text-primary animate-pulse mx-auto" />
                    <p className="text-text-muted">Loading your stats...</p>
                </div>
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No reading data yet</h3>
                <p className="text-text-muted mb-6">Start a reading session to see your stats</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Reading Stats</h1>
                <p className="text-text-muted">Measuring effort & consistency, not vanity metrics.</p>
            </div>

            {/* ========== TIME-BASED STATS (HERO) ========== */}
            <div className="bg-gradient-to-br from-primary/20 to-blue-500/10 border border-primary/30 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Clock className="w-8 h-8 text-primary" />
                    <h2 className="text-2xl font-bold text-white">Time Investment</h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-white mb-1">
                            {formatTimeDetailed(totalTime)}
                        </div>
                        <div className="text-sm text-text-muted">Lifetime</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-emerald-400 mb-1">
                            {formatTime(todayTime)}
                        </div>
                        <div className="text-sm text-text-muted">Today</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-blue-400 mb-1">
                            {formatTime(weekTime)}
                        </div>
                        <div className="text-sm text-text-muted">This Week</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-purple-400 mb-1">
                            {formatTime(monthTime)}
                        </div>
                        <div className="text-sm text-text-muted">This Month</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-2xl font-bold text-white mb-1">{formatTime(avgSession)}</div>
                        <div className="text-xs text-text-muted">Avg Session</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-2xl font-bold text-amber-400 mb-1">{formatTime(longestSession)}</div>
                        <div className="text-xs text-text-muted">Longest Session</div>
                    </div>
                </div>
            </div>

            {/* ========== WEEKLY TIME GRAPH ========== */}
            <div className="bg-surface border border-white/10 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        <h2 className="text-lg sm:text-xl font-bold text-white">Weekly Reading Time</h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="hidden sm:inline">Real-time</span>
                    </div>
                </div>

                {/* Graph Container */}
                <div className="relative">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-8 w-8 sm:w-10 flex flex-col justify-between text-[10px] sm:text-xs text-text-muted">
                        <span>{maxWeeklyTime}m</span>
                        <span>{Math.round(maxWeeklyTime * 0.5)}m</span>
                        <span>0m</span>
                    </div>

                    {/* Graph Area */}
                    <div className="ml-8 sm:ml-10">
                        {/* Grid lines */}
                        <div className="absolute left-8 sm:left-10 right-0 top-0 h-40 sm:h-48 flex flex-col justify-between pointer-events-none">
                            <div className="border-b border-white/5 w-full" />
                            <div className="border-b border-white/5 w-full" />
                            <div className="border-b border-white/5 w-full" />
                        </div>

                        {/* Bars */}
                        <div className="flex items-end justify-between gap-1 sm:gap-2 h-40 sm:h-48 relative">
                            {weeklyData.map((minutes, index) => {
                                const height = maxWeeklyTime > 0 ? (minutes / maxWeeklyTime) * 100 : 0;
                                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                const dayIndex = (new Date().getDay() - 6 + index + 7) % 7;
                                const isToday = index === 6;
                                
                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center group relative">
                                        {/* Tooltip */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface border border-white/20 rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                                            <div className="text-xs font-bold text-white">{minutes}m</div>
                                            <div className="text-[10px] text-text-muted">{dayNames[dayIndex]}</div>
                                        </div>

                                        {/* Bar container */}
                                        <div className="w-full h-full flex items-end">
                                            <div 
                                                className={cn(
                                                    "w-full rounded-t-md sm:rounded-t-lg transition-all duration-700 ease-out relative overflow-hidden cursor-pointer",
                                                    isToday 
                                                        ? "bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/20" 
                                                        : "bg-gradient-to-t from-primary to-blue-400",
                                                    "hover:opacity-90 hover:scale-105 origin-bottom"
                                                )}
                                                style={{ 
                                                    height: `${Math.max(height, minutes > 0 ? 4 : 0)}%`,
                                                    animationDelay: `${index * 100}ms`
                                                }}
                                            >
                                                {/* Shine effect */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                
                                                {/* Pulse for today */}
                                                {isToday && minutes > 0 && (
                                                    <div className="absolute inset-0 bg-emerald-400/30 animate-pulse rounded-t-md sm:rounded-t-lg" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Day label */}
                                        <div className={cn(
                                            "mt-2 text-[10px] sm:text-xs transition-colors",
                                            isToday ? "text-emerald-400 font-semibold" : "text-text-muted"
                                        )}>
                                            {dayNames[dayIndex]}
                                        </div>
                                        
                                        {/* Minutes label */}
                                        <div className={cn(
                                            "text-[10px] sm:text-xs font-semibold",
                                            isToday ? "text-emerald-400" : "text-white/80"
                                        )}>
                                            {minutes > 0 ? `${minutes}m` : '-'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Summary row */}
                <div className="mt-4 sm:mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-white">
                            {weeklyData.reduce((a, b) => a + b, 0)}m
                        </div>
                        <div className="text-[10px] sm:text-xs text-text-muted">Total This Week</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-blue-400">
                            {Math.round(weeklyData.reduce((a, b) => a + b, 0) / 7)}m
                        </div>
                        <div className="text-[10px] sm:text-xs text-text-muted">Daily Average</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-emerald-400">
                            {weeklyData[6]}m
                        </div>
                        <div className="text-[10px] sm:text-xs text-text-muted">Today</div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* ========== PAGE-BASED STATS ========== */}
                <div className="bg-surface border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                        <h2 className="text-xl font-bold text-white">Page Effort</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <span className="text-text-muted">Total Pages Read</span>
                            <span className="text-2xl font-bold text-white">{totalPages.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <span className="text-text-muted">Pages/Day Avg</span>
                            <span className="text-2xl font-bold text-emerald-400">{pagesPerDay}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <span className="text-text-muted">Pages/Hour</span>
                            <span className="text-2xl font-bold text-blue-400">{pagesPerHour}</span>
                        </div>
                    </div>
                </div>

                {/* ========== BOOK COMPLETION STATS ========== */}
                <div className="bg-surface border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Award className="w-6 h-6 text-amber-400" />
                        <h2 className="text-xl font-bold text-white">Books</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <span className="text-text-muted">Finished</span>
                            <span className="text-2xl font-bold text-emerald-400">{bookStats.finished}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <span className="text-text-muted">Currently Reading</span>
                            <span className="text-2xl font-bold text-blue-400">{bookStats.reading}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <span className="text-text-muted">Avg Time/Book</span>
                            <span className="text-2xl font-bold text-purple-400">{formatTime(avgTimePerBook)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== READING INTENT BREAKDOWN ========== */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-white">Reading Intent Breakdown</h2>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                    {Object.entries(intentStats).map(([intent, data]) => {
                        const percentage = totalTime > 0 ? Math.round((data.time / totalTime) * 100) : 0;
                        
                        return (
                            <div key={intent} className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white capitalize">{intent}</span>
                                    <span className={cn("text-xs font-bold", data.color)}>{percentage}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                                    <div 
                                        className={cn("h-full transition-all duration-500", 
                                            intent === 'study' && 'bg-blue-400',
                                            intent === 'relax' && 'bg-amber-400',
                                            intent === 'research' && 'bg-purple-400',
                                            intent === 'habit' && 'bg-emerald-400'
                                        )}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs text-text-muted">
                                    <span>{formatTime(data.time)}</span>
                                    <span>{data.sessions} sessions</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ========== TAG-BASED INSIGHTS ========== */}
            {topTags.length > 0 && (
                <div className="bg-surface border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Tag className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-bold text-white">Top Reading Contexts</h2>
                        <span className="text-sm text-text-muted ml-auto">Self-awareness, not vanity</span>
                    </div>

                    <div className="space-y-3">
                        {topTags.map(([tag, data]) => {
                            const percentage = totalTime > 0 ? Math.round((data.time / totalTime) * 100) : 0;
                            
                            return (
                                <div key={tag} className="bg-white/5 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-white">#{tag}</span>
                                        <span className="text-sm font-bold text-primary">{percentage}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                                        <div 
                                            className="h-full bg-gradient-to-r from-primary to-purple-400 transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-xs text-text-muted">
                                        <div>
                                            <div className="font-semibold text-white">{formatTime(data.time)}</div>
                                            <div>Time spent</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-white">{data.pages}</div>
                                            <div>Pages read</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-white">{data.sessions}</div>
                                            <div>Sessions</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ========== CONSISTENCY & HABIT ========== */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Zap className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-xl font-bold text-white">Consistency & Patterns</h2>
                    <span className="text-sm text-text-muted ml-auto">Quiet accountability</span>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4">
                        <div className="text-3xl font-bold text-emerald-400 mb-1">{streak}</div>
                        <div className="text-sm text-text-muted">Day Streak</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-3xl font-bold text-blue-400 mb-1">{sessionsThisWeek}</div>
                        <div className="text-sm text-text-muted">Sessions This Week</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-3xl font-bold text-purple-400 mb-1">{bestDay}</div>
                        <div className="text-sm text-text-muted">Best Reading Day</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-3xl font-bold text-amber-400 mb-1">{bestTime}</div>
                        <div className="text-sm text-text-muted">Preferred Time</div>
                    </div>
                </div>
            </div>

            {/* ========== FOOTER INSIGHT ========== */}
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-2xl p-6 text-center">
                <p className="text-text-muted italic">
                    "Time spent reading is more honest than books finished. You're measuring effort, not completion."
                </p>
            </div>
        </div>
    );
}
