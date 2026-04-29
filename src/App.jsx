import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminDashboard from './pages/admin/Dashboard'
import CountryManagement from './pages/admin/super/CountryManagement'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                
                {/* Admin routes */}
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/super/countries" element={<CountryManagement />} />
                
                {/* Add other routes as we build them */}
            </Routes>
        </BrowserRouter>
    )
}
