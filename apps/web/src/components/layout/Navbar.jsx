import React from 'react';
import { Menu, Search, Bell, User } from 'lucide-react';

export function Navbar({ onMenuClick }) {
    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl px-4 md:px-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary"
                >
                    <Menu size={24} />
                </button>

                {/* Mobile Logo */}
                <span className="md:hidden text-lg font-bold text-white">book<span className="text-primary">Cat</span></span>

                {/* Search Bar (Desktop) */}
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-white/5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all w-64 lg:w-96">
                    <Search size={16} className="text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search books, authors..."
                        className="bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted w-full"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-full transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-background"></span>
                </button>

                <div className="h-8 w-[1px] bg-white/10 hidden md:block" />

                <button className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary/20">
                        JD
                    </div>
                    <span className="hidden md:block text-sm font-medium text-text-primary">John Doe</span>
                </button>
            </div>
        </header>
    );
}
