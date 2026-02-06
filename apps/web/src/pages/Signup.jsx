import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { BookOpen, Mail, Lock, User, AlertCircle } from 'lucide-react'

export default function Signup() {
    const navigate = useNavigate()
    const { signUp } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [username, setUsername] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [lampOn, setLampOn] = useState(false)
    const [pulling, setPulling] = useState(false)
    const [ropeStretch, setRopeStretch] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [startY, setStartY] = useState(0)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (username.length < 3) {
            setError('Username must be at least 3 characters')
            return
        }

        setLoading(true)

        const { error: signUpError } = await signUp(email, password, username)

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
        } else {
            navigate('/dashboard')
        }
    }

    const handleLampPull = () => {
        setPulling(true)
        setTimeout(() => {
            setLampOn(!lampOn)
            setPulling(false)
        }, 300)
    }

    const handleMouseDown = (e) => {
        e.preventDefault()
        setIsDragging(true)
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0
        setStartY(clientY)
    }

    const handleMouseMove = (e) => {
        if (!isDragging) return
        
        e.preventDefault()
        const currentY = e.clientY || e.touches?.[0]?.clientY || 0
        const deltaY = currentY - startY
        
        // Limit stretch to maximum 80px
        const stretch = Math.max(0, Math.min(deltaY, 80))
        setRopeStretch(stretch)
    }

    const handleMouseUp = () => {
        if (!isDragging) return
        
        setIsDragging(false)
        
        // Toggle lamp if pulled more than 30px
        if (ropeStretch > 30) {
            setPulling(true)
            setTimeout(() => {
                setLampOn(!lampOn)
                setPulling(false)
            }, 200)
        }
        
        // Elastic snap back animation
        let currentStretch = ropeStretch
        const snapInterval = setInterval(() => {
            currentStretch = currentStretch * 0.7
            if (currentStretch <= 1) {
                clearInterval(snapInterval)
                setRopeStretch(0)
            } else {
                setRopeStretch(currentStretch)
            }
        }, 16) // ~60fps
    }

    // Add global event listeners for drag
    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
            window.addEventListener('touchmove', handleMouseMove)
            window.addEventListener('touchend', handleMouseUp)
            
            return () => {
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
                window.removeEventListener('touchmove', handleMouseMove)
                window.removeEventListener('touchend', handleMouseUp)
            }
        }
    }, [isDragging, ropeStretch, startY, lampOn])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full transition-all duration-1000 ${
                    lampOn 
                        ? 'bg-blue-500/20 blur-[120px] opacity-100' 
                        : 'bg-blue-500/0 blur-[120px] opacity-0'
                }`} />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
            </div>

            {/* Stars */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            opacity: Math.random() * 0.7 + 0.3,
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Lamp Container */}
                <div className="relative mb-8 flex flex-col items-center">
                    {/* Ceiling Mount Cord */}
                    <div className="relative h-16 flex flex-col items-center">
                        <div className="w-0.5 h-16 bg-gradient-to-b from-slate-600 to-slate-700" />
                    </div>

                    {/* Lamp Fixture */}
                    <div className="relative">
                        {/* Lamp Top */}
                        <div className="w-4 h-3 bg-gradient-to-b from-slate-700 to-slate-800 rounded-t-sm mx-auto" />
                        
                        {/* Lamp Shade */}
                        <div className={`relative w-32 h-24 transition-all duration-700 ${
                            lampOn ? 'drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]' : ''
                        }`}>
                            {/* Outer Shade */}
                            <div className="absolute inset-0">
                                <svg viewBox="0 0 100 100" className="w-full h-full">
                                    <defs>
                                        <linearGradient id="shadeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor={lampOn ? '#3b82f6' : '#1e3a5f'} />
                                            <stop offset="100%" stopColor={lampOn ? '#2563eb' : '#0f1e3a'} />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d="M 20 10 L 10 90 L 90 90 L 80 10 Z"
                                        fill="url(#shadeGradient)"
                                        stroke={lampOn ? '#60a5fa' : '#1e3a5f'}
                                        strokeWidth="1"
                                    />
                                </svg>
                            </div>

                            {/* Inner Glow */}
                            {lampOn && (
                                <div className="absolute inset-0 flex items-end justify-center pb-2">
                                    <div className="w-20 h-16 bg-gradient-radial from-blue-200/80 via-blue-300/40 to-transparent rounded-full blur-sm animate-pulse-slow" />
                                </div>
                            )}

                            {/* Light Bulb Glow */}
                            {lampOn && (
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-200 rounded-full blur-md opacity-80 animate-flicker" />
                            )}
                        </div>

                        {/* Light Rays */}
                        {lampOn && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-40 h-40 pointer-events-none">
                                <div className="absolute inset-0 bg-gradient-to-b from-blue-400/30 via-blue-500/10 to-transparent opacity-60 animate-light-sweep" 
                                     style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)' }} />
                            </div>
                        )}

                        {/* Pull Chain - Below Lamp */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center pt-2">
                            {/* Elastic Rope */}
                            <div 
                                className="relative transition-all"
                                style={{ 
                                    height: `${48 + ropeStretch}px`,
                                    transitionDuration: isDragging ? '0ms' : '300ms'
                                }}
                            >
                                {/* Main rope with elastic stretch effect */}
                                <svg 
                                    width="20" 
                                    height={48 + ropeStretch} 
                                    className="absolute left-1/2 -translate-x-1/2"
                                    style={{ overflow: 'visible' }}
                                >
                                    <defs>
                                        <linearGradient id="ropeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#475569" />
                                            <stop offset="50%" stopColor="#64748b" />
                                            <stop offset="100%" stopColor="#475569" />
                                        </linearGradient>
                                    </defs>
                                    
                                    {/* Rope path with bezier curve for realistic sag */}
                                    <path
                                        d={`M 10 0 Q 10 ${(48 + ropeStretch) * 0.3} 10 ${(48 + ropeStretch) * 0.5} T 10 ${48 + ropeStretch}`}
                                        stroke="url(#ropeGradient)"
                                        strokeWidth={ropeStretch > 20 ? 1.5 : 2}
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                    
                                    {/* Shadow/depth effect */}
                                    <path
                                        d={`M 10 0 Q 10 ${(48 + ropeStretch) * 0.3} 10 ${(48 + ropeStretch) * 0.5} T 10 ${48 + ropeStretch}`}
                                        stroke="rgba(71, 85, 105, 0.3)"
                                        strokeWidth={ropeStretch > 20 ? 2 : 2.5}
                                        fill="none"
                                        strokeLinecap="round"
                                        className="blur-[1px]"
                                    />
                                </svg>

                                {/* Stretch indicator lines (appears when stretched) */}
                                {ropeStretch > 10 && (
                                    <div className="absolute inset-0 flex flex-col justify-around px-2 opacity-30">
                                        {[...Array(Math.floor(ropeStretch / 15))].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="h-px bg-slate-400"
                                                style={{ 
                                                    width: `${4 + Math.sin(i) * 2}px`,
                                                    marginLeft: 'auto',
                                                    marginRight: 'auto'
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pull Handle/Bead */}
                            <div 
                                className={`cursor-grab active:cursor-grabbing transition-all ${
                                    isDragging ? 'scale-110' : 'scale-100'
                                } group`}
                                style={{
                                    transform: `translateY(${ropeStretch}px) scale(${isDragging ? 1.1 : 1})`,
                                    transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                                onMouseDown={handleMouseDown}
                                onTouchStart={handleMouseDown}
                            >
                                {/* Bead/Handle with glow effect */}
                                <div className={`relative w-6 h-6 rounded-full border-2 transition-all duration-300 ${
                                    lampOn 
                                        ? 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300 shadow-lg shadow-blue-500/50' 
                                        : 'bg-gradient-to-br from-slate-600 to-slate-700 border-slate-500 group-hover:border-slate-400 group-hover:shadow-lg group-hover:shadow-slate-500/50'
                                }`}>
                                    {/* Highlight */}
                                    <div className="w-2 h-2 bg-white/40 rounded-full ml-1.5 mt-1.5" />
                                    
                                    {/* Stretch glow effect */}
                                    {ropeStretch > 20 && (
                                        <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
                                    )}
                                </div>

                                {/* Pull hint indicator - only when lamp is off and not dragging */}
                                {!lampOn && !isDragging && ropeStretch === 0 && (
                                    <div 
                                        id="pull-hint-signup"
                                        className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                                    >
                                        <div className="flex items-center gap-1 text-blue-400/70 text-xs font-medium">
                                            <svg className="w-3 h-3 animate-bounce-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                            Pull & drag me
                                        </div>
                                    </div>
                                )}
                                
                                {/* Stretching feedback */}
                                {isDragging && ropeStretch > 10 && (
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <div className="text-blue-400 text-xs font-medium animate-pulse">
                                            {ropeStretch > 30 ? 'Release to toggle!' : 'Keep pulling...'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signup Card */}
                <div className={`transition-all duration-700 transform ${
                    lampOn 
                        ? 'opacity-100 translate-y-0 scale-100' 
                        : 'opacity-0 translate-y-8 scale-95'
                }`}>
                    <div className={`bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border transition-all duration-700 ${
                        lampOn 
                            ? 'border-blue-500/30 shadow-blue-500/20' 
                            : 'border-white/10'
                    }`}>
                        {/* Logo */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
                                <BookOpen className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">
                                BookCat
                            </h1>
                            <p className="text-slate-400 text-sm">
                                Join your reading community
                            </p>
                        </div>

                        {/* Signup Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                                    Create Account
                                </h2>

                                {error && (
                                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 animate-shake">
                                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-red-300 text-sm">{error}</p>
                                    </div>
                                )}

                                {/* Username Field */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Username
                                    </label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="bookworm123"
                                        />
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Email
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Password
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Confirm Password
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Creating account...
                                        </span>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Sign In Link */}
                        <p className="mt-6 text-center text-sm text-slate-400">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>

                    {/* Light is on message */}
                    {lampOn && (
                        <p className="text-center mt-4 text-blue-400/60 text-sm">
                            ✨ Light is on - Welcome!
                        </p>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 0.9; }
                }
                @keyframes flicker {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
                @keyframes light-sweep {
                    0% { opacity: 0.4; }
                    50% { opacity: 0.6; }
                    100% { opacity: 0.4; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes bounce-fast {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-twinkle {
                    animation: twinkle 3s ease-in-out infinite;
                }
                .animate-pulse-slow {
                    animation: pulse-slow 2s ease-in-out infinite;
                }
                .animate-flicker {
                    animation: flicker 0.15s ease-in-out infinite;
                }
                .animate-light-sweep {
                    animation: light-sweep 3s ease-in-out infinite;
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s ease-in-out infinite;
                }
                .animate-bounce-fast {
                    animation: bounce-fast 0.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}