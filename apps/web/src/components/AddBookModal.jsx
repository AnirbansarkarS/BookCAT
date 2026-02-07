import { useState } from 'react';
import { X, Camera, Edit3, Loader2, Search } from 'lucide-react';
import ISBNScanner from './ISBNScanner';
import BookPreviewCard from './BookPreviewCard';
import { fetchBookByISBN, checkDuplicateISBN, addBook } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export default function AddBookModal({ isOpen, onClose, onBookAdded }) {
    const { user } = useAuth();
    const [mode, setMode] = useState(null); // null, 'scan', 'manual'
    const [scannedISBN, setScannedISBN] = useState(null);
    const [bookData, setBookData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingISBN, setIsFetchingISBN] = useState(false);

    // Manual entry form state
    const [manualForm, setManualForm] = useState({
        isbn: '',
        title: '',
        authors: '',
        published_year: '',
        total_pages: '',
        description: '',
        cover_url: '',
    });

    const resetModal = () => {
        setMode(null);
        setScannedISBN(null);
        setBookData(null);
        setIsLoading(false);
        setError(null);
        setIsSaving(false);
        setIsFetchingISBN(false);
        setManualForm({
            isbn: '',
            title: '',
            authors: '',
            published_year: '',
            total_pages: '',
            description: '',
            cover_url: '',
        });
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    const handleISBNDetected = async (isbn) => {
        setScannedISBN(isbn);
        setIsLoading(true);
        setError(null);

        try {
            // Check for duplicates
            const isDuplicate = await checkDuplicateISBN(user.id, isbn);
            if (isDuplicate) {
                setError('This book is already in your library');
                setIsLoading(false);
                return;
            }

            // Fetch book data from Google Books API
            const data = await fetchBookByISBN(isbn);

            if (!data) {
                setError('Book not found in Google Books. Please try manual entry.');
                setIsLoading(false);
                return;
            }

            setBookData(data);
            setIsLoading(false);
        } catch (err) {
            console.error('Error fetching book:', err);
            setError('Failed to fetch book data. Please try again.');
            setIsLoading(false);
        }
    };

    const handleSaveBook = async (finalBookData) => {
        setIsSaving(true);
        setError(null);

        try {
            await addBook(user.id, {
                ...finalBookData,
                source: mode === 'scan' ? 'scan' : 'manual',
                status: 'Want to Read',
                progress: 0,
            });

            // Reset and close
            if (onBookAdded) onBookAdded();
            handleClose();
        } catch (err) {
            console.error('Error saving book:', err);
            setError('Failed to save book. Please try again.');
            setIsSaving(false);
        }
    };

    const handleManualFormChange = (field, value) => {
        setManualForm(prev => ({ ...prev, [field]: value }));
    };

    // New function to fetch book details from ISBN in manual mode
    const handleFetchFromISBN = async () => {
        if (!manualForm.isbn || !manualForm.isbn.trim()) {
            setError('Please enter an ISBN first');
            return;
        }

        setIsFetchingISBN(true);
        setError(null);

        try {
            // Check for duplicates
            const isDuplicate = await checkDuplicateISBN(user.id, manualForm.isbn);
            if (isDuplicate) {
                setError('A book with this ISBN is already in your library');
                setIsFetchingISBN(false);
                return;
            }

            // Fetch book data from Google Books API
            const data = await fetchBookByISBN(manualForm.isbn);

            if (!data) {
                setError('Book not found in Google Books. You can still enter details manually.');
                setIsFetchingISBN(false);
                return;
            }

            // Populate form with fetched data
            setManualForm({
                isbn: data.isbn || manualForm.isbn,
                title: data.title || '',
                authors: data.authors || '',
                published_year: data.published_year || '',
                total_pages: data.pageCount || '', // Google Books API returns pageCount
                description: data.description || '',
                cover_url: data.cover_url || '',
            });

            setIsFetchingISBN(false);
        } catch (err) {
            console.error('Error fetching book:', err);
            setError('Failed to fetch book data. You can still enter details manually.');
            setIsFetchingISBN(false);
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();

        if (!manualForm.title || !manualForm.title.trim()) {
            setError('Title is required');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Check for duplicates if ISBN is provided
            if (manualForm.isbn && manualForm.isbn.trim()) {
                const isDuplicate = await checkDuplicateISBN(user.id, manualForm.isbn);
                if (isDuplicate) {
                    setError('A book with this ISBN is already in your library');
                    setIsSaving(false);
                    return;
                }
            }

            await addBook(user.id, {
                isbn: manualForm.isbn?.trim() || null,
                title: manualForm.title.trim(),
                authors: manualForm.authors?.trim() || null,
                published_year: manualForm.published_year?.trim() || null,
                total_pages: manualForm.total_pages ? parseInt(manualForm.total_pages) : null,
                description: manualForm.description?.trim() || null,
                cover_url: manualForm.cover_url?.trim() || null,
                source: 'manual',
                status: 'Want to Read',
                progress: 0,
            });

            // Reset and close
            if (onBookAdded) onBookAdded();
            handleClose();
        } catch (err) {
            console.error('Error saving book:', err);
            setError('Failed to save book. Please try again.');
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background rounded-2xl border border-white/10 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background border-b border-white/10 p-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-white">Add Book to Library</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Mode Selection */}
                    {!mode && (
                        <div className="space-y-4">
                            <p className="text-text-muted text-center mb-6">
                                Choose how you'd like to add your book
                            </p>
                            <div className="grid md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => setMode('scan')}
                                    className="group p-8 bg-surface hover:bg-white/10 border border-white/10 hover:border-primary/50 rounded-2xl transition-all"
                                >
                                    <Camera className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-xl font-bold text-white mb-2">Scan ISBN</h3>
                                    <p className="text-sm text-text-muted">
                                        Use your camera to scan the barcode
                                    </p>
                                </button>

                                <button
                                    onClick={() => setMode('manual')}
                                    className="group p-8 bg-surface hover:bg-white/10 border border-white/10 hover:border-primary/50 rounded-2xl transition-all"
                                >
                                    <Edit3 className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-xl font-bold text-white mb-2">Manual Entry</h3>
                                    <p className="text-sm text-text-muted">
                                        Enter book details manually
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Scan Mode */}
                    {mode === 'scan' && !bookData && !scannedISBN && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setMode(null)}
                                className="text-sm text-text-muted hover:text-white transition-colors mb-4"
                            >
                                ← Back to options
                            </button>
                            <ISBNScanner onDetected={handleISBNDetected} />
                        </div>
                    )}

                    {/* Show scanned ISBN and loading/error */}
                    {mode === 'scan' && scannedISBN && (
                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    setScannedISBN(null);
                                    setError(null);
                                    setBookData(null);
                                }}
                                className="text-sm text-text-muted hover:text-white transition-colors"
                            >
                                ← Scan another ISBN
                            </button>

                            <div className="bg-surface rounded-lg p-4 border border-white/10">
                                <p className="text-sm text-text-muted mb-1">Scanned ISBN:</p>
                                <p className="text-lg font-mono font-bold text-white">{scannedISBN}</p>
                            </div>

                            <BookPreviewCard
                                bookData={bookData}
                                isLoading={isLoading}
                                error={error}
                                onSave={handleSaveBook}
                                onCancel={handleClose}
                                onEdit={setBookData}
                            />
                        </div>
                    )}

                    {/* Manual Mode */}
                    {mode === 'manual' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setMode(null)}
                                className="text-sm text-text-muted hover:text-white transition-colors mb-4"
                            >
                                ← Back to options
                            </button>

                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}

                                {/* ISBN field with fetch button */}
                                <div>
                                    <label className="text-sm font-medium text-text-secondary block mb-2">
                                        ISBN (Optional)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualForm.isbn}
                                            onChange={(e) => handleManualFormChange('isbn', e.target.value)}
                                            placeholder="e.g., 9780140449136"
                                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleFetchFromISBN}
                                            disabled={isFetchingISBN || !manualForm.isbn}
                                            className={cn(
                                                "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap",
                                                manualForm.isbn && !isFetchingISBN
                                                    ? "bg-primary hover:bg-primary/90 text-white"
                                                    : "bg-white/5 text-text-muted cursor-not-allowed"
                                            )}
                                        >
                                            {isFetchingISBN ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Fetching...
                                                </>
                                            ) : (
                                                <>
                                                    <Search size={16} />
                                                    Fetch Info
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-text-muted mt-1">
                                        Enter ISBN and click "Fetch Info" to auto-fill book details
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-secondary block mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={manualForm.title}
                                        onChange={(e) => handleManualFormChange('title', e.target.value)}
                                        placeholder="Book title"
                                        required
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-secondary block mb-2">
                                        Authors
                                    </label>
                                    <input
                                        type="text"
                                        value={manualForm.authors}
                                        onChange={(e) => handleManualFormChange('authors', e.target.value)}
                                        placeholder="Author names (comma separated)"
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-secondary block mb-2">
                                        Published Year
                                    </label>
                                    <input
                                        type="text"
                                        value={manualForm.published_year}
                                        onChange={(e) => handleManualFormChange('published_year', e.target.value)}
                                        placeholder="e.g., 2023"
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-secondary block mb-2">
                                        Cover Image URL
                                    </label>
                                    <input
                                        type="text"
                                        value={manualForm.cover_url}
                                        onChange={(e) => handleManualFormChange('cover_url', e.target.value)}
                                        placeholder="https://example.com/cover.jpg"
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-secondary block mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={manualForm.description}
                                        onChange={(e) => handleManualFormChange('description', e.target.value)}
                                        placeholder="Brief description of the book..."
                                        rows={4}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving || !manualForm.title}
                                        className={cn(
                                            "px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2",
                                            manualForm.title && !isSaving
                                                ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                                                : "bg-white/5 text-text-muted cursor-not-allowed"
                                        )}
                                    >
                                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {isSaving ? 'Saving...' : 'Save to Library'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
