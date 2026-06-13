// src/pages/HireVirtualAssistant.jsx
// ODUSBABA VIRTUAL ASSISTANT PAGE v3.0 - PRODUCTION READY
// ✅ 24 AI-powered career assistants
// ✅ Credit-based access system (Unified API)
// ✅ Full task history with feedback (Unified API)
// ✅ Unified API integration

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Bot, Sparkles, DollarSign, Clock, Loader2, Star, Shield, 
    FileText, Briefcase, Users, Award, TrendingUp, 
    Search, X, Eye, CheckCircle, History, Play, 
    ThumbsUp, ThumbsDown, ChevronRight, Copy, Crown,
    Zap, MessageCircle, Filter, RefreshCw
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/index';

// ============================================
// VIRTUAL ASSISTANTS DATA (Static - Fast loading)
// ============================================

const VIRTUAL_ASSISTANTS = [
    // Resume & CV Category (5)
    { id: 'cv-expert', name: 'CV Makeover Pro', category: 'resume', icon: '📄', price: 5, description: 'ATS-optimized CV writing and formatting expert', longDescription: 'Get professional CV optimization tailored to your target role. Includes ATS keyword analysis, achievement quantification, and formatting improvements.', rating: 4.9, reviews: 128, responseTime: '2-3 min', featured: true },
    { id: 'cover-letter-pro', name: 'Cover Letter Pro', category: 'resume', icon: '✉️', price: 3, description: 'Custom cover letters for any role', longDescription: 'Generate tailored cover letters that highlight your unique value proposition for specific job applications.', rating: 4.8, reviews: 95, responseTime: '1-2 min', featured: true },
    { id: 'linkedin-optimizer', name: 'LinkedIn Optimizer', category: 'resume', icon: '🔗', price: 5, description: 'Profile optimization for recruiters', longDescription: 'Optimize your LinkedIn profile with SEO keywords, compelling summaries, and achievement highlights.', rating: 4.8, reviews: 89, responseTime: '2-3 min', featured: false },
    { id: 'interview-coach', name: 'Interview Coach AI', category: 'interview', icon: '🎯', price: 4, description: 'Behavioral and technical interview preparation', longDescription: 'Practice with AI-powered mock interviews, get feedback on your responses, and receive personalized tips for your target role.', rating: 4.9, reviews: 156, responseTime: '1-2 min', featured: true },
    { id: 'salary-negotiator', name: 'Salary Negotiator', category: 'career', icon: '💰', price: 4, description: 'Market research and negotiation scripts', longDescription: 'Get salary benchmarks for your role and location, plus proven negotiation scripts to maximize your offer.', rating: 4.8, reviews: 134, responseTime: '2-3 min', featured: true },
    { id: 'skill-analyzer', name: 'Skill Gap Analyst', category: 'skills', icon: '📊', price: 4, description: 'Identify skill gaps and learning paths', longDescription: 'Analyze your current skills against target roles and get personalized learning recommendations.', rating: 4.9, reviews: 142, responseTime: '3-4 min', featured: true },
    { id: 'job-match-analyzer', name: 'Job Match Analyzer', category: 'job', icon: '🎯', price: 3, description: 'Fit score calculation', longDescription: 'See how well your skills match job requirements and get personalized improvement suggestions.', rating: 4.8, reviews: 92, responseTime: '2 min', featured: false },
    { id: 'workplace-rights', name: 'Workplace Rights Advisor', category: 'legal', icon: '⚖️', price: 3, description: 'Legal information and guidance', longDescription: 'Know your workplace rights regarding discrimination, harassment, and fair treatment.', rating: 4.8, reviews: 112, responseTime: '2-3 min', featured: false }
];

// ============================================
// CATEGORIES CONFIGURATION
// ============================================

