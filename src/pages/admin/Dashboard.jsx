import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalJobs: 0,
        pendingJobs: 0,
        pendingSkills: 0,
        testerFeedback: 0
    })
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)

    useEffect(() => {
        checkAuth()
        loadStats()
    }, [])

    async function checkAuth() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            window.location.href = '/admin-login'
            return
        }
        
        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single()
        
        if (!profile || (profile.user_type !== 'admin' && profile.user_type !== 'super_admin')) {
            window.location.href = '/'
        }
        setUser(user)
    }

    async function loadStats() {
        setLoading(true)
        
        // Get total users
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
        
        // Get total jobs
        const { count: totalJobs } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
        
        // Get pending jobs
        const { count: pendingJobs } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('compliance_status', 'pending')
        
        // Get pending skills
        const { count: pendingSkills } = await supabase
            .from('skills')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'pending')
        
        // Get tester feedback
        const { count: testerFeedback } = await supabase
            .from('tester_feedback')
            .select('*', { count: 'exact', head: true })
        
        setStats({
            totalUsers: totalUsers || 0,
            totalJobs: totalJobs || 0,
            pendingJobs: pendingJobs || 0,
            pendingSkills: pendingSkills || 0,
            testerFeedback: testerFeedback || 0
        })
        setLoading(false)
    }

    if (loading) {
        return <div className="p-8 text-center">Loading dashboard...</div>
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                    <div className="text-gray-500 text-sm">Total Users</div>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <div className="text-gray-500 text-sm">Total Jobs</div>
                    <div className="text-2xl font-bold">{stats.totalJobs}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                    <div className="text-gray-500 text-sm">Pending Jobs</div>
                    <div className="text-2xl font-bold">{stats.pendingJobs}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                    <div className="text-gray-500 text-sm">Pending Skills</div>
                    <div className="text-2xl font-bold">{stats.pendingSkills}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                    <div className="text-gray-500 text-sm">Tester Feedback</div>
                    <div className="text-2xl font-bold">{stats.testerFeedback}</div>
                </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <a href="/admin/users" className="bg-blue-500 text-white text-center px-4 py-2 rounded hover:bg-blue-600">Manage Users</a>
                    <a href="/admin/jobs" className="bg-green-500 text-white text-center px-4 py-2 rounded hover:bg-green-600">Moderate Jobs</a>
                    <a href="/admin/skills" className="bg-purple-500 text-white text-center px-4 py-2 rounded hover:bg-purple-600">Verify Skills</a>
                    <a href="/admin/audit" className="bg-gray-500 text-white text-center px-4 py-2 rounded hover:bg-gray-600">View Audit Log</a>
                </div>
            </div>
            
            {/* Super Admin Section (only visible to super_admin) */}
            {user && (
                <div className="bg-gray-100 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">🔒 Super Admin Tools</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <a href="/admin/super/countries" className="bg-gray-700 text-white text-center px-4 py-2 rounded hover:bg-gray-800">Country Management</a>
                        <a href="/admin/geo-pricing" className="bg-gray-700 text-white text-center px-4 py-2 rounded hover:bg-gray-800">Geo-Pricing</a>
                        <a href="/admin/security" className="bg-gray-700 text-white text-center px-4 py-2 rounded hover:bg-gray-800">Security Dashboard</a>
                        <a href="/admin/tamper-reports" className="bg-gray-700 text-white text-center px-4 py-2 rounded hover:bg-gray-800">Tamper Reports</a>
                    </div>
                </div>
            )}
        </div>
    )
}
