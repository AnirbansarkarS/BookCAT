import React, { useState, useEffect } from 'react';
import { 
    BookOpen, CheckCircle, Clock, Award, Loader2 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
    getUserFeed,
    subscribeToActivities
} from '../services/activityService';

const ACTIVITY_ICONS = {
    FINISHED_BOOK: CheckCircle,
    STARTED_BOOK: BookOpen,
    READING_SESSION: Clock,
    MILESTONE: Award,
};

const ACTIVITY_COLORS = {
    FINISHED_BOOK: 'text-emerald-400 bg-emerald-500/10',
    STARTED_BOOK: 'text-blue-400 bg-blue-500/10',
    READING_SESSION: 'text-purple-400 bg-purple-500/10',
    MILESTONE: 'text-amber-400 bg-amber-500/10',
};

export default function ActivityFeed() {
    const { user } = useAuth();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // Load initial feed
        loadFeed();

        // Subscribe to realtime updates
        const channel = subscribeToActivities((newActivity) => {
            console.log('🔔 New activity received:', newActivity);
            setActivities(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50
        });

        return () => {
            channel?.unsubscribe();
        };
    }, [user]);

    const loadFeed = async () => {
        setLoading(true);
        const { data } = await getUserFeed(user.id, 30);
        setActivities(data);
        setLoading(false);
    };

    const relativeTime = (date) => {
        const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Activity Feed</h2>
            
            {activities.length === 0 ? (
                <p className="text-text-muted text-sm py-8 text-center">
                    No recent activity
                </p>
            ) : (
                activities.map((activity) => {
                    const Icon = ACTIVITY_ICONS[activity.type] || BookOpen;
                    const colorClass = ACTIVITY_COLORS[activity.type] || 'text-gray-400 bg-gray-500/10';

                    return (
                        <div
                            key={activity.id}
                            className="flex gap-3 p-3 bg-surface border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                        >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {(activity.username || 'U')[0].toUpperCase()}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm text-white">
                                            <span className="font-semibold">
                                                {activity.username || 'Someone'}
                                            </span>
                                            {activity.is_friend && (
                                                <span className="ml-1 text-[10px] text-primary">
                                                    • Friend
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-text-muted mt-0.5">
                                            {activity.content}
                                        </p>
                                    </div>
                                    
                                    {/* Icon */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                                        <Icon size={14} />
                                    </div>
                                </div>

                                {/* Book info if present */}
                                {activity.book_cover && (
                                    <div className="flex items-center gap-2 mt-2 p-2 bg-white/5 rounded-lg">
                                        <img 
                                            src={activity.book_cover} 
                                            alt={activity.book_title}
                                            className="w-8 h-12 object-cover rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-white truncate">
                                                {activity.book_title}
                                            </p>
                                            <p className="text-[10px] text-text-muted truncate">
                                                {activity.book_authors}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Timestamp */}
                                <p className="text-[10px] text-text-muted mt-2">
                                    {relativeTime(activity.created_at)}
                                </p>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}