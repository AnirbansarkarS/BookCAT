import React, { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Discover from './pages/Discover';
import Library from './pages/Library'
import Community from './pages/Community'
import Exchange from './pages/Exchange'
import ReadingMode from './pages/ReadingMode'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Stats from './pages/Stats'
import SplashScreen from './components/SplashScreen'

function App() {
  const [splashDone, setSplashDone] = useState(false)

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true)
  }, [])

  return (
    <>
      {/* ── Cinematic splash intro ── */}
      <AnimatePresence>
        {!splashDone && (
          <SplashScreen onFinish={handleSplashFinish} />
        )}
      </AnimatePresence>

      {/* ── Main application ── */}
      <AnimatePresence>
        {splashDone && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ minHeight: '100vh' }}
          >
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />

                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="discover" element={<Discover />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="library" element={<Library />} />
                    <Route path="stats" element={<Stats />} />
                    <Route path="community" element={<Community />} />
                    <Route path="exchange" element={<Exchange />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="read/:bookId" element={<ReadingMode />} />
                    <Route
                      path="*"
                      element={<div className="p-10 text-white">Page not found</div>}
                    />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App