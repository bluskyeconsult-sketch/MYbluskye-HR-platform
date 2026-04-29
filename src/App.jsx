import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Temporary placeholder components (we'll build these later)
function HomePage() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Bluskye Consult</h1>
      <p className="text-xl">ODUSBABA HR Intelligence Platform</p>
      <p className="mt-4 text-green-600">✅ Setup successful! Ready for next steps.</p>
      <div className="mt-8">
        <a href="/admin-login" className="bg-blue-500 text-white px-4 py-2 rounded">Admin Login</a>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Admin Dashboard placeholder (will be replaced by our full version)
function AdminDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p>Admin dashboard content will appear here.</p>
      <div className="mt-4">
        <a href="/admin/super/countries" className="bg-gray-700 text-white px-4 py-2 rounded">Country Management</a>
      </div>
    </div>
  )
}

// Country Management placeholder
function CountryManagementPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Country Management</h1>
      <p>Country management interface will appear here. Super Admin only.</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/super/countries" element={<CountryManagementPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
