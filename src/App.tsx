import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { NewQuote } from './pages/NewQuote'
import { QuoteDetail } from './pages/QuoteDetail'
import { QuoteDocument } from './pages/QuoteDocument'
import { AdminPresets } from './pages/AdminPresets'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/quotes/new" element={<ProtectedRoute><Layout><NewQuote /></Layout></ProtectedRoute>} />
          <Route path="/quotes/:id" element={<ProtectedRoute><Layout><QuoteDetail /></Layout></ProtectedRoute>} />
          <Route path="/quotes/:id/document" element={<ProtectedRoute><QuoteDocument /></ProtectedRoute>} />
          <Route path="/admin/presets" element={<ProtectedRoute><Layout><AdminPresets /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
