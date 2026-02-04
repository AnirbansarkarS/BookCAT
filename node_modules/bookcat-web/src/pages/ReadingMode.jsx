import React, { useState, useEffect } from 'react';
import { ArrowLeft, Moon, Sun, Type, Minimize, Maximize, Clock, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function ReadingMode() {
    const [theme, setTheme] = useState('dark'); // dark, sepia, light
    const [fontSize, setFontSize] = useState(18);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [timer, setTimer] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(true);

    useEffect(() => {
        let interval;
        if (isTimerActive) {
            interval = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerActive]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const themeConfig = {
        dark: 'bg-[#0f111a] text-[#e2e8f0]',
        sepia: 'bg-[#f4ecd8] text-[#433422]',
        light: 'bg-white text-gray-900',
    };

    return (
        <div className={cn("fixed inset-0 z-50 flex transition-colors duration-500", themeConfig[theme])}>
            {/* Controls Sidebar */}
            <div className={cn(
                "w-80 border-r flex flex-col transition-all duration-300 bg-opacity-5 backdrop-blur-sm border-current/10",
                !sidebarOpen && "-ml-80"
            )}>
                <div className="p-6 border-b border-current/10 flex items-center gap-4">
                    <Link to="/library" className="p-2 hover:bg-current/10 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <span className="font-semibold">Reading Controls</span>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto flex-1">
                    {/* Timer Section */}
                    <div className="p-4 rounded-xl bg-current/5 space-y-2">
                        <div className="flex items-center gap-2 text-sm opacity-70">
                            <Clock size={16} />
                            <span>Session Timer</span>
                        </div>
                        <div className="text-3xl font-mono font-bold flex items-center justify-between">
                            {formatTime(timer)}
                            <button
                                onClick={() => setIsTimerActive(!isTimerActive)}
                                className="text-sm px-3 py-1 rounded-full border border-current/20 hover:bg-current/10 transition-colors"
                            >
                                {isTimerActive ? 'Pause' : 'Resume'}
                            </button>
                        </div>
                    </div>

                    {/* Theme Toggle */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium opacity-70">Theme</label>
                        <div className="flex gap-2">
                            {[
                                { id: 'dark', icon: Moon, label: 'Dark' },
                                { id: 'sepia', icon: FileText, label: 'Sepia' },
                                { id: 'light', icon: Sun, label: 'Light' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={cn(
                                        "flex-1 py-3 rounded-lg border flex flex-col items-center gap-2 transition-all",
                                        theme === t.id
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-current/10 hover:bg-current/5"
                                    )}
                                >
                                    <t.icon size={18} />
                                    <span className="text-xs">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium opacity-70">Font Size</label>
                            <span className="text-xs opacity-50">{fontSize}px</span>
                        </div>
                        <input
                            type="range"
                            min="14"
                            max="32"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-full h-2 bg-current/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs opacity-50 px-1">
                            <Type size={14} />
                            <Type size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative h-full overflow-hidden flex flex-col">
                {/* Toggle Sidebar Button */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute top-6 left-6 z-20 p-2 rounded-full bg-current/5 hover:bg-current/10 transition-colors opacity-50 hover:opacity-100"
                >
                    {sidebarOpen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>

                <div className="flex-1 overflow-y-auto px-4 md:px-0">
                    <div
                        className="max-w-2xl mx-auto py-20 px-4 md:px-12 transition-all duration-300 ease-in-out outline-none"
                        style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-12 leading-tight">The Midnight Library</h1>

                        <p className="mb-6 indent-8 text-justify">
                            Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. To see how things would be if you had made other choices... Would you have done anything different, if you had the chance to undo your regrets?
                        </p>

                        <p className="mb-6 indent-8 text-justify">
                            Nora Seed found herself in just such a library. It was endless. The shelves stretched into the dark distance, their boundaries indiscernible in the gloom. It was quiet, too. The kind of quiet that feels heavy, like a blanket.
                        </p>

                        <p className="mb-6 indent-8 text-justify">
                            "Be careful what you wish for," the librarian said, appearing from the shadows with a knowing smile. Mrs. Elm had been the librarian at Nora's school, a comforting presence in a difficult childhood. Seeing her here, now, was both strange and oddly familiar.
                        </p>

                        <p className="mb-6 indent-8 text-justify">
                            The books were all shades of green. Hunter green, forest green, lime green, olive. Some were old and worn, their spines cracked and faded. Others looked brand new, as if they had just been printed. Each one represented a life Nora could have lived.
                        </p>

                        <p className="mb-6 indent-8 text-justify">
                            She reached out and touched the spine of a thick, dark green volume. It felt cold to the touch. "This one," Mrs. Elm said softly, "is the life where you stayed in the band."
                        </p>

                        <p className="mb-6 indent-8 text-justify opacity-50">
                            (This is a specialized reading mode designed for focus. The content is placeholder text for demonstration purposes.)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
