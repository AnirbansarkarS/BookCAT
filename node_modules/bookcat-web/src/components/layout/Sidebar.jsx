import React from 'react';
import { NavLink } from 'react-router-dom';
import { Library, Users, ArrowLeftRight, BarChart2, Settings, X } from 'lucide-react';
import { cn } from '../../lib/utils';

import { navItems } from '../../lib/navItems';

export function Sidebar({ isOpen, onClose }) {
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Content */}
            <aside className={cn(
                "fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-surface border-r border-white/5",
                "transform transition-transform duration-300 ease-in-out md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-16 flex items-center justify-between px-6 md:hidden">
                    <span className="text-xl font-bold text-primary">bookCat</span>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <X size={24} />
                    </button>
                </div>

                <div className="hidden md:flex h-16 items-center px-8 border-b border-white/5">
                    <span className="text-xl font-bold tracking-tight text-white">book<span className="text-primary">Cat</span></span>
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
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-white/5">
                        <h4 className="text-sm font-semibold text-white mb-1">Reading Goal</h4>
                        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-primary w-[75%]" />
                        </div>
                        <p className="text-xs text-text-muted">12/15 books this year</p>
                    </div>
                </div>
            </aside>
        </>
    );
}
