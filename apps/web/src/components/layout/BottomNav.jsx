import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { navItems } from '../../lib/navItems';

export function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-lg border-t border-white/5 md:hidden pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200",
                            isActive
                                ? "text-primary"
                                : "text-text-secondary hover:text-text-primary"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    size={24}
                                    strokeWidth={isActive ? 2.5 : 1.5}
                                    className={cn(
                                        "transition-all duration-200",
                                        isActive && "scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                    )}
                                />
                                {isActive && (
                                    <span className="text-[10px] font-medium animate-in fade-in zoom-in duration-200">
                                        {item.label}
                                    </span>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
