import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import Community from './pages/Community'
import Exchange from './pages/Exchange'
import ReadingMode from './pages/ReadingMode'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Stats from './pages/Stats'

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Protected Routes */}
                    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="library" element={<Library />} />
                        <Route path="stats" element={<Stats />} />
                        <Route path="community" element={<Community />} />
                        <Route path="exchange" element={<Exchange />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="read/:bookId" element={<ReadingMode />} />
                        <Route path="*" element={<div className="p-10 text-white">Page not found</div>} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App

