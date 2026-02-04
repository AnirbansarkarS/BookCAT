import React from 'react';
import { ArrowLeftRight, MapPin, Star } from 'lucide-react';
import { cn } from '../lib/utils';

const exchanges = [
    { id: 1, book: 'The Silent Patient', user: 'Sarah J.', distance: '2.5 km', trust: 4.9, type: 'Give', status: 'Available' },
    { id: 2, book: 'Normal People', user: 'Mike T.', distance: '0.8 km', trust: 4.5, type: 'Request', status: 'Pending' },
    { id: 3, book: 'Educated', user: 'Emma W.', distance: '5.1 km', trust: 5.0, type: 'Give', status: 'Available' },
];

export default function Exchange() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Book Exchange</h1>
                    <p className="text-text-muted">Trade books with readers near you.</p>
                </div>
                <button className="px-6 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20">
                    Post a Book
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {exchanges.map((item) => (
                    <div key={item.id} className="bg-surface rounded-2xl p-6 border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold",
                                item.type === 'Give' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                                {item.type === 'Give' ? 'G' : 'R'}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">{item.book}</h3>
                                <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                                    <span className="flex items-center gap-1"><MapPin size={14} />{item.distance}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <span className="flex items-center gap-1 text-yellow-500"><Star size={14} fill="currentColor" />{item.trust}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <span>{item.user}</span>
                                </div>
                            </div>
                        </div>

                        <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-text-primary transition-colors">
                            <ArrowLeftRight size={20} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
