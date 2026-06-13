// src/pages/admin/SuperAdminDashboard.jsx
// COMPLETE SUPER ADMIN DASHBOARD - All functions, AI knowledge, job fetch

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    LayoutDashboard, Users, Briefcase, Flag, FileText, 
    BookOpen, ClipboardList, Bot, Mail, Database, Sparkles,
    Shield, Settings, LogOut, Menu, X, Activity,
    BarChart3, Globe, Award, CheckCircle, Clock, AlertCircle,
    TrendingUp, Calendar, UserPlus, Eye, Zap, Wifi, Download,
    Upload, Plus, Trash2, Edit, RefreshCw, Loader2, Brain,
    File, Image, Link as LinkIcon, Search, Filter
} from 'lucide-react';
import { 
    getKnowledgeSources, 
    addKnowledgeSource, 
    deleteKnowledgeSource,
    uploadToKnowledgeBase,
    checkAIHealth,
    generateSEOTitle,
    improveContent
} from '../../services/aiService';

export default function SuperAdminDashboard() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalJobs: 0,
        pendingJobs: 0,
        pendingReports: 0,
        totalVAs: 24,
        totalCourses: 0,
        totalAssessments: 0,
        aiHealth: 'checking'
    });
    
    // AI Knowledge Base State
    const [knowledgeSources, setKnowledgeSources] = useState([]);
    const [showAddSource, setShowAddSource] = useState(false);
    const [newSource, setNewSource] = useState({ name: '', type: 'document', url: '', content: '' });
    const [uploadingFile, setUploadingFile] = useState(false);
    const [aiHealth, setAiHealth] = useState(null);
    
    // Job Fetch State
    const [fetchingJobs, setFetchingJobs] = useState(false);
    const [fetchResult, setFetchResult] = useState(null);
    const [externalJobs, setExternalJobs] = useState([]);
    
    // AI Test State
    const [testTitle, setTestTitle] = useState('');
    const [testResult, setTestResult] = useState('');
    const [testContent, setTestContent] = useState('');
    const [improvedContent, setImprovedContent] = useState('');

    useEffect(() => {
        loadDashboard();
        loadKnowledgeSources();
        checkAI();
        loadExternalJobs();
    }, []);

    async function loadDashboard() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/admin-login';
            return;
        }
        
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileData?.user_type !== 'super_admin' && user.email !== 'bluskyeconsult@gmail.com') {
            window.location.href = '/dashboard';
            return;
        }
        
        setUser(user);
        setProfile(profileData);
        
        // Load stats
        const [userCount, jobCount, pendingJobs, pendingReports, coursesCount, assessmentsCount] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('external_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
            supabase.from('fraud_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
            supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ]);
        
        setStats({
            totalUsers: userCount.count || 0,
            totalJobs: jobCount.count || 0,
            pendingJobs: pendingJobs.count || 0,
            pendingReports: pendingReports.count || 0,
            totalVAs: 24,
            totalCourses: coursesCount.count || 0,
            totalAssessments: assessmentsCount.count || 0,
            aiHealth: 'unknown'
        });
        
        setLoading(false);
    }

    async function loadKnowledgeSources() {
        const sources = await getKnowledgeSources();
        setKnowledgeSources(sources);
    }

    async function checkAI() {
        const health = await checkAIHealth();
        setAiHealth(health);
        setStats(prev => ({ ...prev, aiHealth: health.status }));
    }

    async function loadExternalJobs() {
        const { data } = await supabase
            .from('external_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        setExternalJobs(data || []);
    }

    async function handleFetchJobs() {
        setFetchingJobs(true);
        setFetchResult(null);
        
        try {
            // Manual fetch via API
            const response = await fetch('/api/fetch-jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            setFetchResult({ success: true, added: data.added || 0, message: data.message });
            await loadExternalJobs();
            await loadDashboard();
        } catch (error) {
            setFetchResult({ success: false, error: error.message });
        } finally {
            setFetchingJobs(false);
        }
    }

    async function handleSyncExternalJobs() {
        setFetchingJobs(true);
        
        try {
            // Sync external jobs to main jobs table
            const { data: pending } = await supabase
                .from('external_jobs')
                .select('*')
                .eq('status', 'pending_approval')
                .limit(50);
            
            let approved = 0;
            for (const job of pending || []) {
                const { error } = await supabase
                    .from('jobs')
                    .insert({
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        description: job.description,
                        salary_range: job.salary_range,
                        external_apply_url: job.external_apply_url,
                        source_type: 'external',
                        compliance_status: 'approved',
                        is_active: true
                    });
                
                if (!error) {
                    await supabase
                        .from('external_jobs')
                        .update({ status: 'approved' })
                        .eq('id', job.id);
                    approved++;
                }
            }
            
            setFetchResult({ success: true, added: approved, message: `Synced ${approved} jobs` });
            await loadExternalJobs();
            await loadDashboard();
        } catch (error) {
            setFetchResult({ success: false, error: error.message });
        } finally {
            setFetchingJobs(false);
        }
    }

    async function handleAddKnowledgeSource() {
        if (!newSource.name) {
            alert('Please enter a source name');
            return;
        }
        
        try {
            await addKnowledgeSource(newSource);
            setNewSource({ name: '', type: 'document', url: '', content: '' });
            setShowAddSource(false);
            await loadKnowledgeSources();
            alert('Knowledge source added successfully');
        } catch (error) {
            alert('Error adding source: ' + error.message);
        }
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        setUploadingFile(true);
        
        try {
            const source = await uploadToKnowledgeBase(file, {
                name: file.name,
                type: file.type.startsWith('image/') ? 'image' : 'document'
            });
            
            await loadKnowledgeSources();
            alert(`File "${file.name}" uploaded and added to knowledge base`);
        } catch (error) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploadingFile(false);
        }
    }

    async function handleDeleteKnowledgeSource(id) {
        if (!confirm('Delete this knowledge source?')) return;
        
        try {
            await deleteKnowledgeSource(id);
            await loadKnowledgeSources();
            alert('Source deleted');
        } catch (error) {
            alert('Delete failed: ' + error.message);
        }
    }

    async function handleTestSEO() {
        if (!testTitle) {
            alert('Enter a title to test');
            return;
        }
        
        const result = await generateSEOTitle(testTitle);
        setTestResult(result);
    }

    async function handleTestImprove() {
        if (!testContent) {
            alert('Enter content to improve');
            return;
        }
        
        const result = await improveContent(testContent);
        setImprovedContent(result);
    }

    const isSuperAdmin = profile?.user_type === 'super_admin' || user?.email === 'bluskyeconsult@gmail.com';

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-slate-400">Super admin privileges required</p>
                </div>
            </div>
        );
    }

    const menuItems = [
        { id: 'overview', name: 'Overview', icon: LayoutDashboard, path: '/admin/dashboard' },
        { id: 'users', name: 'User Management', icon: Users, path: '/admin/users' },
        { id: 'jobs', name: 'Job Management', icon: Briefcase, path: '/admin/jobs' },
        { id: 'external-jobs', name: 'External Jobs', icon: Globe, path: '/admin/external-jobs' },
        { id: 'ai-knowledge', name: 'AI Knowledge Base', icon: Brain, path: '/admin/knowledge-sources' },
        { id: 'ai-test', name: 'AI Test Lab', icon: Sparkles, path: '/admin/ai-test' },
        { id: 'articles', name: 'Articles', icon: FileText, path: '/admin/articles' },
        { id: 'assessments', name: 'Assessments', icon: ClipboardList, path: '/admin/assessments' },
        { id: 'virtual-assistants', name: 'Virtual Assistants', icon: Bot, path: '/admin/virtual-assistants' },
        { id: 'health', name: 'System Health', icon: Activity, path: '/admin/health' },
        { id: 'analytics', name: 'Analytics', icon: BarChart3, path: '/admin/analytics' }
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white shadow-lg"
            >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Sidebar */}
            <div className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'} overflow-hidden shadow-xl`}>
                <div className="p-4 border-b border-slate-800">
                    <h2 className={`text-lg font-bold text-white ${!sidebarOpen && 'lg:hidden'}`}>Super Admin</h2>
                    {sidebarOpen && (
                        <span className="text-xs text-emerald-400 mt-1 block">Full System Access</span>
                    )}
                </div>
                
                <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100%-120px)]">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg transition ${
                                activeTab === item.id
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800'
                            }`}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className={`text-sm ${!sidebarOpen && 'lg:hidden'}`}>{item.name}</span>
                        </button>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className={`text-sm ${!sidebarOpen && 'lg:hidden'}`}>Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {/* Header */}
                <div className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-sm">
                    <div className="px-6 py-4 flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-white">
                                {menuItems.find(i => i.id === activeTab)?.name || 'Dashboard'}
                            </h1>
                            <p className="text-slate-400 text-sm">Super Admin • Full System Control</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {aiHealth?.status === 'healthy' ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-400">
                                    <CheckCircle className="w-3 h-3" /> AI Online
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-400">
                                    <AlertCircle className="w-3 h-3" /> AI Degraded
                                </span>
                            )}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <Award className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-semibold">Super Admin</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* ============================================ */}
                    {/* OVERVIEW TAB */}
                    {/* ============================================ */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-slate-400 text-sm">Total Users</p><p className="text-2xl font-bold text-white">{stats.totalUsers}</p></div>
                                        <Users className="w-8 h-8 text-primary-400 opacity-50" />
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-slate-400 text-sm">Active Jobs</p><p className="text-2xl font-bold text-white">{stats.totalJobs}</p></div>
                                        <Briefcase className="w-8 h-8 text-emerald-400 opacity-50" />
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-slate-400 text-sm">Pending Approvals</p><p className="text-2xl font-bold text-amber-400">{stats.pendingJobs + stats.pendingReports}</p></div>
                                        <Clock className="w-8 h-8 text-amber-400 opacity-50" />
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-slate-400 text-sm">AI Knowledge Items</p><p className="text-2xl font-bold text-white">{knowledgeSources.length}</p></div>
                                        <Brain className="w-8 h-8 text-purple-400 opacity-50" />
                                    </div>
                                </div>
                            </div>

                            {/* AI Health Status */}
                            <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
                                aiHealth?.status === 'healthy' 
                                    ? 'bg-emerald-500/10 border border-emerald-500/20' 
                                    : 'bg-amber-500/10 border border-amber-500/20'
                            }`}>
                                <div className="flex items-center gap-3">
                                    {aiHealth?.status === 'healthy' ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-amber-400" />
                                    )}
                                    <div>
                                        <p className="text-white font-semibold">AI Service Status</p>
                                        <p className="text-slate-400 text-sm">
                                            {aiHealth?.status === 'healthy' 
                                                ? 'All AI services operational' 
                                                : aiHealth?.message || 'AI service degraded - using fallbacks'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={checkAI} className="text-primary-400 text-sm hover:underline">Refresh</button>
                            </div>

                            {/* Job Fetch Section */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Wifi className="w-4 h-4 text-primary-400" />
                                    Job Fetch & Sync
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={handleFetchJobs}
                                        disabled={fetchingJobs}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {fetchingJobs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                        Fetch External Jobs
                                    </button>
                                    <button
                                        onClick={handleSyncExternalJobs}
                                        disabled={fetchingJobs}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {fetchingJobs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Sync to Main Jobs
                                    </button>
                                </div>
                                
                                {fetchResult && (
                                    <div className={`mt-3 p-3 rounded-lg ${fetchResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        <p className="text-sm">{fetchResult.success ? `✅ ${fetchResult.message || `Added ${fetchResult.added} jobs`}` : `❌ ${fetchResult.error}`}</p>
                                    </div>
                                )}
                            </div>

                            {/* Recent External Jobs */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-primary-400" />
                                    Recently Fetched External Jobs
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-800/50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-white">Title</th>
                                                <th className="px-3 py-2 text-left text-white">Source</th>
                                                <th className="px-3 py-2 text-left text-white">Status</th>
                                                <th className="px-3 py-2 text-left text-white">Received</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {externalJobs.slice(0, 10).map(job => (
                                                <tr key={job.id} className="border-b border-slate-800">
                                                    <td className="px-3 py-2 text-slate-300">{job.title?.substring(0, 50)}...</td>
                                                    <td className="px-3 py-2 text-slate-400">{job.source_name}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                            job.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-400' :
                                                            job.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>
                                                            {job.status || 'pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-400">{new Date(job.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                            {externalJobs.length === 0 && (
                                                <tr><td colSpan="4" className="px-3 py-8 text-center text-slate-400">No external jobs found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ============================================ */}
                    {/* AI KNOWLEDGE BASE TAB */}
                    {/* ============================================ */}
                    {activeTab === 'ai-knowledge' && (
                        <div className="space-y-6">
                            {/* Add Knowledge Source */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-primary-400" />
                                        AI Knowledge Base
                                    </h3>
                                    <button
                                        onClick={() => setShowAddSource(!showAddSource)}
                                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> Add Source
                                    </button>
                                </div>
                                
                                {/* File Upload */}
                                <div className="mb-4 p-4 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                                    <label className="flex flex-col items-center justify-center cursor-pointer">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                            <p className="text-sm text-slate-400">Click to upload file to AI knowledge base</p>
                                            <p className="text-xs text-slate-500">PDF, DOC, TXT, or Image files</p>
                                        </div>
                                        <input
                                            type="file"
                                            onChange={handleFileUpload}
                                            disabled={uploadingFile}
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                                        />
                                    </label>
                                    {uploadingFile && <p className="text-center text-primary-400 text-sm mt-2">Uploading...</p>}
                                </div>
                                
                                {showAddSource && (
                                    <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <h4 className="text-white text-sm font-medium mb-3">Add URL / Text Source</h4>
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                placeholder="Source name"
                                                value={newSource.name}
                                                onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                            />
                                            <select
                                                value={newSource.type}
                                                onChange={(e) => setNewSource({...newSource, type: e.target.value})}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                            >
                                                <option value="document">Document</option>
                                                <option value="url">URL</option>
                                                <option value="faq">FAQ</option>
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="URL (if applicable)"
                                                value={newSource.url}
                                                onChange={(e) => setNewSource({...newSource, url: e.target.value})}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                            />
                                            <textarea
                                                placeholder="Content / Description"
                                                value={newSource.content}
                                                onChange={(e) => setNewSource({...newSource, content: e.target.value})}
                                                rows={3}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={handleAddKnowledgeSource} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Save</button>
                                                <button onClick={() => setShowAddSource(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm">Cancel</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Knowledge Sources List */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <h3 className="text-white font-semibold mb-4">Knowledge Sources ({knowledgeSources.length})</h3>
                                <div className="space-y-2">
                                    {knowledgeSources.map(source => (
                                        <div key={source.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                                            <div className="flex items-center gap-3">
                                                {source.source_type === 'url' ? <LinkIcon className="w-4 h-4 text-primary-400" /> : <File className="w-4 h-4 text-primary-400" />}
                                                <div>
                                                    <p className="text-white text-sm font-medium">{source.source_name}</p>
                                                    <p className="text-xs text-slate-500">{source.source_type} • {new Date(source.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteKnowledgeSource(source.id)}
                                                className="p-1 text-red-400 hover:text-red-300 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {knowledgeSources.length === 0 && (
                                        <p className="text-slate-400 text-center py-8">No knowledge sources added yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ============================================ */}
                    {/* AI TEST LAB TAB */}
                    {/* ============================================ */}
                    {activeTab === 'ai-test' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* SEO Title Generator Test */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary-400" />
                                    SEO Title Generator
                                </h3>
                                <input
                                    type="text"
                                    value={testTitle}
                                    onChange={(e) => setTestTitle(e.target.value)}
                                    placeholder="Enter article title..."
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white mb-3"
                                />
                                <button
                                    onClick={handleTestSEO}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    Generate SEO Title
                                </button>
                                {testResult && (
                                    <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                                        <p className="text-xs text-slate-400 mb-1">Result:</p>
                                        <p className="text-white">{testResult}</p>
                                    </div>
                                )}
                            </div>

                            {/* Content Improver Test */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary-400" />
                                    Content Improver
                                </h3>
                                <textarea
                                    value={testContent}
                                    onChange={(e) => setTestContent(e.target.value)}
                                    placeholder="Enter content to improve..."
                                    rows={4}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white mb-3"
                                />
                                <button
                                    onClick={handleTestImprove}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    Improve Content
                                </button>
                                {improvedContent && (
                                    <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                                        <p className="text-xs text-slate-400 mb-1">Improved:</p>
                                        <p className="text-white text-sm">{improvedContent}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
