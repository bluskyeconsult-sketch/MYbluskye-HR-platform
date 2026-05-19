// src/pages/HireVirtualAssistant.jsx
// COMPLETE VIRTUAL ASSISTANT PAGE - Real AI integration, credit tracking, task history

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Bot, Sparkles, DollarSign, Clock, CheckCircle, Loader2, 
    History, Play, FileText, Briefcase, Users, Award, TrendingUp,
    Star, Zap, Shield, MessageCircle, Download, Save, X,
    ChevronRight, Filter, Calendar, Eye, ThumbsUp, ThumbsDown
} from 'lucide-react';

// Virtual Assistants Data
const VIRTUAL_ASSISTANTS = [
    { 
        id: 'cv-expert', 
        name: 'CV Makeover Pro', 
        category: 'resume', 
        icon: '📄',
        price: 5,
        description: 'ATS-optimized CV writing and formatting expert',
        longDescription: 'Get professional CV optimization tailored to your target role. Includes ATS keyword analysis, achievement quantification, and formatting improvements.',
        rating: 4.9,
        reviews: 128,
        responseTime: '2-3 min'
    },
    { 
        id: 'interview-coach', 
        name: 'Interview Coach AI', 
        category: 'interview', 
        icon: '🎯',
        price: 3,
        description: 'Behavioral and technical interview preparation',
        longDescription: 'Practice with AI-powered mock interviews, get feedback on your responses, and receive personalized tips for your target role.',
        rating: 4.8,
        reviews: 95,
        responseTime: '1-2 min'
    },
    { 
        id: 'salary-negotiator', 
        name: 'Salary Negotiator', 
        category: 'career', 
        icon: '💰',
        price: 4,
        description: 'Market research and negotiation scripts',
        longDescription: 'Get salary benchmarks for your role and location, plus proven negotiation scripts to maximize your offer.',
        rating: 4.7,
        reviews: 76,
        responseTime: '2-3 min'
    },
    { 
        id: 'skill-analyzer', 
        name: 'Skill Gap Analyst', 
        category: 'skills', 
        icon: '📊',
        price: 4,
        description: 'Identify skill gaps and learning paths',
        longDescription: 'Analyze your current skills against target roles and get personalized learning recommendations.',
        rating: 4.9,
        reviews: 112,
        responseTime: '3-4 min'
    },
    { 
        id: 'linkedin-optimizer', 
        name: 'LinkedIn Optimizer', 
        category: 'social', 
        icon: '🔗',
        price: 5,
        description: 'Profile optimization for recruiters',
        longDescription: 'Optimize your LinkedIn profile with SEO keywords, compelling summaries, and achievement highlights.',
        rating: 4.8,
        reviews: 89,
        responseTime: '2-3 min'
    },
    { 
        id: 'cover-letter-pro', 
        name: 'Cover Letter Pro', 
        category: 'resume', 
        icon: '✉️',
        price: 3,
        description: 'Custom cover letters for any role',
        longDescription: 'Generate tailored cover letters that highlight your unique value proposition for specific job applications.',
        rating: 4.6,
        reviews: 64,
        responseTime: '1-2 min'
    }
];

