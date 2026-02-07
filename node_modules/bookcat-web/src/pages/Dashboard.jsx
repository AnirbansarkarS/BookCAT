import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, TrendingUp, Award, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getUserBooks, getReadingStats } from '../services/bookService'

export default function Dashboard() {
    const { profile, user } = useAuth()
    const [stats, setStats] = useState({ totalSeconds: 0, totalPages: 0, sessionCount: 0 })
    const [currentReads, setCurrentReads] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const displayName = profile?.username || user?.email?.split('@')[0] || 'Reader'

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!user) return
            try {
                const [booksData, statsData] = await Promise.all([
                    getUserBooks(user.id),
                    getReadingStats(user.id)
                ])

                setCurrentReads(booksData.filter(b => b.status === 'Reading').slice(0, 3))
                setStats(statsData)
            } catch (error) {
                console.error('Error loading dashboard:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadDashboardData()
    }, [user])

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600)
        return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                    Welcome back, {displayName}!
                </h1>
                <p className="text-text-muted">Your reading sanctuary awaits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stats Cards */}
                <div className="bg-surface rounded-2xl p-6 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-text-muted">Time Read</p>
                        <p className="text-2xl font-bold text-white">{formatTime(stats.totalSeconds)}</p>
                    </div>
                </div>

                <div className="bg-surface rounded-2xl p-6 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-text-muted">Pages Read</p>
                        <p className="text-2xl font-bold text-white">{stats.totalPages}</p>
                    </div>
                </div>

                <div className="bg-surface rounded-2xl p-6 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-text-muted">Sessions</p>
                        <p className="text-2xl font-bold text-white">{stats.sessionCount}</p>
                    </div>
                </div>

                <div className="bg-surface rounded-2xl p-6 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-text-muted">Avg. Session</p>
                        <p className="text-2xl font-bold text-white">
                            {stats.sessionCount ? Math.round(stats.totalSeconds / stats.sessionCount / 60) : 0}m
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Currently Reading */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Currently Reading</h2>
                        <Link to="/library" className="text-sm text-primary hover:text-primary-light flex items-center gap-1">
                            View Library <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {currentReads.length > 0 ? (
                            currentReads.map(book => (
                                <div key={book.id} className="bg-surface rounded-2xl p-4 border border-white/5 flex gap-4 hover:border-white/10 transition-colors group">
                                    <div className="w-20 h-28 bg-white/5 rounded-lg overflow-hidden flex-shrink-0">
                                        {book.cover_url ? (
                                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <BookOpen className="text-text-muted" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <h3 className="font-semibold text-white truncate">{book.title}</h3>
                                            <p className="text-sm text-text-muted truncate">{book.authors}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-text-muted">
                                                <span>{book.current_page || 0} / {book.total_pages || '?'} pages</span>
                                                <span>{book.progress}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${book.progress}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center self-center px-2">
                                        <Link
                                            to={`/read/${book.id}`}
                                            className="p-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors"
                                            title="Continue Reading"
                                        >
                                            <Play size={20} fill="currentColor" />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-surface rounded-2xl p-8 border border-white/5 text-center space-y-4">
                                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                    <BookOpen className="text-text-muted" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">No active readings</h3>
                                    <p className="text-text-muted">Start reading a book from your library!</p>
                                </div>
                                <Link to="/library" className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                                    Go to Library
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity (Placeholder for now) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Reading Streak</h2>
                    </div>
                    <div className="bg-surface rounded-2xl p-6 border border-white/5">
                        <div className="text-center space-y-2 mb-6">
                            <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                                {stats.sessionCount > 0 ? 'Active' : '0 Days'}
                            </span>
                            <p className="text-sm text-text-muted">Current Streak</p>
                        </div>
                        <div className="grid grid-cols-7 gap-2 text-center text-xs text-text-muted">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                <div key={i} className="space-y-2">
                                    <span>{day}</span>
                                    <div className={`w-full aspect-square rounded-md ${i > 3 ? 'bg-primary/50' : 'bg-white/5'}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
