import React, { useState } from 'react';
import { BookOpen, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const books = [
    { id: 1, title: 'The Midnight Library', author: 'Matt Haig', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400', status: 'Reading', progress: 45 },
    { id: 2, title: 'Project Hail Mary', author: 'Andy Weir', cover: 'https://images.unsplash.com/photo-1614544048536-0d28caf77f41?auto=format&fit=crop&q=80&w=400', status: 'Want to Read', progress: 0 },
    { id: 3, title: 'Klara and the Sun', author: 'Kazuo Ishiguro', cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400', status: 'Completed', progress: 100 },
    { id: 4, title: 'Dune', author: 'Frank Herbert', cover: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=400', status: 'Reading', progress: 12 },
    { id: 5, title: 'Dark Matter', author: 'Blake Crouch', cover: 'https://images.unsplash.com/photo-1476275466078-bd007cd81158?auto=format&fit=crop&q=80&w=400', status: 'Want to Read', progress: 0 },
    { id: 6, title: 'Atomic Habits', author: 'James Clear', cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=400', status: 'Completed', progress: 100 },
];

const statusConfig = {
    'Reading': { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: BookOpen },
    'Completed': { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle },
    'Want to Read': { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock },
};

export default function Library() {
    const [filter, setFilter] = useState('All');

    const filteredBooks = filter === 'All' ? books : books.filter(b => b.status === filter);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
                    <p className="text-text-muted">Manage your collection and track presonal progress.</p>
                </div>

                <div className="flex gap-2 p-1 bg-surface rounded-xl border border-white/5 w-fit">
                    {['All', 'Reading', 'Want to Read', 'Completed'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                filter === tab
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-text-secondary hover:text-white hover:bg-white/5"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredBooks.map((book) => {
                    const StatusIcon = statusConfig[book.status].icon;
                    return (
                        <div key={book.id} className="group relative bg-surface rounded-2xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1">
                            <div className="aspect-[2/3] overflow-hidden relative">
                                <img
                                    src={book.cover}
                                    alt={book.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <Link to={`/read/${book.id}`} className="w-full py-2 bg-white text-black font-semibold rounded-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 hover:bg-gray-200 text-center block">
                                        Read Now
                                    </Link>
                                </div>
                            </div>

                            <div className="p-4 space-y-2">
                                <div className={cn("flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-xs font-medium", statusConfig[book.status].bg, statusConfig[book.status].color)}>
                                    <StatusIcon size={10} />
                                    {book.status}
                                </div>

                                <div>
                                    <h3 className="font-semibold text-white leading-tight truncate" title={book.title}>{book.title}</h3>
                                    <p className="text-sm text-text-muted truncate">{book.author}</p>
                                </div>

                                {book.status === 'Reading' && (
                                    <div className="space-y-1 pt-2">
                                        <div className="flex justify-between text-xs text-text-muted">
                                            <span>Progress</span>
                                            <span>{book.progress}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${book.progress}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
