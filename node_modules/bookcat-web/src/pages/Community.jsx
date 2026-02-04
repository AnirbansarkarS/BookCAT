import React from 'react';
import { UserPlus, MessageSquare, BookOpen } from 'lucide-react';

const users = [
    { id: 1, name: 'Alice Reading', handle: '@alicereads', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200', reading: 'Dune', books: 142 },
    { id: 2, name: 'Bob Bookman', handle: '@bobbybooks', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', reading: 'Project Hail Mary', books: 89 },
    { id: 3, name: 'Carol Page', handle: '@carolpages', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', reading: '1984', books: 320 },
    { id: 4, name: 'Dave Chapter', handle: '@davedoes', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', reading: 'The Hobbit', books: 56 },
];

export default function Community() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Community</h1>
                <p className="text-text-muted">Discover readers with similar tastes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((user) => (
                    <div key={user.id} className="bg-surface rounded-2xl p-6 border border-white/5 flex flex-col gap-4 hover:border-primary/30 transition-all group">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/10" />
                                <div>
                                    <h3 className="font-semibold text-white">{user.name}</h3>
                                    <p className="text-sm text-text-muted">{user.handle}</p>
                                </div>
                            </div>
                            <button className="p-2 rounded-full hover:bg-white/5 text-primary hover:text-white transition-colors">
                                <UserPlus size={20} />
                            </button>
                        </div>

                        <div className="p-4 rounded-xl bg-background/50 border border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <BookOpen size={16} className="text-primary" />
                                <span className="text-text-muted">Reading:</span>
                                <span className="text-white font-medium">{user.reading}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="text-text-muted">Library Size:</div>
                                <div className="text-white font-medium">{user.books} Books</div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-auto">
                            <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-white">
                                View Library
                            </button>
                            <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors text-white">
                                <MessageSquare size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
