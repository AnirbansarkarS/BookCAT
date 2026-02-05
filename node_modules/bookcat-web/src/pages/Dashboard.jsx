import React from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
    const { profile, user } = useAuth()

    const displayName = profile?.username || user?.email?.split('@')[0] || 'Reader'

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                    Welcome back, {displayName}!
                </h1>
                <p className="text-text-muted">Your reading sanctuary awaits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface rounded-2xl p-6 border border-white/5 shadow-xl hover:border-primary/20 transition-colors">
                    <h2 className="text-lg font-semibold mb-4">Currently Reading</h2>
                    <div className="h-32 bg-background/50 rounded-xl animate-pulse" />
                </div>
                <div className="bg-surface rounded-2xl p-6 border border-white/5 shadow-xl hover:border-primary/20 transition-colors">
                    <h2 className="text-lg font-semibold mb-4">Reading Stats</h2>
                    <div className="h-32 bg-background/50 rounded-xl animate-pulse" />
                </div>
                <div className="bg-surface rounded-2xl p-6 border border-white/5 shadow-xl hover:border-primary/20 transition-colors">
                    <h2 className="text-lg font-semibold mb-4">Community Activity</h2>
                    <div className="h-32 bg-background/50 rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
    )
}
