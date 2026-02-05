import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { profileService } from '../services/profileService'
import { User, Camera, Save, X, AlertCircle, CheckCircle } from 'lucide-react'

export default function Profile() {
    const { user, profile, refreshProfile } = useAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [username, setUsername] = useState('')
    const [bio, setBio] = useState('')
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '')
            setBio(profile.bio || '')
        }
    }, [profile])

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarPreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSave = async () => {
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            // Upload avatar if changed
            if (avatarFile) {
                const { error: uploadError } = await profileService.uploadAvatar(user.id, avatarFile)
                if (uploadError) throw uploadError
            }

            // Update profile
            const { error: updateError } = await profileService.updateProfile(user.id, {
                username,
                bio,
            })

            if (updateError) throw updateError

            await refreshProfile()
            setSuccess('Profile updated successfully!')
            setIsEditing(false)
            setAvatarFile(null)
            setAvatarPreview(null)
        } catch (err) {
            setError(err.message || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
        setUsername(profile?.username || '')
        setBio(profile?.bio || '')
        setAvatarFile(null)
        setAvatarPreview(null)
        setError('')
        setSuccess('')
    }

    const displayAvatar = avatarPreview || profile?.avatar_url

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">Profile</h1>
                <p className="text-text-muted">Manage your account information</p>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                    <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-green-400 text-sm">{success}</p>
                </div>
            )}

            <div className="bg-surface rounded-2xl p-8 border border-white/5 shadow-xl">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            {displayAvatar ? (
                                <img
                                    src={displayAvatar}
                                    alt="Avatar"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center border-4 border-primary/20">
                                    <User className="text-white" size={48} />
                                </div>
                            )}
                            {isEditing && (
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <p className="text-text-muted text-sm">{user?.email}</p>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Username
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    placeholder="Enter username"
                                />
                            ) : (
                                <p className="text-white text-lg">{profile?.username || 'Not set'}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Bio
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
                                    placeholder="Tell us about yourself..."
                                />
                            ) : (
                                <p className="text-text-muted">{profile?.bio || 'No bio yet'}</p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
