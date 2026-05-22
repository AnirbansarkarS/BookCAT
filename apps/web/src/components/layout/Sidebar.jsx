import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Library, Users, ArrowLeftRight, BarChart2, Settings, X, Target } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { getUserBooks } from '../../services/bookService';
import { eventBus, EVENTS } from '../../utils/eventBus';
import logo from '../../assets/bookcat-logo.webp';

import { navItems } from '../../lib/navItems';

export function Sidebar({ isOpen, onClose }) {
    const { user, profile } = useAuth();
    const [completedThisYear, setCompletedThisYear] = useState(0);
    const [yearlyGoal, setYearlyGoal] = useState(12);

    const loadGoalData = async () => {
        if (!user) return;
        const books = await getUserBooks(user.id);
        const year = new Date().getFullYear();
        const completed = books.filter(b => {
            if (b.status !== 'Completed') return false;
            const date = b.updated_at || b.created_at;
            return date && new Date(date).getFullYear() === year;
        }).length;
        setCompletedThisYear(completed);
    };

    useEffect(() => {
        loadGoalData();
        eventBus.on(EVENTS.BOOK_UPDATED, loadGoalData);
        eventBus.on(EVENTS.STATS_REFRESH, loadGoalData);
        return () => {
            eventBus.off(EVENTS.BOOK_UPDATED, loadGoalData);
            eventBus.off(EVENTS.STATS_REFRESH, loadGoalData);
        };
    }, [user]);

    useEffect(() => {
        setYearlyGoal(profile?.reading_goal_yearly || 12);
    }, [profile]);

    const progress = yearlyGoal > 0 ? Math.min(100, Math.round((completedThisYear / yearlyGoal) * 100)) : 0;
    const isGoalMet = completedThisYear >= yearlyGoal;

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-[60] md:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Content */}
            <aside className={cn(
                "fixed md:sticky top-0 left-0 z-[70] h-screen w-64 bg-surface border-r border-white/5",
                "transform transition-transform duration-300 ease-in-out md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-16 flex items-center justify-between px-6 md:hidden">
                    <img src={logo} alt="BookCat" className="h-9 w-9 object-contain" width="36" height="36" decoding="async" />
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <X size={24} />
                    </button>
                </div>

                <div className="hidden md:flex h-16 items-center px-6 border-b border-white/5">
                    <img src={logo} alt="BookCat" className="h-9 w-9 object-contain" width="36" height="36" decoding="async" />
                </div>

                <nav className="p-4 space-y-2 mt-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => window.innerWidth < 768 && onClose()}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-primary/10 text-primary shadow-sm shadow-blue-900/20"
                                    : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={20} strokeWidth={1.5} />
                                    <span className="font-medium">{item.label}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-lg shadow-blue-500" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="absolute bottom-8 left-0 w-full px-6">
                    <div className={cn(
                        'p-4 rounded-2xl border transition-all',
                        isGoalMet
                            ? 'bg-gradient-to-br from-emerald-500/20 to-transparent border-emerald-500/20'
                            : 'bg-gradient-to-br from-primary/20 to-transparent border-white/5'
                    )}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <Target size={13} className={isGoalMet ? 'text-emerald-400' : 'text-primary'} />
                                <h4 className="text-xs font-semibold text-white">Reading Goal {new Date().getFullYear()}</h4>
                            </div>
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', isGoalMet ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary')}>
                                {progress}%
                            </span>
                        </div>
                        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mb-2">
                            <div
                                className={cn('h-full rounded-full transition-all duration-700', isGoalMet ? 'bg-emerald-400' : 'bg-primary')}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-text-muted">
                            {isGoalMet
                                ? <span className="text-emerald-400 font-medium">🎉 Goal reached! {completedThisYear} books</span>
                                : <span>{completedThisYear} / {yearlyGoal} books this year</span>
                            }
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
}
