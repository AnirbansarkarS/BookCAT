import React, { useState, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SplashScreen from './components/SplashScreen'

// Lazy-loaded pages — only fetched when user navigates to them
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Discover = lazy(() => import('./pages/Discover'))
const Library = lazy(() => import('./pages/Library'))
const Community = lazy(() => import('./pages/Community'))
const Exchange = lazy(() => import('./pages/Exchange'))
const ReadingMode = lazy(() => import('./pages/ReadingMode'))
const Profile = lazy(() => import('./pages/Profile'))
const Stats = lazy(() => import('./pages/Stats'))
const Quiz = lazy(() => import('./pages/Quiz'))

// Minimal loading fallback for lazy routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
  </div>
)

// Inner app that lives inside BrowserRouter so it can read the current URL
// even while the splash screen is showing. This ensures that when the splash
// finishes the router already knows the originally-requested path and won't
// redirect the user to /discover on refresh.
function AppRoutes({ splashDone }) {
  if (!splashDone) {
    // While splash is playing, render nothing from the router — the splash
    // component is rendered by its parent. We mount the router early so that
    // the URL is preserved in router state.
    return null
  }

  return (
    <motion.div
      key="app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ minHeight: '100vh' }}
    >
      <AuthProvider>
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
            <Route index element={<Navigate to="/discover" replace />} />
            <Route path="discover" element={<Suspense fallback={<PageLoader />}><Discover /></Suspense>} />
            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="library" element={<Suspense fallback={<PageLoader />}><Library /></Suspense>} />
            <Route path="stats" element={<Suspense fallback={<PageLoader />}><Stats /></Suspense>} />
            <Route path="community" element={<Suspense fallback={<PageLoader />}><Community /></Suspense>} />
            <Route path="exchange" element={<Suspense fallback={<PageLoader />}><Exchange /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
            <Route path="quiz" element={<Suspense fallback={<PageLoader />}><Quiz /></Suspense>} />
            <Route path="read/:bookId" element={<Suspense fallback={<PageLoader />}><ReadingMode /></Suspense>} />
            <Route
              path="*"
              element={<div className="p-10 text-white">Page not found</div>}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </motion.div>
  )
}

function App() {
  const [splashDone, setSplashDone] = useState(false)

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true)
  }, [])

  return (
    // BrowserRouter wraps everything so the router is aware of the real URL
    // from the very first render — before the splash screen finishes.
    <BrowserRouter>
      {/* ── Cinematic splash intro ── */}
      <AnimatePresence>
        {!splashDone && (
          <SplashScreen onFinish={handleSplashFinish} />
        )}
      </AnimatePresence>

      {/* ── Main application (shown after splash) ── */}
      <AnimatePresence>
        <AppRoutes splashDone={splashDone} />
      </AnimatePresence>
    </BrowserRouter>
  )
}

export default App