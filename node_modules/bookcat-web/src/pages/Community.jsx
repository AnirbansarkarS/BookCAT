import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserX, MessageSquare, BookOpen, Users, TrendingUp, Check, X, Loader2, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getAllUsers, sendFriendRequest, acceptFriendRequest, getFriends, getActivityFeed } from '../services/communityService';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function Community() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('discover'); // discover, friends, activity
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user) {
            loadData();
            
            // Refresh data every 30 seconds
            const interval = setInterval(loadData, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;

        try {
            const [allUsers, friendsList, activityList] = await Promise.all([
                getAllUsers(user.id),
                getFriends(user.id),
                getActivityFeed(user.id)
            ]);

            setUsers(allUsers.filter(u => u.id !== user.id)); // Exclude current user
            
            const accepted = friendsList.filter(f => f.status === 'accepted');
            const pending = friendsList.filter(f => f.status === 'pending');
            
            setFriends(accepted);
            setPendingRequests(pending);
            setActivities(activityList);
        } catch (err) {
            console.error('Error loading community data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendFriendRequest = async (friendId) => {
        try {
            await sendFriendRequest(user.id, friendId);
            await loadData(); // Refresh to show updated status
        } catch (err) {
            console.error('Error sending friend request:', err);
        }
    };

    const handleAcceptRequest = async (friendshipId) => {
        try {
            await acceptFriendRequest(friendshipId);
            await loadData();
        } catch (err) {
            console.error('Error accepting friend request:', err);
        }
    };

    const isFriend = (userId) => {
        return friends.some(f => f.friend_id === userId);
    };

    const hasPendingRequest = (userId) => {
        return pendingRequests.some(f => f.friend_id === userId);
    };

    const filteredUsers = users.filter(u => 
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                    <p className="text-text-muted">Loading community...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Community</h1>
                <p className="text-text-muted">Connect with readers and share your journey.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span className="text-sm text-text-muted">Friends</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{friends.length}</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <UserPlus className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm text-text-muted">Requests</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{pendingRequests.length}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-text-muted">Readers</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{users.length}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-surface rounded-xl border border-white/5 w-fit">
                {[
                    { id: 'discover', label: 'Discover', icon: Search },
                    { id: 'friends', label: 'Friends', icon: Users },
                    { id: 'activity', label: 'Activity', icon: TrendingUp }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === tab.id
                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                : "text-text-secondary hover:text-white hover:bg-white/5"
                        )}
                    >
                        {React.createElement(tab.icon, { size: 16 })}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            {activeTab === 'discover' && (
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search readers..."
                        className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                </div>
            )}

            {/* Pending Requests */}
            {activeTab === 'discover' && pendingRequests.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <UserPlus size={18} className="text-emerald-400" />
                        Friend Requests ({pendingRequests.length})
                    </h3>
                    <div className="space-y-2">
                        {pendingRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between bg-surface/50 rounded-lg p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                        <Users size={18} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{request.username || 'Reader'}</p>
                                        <p className="text-xs text-text-muted">{request.email}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAcceptRequest(request.friendship_id)}
                                        className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content based on active tab */}
            {activeTab === 'discover' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((reader) => (
                        <div key={reader.id} className="bg-surface rounded-2xl p-6 border border-white/5 flex flex-col gap-4 hover:border-primary/30 transition-all group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                        {(reader.username || reader.email)?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{reader.username || 'Reader'}</h3>
                                        <p className="text-sm text-text-muted">@{reader.email?.split('@')[0]}</p>
                                    </div>
                                </div>
                                {isFriend(reader.id) ? (
                                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                                        <UserCheck size={14} />
                                        Friends
                                    </div>
                                ) : hasPendingRequest(reader.id) ? (
                                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                                        Pending
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleSendFriendRequest(reader.id)}
                                        className="p-2 rounded-full hover:bg-white/5 text-primary hover:text-white transition-colors"
                                    >
                                        <UserPlus size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="p-4 rounded-xl bg-background/50 border border-white/5 space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <BookOpen size={16} className="text-primary" />
                                    <span className="text-text-muted">Library:</span>
                                    <span className="text-white font-medium">{reader.book_count || 0} Books</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="text-text-muted">Total Reading:</div>
                                    <div className="text-white font-medium">{reader.total_reading_time || 0}h</div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto">
                                <Link
                                    to={`/user/${reader.id}`}
                                    className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-white text-center"
                                >
                                    View Profile
                                </Link>
                                {isFriend(reader.id) && (
                                    <Link
                                        to={`/messages/${reader.id}`}
                                        className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                                    >
                                        <MessageSquare size={18} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'friends' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {friends.length > 0 ? (
                        friends.map((friend) => (
                            <div key={friend.friend_id} className="bg-surface rounded-2xl p-6 border border-emerald-500/30 flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                                        {(friend.username || friend.email)?.[0]?.toUpperCase() || 'F'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{friend.username || 'Friend'}</h3>
                                        <p className="text-sm text-text-muted">Friends since {new Date(friend.friendship_since).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Link
                                        to={`/user/${friend.friend_id}`}
                                        className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-white text-center"
                                    >
                                        View Library
                                    </Link>
                                    <Link
                                        to={`/messages/${friend.friend_id}`}
                                        className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                                    >
                                        <MessageSquare size={18} />
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <Users className="w-16 h-16 text-text-muted mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No friends yet</h3>
                            <p className="text-text-muted mb-4">Start connecting with readers in the Discover tab</p>
                            <button
                                onClick={() => setActiveTab('discover')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
                            >
                                <UserPlus size={20} />
                                Discover Readers
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="max-w-2xl mx-auto space-y-4">
                    {activities.length > 0 ? (
                        activities.map((activity) => (
                            <div key={activity.id} className="bg-surface rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-all">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                        {activity.activity_type === 'book_completed' ? (
                                            <BookOpen size={18} className="text-primary" />
                                        ) : (
                                            <TrendingUp size={18} className="text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white">
                                            <span className="font-semibold">{activity.username || 'A reader'}</span>
                                            {' '}
                                            {activity.activity_type === 'book_completed' && 'completed'}
                                            {activity.activity_type === 'session_completed' && 'read for'}
                                            {' '}
                                            {activity.activity_type === 'book_completed' && (
                                                <span className="text-primary">{activity.data?.book_title}</span>
                                            )}
                                            {activity.activity_type === 'session_completed' && (
                                                <span className="text-primary">{activity.data?.duration_minutes} minutes</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-text-muted mt-1">
                                            {new Date(activity.created_at).toRelativeTime()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <TrendingUp className="w-16 h-16 text-text-muted mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No activity yet</h3>
                            <p className="text-text-muted">Activity from you and your friends will appear here</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Helper to format relative time
Date.prototype.toRelativeTime = function() {
    const now = new Date();
    const diffMs = now - this;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.toLocaleDateString();
};