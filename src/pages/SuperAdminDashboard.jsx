// src/pages/SuperAdminDashboard.jsx
// ODUSBABA SUPER ADMIN DASHBOARD v1.0 - Production Ready
// ✅ Complete governance control
// ✅ AI Knowledge Base Management
// ✅ Job fetch control (manual + automated)
// ✅ User governance
// ✅ Platform analytics

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Shield, Users, Briefcase, BookOpen, Brain, Database, 
    Settings, BarChart3, Activity, FileText, Upload, 
    RefreshCw, AlertCircle, CheckCircle, Loader2,
    TrendingUp, Award, Clock, Zap, Filter, Search,
    Plus, X, Download, Trash2, Eye, Edit, Save,
    Play, Pause, Calendar, MessageSquare, Bell, Lock,
    Globe, Server, Cpu, HardDrive, Wifi, Power
} from 'lucide-react';

// ============================================
// TABS CONFIGURATION
// ============================================

const TABS = [
    { id: 'overview', name: 'Platform Overview', icon: BarChart3 },
    { id: 'knowledge', name: 'AI Knowledge Base', icon: Brain },
    { id: 'jobs', name: 'Job Management', icon: Briefcase },
    { id: 'users', name: 'User Governance', icon: Users },
    { id: 'workforce', name: 'Workforce Skills', icon: Award },
    { id: 'system', name: 'System Health', icon: Activity },
    { id: 'audit', name: 'Audit Logs', icon: FileText }
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function SuperAdminDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Stats
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalJobs: 0,
        totalSkills: 0,
        totalCourses: 0,
        activeTesters: 0,
        pendingSkills: 0,
        pendingJobs: 0,
        aiCreditsUsed: 0
    });
    
    // Knowledge Base
    const [knowledgeSources, setKnowledgeSources] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [knowledgeSearch, setKnowledgeSearch] = useState('');
    
    // Job Management
    const [jobs, setJobs] = useState([]);
    const [fetchingJobs, setFetchingJobs] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [jobFilter, setJobFilter] = useState('all');
    
    // Users
    const [users, setUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    
    // System Health
    const [systemHealth, setSystemHealth] = useState({
        database: 'checking',
        api: 'checking',
        ai: 'checking',
        storage: 'checking',
        uptime: 0,
        lastBackup: null
    });
    
    // Audit Logs
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditFilter, setAuditFilter] = useState('all');

    useEffect(() => {
        checkAdminAndLoad();
    }, []);

    useEffect(() => {
        if (isAdmin) {
            loadDashboardData();
        }
    }, [activeTab, isAdmin]);

    async function checkAdminAndLoad() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/admin-login';
                return;
            }
            
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', user.id)
                .single();
            
            const isAdminUser = profile?.user_type === 'super_admin' || 
                               profile?.user_type === 'admin' || 
                               user.email === 'bluskyeconsult@gmail.com';
            
            if (!isAdminUser) {
                window.location.href = '/dashboard';
                return;
            }
            
            setUser(user);
            setIsAdmin(true);
            setLoading(false);
        } catch (error) {
            console.error('Admin check error:', error);
            window.location.href = '/admin-login';
        }
    }

    async function loadDashboardData() {
        setLoading(true);
        
        try {
            // Load stats
            await loadStats();
            
            // Load tab-specific data
            switch (activeTab) {
                case 'knowledge':
                    await loadKnowledgeSources();
                    break;
                case 'jobs':
                    await loadJobs();
                    await loadLastFetchTime();
                    break;
                case 'users':
                    await loadUsers();
                    break;
                case 'workforce':
                    await loadWorkforceSkills();
                    break;
                case 'system':
                    await loadSystemHealth();
                    break;
                case 'audit':
                    await loadAuditLogs();
                    break;
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadStats() {
        const [
            { count: users },
            { count: jobs },
            { count: skills },
            { count: courses },
            { count: testers },
            { count: pendingSkills },
            { count: pendingJobs },
            { data: credits }
        ] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('workforce_skills').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
            supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_published', true),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'tester'),
            supabase.from('workforce_skills').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('compliance_status', 'pending'),
            supabase.from('profiles').select('ai_credits_used')
        ]);
        
        setStats({
            totalUsers: users || 0,
            totalJobs: jobs || 0,
            totalSkills: skills || 0,
            totalCourses: courses || 0,
            activeTesters: testers || 0,
            pendingSkills: pendingSkills || 0,
            pendingJobs: pendingJobs || 0,
            aiCreditsUsed: credits?.reduce((sum, p) => sum + (p.ai_credits_used || 0), 0) || 0
        });
    }

    // ============================================
    // KNOWLEDGE BASE FUNCTIONS
    // ============================================

    async function loadKnowledgeSources() {
        const { data } = await supabase
            .from('knowledge_sources')
            .select('*')
            .order('created_at', { ascending: false });
        
        setKnowledgeSources(data || []);
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        setUploadingFile(true);
        
        try {
            // Upload to storage
            const fileName = `knowledge/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('knowledge_base')
                .upload(fileName, file);
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('knowledge_base')
                .getPublicUrl(fileName);
            
            // Save to database
            const { error: dbError } = await supabase
                .from('knowledge_sources')
                .insert({
                    name: file.name,
                    type: file.type,
                    url: publicUrl,
                    size: file.size,
                    status: 'pending_indexing',
                    uploaded_by: user.id,
                    created_at: new Date().toISOString()
                });
            
            if (dbError) throw dbError;
            
            await loadKnowledgeSources();
            alert(`✅ File "${file.name}" uploaded and queued for AI indexing`);
            
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file');
        } finally {
            setUploadingFile(false);
            event.target.value = '';
        }
    }

    async function reindexKnowledge(sourceId) {
        const { error } = await supabase
            .from('knowledge_sources')
            .update({ status: 'pending_indexing', updated_at: new Date().toISOString() })
            .eq('id', sourceId);
        
        if (!error) {
            alert('Re-indexing queued');
            await loadKnowledgeSources();
        }
    }

    async function deleteKnowledgeSource(sourceId) {
        if (!confirm('Delete this knowledge source? This cannot be undone.')) return;
        
        const { error } = await supabase
            .from('knowledge_sources')
            .delete()
            .eq('id', sourceId);
        
        if (!error) {
            await loadKnowledgeSources();
            alert('Knowledge source deleted');
        }
    }

    // ============================================
    // JOB MANAGEMENT FUNCTIONS
    // ============================================

    async function loadJobs() {
        let query = supabase
            .from('jobs')
            .select('*, profiles:employer_id(full_name, email)')
            .order('created_at', { ascending: false });
        
        if (jobFilter === 'pending') {
            query = query.eq('compliance_status', 'pending');
        } else if (jobFilter === 'approved') {
            query = query.eq('compliance_status', 'approved');
        } else if (jobFilter === 'rejected') {
            query = query.eq('compliance_status', 'rejected');
        }
        
        const { data } = await query;
        setJobs(data || []);
    }

    async function loadLastFetchTime() {
        const { data } = await supabase
            .from('external_job_fetch_log')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (data) {
            setLastFetchTime(new Date(data.created_at));
        }
    }

    async function manualFetchJobs() {
        setFetchingJobs(true);
        
        try {
            const response = await fetch('/api/cron/fetch-jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.CRON_SECRET}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Fetched ${result.added} new jobs`);
                await loadJobs();
                await loadLastFetchTime();
            } else {
                alert('Failed to fetch jobs');
            }
        } catch (error) {
            console.error('Manual fetch error:', error);
            alert('Error fetching jobs');
        } finally {
            setFetchingJobs(false);
        }
    }

    async function updateJobStatus(jobId, status, reason = null) {
        const { error } = await supabase
            .from('jobs')
            .update({
                compliance_status: status,
                compliance_reviewed_at: new Date().toISOString(),
                compliance_notes: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
        
        if (!error) {
            await loadJobs();
            alert(`Job ${status}`);
        }
    }

    // ============================================
    // USER GOVERNANCE FUNCTIONS
    // ============================================

    async function loadUsers() {
        let query = supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (userSearch) {
            query = query.or(`email.ilike.%${userSearch}%,full_name.ilike.%${userSearch}%`);
        }
        
        const { data } = await query;
        setUsers(data || []);
    }

    async function updateUserRole(userId, userType, tier) {
        const { error } = await supabase
            .from('profiles')
            .update({
                user_type: userType,
                tier: tier,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (!error) {
            await loadUsers();
            alert('User role updated');
        }
    }

    async function adjustUserCredits(userId, amount, type = 'ai') {
        const field = type === 'ai' ? 'ai_credits_remaining' : 'va_credits_balance';
        
        const { data: current } = await supabase
            .from('profiles')
            .select(field)
            .eq('id', userId)
            .single();
        
        const newBalance = (current?.[field] || 0) + amount;
        
        const { error } = await supabase
            .from('profiles')
            .update({ [field]: newBalance, updated_at: new Date().toISOString() })
            .eq('id', userId);
        
        if (!error) {
            await loadUsers();
            alert(`Credits ${amount >= 0 ? 'added' : 'removed'}. New balance: ${newBalance}`);
        }
    }

    // ============================================
    // WORKFORCE SKILLS FUNCTIONS
    // ============================================

    async function loadWorkforceSkills() {
        const { data } = await supabase
            .from('workforce_skills')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false });
        
        setWorkforceSkills(data || []);
    }

    async function updateSkillStatus(skillId, status, trustScore = null) {
        const update = { status, updated_at: new Date().toISOString() };
        if (trustScore !== null) update.trust_score = trustScore;
        
        const { error } = await supabase
            .from('workforce_skills')
            .update(update)
            .eq('id', skillId);
        
        if (!error) {
            await loadWorkforceSkills();
            alert(`Skill ${status}`);
        }
    }

    // ============================================
    // SYSTEM HEALTH FUNCTIONS
    // ============================================

    async function loadSystemHealth() {
        try {
            // Check database
            const { error: dbError } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            setSystemHealth(prev => ({ ...prev, database: dbError ? 'degraded' : 'healthy' }));
            
            // Check API
            const apiResponse = await fetch('/api/index?action=health');
            setSystemHealth(prev => ({ ...prev, api: apiResponse.ok ? 'healthy' : 'degraded' }));
            
            // Check AI
            const aiResponse = await fetch('/api/index?action=chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }], maxTokens: 5 })
            });
            setSystemHealth(prev => ({ ...prev, ai: aiResponse.ok ? 'healthy' : 'degraded' }));
            
            // Storage check
            const { data: buckets } = await supabase.storage.listBuckets();
            setSystemHealth(prev => ({ ...prev, storage: buckets ? 'healthy' : 'degraded' }));
            
            // Uptime
            setSystemHealth(prev => ({ ...prev, uptime: process.uptime() }));
            
        } catch (error) {
            console.error('System health check error:', error);
        }
    }

    // ============================================
    // AUDIT LOGS FUNCTIONS
    // ============================================

    async function loadAuditLogs() {
        let query = supabase
            .from('governance_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (auditFilter !== 'all') {
            query = query.eq('event_type', auditFilter);
        }
        
        const { data } = await query;
        setAuditLogs(data || []);
    }

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Super Admin Dashboard</h1>
                                <p className="text-xs text-slate-400">Governance & Platform Control</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-right">
                                <p className="text-xs text-slate-400">{user?.email}</p>
                                <p className="text-xs text-emerald-400">Super Admin</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-slate-800 bg-slate-900/30 sticky top-[73px] z-30">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex overflow-x-auto gap-1 py-2 scrollbar-thin">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-primary-600 text-white'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                
                {/* ============================================
                     OVERVIEW TAB
                ============================================ */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Total Users</p>
                                        <p className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
                                    </div>
                                    <Users className="w-8 h-8 text-primary-400 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Active Jobs</p>
                                        <p className="text-2xl font-bold text-white">{stats.totalJobs.toLocaleString()}</p>
                                    </div>
                                    <Briefcase className="w-8 h-8 text-emerald-400 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Verified Skills</p>
                                        <p className="text-2xl font-bold text-white">{stats.totalSkills.toLocaleString()}</p>
                                    </div>
                                    <Award className="w-8 h-8 text-amber-400 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Active Testers</p>
                                        <p className="text-2xl font-bold text-white">{stats.activeTesters.toLocaleString()}</p>
                                    </div>
                                    <Users className="w-8 h-8 text-purple-400 opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* Pending Actions */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock className="w-5 h-5 text-amber-400" />
                                    <h3 className="text-white font-semibold">Pending Approvals</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Skills awaiting review</span>
                                        <span className="text-amber-400 font-bold">{stats.pendingSkills}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Jobs awaiting compliance</span>
                                        <span className="text-amber-400 font-bold">{stats.pendingJobs}</span>
                                    </div>
                                    <button 
                                        onClick={() => setActiveTab('workforce')}
                                        className="w-full mt-2 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm"
                                    >
                                        Review Pending Items →
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    <h3 className="text-white font-semibold">Platform Activity</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">AI Credits Used</span>
                                        <span className="text-emerald-400 font-bold">{stats.aiCreditsUsed.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Published Courses</span>
                                        <span className="text-emerald-400 font-bold">{stats.totalCourses}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <button onClick={() => setActiveTab('knowledge')} className="p-3 bg-slate-800 rounded-lg text-center hover:bg-slate-700 transition group">
                                    <Brain className="w-6 h-6 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                                    <span className="text-xs text-slate-300">Add Knowledge</span>
                                </button>
                                <button onClick={() => setActiveTab('jobs')} className="p-3 bg-slate-800 rounded-lg text-center hover:bg-slate-700 transition group">
                                    <RefreshCw className="w-6 h-6 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                                    <span className="text-xs text-slate-300">Fetch Jobs</span>
                                </button>
                                <button onClick={() => setActiveTab('users')} className="p-3 bg-slate-800 rounded-lg text-center hover:bg-slate-700 transition group">
                                    <Users className="w-6 h-6 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                                    <span className="text-xs text-slate-300">Manage Users</span>
                                </button>
                                <button onClick={() => setActiveTab('system')} className="p-3 bg-slate-800 rounded-lg text-center hover:bg-slate-700 transition group">
                                    <Activity className="w-6 h-6 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                                    <span className="text-xs text-slate-300">System Health</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================
                     KNOWLEDGE BASE TAB
                ============================================ */}
                {activeTab === 'knowledge' && (
                    <div className="space-y-6">
                        {/* Upload Section */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">AI Knowledge Base</h2>
                                    <p className="text-sm text-slate-400">Upload documents for AI training and context</p>
                                </div>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".pdf,.txt,.md,.json,.csv,.docx"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFile}
                                        className="hidden"
                                    />
                                    <div className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2">
                                        {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {uploadingFile ? 'Uploading...' : 'Upload Document'}
                                    </div>
                                </label>
                            </div>
                            <div className="text-xs text-slate-500">
                                Supported formats: PDF, TXT, Markdown, JSON, CSV, DOCX
                            </div>
                        </div>

                        {/* Knowledge Sources List */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-slate-800">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={knowledgeSearch}
                                        onChange={(e) => setKnowledgeSearch(e.target.value)}
                                        placeholder="Search knowledge sources..."
                                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                            </div>
                            <div className="divide-y divide-slate-800">
                                {knowledgeSources.filter(s => s.name.toLowerCase().includes(knowledgeSearch.toLowerCase())).map(source => (
                                    <div key={source.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-8 h-8 text-slate-500" />
                                            <div>
                                                <p className="text-white font-medium">{source.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        source.status === 'indexed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        source.status === 'pending_indexing' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-slate-500/20 text-slate-400'
                                                    }`}>
                                                        {source.status === 'indexed' ? '✓ Indexed' : 
                                                         source.status === 'pending_indexing' ? '⏳ Pending' : 'Processing'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {(source.size / 1024).toFixed(1)} KB
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(source.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => reindexKnowledge(source.id)}
                                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                                                title="Re-index"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteKnowledgeSource(source.id)}
                                                className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {knowledgeSources.length === 0 && (
                                    <div className="p-8 text-center text-slate-400">
                                        <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No knowledge sources uploaded yet</p>
                                        <p className="text-xs mt-1">Upload documents to train the AI</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================
                     JOB MANAGEMENT TAB
                ============================================ */}
                {activeTab === 'jobs' && (
                    <div className="space-y-6">
                        {/* Fetch Controls */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Job Fetch Control</h2>
                                    <p className="text-sm text-slate-400">
                                        {lastFetchTime ? `Last automated fetch: ${lastFetchTime.toLocaleString()}` : 'No fetch history'}
                                    </p>
                                </div>
                                <button
                                    onClick={manualFetchJobs}
                                    disabled={fetchingJobs}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    {fetchingJobs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    {fetchingJobs ? 'Fetching...' : 'Manual Job Fetch'}
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-slate-500">
                                Cron job runs daily at 2 AM. Manual fetch triggers immediate job import.
                            </div>
                        </div>

                        {/* Job Filters */}
                        <div className="flex flex-wrap gap-2">
                            {['all', 'pending', 'approved', 'rejected'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => {
                                        setJobFilter(filter);
                                        loadJobs();
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                                        jobFilter === filter
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        {/* Jobs List */}
                        <div className="space-y-3">
                            {jobs.map(job => (
                                <div key={job.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <h3 className="text-white font-semibold">{job.title}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    job.compliance_status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    job.compliance_status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {job.compliance_status || 'pending'}
                                                </span>
                                            </div>
                                            <p className="text-primary-400 text-sm">{job.company}</p>
                                            <p className="text-slate-400 text-sm mt-1 line-clamp-2">{job.description}</p>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Posted: {new Date(job.created_at).toLocaleDateString()}
                                                {job.source_type === 'external' && ` • Source: ${job.source_name}`}
                                            </p>
                                        </div>
                                        <div className="flex flex-row md:flex-col gap-2">
                                            {job.compliance_status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => updateJobStatus(job.id, 'approved')}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => updateJobStatus(job.id, 'rejected')}
                                                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <a
                                                href={job.external_apply_url || `/jobs/${job.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm text-center"
                                            >
                                                View
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {jobs.length === 0 && (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                                    <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No jobs found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============================================
                     USER GOVERNANCE TAB
                ============================================ */}
                {activeTab === 'users' && (
                    <div className="space-y-6">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={userSearch}
                                onChange={(e) => {
                                    setUserSearch(e.target.value);
                                    loadUsers();
                                }}
                                placeholder="Search users by email or name..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            />
                        </div>

                        {/* Users List */}
                        <div className="space-y-3">
                            {users.map(userItem => (
                                <div key={userItem.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-white font-semibold">{userItem.full_name || 'Unnamed'}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    userItem.user_type === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                                                    userItem.user_type === 'admin' ? 'bg-primary-500/20 text-primary-400' :
                                                    userItem.user_type === 'tester' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                    {userItem.user_type || 'user'}
                                                </span>
                                            </div>
                                            <p className="text-slate-400 text-sm">{userItem.email}</p>
                                            <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                                                <span>Tier: {userItem.tier || 'free'}</span>
                                                <span>AI Credits: {userItem.ai_credits_remaining || 0}</span>
                                                <span>Joined: {new Date(userItem.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <select
                                                value={userItem.user_type || 'user'}
                                                onChange={(e) => updateUserRole(userItem.id, e.target.value, userItem.tier)}
                                                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                            >
                                                <option value="user">User</option>
                                                <option value="tester">Tester</option>
                                                <option value="employer">Employer</option>
                                                <option value="admin">Admin</option>
                                                <option value="super_admin">Super Admin</option>
                                            </select>
                                            <select
                                                value={userItem.tier || 'free'}
                                                onChange={(e) => updateUserRole(userItem.id, userItem.user_type, e.target.value)}
                                                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                            >
                                                <option value="free">Free</option>
                                                <option value="registered">Registered</option>
                                                <option value="professional">Professional</option>
                                                <option value="employer">Employer</option>
                                                <option value="business">Business</option>
                                            </select>
                                            <button
                                                onClick={() => adjustUserCredits(userItem.id, 10, 'ai')}
                                                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                                            >
                                                +10 AI Credits
                                            </button>
                                            <button
                                                onClick={() => setSelectedUser(userItem)}
                                                className="px-2 py-1 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600"
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {users.length === 0 && (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No users found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============================================
                     WORKFORCE SKILLS TAB
                ============================================ */}
                {activeTab === 'workforce' && (
                    <div className="space-y-4">
                        {workforceSkills?.map(skill => (
                            <div key={skill.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-white font-semibold">{skill.skill_name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                skill.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                                skill.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {skill.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm">
                                            by {skill.profiles?.full_name || 'Unknown'} • {skill.category || 'General'}
                                        </p>
                                        <p className="text-slate-400 text-sm mt-2">{skill.description}</p>
                                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                            <span>Trust Score: {skill.trust_score || 0}</span>
                                            <span>Experience: {skill.years_experience || 0}+ years</span>
                                            <span>Jobs: {skill.completed_jobs || 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {skill.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => updateSkillStatus(skill.id, 'approved', 85)}
                                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => updateSkillStatus(skill.id, 'rejected')}
                                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => updateSkillStatus(skill.id, skill.status, Math.min(100, (skill.trust_score || 0) + 5))}
                                            className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600"
                                        >
                                            +5 Trust
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {workforceSkills?.length === 0 && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                                <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">No skills submitted yet</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================
                     SYSTEM HEALTH TAB
                ============================================ */}
                {activeTab === 'system' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(systemHealth).map(([key, value]) => {
                                if (key === 'uptime' || key === 'lastBackup') return null;
                                return (
                                    <div key={key} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-slate-400 text-sm capitalize">{key}</p>
                                                <p className={`text-lg font-bold ${
                                                    value === 'healthy' ? 'text-emerald-400' :
                                                    value === 'degraded' ? 'text-amber-400' :
                                                    'text-red-400'
                                                }`}>
                                                    {value === 'healthy' ? '✓ Healthy' :
                                                     value === 'degraded' ? '⚠ Degraded' : '✗ Down'}
                                                </p>
                                            </div>
                                            {key === 'database' && <Database className="w-8 h-8 text-slate-500 opacity-50" />}
                                            {key === 'api' && <Globe className="w-8 h-8 text-slate-500 opacity-50" />}
                                            {key === 'ai' && <Brain className="w-8 h-8 text-slate-500 opacity-50" />}
                                            {key === 'storage' && <HardDrive className="w-8 h-8 text-slate-500 opacity-50" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-3">System Info</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Uptime</span>
                                    <span className="text-white">{Math.floor(systemHealth.uptime / 3600)} hours</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Last Backup</span>
                                    <span className="text-white">{systemHealth.lastBackup || 'Not configured'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Environment</span>
                                    <span className="text-white">{import.meta.env.MODE}</span>
                                </div>
                            </div>
                            <button
                                onClick={loadSystemHealth}
                                className="mt-4 w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh Status
                            </button>
                        </div>
                    </div>
                )}

                {/* ============================================
                     AUDIT LOGS TAB
                ============================================ */}
                {activeTab === 'audit' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {['all', 'capability_check', 'enforcement_changed', 'skill_approved', 'job_approved', 'user_role_changed'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => {
                                        setAuditFilter(filter);
                                        loadAuditLogs();
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs capitalize transition ${
                                        auditFilter === filter
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {filter.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>
                        
                        <div className="space-y-2">
                            {auditLogs.map(log => (
                                <div key={log.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                log.event_type === 'capability_check' ? 'bg-blue-500/20 text-blue-400' :
                                                log.event_type === 'enforcement_changed' ? 'bg-amber-500/20 text-amber-400' :
                                                log.event_type.includes('approved') ? 'bg-emerald-500/20 text-emerald-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {log.event_type}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            User: {log.user_id?.slice(0, 8)}...
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {JSON.stringify(log.data).slice(0, 200)}
                                    </p>
                                </div>
                            ))}
                            {auditLogs.length === 0 && (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No audit logs found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
