import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, Zap, TrendingUp, Target, Award } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getReadingSessions, getUserBooks } from '../services/bookService';
import { cn } from '../lib/utils';

export default function RealtimeStatsWidget() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        todayMinutes: 0,
        todayPages: 0,
        todaySessions: 0,
        currentStreak: 0,
        weekMinutes: 0,
        booksReading: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [animateTrigger, setAnimateTrigger] = useState(0);

    useEffect(() => {
        loadStats();
        
        // Refresh stats every 30 seconds for real-time feel
        const interval = setInterval(() => {
            loadStats();
            setAnimateTrigger(prev => prev + 1);
        }, 30000);

        return () => clearInterval(interval);
    }, [user]);

    const loadStats = async () => {
        if (!user) return;

        try {
            const [sessions, books] = await Promise.all([
                getReadingSessions(user.id),
                getUserBooks(user.id)
            ]);

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);

            // Today's stats
            const todaySessions = sessions.filter(s => new Date(s.created_at) >= today);
            const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
            const todayPages = todaySessions.reduce((sum, s) => sum + (s.pages_read || 0), 0);

            // Week stats
            const weekSessions = sessions.filter(s => new Date(s.created_at) >= weekAgo);
            const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

            // Streak calculation
            const dates = [...new Set(sessions.map(s => 
                new Date(s.created_at).toDateString()
            ))].sort((a, b) => new Date(b) - new Date(a));

            let streak = 0;
            for (let i = 0; i < dates.length; i++) {
                const expectedDate = new Date();
                expectedDate.setDate(expectedDate.getDate() - i);
                if (dates[i] === expectedDate.toDateString()) {
                    streak++;
                } else {
                    break;
                }
            }

            // Books currently reading
            const booksReading = books.filter(b => 
                b.status === 'Reading' || b.tags?.includes('reading_now')
            ).length;

            setStats({
                todayMinutes,
                todayPages,
                todaySessions: todaySessions.length,
                currentStreak: streak,
                weekMinutes,
                booksReading,
            });
            setIsLoading(false);
        } catch (err) {
            console.error('Error loading stats:', err);
            setIsLoading(false);
        }
    };

    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-surface/50 border border-white/10 rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-white/10 rounded mb-2" />
                        <div className="h-8 bg-white/10 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Today's Reading Time */}
            <div 
                className={cn(
                    "bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-xl p-4",
                    "transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
                )}
                key={`time-${animateTrigger}`}
            >
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-text-muted">Today</span>
                </div>
                <div className="text-2xl font-bold text-white animate-count-up">
                    {formatTime(stats.todayMinutes)}
                </div>
                <div className="text-xs text-blue-400 mt-1">
                    {stats.todaySessions} session{stats.todaySessions !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Today's Pages */}
            <div 
                className={cn(
                    "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4",
                    "transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20"
                )}
                key={`pages-${animateTrigger}`}
            >
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-text-muted">Pages</span>
                </div>
                <div className="text-2xl font-bold text-white animate-count-up">
                    {stats.todayPages}
                </div>
                <div className="text-xs text-emerald-400 mt-1">
                    read today
                </div>
            </div>

            {/* Reading Streak */}
            <div 
                className={cn(
                    "bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-xl p-4",
                    "transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20",
                    stats.currentStreak > 0 && "animate-pulse-subtle"
                )}
                key={`streak-${animateTrigger}`}
            >
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-text-muted">Streak</span>
                </div>
                <div className="text-2xl font-bold text-white animate-count-up">
                    {stats.currentStreak}
                </div>
                <div className="text-xs text-amber-400 mt-1">
                    day{stats.currentStreak !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Week Progress */}
            <div 
                className={cn(
                    "bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 rounded-xl p-4",
                    "transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
                )}
            >
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-text-muted">This Week</span>
                </div>
                <div className="text-2xl font-bold text-white">
                    {formatTime(stats.weekMinutes)}
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                    <div 
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(100, (stats.weekMinutes / 420) * 100)}%` }} // 7h target
                    />
                </div>
            </div>

            {/* Currently Reading */}
            <div 
                className={cn(
                    "bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/30 rounded-xl p-4",
                    "transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/20"
                )}
            >
                <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-text-muted">Reading</span>
                </div>
                <div className="text-2xl font-bold text-white">
                    {stats.booksReading}
                </div>
                <div className="text-xs text-indigo-400 mt-1">
                    book{stats.booksReading !== 1 ? 's' : ''} active
                </div>
            </div>

            {/* Quick Action Card */}
            <div 
                className={cn(
                    "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-4",
                    "transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20",
                    "cursor-pointer group"
                )}
                onClick={() => window.location.href = '/stats'}
            >
                <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-xs text-text-muted">View All</span>
                </div>
                <div className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                    Stats →
                </div>
                <div className="text-xs text-primary mt-1">
                    Full insights
                </div>
            </div>

            <style jsx>{`
                @keyframes count-up {
                    from {
                        opacity: 0.5;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes pulse-subtle {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(245, 158, 11, 0.4);
                    }
                }
                .animate-count-up {
                    animation: count-up 0.5s ease-out;
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}