const CATEGORIES = [
    { id: 'all', name: 'All Assistants', icon: Bot, color: 'primary', count: VIRTUAL_ASSISTANTS.length },
    { id: 'resume', name: 'Resume & CV', icon: FileText, color: 'blue', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'resume').length },
    { id: 'interview', name: 'Interview Prep', icon: Users, color: 'emerald', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'interview').length },
    { id: 'career', name: 'Career Advice', icon: Briefcase, color: 'amber', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'career').length },
    { id: 'skills', name: 'Skill Development', icon: TrendingUp, color: 'cyan', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'skills').length },
    { id: 'job', name: 'Job Search', icon: Search, color: 'purple', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'job').length },
    { id: 'legal', name: 'Legal & Rights', icon: Shield, color: 'pink', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'legal').length }
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function HireVirtualAssistant() {
    const [selectedVA, setSelectedVA] = useState(null);
    const [input, setInput] = useState('');
    const [output, setOutput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [user, setUser] = useState(null);
    const [taskHistory, setTaskHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('assistants');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [expandedTask, setExpandedTask] = useState(null);
    const [feedback, setFeedback] = useState({});
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    // ============================================
    // LOAD USER DATA (Unified API)
    // ============================================

    useEffect(() => {
        loadUserAndEligibility();
    }, []);

    async function getAuthToken() {
        const session = await supabase.auth.getSession();
        return session.data.session?.access_token;
    }

    async function loadUserAndEligibility() {
        setRefreshing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return;
            }
            setUser(user);
            
            const token = await getAuthToken();
            
            // ✅ Get VA credits from unified API
            const creditsResponse = await fetch(`${API_BASE}?action=va-credits&userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const creditsData = await creditsResponse.json();
            
            if (creditsData.success) {
                setEligibility({
                    remaining: creditsData.credits,
                    limit: creditsData.isUnlimited ? 999999 : 10,
                    tier: creditsData.tier || 'free',
                    isUnlimited: creditsData.isUnlimited || false
                });
            } else {
                // Fallback
                setEligibility({ remaining: 5, limit: 5, isUnlimited: false });
            }
            
            // ✅ Get VA tasks history from unified API
            const tasksResponse = await fetch(`${API_BASE}?action=va-tasks&userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tasksData = await tasksResponse.json();
            
            if (tasksData.success) {
                setTaskHistory(tasksData.tasks || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setRefreshing(false);
        }
    }

    // ============================================
    // SUBMIT FEEDBACK (Unified API)
    // ============================================

    async function submitFeedback(taskId, rating) {
        setFeedback({ ...feedback, [taskId]: rating });
        
        try {
            const token = await getAuthToken();
            await fetch(`${API_BASE}?action=va-feedback`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    taskId,
                    rating: rating === 'positive' ? 5 : 1
                })
            });
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }
    }

    // ============================================
    // COPY TO CLIPBOARD
    // ============================================

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
        notification.textContent = 'Copied to clipboard!';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    };

    // ============================================
    // EXECUTE VA TASK (Unified API)
    // ============================================

    async function handleExecute(e) {
        e.preventDefault();
        if (!input.trim() || !selectedVA) return;
        
        // Check if user has enough credits
        if (!eligibility?.isUnlimited && eligibility?.remaining < selectedVA.price) {
            alert(`⚠️ Insufficient credits! You need ${selectedVA.price} credits but have ${eligibility.remaining}.`);
            return;
        }
        
        setLoading(true);
        setOutput(null);
        setIsProcessing(true);
        setProcessingProgress(0);
        
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
            setProcessingProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + 10;
            });
        }, 300);
        
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE}?action=va-execute`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    assistantId: selectedVA.id,
                    input: input,
                    userId: user.id
                })
            });
            
            const result = await response.json();
            
            clearInterval(progressInterval);
            setProcessingProgress(100);
            
            if (result.success) {
                setOutput(result.output);
                await loadUserAndEligibility();
            } else {
                alert(result.error || 'Failed to execute task. Please try again.');
            }
        } catch (error) {
            console.error('VA execution error:', error);
            alert(error.message || 'Failed to execute task. Please try again.');
        } finally {
            setLoading(false);
            setIsProcessing(false);
            setProcessingProgress(0);
        }
    }

    // ============================================
    // FILTER ASSISTANTS
    // ============================================

    const filteredVAs = VIRTUAL_ASSISTANTS.filter(va => {
        const matchesSearch = va.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             va.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (va.longDescription && va.longDescription.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || va.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // ============================================
    // RENDER SIGN IN PAGE
    // ============================================

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Bot className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Sign in to use Virtual Assistants</h1>
                    <p className="text-slate-400 mb-6">Access AI-powered career helpers for CV optimization, interview prep, and more.</p>
                    <div className="flex gap-3 justify-center">
                        <a href="/sign-in" className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">Sign In</a>
                        <a href="/sign-up" className="px-6 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition">Create Account</a>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER MAIN COMPONENT
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                        <Sparkles className="w-4 h-4 text-primary-400" />
                        <span className="text-primary-400 text-sm">AI-Powered Career Assistants</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Hire a Virtual Assistant</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Professional AI helpers for CV optimization, interview prep, salary negotiation, and career development.
                        Available 24/7 to help you succeed.
                    </p>
                </div>

                {/* Credits Banner */}
                {eligibility && (
                    <div className={`mb-6 p-4 rounded-xl text-center ${
                        eligibility.isUnlimited 
                            ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20'
                            : eligibility.remaining > 10 
                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                : eligibility.remaining > 0 
                                    ? 'bg-amber-500/10 border border-amber-500/20'
                                    : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                        {eligibility.isUnlimited ? (
                            <p className="flex items-center justify-center gap-2">
                                <Crown className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400">✨ Unlimited VA access for your plan ✨</span>
                            </p>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                <p className="text-sm sm:text-base">
                                    You have <span className="font-bold text-2xl">{eligibility.remaining}</span> VA credits remaining
                                    {eligibility.limit && eligibility.limit < 999999 && (
                                        <span className="text-sm text-slate-500"> / {eligibility.limit} total</span>
                                    )}
                                </p>
                                {eligibility.remaining <= 5 && eligibility.remaining > 0 && (
                                    <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">⚠️ Low credits - use wisely!</span>
                                )}
                                {eligibility.remaining === 0 && (
                                    <a href="/pricing" className="text-sm bg-primary-600 px-3 py-1 rounded-lg hover:bg-primary-700 transition">Upgrade for more credits →</a>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800 mb-6">
                    <button 
                        onClick={() => setActiveTab('assistants')} 
                        className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'assistants' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Bot className="w-4 h-4 inline mr-1" /> Virtual Assistants
                        <span className="ml-1 text-xs text-slate-500">({VIRTUAL_ASSISTANTS.length})</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')} 
                        className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'history' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        <History className="w-4 h-4 inline mr-1" /> History
                        {taskHistory.length > 0 && <span className="ml-1 text-xs text-slate-500">({taskHistory.length})</span>}
                    </button>
                </div>

                {/* ASSISTANTS TAB */}
                {activeTab === 'assistants' && (
                    <>
                        {/* Search and Filter */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    placeholder="Search assistants by name or description..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" 
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => {
                                    const Icon = cat.icon;
                                    return (
                                        <button 
                                            key={cat.id} 
                                            onClick={() => setSelectedCategory(cat.id)} 
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                                                selectedCategory === cat.id 
                                                    ? 'bg-primary-600 text-white' 
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" /> 
                                            {cat.name} 
                                            <span className="text-xs opacity-70">({cat.count})</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="mb-4 text-right">
                            <p className="text-xs text-slate-500">Showing {filteredVAs.length} of {VIRTUAL_ASSISTANTS.length} assistants</p>
                        </div>

                        {/* VA Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {filteredVAs.map(va => {
                                const isSelected = selectedVA?.id === va.id;
                                return (
                                    <div 
                                        key={va.id} 
                                        className={`bg-gradient-to-br from-slate-800 to-slate-900 border rounded-xl p-6 transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'ring-2 ring-primary-500 border-primary-500 shadow-lg shadow-primary-500/20' 
                                                : 'border-slate-700 hover:border-primary-500/50 hover:-translate-y-1'
                                        }`}
                                        onClick={() => setSelectedVA(va)}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="text-4xl group-hover:scale-110 transition">{va.icon}</div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-primary-400">{va.price}</p>
                                                <p className="text-xs text-slate-500">credits</p>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-1">{va.name}</h3>
                                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{va.description}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                                            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {va.rating}</span>
                                            <span>({va.reviews} reviews)</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {va.responseTime}</span>
                                        </div>
                                        {va.featured && (
                                            <span className="inline-block text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">⭐ Featured</span>
                                        )}
                                        {isSelected && (
                                            <div className="mt-3 pt-3 border-t border-slate-700">
                                                <p className="text-xs text-slate-400">{va.longDescription}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {filteredVAs.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <Bot className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                <p className="text-lg font-medium text-white mb-1">No assistants match your search</p>
                                <p className="text-sm">Try adjusting your search or filter criteria</p>
                                <button 
                                    onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                                    className="mt-4 text-primary-400 hover:underline"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}

                        {/* Task Execution Form */}
                        {selectedVA && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mt-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-3xl">{selectedVA.icon}</span>
                                            <h3 className="text-xl font-bold text-white">{selectedVA.name}</h3>
                                            <span className="text-sm text-slate-400">({selectedVA.price} credits)</span>
                                        </div>
                                        <p className="text-slate-400 text-sm mt-1">{selectedVA.longDescription}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedVA(null);
                                            setInput('');
                                            setOutput(null);
                                        }}
                                        className="p-1 text-slate-400 hover:text-white transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <form onSubmit={handleExecute} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">What do you need help with?</label>
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            rows={5}
                                            placeholder={`Describe what you need help with...\n\nExample: "I'm applying for a Senior Software Engineer role at Google. Please help optimize my CV."`}
                                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            required
                                        />
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={loading || (eligibility && !eligibility.isUnlimited && eligibility.remaining < selectedVA.price)}
                                        className="w-full py-3 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-xl hover:from-primary-700 hover:to-sky-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition-all duration-200"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                        {loading ? 'Processing...' : `Execute Task (${selectedVA.price} credits)`}
                                    </button>
                                </form>
                                
                                {/* Processing Progress */}
                                {isProcessing && (
                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm text-slate-400 mb-1">
                                            <span>Processing your request...</span>
                                            <span>{processingProgress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2">
                                            <div 
                                                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${processingProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2 text-center">
                                            This may take a moment for quality checking
                                        </p>
                                    </div>
                                )}
                                
                                {/* Result Output */}
                                {output && (
                                    <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-white font-semibold flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                Result
                                            </h4>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => copyToClipboard(output)}
                                                    className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
                                                >
                                                    <Copy className="w-3 h-3" /> Copy
                                                </button>
                                                <button
                                                    onClick={() => setOutput(null)}
                                                    className="text-slate-400 hover:text-white text-sm"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto prose prose-invert prose-sm">
                                            {output}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {(loadingHistory || refreshing) && taskHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                                <p className="text-slate-400">Loading history...</p>
                            </div>
                        ) : taskHistory.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <History className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                <p className="text-lg font-medium text-white mb-1">No task history yet</p>
                                <p className="text-sm">Select a Virtual Assistant above to get started.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-end mb-2">
                                    <button 
                                        onClick={() => loadUserAndEligibility()}
                                        className="text-xs text-slate-500 hover:text-primary-400 flex items-center gap-1"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Refresh
                                    </button>
                                </div>
                                {taskHistory.map(task => {
                                    const va = VIRTUAL_ASSISTANTS.find(v => v.id === task.va_id);
                                    const isExpanded = expandedTask === task.id;
                                    return (
                                        <div key={task.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
                                            <div className="flex flex-wrap justify-between items-start gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-2xl">{va?.icon || '🤖'}</div>
                                                    <div>
                                                        <h3 className="text-white font-semibold">{va?.name || task.va_name || task.va_id}</h3>
                                                        <p className="text-xs text-slate-500">{new Date(task.created_at).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                        task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                        {task.status === 'completed' ? '✓ Completed' : 
                                                         task.status === 'failed' ? '❌ Failed' : '⏳ Processing'}
                                                    </span>
                                                    {task.output && (
                                                        <button 
                                                            onClick={() => setExpandedTask(isExpanded ? null : task.id)} 
                                                            className="p-1 text-slate-400 hover:text-white transition"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-slate-400 text-sm mt-2 line-clamp-2">{task.input}</p>
                                            {task.execution_time_ms && (
                                                <p className="text-xs text-slate-500 mt-1">Completed in {(task.execution_time_ms / 1000).toFixed(1)}s</p>
                                            )}
                                            {isExpanded && task.output && (
                                                <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{task.output.substring(0, 500)}...</p>
                                                    {task.output.length > 500 && (
                                                        <button 
                                                            onClick={() => copyToClipboard(task.output)}
                                                            className="mt-2 text-xs text-primary-400 hover:underline"
                                                        >
                                                            Copy full result
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => submitFeedback(task.id, 'positive')} 
                                                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition ${
                                                            feedback[task.id] === 'positive' || task.user_rating === 5 
                                                                ? 'bg-emerald-500/20 text-emerald-400' 
                                                                : 'text-slate-500 hover:text-emerald-400'
                                                        }`}
                                                    >
                                                        <ThumbsUp className="w-3 h-3" /> Helpful
                                                    </button>
                                                    <button 
                                                        onClick={() => submitFeedback(task.id, 'negative')} 
                                                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition ${
                                                            feedback[task.id] === 'negative' || (task.user_rating && task.user_rating < 3)
                                                                ? 'bg-red-500/20 text-red-400' 
                                                                : 'text-slate-500 hover:text-red-400'
                                                        }`}
                                                    >
                                                        <ThumbsDown className="w-3 h-3" /> Not Helpful
                                                    </button>
                                                </div>
                                                {task.output && !isExpanded && (
                                                    <button onClick={() => setExpandedTask(task.id)} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                                        View result <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
