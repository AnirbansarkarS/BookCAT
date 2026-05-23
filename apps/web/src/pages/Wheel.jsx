import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Plus, Trash2, ArrowLeft, RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserBooks } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

const COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
];

export default function Wheel() {
    const { user } = useAuth();
    const [options, setOptions] = useState([]);
    const [newOption, setNewOption] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState(null);

    const wheelRef = useRef(null);

    useEffect(() => {
        const fetchBooks = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const books = await getUserBooks(user.id);
                const nextBooks = books
                    .filter(b => b.status === 'Want to Read')
                    .map(b => b.title.length > 25 ? b.title.substring(0, 22) + '...' : b.title);

                // Ensure at least some default options if empty
                if (nextBooks.length === 0) {
                    setOptions(['Read a Fantasy Book', 'Read a Sci-Fi Book', 'Read a Classic', 'Read Non-fiction']);
                } else {
                    setOptions(nextBooks);
                }
            } catch (err) {
                console.error(err);
                setOptions(['Option 1', 'Option 2', 'Option 3']);
            }
            setIsLoading(false);
        };
        fetchBooks();
    }, [user]);

    const addOption = (e) => {
        e.preventDefault();
        if (newOption.trim()) {
            setOptions([...options, newOption.trim()]);
            setNewOption('');
            setResult(null);
        }
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
            setResult(null);
        }
    };

    const spinWheel = () => {
        if (isSpinning || options.length < 2) return;
        setIsSpinning(true);
        setResult(null);

        const spinDuration = 4000;
        const extraSpins = 5; // 5 full rotations min

        // Pick a random winner
        const winningIndex = Math.floor(Math.random() * options.length);

        // Calculate slice angle
        const sliceAngle = 360 / options.length;

        // We want the wheel to stop such that the winning index is at the top (0 degrees).
        // The top is 270 degrees in SVG math, or we can rotate the SVG so the top is 0.
        // Let's assume the indicator is at the top. The center of slice 0 is at 0 degrees.
        // If slice 0 is at top, rotation should be 0.
        // If slice 1 is to be at top, rotation should be -(sliceAngle * 1).
        // Plus random offset within the slice to land randomly inside it
        const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.8);

        const targetRotation = (extraSpins * 360) - (winningIndex * sliceAngle) + randomOffset;

        // We add this to current rotation, but normalize current rotation to avoid crazy high numbers
        const newRotation = rotation + targetRotation + (360 - (rotation % 360));

        setRotation(newRotation);

        setTimeout(() => {
            setIsSpinning(false);
            setResult(options[winningIndex]);
            triggerConfetti();
        }, spinDuration);
    };

    const triggerConfetti = () => {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 }
        };

        function fire(particleRatio, opts) {
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    };

    // SVG Drawing Helpers
    const createSlices = () => {
        const numSlices = options.length;
        const sliceAngle = 360 / numSlices;
        const radius = 50;
        const cx = 50;
        const cy = 50;

        return options.map((option, index) => {
            const startAngle = (index * sliceAngle - sliceAngle / 2) * (Math.PI / 180);
            const endAngle = ((index + 1) * sliceAngle - sliceAngle / 2) * (Math.PI / 180);

            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);

            const largeArcFlag = sliceAngle > 180 ? 1 : 0;
            const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            const textAngle = index * sliceAngle;

            return (
                <g key={index}>
                    <path d={pathData} fill={COLORS[index % COLORS.length]} stroke="#1e1e1e" strokeWidth="0.5" />
                    <g transform={`rotate(${textAngle}, ${cx}, ${cy})`}>
                        <text
                            x={cx + radius - 5}
                            y={cy}
                            fill="white"
                            fontSize="3.5"
                            fontWeight="bold"
                            textAnchor="end"
                            alignmentBaseline="middle"
                            className="drop-shadow-md"
                        >
                            {option.length > 20 ? option.substring(0, 17) + '...' : option}
                        </text>
                    </g>
                </g >
            );
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-text-muted">Preparing the wheel...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <Link to="/library" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                    <ArrowLeft size={20} className="text-white" />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-0.5">Wheel of Reading</h1>
                    <p className="text-sm text-text-muted">Can't decide? Let fate choose your next book.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start mt-8">
                {/* Left Side: Wheel */}
                <div className="relative flex flex-col items-center">
                    <div className="relative w-full max-w-[400px] aspect-square drop-shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                        {/* Pointer / Marker at the top */}
                        <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 flex flex-col items-center z-20 drop-shadow-xl">
                            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-white drop-shadow-lg" />
                            <div className="w-4 h-4 bg-white rounded-full -mt-2 shadow-lg" />
                        </div>

                        {/* The SVG Wheel */}
                        <div
                            ref={wheelRef}
                            className="w-full h-full rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-surface"
                            style={{
                                transform: `rotate(${rotation - 90}deg)`, // -90 so 0 degree slice starts at top
                                transition: isSpinning ? 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)' : 'none'
                            }}
                        >
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                {createSlices()}
                                {/* Center Hub */}
                                <circle cx="50" cy="50" r="12" fill="#1e1e2d" stroke="#3b82f6" strokeWidth="2" />
                                <circle cx="50" cy="50" r="4" fill="#ffffff" />
                            </svg>
                        </div>
                    </div>

                    <button
                        onClick={spinWheel}
                        disabled={isSpinning || options.length < 2}
                        className={cn(
                            "mt-8 px-8 py-3 rounded-full font-bold text-lg shadow-xl uppercase tracking-wider flex items-center gap-2",
                            isSpinning || options.length < 2
                                ? "bg-white/10 text-white/50 cursor-not-allowed"
                                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white hover:scale-105 transition-transform"
                        )}
                    >
                        {isSpinning ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCw className="w-5 h-5" />}
                        {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
                    </button>
                </div>

                {/* Right Side: Options and Results */}
                <div className="space-y-6">
                    {/* Result Banner */}
                    {result && !isSpinning && (
                        <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-pink-500/30 rounded-2xl animate-fade-in shadow-xl shadow-purple-900/20 text-center">
                            <p className="text-sm text-pink-300 font-semibold mb-2 uppercase tracking-wide">The wheel has spoken!</p>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-white">{result}</h2>
                        </div>
                    )}

                    <div className="bg-surface border border-white/10 rounded-2xl p-5">
                        <h3 className="text-lg font-bold text-white mb-4">Wheel Options</h3>
                        <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                            {options.map((opt, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                                            {i + 1}
                                        </span>
                                        <span className="text-sm text-white font-medium">{opt}</span>
                                    </div>
                                    <button
                                        onClick={() => removeOption(i)}
                                        disabled={options.length <= 2 || isSpinning}
                                        className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={addOption} className="flex gap-2">
                            <input
                                value={newOption}
                                onChange={e => setNewOption(e.target.value)}
                                placeholder="Add a book or genre..."
                                disabled={isSpinning}
                                className="flex-1 px-4 py-2 bg-background border border-white/10 rounded-xl text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50"
                            />
                            <button
                                type="submit"
                                disabled={!newOption.trim() || isSpinning}
                                className="p-2.5 bg-primary disabled:opacity-50 hover:bg-primary/90 text-white rounded-xl transition-colors"
                                title="Add to Wheel"
                            >
                                <Plus size={18} />
                            </button>
                        </form>
                        {options.length < 2 && (
                            <p className="text-red-400 text-xs mt-2">Add at least two options to spin.</p>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}} />
        </div>
    );
}
