import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, User, LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export function Navbar({ onMenuClick }) {
    const navigate = useNavigate()
    const { user, profile, signOut } = useAuth()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false)
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
        if (profile?.username) {
            return profile.username.substring(0, 2).toUpperCase()
        }
        if (user?.email) {
            return user.email.substring(0, 2).toUpperCase()
        }
        return 'U'
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl px-4 md:px-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary"
                >
                    <Menu size={24} />
                </button>

                {/* Mobile Logo */}
                <span className="md:hidden text-lg font-bold text-white">Book<span className="text-primary">Cat</span></span>

                {/* Search Bar (Desktop) */}
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-white/5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all w-64 lg:w-96">
                    <Search size={16} className="text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search books, authors..."
                        className="bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted w-full"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-full transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-background"></span>
                </button>

                <div className="h-8 w-[1px] bg-white/10 hidden md:block" />

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                    >
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full object-cover shadow-lg shadow-primary/20"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary/20">
                                {getInitials()}
                            </div>
                        )}
                        <span className="hidden md:block text-sm font-medium text-text-primary">
                            {profile?.username || user?.email?.split('@')[0] || 'User'}
                        </span>
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