export default function HireVirtualAssistant() {
    const [selectedVA, setSelectedVA] = useState(null);
    const [input, setInput] = useState('');
    const [output, setOutput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [user, setUser] = useState(null);
    const [userTier, setUserTier] = useState(null);
    const [taskHistory, setTaskHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('assistants');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [expandedTask, setExpandedTask] = useState(null);
    const [feedback, setFeedback] = useState({});

    useEffect(() => {
        loadUserAndEligibility();
    }, []);

    async function loadUserAndEligibility() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            // Get user profile for tier
            const { data: profile } = await supabase
                .from('profiles')
                .select('tier, user_type')
                .eq('id', user.id)
                .single();
            
            setUserTier(profile?.tier || 'free');
            
            // Check eligibility from database
            const { data: vaCredits } = await supabase
                .from('va_credits')
                .select('balance')
                .eq('user_id', user.id)
                .single();
            
            const isUnlimited = profile?.user_type === 'super_admin' || 
                               profile?.user_type === 'admin' || 
                               profile?.tier === 'business';
            
            setEligibility({
                remaining: isUnlimited ? 999999 : (vaCredits?.balance || 0),
                limit: isUnlimited ? 999999 : 10,
                isUnlimited: isUnlimited
            });
            
            // Load task history
            const { data: tasks } = await supabase
                .from('va_tasks')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);
            
            setTaskHistory(tasks || []);
        }
    }

    async function handleExecute(e) {
        e.preventDefault();
        if (!input.trim() || !selectedVA) return;
        
        setLoading(true);
        setOutput(null);
        
        try {
            // Call AI API
            const response = await fetch('/api/ai/virtual-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    assistantId: selectedVA.id,
                    assistantName: selectedVA.name,
                    input: input,
                    userId: user.id,
                    userTier: userTier
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to execute task');
            }
            
            setOutput(data.output);
            
            // Reload eligibility and history
            await loadUserAndEligibility();
            
        } catch (error) {
            console.error('VA execution error:', error);
            alert(error.message || 'Failed to execute task. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function submitFeedback(taskId, rating) {
        setFeedback({ ...feedback, [taskId]: rating });
        
        await supabase
            .from('va_tasks')
            .update({ user_rating: rating })
            .eq('id', taskId);
    }

    const categories = [
        { id: 'all', name: 'All', icon: Bot },
        { id: 'resume', name: 'Resume & CV', icon: FileText, color: 'from-blue-500/20 to-blue-600/20' },
        { id: 'social', name: 'Social Media', icon: Users, color: 'from-purple-500/20 to-purple-600/20' },
        { id: 'interview', name: 'Interview Prep', icon: Briefcase, color: 'from-emerald-500/20 to-emerald-600/20' },
        { id: 'career', name: 'Career Advice', icon: TrendingUp, color: 'from-amber-500/20 to-amber-600/20' },
        { id: 'skills', name: 'Skill Development', icon: Award, color: 'from-cyan-500/20 to-cyan-600/20' }
    ];

    const filteredVAs = VIRTUAL_ASSISTANTS.filter(va => {
        const matchesSearch = va.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             va.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || va.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <Bot className="w-20 h-20 text-primary-400 mx-auto mb-4" />
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

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                        <Bot className="w-4 h-4 text-primary-400" />
                        <span className="text-primary-400 text-sm">AI-Powered Career Assistants</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Hire a Virtual Assistant</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Professional AI helpers for CV optimization, interview prep, salary negotiation, and career development.
                    </p>
                </div>

                {/* Eligibility Banner */}
                {eligibility && (
                    <div className={`mb-6 p-4 rounded-xl text-center ${
                        eligibility.remaining > 10 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : eligibility.remaining > 0 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {eligibility.isUnlimited ? (
                            <p className="flex items-center justify-center gap-2">
                                <Shield className="w-4 h-4" />
                                Unlimited VA tasks for admin accounts
                            </p>
                        ) : eligibility.remaining > 0 ? (
                            <p>
                                You have <span className="font-bold">{eligibility.remaining}</span> VA {eligibility.remaining === 1 ? 'task' : 'tasks'} remaining.
                                {eligibility.remaining <= 5 && (
                                    <span className="ml-2 text-xs">🎯 Use them wisely!</span>
                                )}
                            </p>
                        ) : (
                            <p>
                                You've used all your VA tasks this month. 
                                <a href="/pricing" className="ml-2 underline hover:text-emerald-300">Upgrade to continue</a>
                            </p>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800 mb-6">
                    <button
                        onClick={() => setActiveTab('assistants')}
                        className={`px-4 py-2 text-sm font-medium transition ${
                            activeTab === 'assistants' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Bot className="w-4 h-4 inline mr-1" /> Virtual Assistants
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 text-sm font-medium transition ${
                            activeTab === 'history' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <History className="w-4 h-4 inline mr-1" /> History ({taskHistory.length})
                    </button>
                </div>

                {activeTab === 'assistants' && (
                    <>
                        {/* Search and Filter */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            <div className="flex-1 min-w-[200px]">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search assistants..."
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                            selectedCategory === cat.id 
                                                ? 'bg-primary-600 text-white' 
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        <cat.icon className="w-3 h-3 inline mr-1" />
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* VA Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {filteredVAs.map(va => {
                                const category = categories.find(c => c.id === va.category);
                                return (
                                    <div 
                                        key={va.id} 
                                        className={`group bg-gradient-to-br ${category?.color || 'from-slate-800 to-slate-900'} border rounded-xl p-5 hover:-translate-y-1 transition-all cursor-pointer ${
                                            selectedVA?.id === va.id ? 'ring-2 ring-primary-500 border-primary-500' : 'border-slate-700 hover:border-primary-500/50'
                                        }`} 
                                        onClick={() => setSelectedVA(va)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="text-4xl">{va.icon}</div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-primary-400">${va.price}</p>
                                                <p className="text-xs text-slate-500">per task</p>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-1">{va.name}</h3>
                                        <p className="text-slate-400 text-sm mb-2">{va.description}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-yellow-400" /> {va.rating}
                                            </span>
                                            <span>({va.reviews} reviews)</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {va.responseTime}
                                            </span>
                                        </div>
                                        {selectedVA?.id === va.id && (
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
                                <p>No assistants match your search.</p>
                            </div>
                        )}

                        {/* Task Execution Form */}
                        {selectedVA && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <span className="text-2xl">{selectedVA.icon}</span>
                                            {selectedVA.name}
                                            <span className="text-sm font-normal text-slate-400">
                                                (${selectedVA.price} credits)
                                            </span>
                                        </h3>
                                        <p className="text-slate-400 text-sm mt-1">{selectedVA.longDescription}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedVA(null)}
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
                                            rows={6}
                                            placeholder={`Example: "I'm applying for a Senior Software Engineer role at Google. Please help optimize my CV with relevant keywords and quantify my achievements."`}
                                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={loading || (eligibility && !eligibility.isUnlimited && eligibility.remaining === 0)}
                                            className="flex-1 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                            {loading ? 'Processing...' : `Execute Task (${selectedVA.price} credits)`}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setInput(`I need help with ${selectedVA.name.toLowerCase()}. Please provide professional assistance.`);
                                            }}
                                            className="px-4 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition"
                                        >
                                            <Zap className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                                
                                {output && (
                                    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-white font-semibold flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                Result
                                            </h4>
                                            <button
                                                onClick={() => setOutput(null)}
                                                className="text-slate-400 hover:text-white text-sm"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <div className="text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                                            {output}
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-end">
                                            <button
                                                onClick={() => navigator.clipboard.writeText(output)}
                                                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                                            >
                                                <Copy className="w-3 h-3" /> Copy to clipboard
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {taskHistory.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <History className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                <p className="text-lg font-medium text-white mb-1">No task history yet</p>
                                <p className="text-sm">Select a Virtual Assistant above to get started.</p>
                            </div>
                        ) : (
                            taskHistory.map(task => {
                                const va = VIRTUAL_ASSISTANTS.find(v => v.id === task.va_id);
                                const isExpanded = expandedTask === task.id;
                                return (
                                    <div key={task.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
                                        <div className="flex flex-wrap justify-between items-start gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">{va?.icon || '🤖'}</div>
                                                <div>
                                                    <h3 className="text-white font-semibold">{va?.name || task.va_id}</h3>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(task.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                    {task.status}
                                                </span>
                                                <button
                                                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                                                    className="p-1 text-slate-400 hover:text-white transition"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <p className="text-slate-400 text-sm mt-2 line-clamp-2">{task.input}</p>
                                        
                                        {isExpanded && task.output && (
                                            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                                                <p className="text-slate-300 text-sm whitespace-pre-wrap">{task.output}</p>
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => submitFeedback(task.id, 'positive')}
                                                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition ${
                                                        feedback[task.id] === 'positive' 
                                                            ? 'bg-emerald-500/20 text-emerald-400' 
                                                            : 'text-slate-500 hover:text-emerald-400'
                                                    }`}
                                                >
                                                    <ThumbsUp className="w-3 h-3" /> Helpful
                                                </button>
                                                <button
                                                    onClick={() => submitFeedback(task.id, 'negative')}
                                                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition ${
                                                        feedback[task.id] === 'negative' 
                                                            ? 'bg-red-500/20 text-red-400' 
                                                            : 'text-slate-500 hover:text-red-400'
                                                    }`}
                                                >
                                                    <ThumbsDown className="w-3 h-3" /> Not Helpful
                                                </button>
                                            </div>
                                            {task.output && !isExpanded && (
                                                <button
                                                    onClick={() => setExpandedTask(task.id)}
                                                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                                                >
                                                    View result <ChevronRight className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Import missing icons
import { Copy } from 'lucide-react';
