import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { profileService } from '../services/profileService';
import {
    User, Camera, Save, X, AlertCircle, CheckCircle, BookOpen, 
    Star, Target, Clock, Coffee, Sparkles, MapPin, Globe, Zap,
    Heart, TrendingUp, Award, Edit2
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Profile() {
    const { user, profile, refreshProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    
    // Basic info
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    
    // Enhanced fields
    const [favoriteBook, setFavoriteBook] = useState('');
    const [favoriteAuthor, setFavoriteAuthor] = useState('');
    const [readingGoal, setReadingGoal] = useState(12);
    const [favoriteGenre, setFavoriteGenre] = useState('');
    const [readingSpeed, setReadingSpeed] = useState('moderate');
    const [preferredFormat, setPreferredFormat] = useState('physical');
    const [location, setLocation] = useState('');
    const [funFact, setFunFact] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '');
            setBio(profile.bio || '');
            setFavoriteBook(profile.favorite_book || '');
            setFavoriteAuthor(profile.favorite_author || '');
            setReadingGoal(profile.reading_goal_yearly || 12);
            setFavoriteGenre(profile.favorite_genre || '');
            setReadingSpeed(profile.reading_speed || 'moderate');
            setPreferredFormat(profile.preferred_format || 'physical');
            setLocation(profile.location || '');
            setFunFact(profile.fun_fact || '');
        }
    }, [profile]);

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (avatarFile) {
                const { error: uploadError } = await profileService.uploadAvatar(user.id, avatarFile);
                if (uploadError) throw uploadError;
            }

            const { error: updateError } = await profileService.updateProfile(user.id, {
                username,
                bio,
                favorite_book: favoriteBook,
                favorite_author: favoriteAuthor,
                reading_goal_yearly: readingGoal,
                favorite_genre: favoriteGenre,
                reading_speed: readingSpeed,
                preferred_format: preferredFormat,
                location,
                fun_fact: funFact,
            });

            if (updateError) throw updateError;

            await refreshProfile();
            setSuccess('Profile updated successfully!');
            setIsEditing(false);
            setAvatarFile(null);
            setAvatarPreview(null);
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setUsername(profile?.username || '');
        setBio(profile?.bio || '');
        setFavoriteBook(profile?.favorite_book || '');
        setFavoriteAuthor(profile?.favorite_author || '');
        setReadingGoal(profile?.reading_goal_yearly || 12);
        setFavoriteGenre(profile?.favorite_genre || '');
        setReadingSpeed(profile?.reading_speed || 'moderate');
        setPreferredFormat(profile?.preferred_format || 'physical');
        setLocation(profile?.location || '');
        setFunFact(profile?.fun_fact || '');
        setAvatarFile(null);
        setAvatarPreview(null);
        setError('');
        setSuccess('');
    };

    const displayAvatar = avatarPreview || profile?.avatar_url;

    const GENRES = [
        'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance', 'Sci-Fi', 
        'Fantasy', 'Horror', 'Biography', 'History', 'Self-Help', 'Poetry',
        'Literary Fiction', 'Young Adult', 'Children', 'Graphic Novels'
    ];

    const READING_SPEEDS = [
        { value: 'slow', label: 'Slow & Steady', icon: '🐢', desc: '< 20 pages/hour' },
        { value: 'moderate', label: 'Moderate', icon: '🚶', desc: '20-40 pages/hour' },
        { value: 'fast', label: 'Fast', icon: '🏃', desc: '40-60 pages/hour' },
        { value: 'very_fast', label: 'Speed Reader', icon: '⚡', desc: '60+ pages/hour' },
    ];

    const FORMATS = [
        { value: 'physical', label: 'Physical Books', icon: '📚' },
        { value: 'ebook', label: 'E-books', icon: '📱' },
        { value: 'audiobook', label: 'Audiobooks', icon: '🎧' },
        { value: 'mixed', label: 'Mixed', icon: '🔀' },
    ];

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">Profile</h1>
                <p className="text-text-muted">Personalize your reading journey</p>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3 animate-in fade-in duration-300">
                    <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-green-400 text-sm">{success}</p>
                </div>
            )}

            {/* Main Profile Card */}
            <div className="bg-surface rounded-2xl border border-white/5 shadow-xl overflow-hidden">
                {/* Header with gradient */}
                <div className="h-32 bg-gradient-to-r from-primary via-violet-600 to-pink-600 relative">
                    <div className="absolute -bottom-16 left-8">
                        <div className="relative group">
                            {displayAvatar ? (
                                <img
                                    src={displayAvatar}
                                    alt="Avatar"
                                    className="w-32 h-32 rounded-2xl object-cover border-4 border-surface shadow-2xl"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center border-4 border-surface shadow-2xl">
                                    <User className="text-white" size={48} />
                                </div>
                            )}
                            {isEditing && (
                                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="text-white" size={24} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-20 px-8 pb-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{profile?.username || 'Reader'}</h2>
                            <p className="text-text-muted text-sm mt-1">{user?.email}</p>
                            {profile?.location && (
                                <p className="flex items-center gap-1.5 text-text-muted text-sm mt-2">
                                    <MapPin size={14} /> {profile.location}
                                </p>
                            )}
                        </div>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
                            >
                                <Edit2 size={16} />
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {/* Bio */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                            <Sparkles size={14} /> About Me
                        </label>
                        {isEditing ? (
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                placeholder="Tell us about yourself..."
                            />
                        ) : (
                            <p className="text-text-muted">{profile?.bio || 'No bio yet'}</p>
                        )}
                    </div>

                    {/* Reading Identity */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        {/* Favorite Book */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                                <Heart size={14} className="text-rose-400" /> Favorite Book
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={favoriteBook}
                                    onChange={(e) => setFavoriteBook(e.target.value)}
                                    className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="e.g., 1984 by George Orwell"
                                />
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                    <BookOpen className="text-rose-400 flex-shrink-0" size={20} />
                                    <p className="text-white">{favoriteBook || 'Not set'}</p>
                                </div>
                            )}
                        </div>

                        {/* Favorite Author */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                                <Star size={14} className="text-amber-400" /> Favorite Author
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={favoriteAuthor}
                                    onChange={(e) => setFavoriteAuthor(e.target.value)}
                                    className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="e.g., Haruki Murakami"
                                />
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <User className="text-amber-400 flex-shrink-0" size={20} />
                                    <p className="text-white">{favoriteAuthor || 'Not set'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reading Stats */}
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                        {/* Reading Goal */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                                <Target size={14} className="text-emerald-400" /> Yearly Goal
                            </label>
                            {isEditing ? (
                                <input
                                    type="number"
                                    value={readingGoal}
                                    onChange={(e) => setReadingGoal(parseInt(e.target.value) || 12)}
                                    min="1"
                                    className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            ) : (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                                    <div className="text-3xl font-bold text-emerald-400">{readingGoal}</div>
                                    <p className="text-xs text-text-muted mt-1">books/year</p>
                                </div>
                            )}
                        </div>

                        {/* Favorite Genre */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                                <Sparkles size={14} className="text-purple-400" /> Favorite Genre
                            </label>
                            {isEditing ? (
                                <select
                                    value={favoriteGenre}
                                    onChange={(e) => setFavoriteGenre(e.target.value)}
                                    className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">Select genre</option>
                                    {GENRES.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
                                    <p className="text-purple-400 font-semibold">{favoriteGenre || 'Not set'}</p>
                                </div>
                            )}
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                                <MapPin size={14} className="text-sky-400" /> Location
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="City, Country"
                                />
                            ) : (
                                <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl text-center">
                                    <p className="text-sky-400 font-semibold">{location || 'Not set'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reading Preferences */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        {/* Reading Speed */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                                <Zap size={14} /> Reading Speed
                            </label>
                            {isEditing ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {READING_SPEEDS.map(s => (
                                        <button
                                            key={s.value}
                                            onClick={() => setReadingSpeed(s.value)}
                                            className={cn(
                                                'p-3 rounded-xl border transition-all text-left',
                                                readingSpeed === s.value
                                                    ? 'bg-primary/20 border-primary text-primary'
                                                    : 'bg-white/5 border-white/10 text-text-muted hover:border-primary/40'
                                            )}
                                        >
                                            <div className="text-2xl mb-1">{s.icon}</div>
                                            <div className="text-xs font-semibold">{s.label}</div>
                                            <div className="text-[10px] text-text-muted">{s.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                                    <span className="text-2xl">{READING_SPEEDS.find(s => s.value === readingSpeed)?.icon}</span>
                                    <div>
                                        <p className="text-white font-semibold">{READING_SPEEDS.find(s => s.value === readingSpeed)?.label}</p>
                                        <p className="text-xs text-text-muted">{READING_SPEEDS.find(s => s.value === readingSpeed)?.desc}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Preferred Format */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                                <BookOpen size={14} /> Preferred Format
                            </label>
                            {isEditing ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {FORMATS.map(f => (
                                        <button
                                            key={f.value}
                                            onClick={() => setPreferredFormat(f.value)}
                                            className={cn(
                                                'p-3 rounded-xl border transition-all text-center',
                                                preferredFormat === f.value
                                                    ? 'bg-primary/20 border-primary text-primary'
                                                    : 'bg-white/5 border-white/10 text-text-muted hover:border-primary/40'
                                            )}
                                        >
                                            <div className="text-2xl mb-1">{f.icon}</div>
                                            <div className="text-xs font-semibold">{f.label}</div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                                    <span className="text-2xl">{FORMATS.find(f => f.value === preferredFormat)?.icon}</span>
                                    <p className="text-white font-semibold">{FORMATS.find(f => f.value === preferredFormat)?.label}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fun Fact */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                            <Coffee size={14} className="text-orange-400" /> Fun Fact
                        </label>
                        {isEditing ? (
                            <textarea
                                value={funFact}
                                onChange={(e) => setFunFact(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                placeholder="Share something interesting about your reading habits..."
                            />
                        ) : (
                            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                <p className="text-white">{funFact || 'No fun fact yet'}</p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {isEditing && (
                        <div className="flex gap-3 pt-6 mt-6 border-t border-white/10">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-violet-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                            >
                                <Save size={18} />
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 text-text-primary font-semibold rounded-xl hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}