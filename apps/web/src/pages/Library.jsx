import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { getUserBooks } from '../services/bookService';
import AddBookModal from '../components/AddBookModal';

const statusConfig = {
    'Reading': { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: BookOpen },
    'Completed': { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle },
    'Want to Read': { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock },
};

export default function Library() {
    const { user } = useAuth();
    const [filter, setFilter] = useState('All');
    const [books, setBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState(null);

    const loadBooks = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            setError(null);
            const data = await getUserBooks(user.id);
            setBooks(data);
        } catch (err) {
            console.error('Error loading books:', err);
            setError('Failed to load books. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBooks();
    }, [user]);

    const handleBookAdded = () => {
        loadBooks(); // Refresh the book list
    };

    const filteredBooks = filter === 'All' ? books : books.filter(b => b.status === filter);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
                    <p className="text-text-muted">Manage your collection and track personal progress.</p>
                </div>

                <div className="flex items-center gap-4">
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

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
                    >
                        <Plus size={20} />
                        Add Book
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                        <p className="text-text-muted">Loading your library...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && books.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Your library is empty</h3>
                    <p className="text-text-muted mb-6">Start building your collection by adding your first book</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all"
                    >
                        <Plus size={20} />
                        Add Your First Book
                    </button>
                </div>
            )}

            {/* Books Grid */}
            {!isLoading && filteredBooks.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredBooks.map((book) => {
                        const StatusIcon = statusConfig[book.status].icon;
                        return (
                            <div key={book.id} className="group relative bg-surface rounded-2xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1">
                                <div className="aspect-[2/3] overflow-hidden relative">
                                    {book.cover_url ? (
                                        <img
                                            src={book.cover_url}
                                            alt={book.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                            <BookOpen className="w-12 h-12 text-text-muted" />
                                        </div>
                                    )}
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
                                        <p className="text-sm text-text-muted truncate">{book.authors || 'Unknown Author'}</p>
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
            )}

            {/* No results for filter */}
            {!isLoading && books.length > 0 && filteredBooks.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-text-muted">No books found with status "{filter}"</p>
                </div>
            )}

            {/* Add Book Modal */}
            <AddBookModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onBookAdded={handleBookAdded}
            />
        </div>
    );
}
