import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, LogOut, UserCircle, UserPlus, ArrowLeftRight, MessageSquare, Check, X, BookOpen } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import logo from '../../assets/bookcat-logo.webp'

function relTime(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000)
    if (s < 60) return 'Just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
}

const NOTIF_ICONS = {
    friend_request: { icon: UserPlus, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    exchange_offer: { icon: ArrowLeftRight, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    message: { icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    milestone: { icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10' },
}

export function Navbar({ onMenuClick }) {
    const navigate = useNavigate()
    const { user, profile, signOut } = useAuth()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [loadingNotifs, setLoadingNotifs] = useState(false)
    const dropdownRef = useRef(null)
    const notifRef = useRef(null)

    // ── Fetch notifications ──────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        if (!user) return
        setLoadingNotifs(true)
        try {
            const notifs = []

            // 1. Pending friend requests sent TO me
            const { data: friendReqs } = await supabase
                .from('friendships')
                .select('id, created_at, user_id')
                .eq('friend_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(10)

            if (friendReqs?.length) {
                const senderIds = friendReqs.map(r => r.user_id)
                const { data: senderProfiles } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', senderIds)

                friendReqs.forEach(req => {
                    const sender = senderProfiles?.find(p => p.id === req.user_id)
                    notifs.push({
                        id: `fr-${req.id}`,
                        type: 'friend_request',
                        title: 'Friend Request',
                        body: `${sender?.username || 'Someone'} wants to be friends`,
                        time: req.created_at,
                        action: () => navigate('/community'),
                        meta: { friendshipId: req.id },
                    })
                })
            }

            // 2. Pending exchange offers sent TO me
            const { data: exchanges } = await supabase
                .from('exchange_offers')
                .select('id, created_at, initiator_id, initiator_message')
                .eq('recipient_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(10)

            if (exchanges?.length) {
                const senderIds = [...new Set(exchanges.map(e => e.initiator_id))]
                const { data: senderProfiles } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', senderIds)

                exchanges.forEach(ex => {
                    const sender = senderProfiles?.find(p => p.id === ex.initiator_id)
                    notifs.push({
                        id: `ex-${ex.id}`,
                        type: 'exchange_offer',
                        title: 'Exchange Request',
                        body: `${sender?.username || 'Someone'} wants to exchange a book`,
                        time: ex.created_at,
                        action: () => navigate('/exchange'),
                    })
                })
            }

            // 3. Unread messages
            const { data: msgs } = await supabase
                .from('messages')
                .select('id, created_at, sender_id, content')
                .eq('receiver_id', user.id)
                .is('read_at', null)
                .order('created_at', { ascending: false })
                .limit(10)

            if (msgs?.length) {
                const senderIds = [...new Set(msgs.map(m => m.sender_id))]
                const { data: senderProfiles } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', senderIds)

                // Group by sender
                const grouped = {}
                msgs.forEach(msg => {
                    if (!grouped[msg.sender_id]) {
                        grouped[msg.sender_id] = { count: 0, latest: msg }
                    }
                    grouped[msg.sender_id].count++
                })

                Object.entries(grouped).forEach(([senderId, { count, latest }]) => {
                    const sender = senderProfiles?.find(p => p.id === senderId)
                    notifs.push({
                        id: `msg-${senderId}`,
                        type: 'message',
                        title: sender?.username || 'Message',
                        body: count > 1 ? `${count} unread messages` : latest.content.slice(0, 60),
                        time: latest.created_at,
                        action: () => navigate('/community'),
                    })
                })
            }

            // Sort by time desc
            notifs.sort((a, b) => new Date(b.time) - new Date(a.time))
            setNotifications(notifs)
        } catch (err) {
            console.error('Error fetching notifications:', err)
        } finally {
            setLoadingNotifs(false)
        }
    }, [user, navigate])

    useEffect(() => {
        fetchNotifications()
        // Poll every 30s
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    // Realtime subscription for messages
    useEffect(() => {
        if (!user) return
        const channel = supabase
            .channel('navbar-notifs')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`,
            }, () => fetchNotifications())
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'friendships',
                filter: `friend_id=eq.${user.id}`,
            }, () => fetchNotifications())
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'exchange_offers',
                filter: `recipient_id=eq.${user.id}`,
            }, () => fetchNotifications())
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [user, fetchNotifications])

    // ── Outside click ────────────────────────────────────────
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false)
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setNotifOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    const handleProfileClick = () => {
        setDropdownOpen(false)
        navigate('/profile')
    }

    const getInitials = () => {
        if (profile?.username) return profile.username.substring(0, 2).toUpperCase()
        if (user?.email) return user.email.substring(0, 2).toUpperCase()
        return 'U'
    }

    const unreadCount = notifications.length

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl px-4 md:px-8">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary"
                >
                    <Menu size={24} />
                </button>

                {/* Logo — both mobile & desktop */}
                <button onClick={() => navigate('/')} className="flex items-center">
                    <img src={logo} alt="BookCat" className="h-9 w-9 object-contain drop-shadow-md" width="36" height="36" decoding="async" />
                </button>

                {/* Desktop Navigation Links */}
                <div className="hidden md:flex items-center gap-6 ml-2">
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm font-medium text-text-secondary hover:text-white transition-colors"
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/library')}
                        className="text-sm font-medium text-text-secondary hover:text-white transition-colors"
                    >
                        Library
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">

                {/* ── Notification Bell ── */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => { setNotifOpen(o => !o); setDropdownOpen(false) }}
                        className={cn(
                            'relative p-2 rounded-full transition-colors',
                            notifOpen
                                ? 'bg-white/10 text-white'
                                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                        )}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 border-2 border-background text-[9px] font-bold text-white flex items-center justify-center leading-none">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {notifOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                                <p className="text-sm font-bold text-white">Notifications</p>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>

                            <div className="max-h-[360px] overflow-y-auto">
                                {loadingNotifs ? (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                            <Bell size={18} className="text-text-muted/40" />
                                        </div>
                                        <p className="text-sm text-white font-medium">All caught up!</p>
                                        <p className="text-xs text-text-muted">No new notifications</p>
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-1">
                                        {notifications.map(notif => {
                                            const cfg = NOTIF_ICONS[notif.type] || NOTIF_ICONS.milestone
                                            const Icon = cfg.icon
                                            return (
                                                <button
                                                    key={notif.id}
                                                    onClick={() => { notif.action(); setNotifOpen(false) }}
                                                    className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition-all text-left group"
                                                >
                                                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
                                                        <Icon size={15} className={cfg.color} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-white leading-snug">{notif.title}</p>
                                                        <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
                                                        <p className="text-[10px] text-text-muted/50 mt-1">{relTime(notif.time)}</p>
                                                    </div>
                                                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {notifications.length > 0 && (
                                <div className="px-3 py-2.5 border-t border-white/[0.07]">
                                    <button
                                        onClick={() => { setNotifications([]); setNotifOpen(false) }}
                                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-text-muted hover:text-white transition-colors"
                                    >
                                        <Check size={11} />
                                        Mark all as read
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-8 w-[1px] bg-white/10 hidden md:block" />

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false) }}
                        className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                    >
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full object-cover shadow-lg shadow-primary/20"
                                loading="lazy"
                                decoding="async"
                                width="32"
                                height="32"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-wine flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary/20">
                                {getInitials()}
                            </div>
                        )}
                        <span className="hidden md:block text-sm font-medium text-text-primary">
                            {profile?.username || user?.email?.split('@')[0] || 'User'}
                        </span>
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                            <div className="p-4 border-b border-white/5">
                                <p className="text-sm font-medium text-white">
                                    {profile?.username || 'User'}
                                </p>
                                <p className="text-xs text-text-muted truncate">{user?.email}</p>
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={handleProfileClick}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-white/5 rounded-xl transition-colors"
                                >
                                    <UserCircle size={18} />
                                    Profile
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
