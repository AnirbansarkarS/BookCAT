import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import Community from './pages/Community'
import Exchange from './pages/Exchange'
import ReadingMode from './pages/ReadingMode'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="library" element={<Library />} />
                    <Route path="community" element={<Community />} />
                    <Route path="exchange" element={<Exchange />} />
                    <Route path="read/:bookId" element={<ReadingMode />} />
                    <Route path="*" element={<div className="p-10 text-white">Page not found</div>} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
