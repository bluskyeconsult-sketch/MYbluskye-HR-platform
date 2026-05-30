// src/pages/HireVirtualAssistant.jsx
// COMPLETE VIRTUAL ASSISTANT PAGE - Full AI integration, credit tracking, task history, 24 assistants, unified API

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Bot, Sparkles, DollarSign, Clock, Loader2, Star, Shield, 
    Zap, FileText, Briefcase, Users, Award, TrendingUp, 
    MessageCircle, CreditCard, Search, X, Eye, CheckCircle,
    History, Play, ThumbsUp, ThumbsDown, ChevronRight, Copy,
    Filter, Calendar, Save, Download, Trash2, Edit, Plus, Heart,
    GraduationCap, Target, Coffee, Rocket, Lightbulb, Wifi
} from 'lucide-react';

// ============================================
// VIRTUAL ASSISTANTS DATA - 24 Assistants
// ============================================

const VIRTUAL_ASSISTANTS = [
    // Resume & CV Category (5)
    { id: 'cv-expert', name: 'CV Makeover Pro', category: 'resume', icon: '📄', price: 5, description: 'ATS-optimized CV writing and formatting expert', longDescription: 'Get professional CV optimization tailored to your target role. Includes ATS keyword analysis, achievement quantification, and formatting improvements.', rating: 4.9, reviews: 128, responseTime: '2-3 min', featured: true },
    { id: 'cover-letter-pro', name: 'Cover Letter Pro', category: 'resume', icon: '✉️', price: 3, description: 'Custom cover letters for any role', longDescription: 'Generate tailored cover letters that highlight your unique value proposition for specific job applications.', rating: 4.8, reviews: 95, responseTime: '1-2 min', featured: true },
    { id: 'linkedin-optimizer', name: 'LinkedIn Optimizer', category: 'resume', icon: '🔗', price: 5, description: 'Profile optimization for recruiters', longDescription: 'Optimize your LinkedIn profile with SEO keywords, compelling summaries, and achievement highlights.', rating: 4.8, reviews: 89, responseTime: '2-3 min', featured: false },
    { id: 'resume-keyword-optimizer', name: 'Resume Keyword Optimizer', category: 'resume', icon: '🔑', price: 4, description: 'ATS keyword analysis for better screening', longDescription: 'Add the right keywords to pass applicant tracking systems and get more interviews.', rating: 4.7, reviews: 67, responseTime: '2 min', featured: false },
    { id: 'portfolio-builder', name: 'Portfolio Builder', category: 'resume', icon: '🎨', price: 8, description: 'Create a professional portfolio website', longDescription: 'Generate a stunning portfolio website to showcase your work and achievements.', rating: 4.9, reviews: 45, responseTime: '5-7 min', featured: false },

    // Interview Prep Category (5)
    { id: 'interview-coach', name: 'Interview Coach AI', category: 'interview', icon: '🎯', price: 4, description: 'Behavioral and technical interview preparation', longDescription: 'Practice with AI-powered mock interviews, get feedback on your responses, and receive personalized tips for your target role.', rating: 4.9, reviews: 156, responseTime: '1-2 min', featured: true },
    { id: 'behavioral-prep', name: 'Behavioral Question Prep', category: 'interview', icon: '💬', price: 3, description: 'STAR method training', longDescription: 'Master the STAR method for behavioral interview questions with personalized practice sessions.', rating: 4.8, reviews: 89, responseTime: '2-3 min', featured: false },
    { id: 'technical-interview', name: 'Technical Interview Prep', category: 'interview', icon: '💻', price: 6, description: 'Coding & technical practice', longDescription: 'Practice technical interview questions with detailed feedback and solutions.', rating: 4.8, reviews: 112, responseTime: '3-4 min', featured: false },
    { id: 'elevator-pitch', name: 'Elevator Pitch Generator', category: 'interview', icon: '🎤', price: 2, description: '30-second introduction creator', longDescription: 'Create a compelling 30-second personal pitch that leaves a lasting impression.', rating: 4.7, reviews: 78, responseTime: '1-2 min', featured: false },
    { id: 'thank-you-note', name: 'Thank You Note Writer', category: 'interview', icon: '💌', price: 2, description: 'Post-interview follow-up emails', longDescription: 'Generate professional thank you emails after interviews to leave a positive impression.', rating: 4.7, reviews: 64, responseTime: '1 min', featured: false },

    // Career Advice Category (4)
    { id: 'salary-negotiator', name: 'Salary Negotiator', category: 'career', icon: '💰', price: 4, description: 'Market research and negotiation scripts', longDescription: 'Get salary benchmarks for your role and location, plus proven negotiation scripts to maximize your offer.', rating: 4.8, reviews: 134, responseTime: '2-3 min', featured: true },
    { id: 'career-path-planner', name: 'Career Path Planner', category: 'career', icon: '🗺️', price: 5, description: '5-year career development plan', longDescription: 'Create a comprehensive 5-year career development plan with milestones and actionable steps.', rating: 4.9, reviews: 98, responseTime: '3-4 min', featured: false },
    { id: 'networking-messages', name: 'Networking Message Generator', category: 'career', icon: '🤝', price: 3, description: 'Professional outreach messages', longDescription: 'Craft engaging messages for recruiters, hiring managers, and industry professionals.', rating: 4.7, reviews: 76, responseTime: '1-2 min', featured: false },
    { id: 'freelance-rate-calc', name: 'Freelance Rate Calculator', category: 'career', icon: '📊', price: 2, description: 'Pricing strategy for freelancers', longDescription: 'Determine your optimal hourly and project rates based on experience, skills, and market demand.', rating: 4.8, reviews: 54, responseTime: '1 min', featured: false },

    // Skill Development Category (3)
    { id: 'skill-analyzer', name: 'Skill Gap Analyst', category: 'skills', icon: '📊', price: 4, description: 'Identify skill gaps and learning paths', longDescription: 'Analyze your current skills against target roles and get personalized learning recommendations.', rating: 4.9, reviews: 142, responseTime: '3-4 min', featured: true },
    { id: 'leadership-assessment', name: 'Leadership Assessment', category: 'skills', icon: '👑', price: 5, description: 'Evaluate leadership potential', longDescription: 'Comprehensive assessment of your leadership skills with personalized development recommendations.', rating: 4.8, reviews: 87, responseTime: '4-5 min', featured: false },
    { id: 'communication-test', name: 'Communication Skills Test', category: 'skills', icon: '🗣️', price: 3, description: 'Soft skills evaluation', longDescription: 'Assess your communication abilities and get tips for improvement.', rating: 4.7, reviews: 65, responseTime: '2-3 min', featured: false },

    // Job Search Category (4)
    { id: 'job-match-analyzer', name: 'Job Match Analyzer', category: 'job', icon: '🎯', price: 3, description: 'Fit score calculation', longDescription: 'See how well your skills match job requirements and get personalized improvement suggestions.', rating: 4.8, reviews: 92, responseTime: '2 min', featured: false },
    { id: 'company-research', name: 'Company Research Assistant', category: 'job', icon: '🏢', price: 4, description: 'Employer intelligence reports', longDescription: 'Get detailed company reports including culture, benefits, and interview tips.', rating: 4.8, reviews: 73, responseTime: '3-4 min', featured: false },
    { id: 'job-alert-customizer', name: 'Job Alert Customizer', category: 'job', icon: '🔔', price: 2, description: 'Personalized job notifications', longDescription: 'Set up custom job alerts tailored to your skills and preferences.', rating: 4.6, reviews: 58, responseTime: '1 min', featured: false },
    { id: 'reference-checker', name: 'Reference Checker', category: 'job', icon: '✓', price: 4, description: 'Background verification', longDescription: 'Automated reference checks to verify employment history and skills.', rating: 4.7, reviews: 48, responseTime: '3-4 min', featured: false },

    // Legal & Rights Category (3)
    { id: 'workplace-rights', name: 'Workplace Rights Advisor', category: 'legal', icon: '⚖️', price: 3, description: 'Legal information and guidance', longDescription: 'Know your workplace rights regarding discrimination, harassment, and fair treatment.', rating: 4.8, reviews: 112, responseTime: '2-3 min', featured: false },
    { id: 'contract-review', name: 'Contract Review Assistant', category: 'legal', icon: '📝', price: 6, description: 'Employment agreement review', longDescription: 'Review job offers and employment contracts for potential issues.', rating: 4.9, reviews: 95, responseTime: '4-5 min', featured: false },
    { id: 'immigration-consultant', name: 'Immigration Consultant', category: 'legal', icon: '🌍', price: 5, description: 'Visa & work permit information', longDescription: 'Get information about work visas, sponsorship, and immigration requirements.', rating: 4.8, reviews: 67, responseTime: '3-4 min', featured: false }
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
    const [userTier, setUserTier] = useState(null);
    const [taskHistory, setTaskHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('assistants');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [expandedTask, setExpandedTask] = useState(null);
    const [feedback, setFeedback] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const categories = [
        { id: 'all', name: 'All Assistants', icon: Bot, color: 'primary', count: VIRTUAL_ASSISTANTS.length },
        { id: 'resume', name: 'Resume & CV', icon: FileText, color: 'blue', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'resume').length },
        { id: 'interview', name: 'Interview Prep', icon: Users, color: 'emerald', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'interview').length },
        { id: 'career', name: 'Career Advice', icon: Briefcase, color: 'amber', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'career').length },
        { id: 'skills', name: 'Skill Development', icon: TrendingUp, color: 'cyan', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'skills').length },
        { id: 'job', name: 'Job Search', icon: Search, color: 'purple', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'job').length },
        { id: 'legal', name: 'Legal & Rights', icon: Shield, color: 'pink', count: VIRTUAL_ASSISTANTS.filter(v => v.category === 'legal').length }
    ];

    useEffect(() => {
        loadUserAndEligibility();
    }, []);

    async function loadUserAndEligibility() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tier, user_type')
                    .eq('id', user.id)
                    .single();
                
                setUserTier(profile?.tier || 'free');
                
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
                
                await loadTaskHistory(user.id);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async function loadTaskHistory(userId) {
        setLoadingHistory(true);
        try {
            const { data: tasks, error } = await supabase
                .from('va_tasks')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            setTaskHistory(tasks || []);
        } catch (error) {
            console.error('Error loading task history:', error);
        } finally {
            setLoadingHistory(false);
        }
    }

    async function handleExecute(e) {
        e.preventDefault();
        if (!input.trim() || !selectedVA) return;
        
        setLoading(true);
        setOutput(null);
        
        try {
            // ✅ Using unified API endpoint
            const response = await fetch('/api/index?action=va-execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    assistantId: selectedVA.id,
                    assistantName: selectedVA.name,
                    input: input,
                    userId: user?.id,
                    userTier: userTier
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Failed to execute task');
            
            setOutput(data.output);
            await loadUserAndEligibility();
            setShowModal(false);
            setInput('');
            
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

    const filteredVAs = VIRTUAL_ASSISTANTS.filter(va => {
        const matchesSearch = va.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             va.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || va.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Bot className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Sign in to use Virtual Assistants</h1>
                    <p className="text-slate-400 mb-6">Access 24 AI-powered career helpers for CV optimization, interview prep, and more.</p>
                    <div className="flex gap-3 justify-center">
                        <a href="/sign-in" className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">Sign In</a>
                        <a href="/sign-up" className="px-6 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition">Create Account</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                        <Sparkles className="w-4 h-4 text-primary-400" />
                        <span className="text-primary-400 text-sm">24 AI-Powered Career Assistants</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Hire a Virtual Assistant</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Professional AI helpers for CV optimization, interview prep, salary negotiation, and career development.
                        Available 24/7 to help you succeed.
                    </p>
                </div>

                {/* Eligibility Banner */}
                {eligibility && (
                    <div className={`mb-6 p-4 rounded-xl text-center ${
                        eligibility.isUnlimited ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        eligibility.remaining > 10 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        eligibility.remaining > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {eligibility.isUnlimited ? (
                            <p className="flex items-center justify-center gap-2">
                                <Shield className="w-4 h-4" /> Unlimited VA tasks for admin accounts
                            </p>
                        ) : eligibility.remaining > 0 ? (
                            <p>You have <span className="font-bold">{eligibility.remaining}</span> VA {eligibility.remaining === 1 ? 'task' : 'tasks'} remaining.</p>
                        ) : (
                            <p>You've used all your VA tasks. <a href="/pricing" className="underline hover:text-emerald-300">Upgrade to continue</a></p>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800 mb-6">
                    <button 
                        onClick={() => setActiveTab('assistants')} 
                        className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'assistants' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Bot className="w-4 h-4 inline mr-1" /> Virtual Assistants ({VIRTUAL_ASSISTANTS.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')} 
                        className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'history' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        <History className="w-4 h-4 inline mr-1" /> History ({taskHistory.length})
                    </button>
                </div>

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
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" 
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => {
                                    const Icon = cat.icon;
                                    return (
                                        <button 
                                            key={cat.id} 
                                            onClick={() => setSelectedCategory(cat.id)} 
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${selectedCategory === cat.id ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                        >
                                            <Icon className="w-3 h-3" /> {cat.name} <span className="text-xs opacity-70">({cat.count})</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="mb-4 text-right">
                            <p className="text-slate-400 text-sm">Showing {filteredVAs.length} of {VIRTUAL_ASSISTANTS.length} assistants</p>
                        </div>

                        {/* VA Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {filteredVAs.map(va => (
                                <div 
                                    key={va.id} 
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:-translate-y-1 transition-all cursor-pointer hover:border-primary-500/50 group" 
                                    onClick={() => { setSelectedVA(va); setShowModal(true); setOutput(null); setInput(''); }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="text-4xl group-hover:scale-110 transition">{va.icon}</div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-primary-400">${va.price}</p>
                                            <p className="text-xs text-slate-500">per task</p>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-1">{va.name}</h3>
                                    <p className="text-slate-400 text-sm mb-2">{va.description}</p>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> {va.rating}</span>
                                        <span>({va.reviews} reviews)</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {va.responseTime}</span>
                                    </div>
                                    {va.featured && <span className="mt-2 inline-block text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">⭐ Featured</span>}
                                </div>
                            ))}
                        </div>

                        {filteredVAs.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <Bot className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                <p>No assistants match your search.</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {loadingHistory ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                            </div>
                        ) : taskHistory.length === 0 ? (
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
                                                    <p className="text-xs text-slate-500">{new Date(task.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{task.status}</span>
                                                <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="p-1 text-slate-400 hover:text-white"><Eye className="w-4 h-4" /></button>
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
                                                <button onClick={() => submitFeedback(task.id, 'positive')} className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition ${feedback[task.id] === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}>
                                                    <ThumbsUp className="w-3 h-3" /> Helpful
                                                </button>
                                                <button onClick={() => submitFeedback(task.id, 'negative')} className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition ${feedback[task.id] === 'negative' ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-red-400'}`}>
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
                            })
                        )}
                    </div>
                )}

                {/* Modal */}
                {showModal && selectedVA && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="text-2xl">{selectedVA.icon}</span> {selectedVA.name}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <p className="text-slate-300 text-sm mb-3">{selectedVA.longDescription}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> {selectedVA.rating}</span>
                                <span>({selectedVA.reviews} reviews)</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {selectedVA.responseTime}</span>
                            </div>
                            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3 mb-4">
                                <p className="text-primary-400 text-sm">This task will cost <span className="font-bold">${selectedVA.price}</span> credit(s)</p>
                                <p className="text-slate-500 text-xs mt-1">You have {eligibility?.remaining || 0} credits remaining</p>
                            </div>
                            <form onSubmit={handleExecute} className="space-y-4">
                                <textarea 
                                    value={input} 
                                    onChange={(e) => setInput(e.target.value)} 
                                    rows={5} 
                                    placeholder={`Describe what you need help with...\n\nExample: "I'm applying for a Senior Software Engineer role at Google. Please help optimize my CV."`} 
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" 
                                    required 
                                />
                                <button 
                                    type="submit" 
                                    disabled={loading || (eligibility && !eligibility.isUnlimited && eligibility.remaining < selectedVA.price)} 
                                    className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                    {loading ? 'Processing...' : `Execute Task (${selectedVA.price} credits)`}
                                </button>
                            </form>
                            {output && (
                                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{output}</p>
                                    <button onClick={() => navigator.clipboard.writeText(output)} className="mt-2 text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                        <Copy className="w-3 h-3" /> Copy to clipboard
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
