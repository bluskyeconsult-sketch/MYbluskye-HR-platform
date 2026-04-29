import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import TermsPopup from './components/TermsPopup'
import CookieConsent from './components/CookieConsent'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin Login Page
function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/admin/dashboard'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
      <div className="bg-[#16213e] p-8 rounded-lg shadow-xl w-96 border border-gray-800">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">Admin Login</h1>
        {error && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              className="w-full bg-[#0f0f23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              className="w-full bg-[#0f0f23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Admin Dashboard Placeholder (will be replaced in Week 2)
function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h1>
        <p className="text-gray-400">Admin dashboard content will appear here.</p>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null)
    })
  }, [])

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            {/* Add more routes as we build them */}
          </Routes>
        </main>
        <Footer />
        <TermsPopup userId={user?.id} />
        <CookieConsent />
      </div>
    </BrowserRouter>
  )
}

export default App
