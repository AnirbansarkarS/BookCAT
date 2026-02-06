import { useState } from 'react';
import { Loader2, BookOpen, User, Calendar, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export default function BookPreviewCard({ bookData, isLoading, error, onSave, onCancel, onEdit }) {
    const [editedData, setEditedData] = useState(bookData || {});

    const handleChange = (field, value) => {
        setEditedData(prev => ({ ...prev, [field]: value }));
        if (onEdit) onEdit({ ...editedData, [field]: value });
    };

    if (isLoading) {
        return (
            <div className="bg-surface rounded-2xl border border-white/10 p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-white font-medium">Fetching book details...</p>
                    <p className="text-sm text-text-muted">Please wait while we look up the book information</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-surface rounded-2xl border border-red-500/20 p-8">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <BookOpen className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <p className="text-red-400 font-medium mb-2">Book Not Found</p>
                        <p className="text-sm text-text-muted">{error}</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                    >
                        Try Another ISBN
                    </button>
                </div>
            </div>
        );
    }

    if (!bookData) return null;

    return (
        <div className="bg-surface rounded-2xl border border-white/10 p-6 space-y-6">
            <h3 className="text-xl font-bold text-white">Review Book Details</h3>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Book Cover */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                        <ImageIcon size={16} />
                        Cover Image
                    </label>
                    {editedData.cover_url ? (
                        <img
                            src={editedData.cover_url}
                            alt={editedData.title}
                            className="w-full max-w-[200px] rounded-lg border border-white/10 shadow-lg"
                        />
                    ) : (
                        <div className="w-full max-w-[200px] h-[300px] bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-text-muted" />
                        </div>
                    )}
                    <input
                        type="text"
                        value={editedData.cover_url || ''}
                        onChange={(e) => handleChange('cover_url', e.target.value)}
                        placeholder="Cover image URL"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                </div>

                {/* Book Details */}
                <div className="space-y-4">
                    {/* ISBN (read-only) */}
                    <div>
                        <label className="text-sm font-medium text-text-secondary block mb-2">
                            ISBN
                        </label>
                        <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-text-muted text-sm">
                            {editedData.isbn || 'N/A'}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-2">
                            <BookOpen size={16} />
                            Title *
                        </label>
                        <input
                            type="text"
                            value={editedData.title || ''}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="Book title"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>

                    {/* Authors */}
                    <div>
                        <label className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-2">
                            <User size={16} />
                            Authors
                        </label>
                        <input
                            type="text"
                            value={editedData.authors || ''}
                            onChange={(e) => handleChange('authors', e.target.value)}
                            placeholder="Author names (comma separated)"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Published Year */}
                    <div>
                        <label className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-2">
                            <Calendar size={16} />
                            Published Year
                        </label>
                        <input
                            type="text"
                            value={editedData.published_year || ''}
                            onChange={(e) => handleChange('published_year', e.target.value)}
                            placeholder="e.g., 2023"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-2">
                    <FileText size={16} />
                    Description
                </label>
                <textarea
                    value={editedData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Book description"
                    rows={4}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
                <button
                    onClick={onCancel}
                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-medium"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onSave(editedData)}
                    disabled={!editedData.title}
                    className={cn(
                        "px-6 py-2.5 rounded-lg font-medium transition-all",
                        editedData.title
                            ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                            : "bg-white/5 text-text-muted cursor-not-allowed"
                    )}
                >
                    Save to Library
                </button>
            </div>
        </div>
    );
}
