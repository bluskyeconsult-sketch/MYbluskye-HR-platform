// src/pages/HireVirtualAssistant.jsx - UNIFIED & OPTIMIZED
// ODUSBABA VIRTUAL ASSISTANT PAGE - Complete with All Features & Clean Mobile Design
//
// CHANGED (2026-08-07): the hardcoded VIRTUAL_ASSISTANTS array is gone —
// this now fetches the catalog from ?action=virtual-assistants, which was
// updated to query the real virtual_assistants database table (managed via
// VirtualAssistantManager.jsx) instead of returning a fixed list. This
// closes the architecture split flagged in Phase 9: admin-created VAs are
// now the actual public catalog. VA ids are now real database UUIDs rather
// than the old readable slugs (cv-expert, etc.) — nothing else in this file
// depends on the specific id format, so this is a transparent change.
//
// FIXED (2026-08-16):
// 1. The whole page returned a full-screen "Sign in to use Virtual
//    Assistants" wall for any guest, even though the catalog loads
//    independently of login status — visitors could never browse at all.
//    This contradicts the platform's own "see everything, gate on use"
//    principle. Removed the page-level gate; browsing/searching/filtering
//    is now open to everyone. Sign-in is now only required at the actual
//    moment of executing a task (handleExecute), with a clear prompt.
// 2. handleExecute checked eligibility.remaining < selectedVA.price — a
//    per-VA variable price — but the real va-execute backend handler
//    always deducts a flat 1 credit regardless of price, ignoring
//    selectedVA.price entirely. Frontend validation didn't match actual
//    backend behavior. Fixed to check against a flat 1 credit, matching
//    the unified credit system used everywhere else on the platform.
// 3. CATEGORIES included 'interview', 'skill', 'legal' — but the real
//    virtual_assistants table's category CHECK constraint only allows
//    'career', 'resume', 'writing', 'productivity' (confirmed earlier
//    this session). Those 3 tabs could never match any real VA, always
//    showing empty results. Removed to match what's actually possible.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import PageEdgeBanner from '../components/PageEdgeBanner';
import { 
    Bot, Sparkles, DollarSign, Clock, Loader2, Star, Shield, 
    FileText, Briefcase, Users, Award, TrendingUp, 
    Search, X, Eye, CheckCircle, History, Play, 
    ThumbsUp, ThumbsDown, ChevronRight, Copy, Crown,
    Zap, MessageCircle, Filter, RefreshCw, AlertCircle,
    Gift
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/index';

// ============================================
// CATEGORIES CONFIGURATION
// ============================================

const CATEGORIES = [
    { id: 'all', name: 'All Assistants', icon: Bot },
    { id: 'resume', name: 'CV Strategy & Feedback', icon: FileText },
    { id: 'career', name: 'Career Coaching', icon: Briefcase },
    { id: 'writing', name: 'Writing Partner', icon: TrendingUp },
    { id: 'productivity', name: 'Productivity Coach', icon: Shield },
    // NEW (2026-08-30): the first employer/manager-facing VA category -
    // previously all 4 categories were job-seeker-facing only, despite
    // HR Tools already having employer-facing tools like Job Description
    // Writer. Added alongside the new Rota Preparation Assistant.
    { id: 'employer_ops', name: 'Employer & Workforce Tools', icon: Users }
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function HireVirtualAssistant() {
    const [virtualAssistants, setVirtualAssistants] = useState([]);
    const [loadingVAs, setLoadingVAs] = useState(true);
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
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    // NEW (2026-08-23): real conversation thread for VAs marked
    // execution_type='conversational' — the actual mechanical
    // difference between "hiring an assistant" and running a
    // single-shot tool. Keyed by VA id so switching between assistants
    // doesn't mix up separate conversations. single_turn VAs (the
    // default, matching every VA's original behavior) never touch this.
    const [conversations, setConversations] = useState({}); // { [vaId]: [{role, content}] }
    // NEW (2026-09-04): confirmed real, reported UX bug - the
    // conversation/result area renders correctly, but sits inline
    // below the VA selection and input form with no signal that a
    // response arrived, easy to miss on a page with this much content
    // above it. Auto-scrolls to the result whenever new content
    // appears, rather than requiring the user to notice and scroll
    // down manually.
    const resultRef = useRef(null);
    // NEW (2026-09-06): confirmed real root cause of the continued "chat
    // feels like it's at the bottom" complaint - a full VA catalog grid
    // renders above the selected-VA panel, so selecting a VA drops the
    // user's active area far down the page. The existing auto-scroll only
    // fired once a response arrived, not at the moment of selection
    // itself - meaning the user had to manually scroll past the catalog
    // just to see the form they just opened.
    const selectedPanelRef = useRef(null);

    useEffect(() => {
        if (selectedVA && selectedPanelRef.current) {
            selectedPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [selectedVA]);

    // ============================================
    // LOAD VA CATALOG
    // ============================================

    useEffect(() => {
        loadVirtualAssistants();
    }, []);

    // Auto-scrolls to the result/conversation area whenever a new
    // response arrives, fixing the confirmed UX bug where responses
    // could go unnoticed further down the page.
    useEffect(() => {
        if (resultRef.current) {
            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [output, selectedVA ? conversations[selectedVA.id]?.length : 0]);

    async function loadVirtualAssistants() {
        setLoadingVAs(true);
        try {
            const response = await fetch(`${API_BASE}?action=virtual-assistants`);
            const data = await response.json();
            if (data.success) {
                setVirtualAssistants(data.assistants || []);
            }
        } catch (err) {
            console.error('Error loading virtual assistants:', err);
        } finally {
            setLoadingVAs(false);
        }
    }

    // ============================================
    // LOAD USER DATA (Unified API)
    // ============================================

    useEffect(() => {
        loadUserAndEligibility();
    }, [retryCount]);

    async function getAuthToken() {
        const session = await supabase.auth.getSession();
        return session.data.session?.access_token;
    }

    async function loadUserAndEligibility() {
        setRefreshing(true);
        setError(null);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setUser(null);
                setRefreshing(false);
                return;
            }
            setUser(user);
            
            const token = await getAuthToken();
            
            // Get VA credits from unified API
            try {
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
                    throw new Error('Failed to fetch credits');
                }
            } catch (creditsError) {
                console.error('Error fetching credits:', creditsError);
                // Fallback: Try direct Supabase
                const { data: credits } = await supabase
                    .from('va_credits')
                    .select('balance')
                    .eq('user_id', user.id)
                    .single();
                
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tier, user_type')
                    .eq('id', user.id)
                    .single();
                
                const tier = profile?.tier || profile?.user_type || 'free';
                // FIXED (2026-08-23): this fallback path (only used if the
                // primary ?action=va-credits call fails) still treated
                // business tier as unlimited — stale versus the real
                // backend decision made this session (business gets a
                // real 200/month cap, not unlimited, applied consistently
                // in va-credits/checkAndDeductCredit). Removed 'business'
                // so this fallback matches what the backend actually does
                // if it were reached successfully.
                const isUnlimited = tier === 'super_admin' || tier === 'admin';

                // FIXED (2026-08-23): the '|| 5' default here (only used
                // if no va_credits row exists yet AND the primary API
                // failed) ignored which tier the person is actually on —
                // mirrors index.js's real TIER_MONTHLY_ALLOWANCE constant
                // so this rare fallback-of-fallback path gives a
                // consistent number rather than always defaulting to the
                // free-tier amount regardless of real tier.
                const tierDefaults = { free: 5, registered: 10, professional: 25, employer: 20, business: 200, tester: 10 };
                const fallbackDefault = tierDefaults[tier] ?? 5;
                
                setEligibility({
                    remaining: isUnlimited ? 999999 : (credits?.balance ?? fallbackDefault),
                    limit: isUnlimited ? 999999 : 10,
                    tier: tier,
                    isUnlimited: isUnlimited
                });
            }
            
            // Get VA tasks history from unified API
            try {
                const tasksResponse = await fetch(`${API_BASE}?action=va-tasks&userId=${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const tasksData = await tasksResponse.json();
                
                if (tasksData.success) {
                    setTaskHistory(tasksData.tasks || []);
                } else {
                    throw new Error('Failed to fetch tasks');
                }
            } catch (tasksError) {
                console.error('Error fetching tasks:', tasksError);
                // Fallback: Direct Supabase
                const { data: tasks } = await supabase
                    .from('va_tasks')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);
                setTaskHistory(tasks || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setError(error.message || 'Failed to load data');
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

        // NEW (2026-08-16): sign-in is now required only at this point —
        // the moment of actually using a VA — not to browse the catalog.
        if (!user) {
            if (confirm('Sign in to use Virtual Assistants. Go to sign in now?')) {
                window.location.href = '/sign-in';
            }
            return;
        }
        
        // FIXED (2026-08-23): was checking against a flat 1 — real cost is
        // now execution-type-derived (2 credits for conversational VAs,
        // reflecting the real, confirmed higher compute cost of
        // maintaining conversation history).
        const requiredCost = selectedVA.execution_type === 'conversational' ? 2 : 1;
        if (!eligibility?.isUnlimited && eligibility?.remaining < requiredCost) {
            alert(`⚠️ This assistant costs ${requiredCost} credit${requiredCost > 1 ? 's' : ''} per ${selectedVA.execution_type === 'conversational' ? 'message' : 'use'}. Upgrade your plan or purchase more credits to continue.`);
            return;
        }

        // NEW (2026-08-23): conversational VAs require a paid tier —
        // checked here too (the real enforcement is server-side in
        // va-execute) so a free-tier user gets a clear message before
        // attempting the request at all.
        if (selectedVA.execution_type === 'conversational' && !canUseConversational) {
            if (confirm('Conversational assistants that remember your conversation are available on paid plans. View pricing now?')) {
                window.location.href = '/pricing';
            }
            return;
        }
        
        setLoading(true);
        setOutput(null);
        setIsProcessing(true);
        setProcessingProgress(0);

        // NEW (2026-08-23): for conversational VAs, this VA's prior
        // thread is sent as real history so the model actually has
        // context — the mechanical difference from HR Tools' one-shot
        // utilities. single_turn VAs never send history, matching their
        // original, unchanged behavior exactly.
        const isConversational = selectedVA.execution_type === 'conversational';
        const priorHistory = isConversational ? (conversations[selectedVA.id] || []) : [];
        const userInput = input;
        
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
                    input: userInput,
                    userId: user.id,
                    history: priorHistory
                })
            });
            
            const result = await response.json();
            
            clearInterval(progressInterval);
            setProcessingProgress(100);
            
            if (result.success) {
                setOutput(result.output);

                if (isConversational) {
                    setConversations(prev => ({
                        ...prev,
                        [selectedVA.id]: [
                            ...priorHistory,
                            { role: 'user', content: userInput },
                            { role: 'assistant', content: result.output }
                        ]
                    }));
                    setInput('');
                }

                await loadUserAndEligibility();
            } else {
                setError(result.error || 'Failed to execute task. Please try again.');
            }
        } catch (error) {
            console.error('VA execution error:', error);
            setError(error.message || 'Failed to execute task. Please try again.');
        } finally {
            setLoading(false);
            setIsProcessing(false);
            setProcessingProgress(0);
        }
    }

    // ============================================
    // CHECK VA ACCESSIBILITY
    // ============================================

    const isVAAccessible = useCallback((vaTier) => {
        const tierLevels = { free: 0, registered: 1, professional: 2, employer: 2, business: 3, admin: 3, super_admin: 3 };
        const userLevel = tierLevels[eligibility?.tier || 'free'];
        const vaLevel = tierLevels[vaTier || 'free'];
        return userLevel >= vaLevel;
    }, [eligibility]);

    // NEW (2026-08-23): conversational VAs are restricted to paid tiers —
    // this mirrors the real server-side enforcement in va-execute (which
    // is the actual security boundary); this UI check exists only to give
    // a clear, honest experience rather than letting someone try and then
    // get a 403.
    const canUseConversational = useMemo(() => {
        const tier = eligibility?.tier || 'free';
        return tier !== 'free';
    }, [eligibility]);

    // ============================================
    // FILTER ASSISTANTS
    // ============================================

    const filteredVAs = useMemo(() => {
        return virtualAssistants.filter(va => {
            const matchesSearch = va.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 va.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (va.longDescription && va.longDescription.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = selectedCategory === 'all' || va.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [virtualAssistants, searchTerm, selectedCategory]);

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        loadVirtualAssistants();
    };

    // ============================================
    // MAIN RENDER — no more page-level sign-in wall; everyone can browse.
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-8 sm:py-12">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400" />
                        <span className="text-primary-400 text-xs sm:text-sm">Ongoing AI Advisors</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">Hire a Virtual Assistant</h1>
                    <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                        Bring on a specialist you can keep coming back to — talk through your CV strategy, career direction,
                        or writing over time, not just a single request.
                    </p>
                </div>

                <PageEdgeBanner>
                    Conversational assistants genuinely remember your earlier messages within a session — not
                    a stateless chatbot resetting every reply. That's real, working memory (2 credits/message on
                    paid tiers), not a marketing description.
                </PageEdgeBanner>

                {/* NEW (2026-08-23): clarity-of-purpose cross-link — Hire VA and
                    HR Tools solve genuinely different problems, but a person
                    landing on either page has no way to know that without this.
                    "Need a specific document right now" vs "want an ongoing
                    conversation" is the real distinction, not just different
                    branding for the same thing. */}
                <div className="mb-6 sm:mb-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-slate-400 text-sm">
                        <span className="text-white font-medium">Need one specific document right now</span> — a cover letter, a contract review, a salary number? Assistants here are built for back-and-forth conversation, not a single instant output.
                    </p>
                    <a href="/hr-tools" className="flex-shrink-0 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition text-sm font-medium whitespace-nowrap">
                        Try HR Tools instead →
                    </a>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-red-400 text-sm flex-1">{error}</p>
                        <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Credits Banner */}
                {eligibility && (
                    <div className={`mb-6 p-3 sm:p-4 rounded-xl text-center text-sm sm:text-base ${
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
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                                <p>
                                    You have <span className="font-bold text-xl">{eligibility.remaining}</span> VA credits remaining
                                    {eligibility.limit && eligibility.limit < 999999 && (
                                        <span className="text-xs text-slate-500"> / {eligibility.limit} total</span>
                                    )}
                                </p>
                                {eligibility.remaining <= 5 && eligibility.remaining > 0 && (
                                    <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">🎯 Low credits</span>
                                )}
                                {eligibility.remaining === 0 && (
                                    <a href="/pricing" className="text-xs sm:text-sm bg-primary-600 px-3 py-1 rounded-lg hover:bg-primary-700 transition">Upgrade →</a>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800 mb-6">
                    <button 
                        onClick={() => setActiveTab('assistants')} 
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition ${
                            activeTab === 'assistants' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" /> Assistants
                        <span className="ml-1 text-xs text-slate-500">({virtualAssistants.length})</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')} 
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition ${
                            activeTab === 'history' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" /> History
                        {taskHistory.length > 0 && <span className="ml-1 text-xs text-slate-500">({taskHistory.length})</span>}
                    </button>
                    <button 
                        onClick={() => loadUserAndEligibility()} 
                        disabled={refreshing}
                        className="ml-auto px-3 py-2 text-xs text-slate-500 hover:text-slate-400 transition flex items-center gap-1"
                    >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? '...' : 'Refresh'}
                    </button>
                </div>

                {/* ASSISTANTS TAB */}
                {activeTab === 'assistants' && (
                    <>
                        {loadingVAs ? (
                            <div className="text-center py-12">
                                <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                                <p className="text-slate-400">Loading assistants...</p>
                            </div>
                        ) : (
                        <>
                        {/* Search and Filter */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    placeholder="Search assistants..." 
                                    className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base" 
                                />
                            </div>
                            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {CATEGORIES.map(cat => {
                                    const Icon = cat.icon;
                                    const isActive = selectedCategory === cat.id;
                                    const count = virtualAssistants.filter(v => v.category === cat.id || cat.id === 'all').length;
                                    return (
                                        <button 
                                            key={cat.id} 
                                            onClick={() => setSelectedCategory(cat.id)} 
                                            className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap transition ${
                                                isActive 
                                                    ? 'bg-primary-600 text-white' 
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                                            <span className="hidden xs:inline">{cat.name}</span>
                                            <span className="text-[10px] opacity-70">({count})</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="mb-4 text-right">
                            <p className="text-xs text-slate-500">Showing {filteredVAs.length} of {virtualAssistants.length} assistants</p>
                        </div>

                        {/* VA Grid */}
                        {virtualAssistants.length === 0 ? (
                            <div className="text-center py-8 sm:py-12 text-slate-400">
                                <Bot className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-slate-600" />
                                <p className="text-base sm:text-lg font-medium text-white mb-1">No assistants available yet</p>
                                <p className="text-sm">Check back soon.</p>
                            </div>
                        ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                            {filteredVAs.map(va => {
                                const isSelected = selectedVA?.id === va.id;
                                const isConversationalVA = va.execution_type === 'conversational';
                                // NEW (2026-08-23): conversational VAs need BOTH the
                                // existing tier-level check AND the paid-tier gate —
                                // a free-tier user shouldn't be able to select one at
                                // all, matching the real server-side restriction.
                                const isAccessible = isVAAccessible(va.tier) && (!isConversationalVA || canUseConversational);
                                const isLockedForFreeTier = isConversationalVA && !canUseConversational;
                                const realCost = isConversationalVA ? 2 : 1;
                                return (
                                    <div 
                                        key={va.id} 
                                        className={`bg-gradient-to-br from-slate-800 to-slate-900 border rounded-xl p-4 sm:p-6 transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'ring-2 ring-primary-500 border-primary-500 shadow-lg shadow-primary-500/20' 
                                                : 'border-slate-700 hover:border-primary-500/50 hover:-translate-y-1'
                                        } ${!isAccessible ? 'opacity-60' : ''}`}
                                        onClick={() => {
                                            if (isLockedForFreeTier) {
                                                if (confirm('Conversational assistants that remember your conversation are available on paid plans. View pricing now?')) {
                                                    window.location.href = '/pricing';
                                                }
                                                return;
                                            }
                                            isAccessible && setSelectedVA(va);
                                        }}
                                    >
                                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                                            <div className="text-3xl sm:text-4xl group-hover:scale-110 transition">{va.icon}</div>
                                            <div className="text-right">
                                                {/* FIXED (2026-08-30): confirmed directly by real
                                                    tester feedback - even after the 2026-08-23 fix
                                                    correctly relabeled this as "value" rather than an
                                                    actual charge, showing two different numbers on one
                                                    card (a dollar figure AND a credit count) still read
                                                    as genuinely confusing: "why does it show $9.99 AND
                                                    1 credit - which do I actually pay?" The real
                                                    billing is purely credit-based, so the dollar figure
                                                    added no real clarity, only two numbers where one
                                                    would do. Removed entirely rather than relabeled
                                                    again - the credit line alone is sufficient and
                                                    unambiguous. */}
                                                <p className="text-[10px] sm:text-xs text-primary-400 font-medium">
                                                    {realCost} credit{realCost > 1 ? 's' : ''} per {isConversationalVA ? 'message' : 'use'}
                                                </p>
                                                {isConversationalVA && (
                                                    <p className="text-[10px] sm:text-xs text-amber-400/80 mt-0.5">
                                                        {isLockedForFreeTier ? '🔒 Paid plans only' : 'Remembers your conversation'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="text-base sm:text-lg font-semibold text-white mb-1">{va.name}</h3>
                                        <p className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{va.description}</p>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-500 mb-2 sm:mb-3">
                                            {/* FIXED (2026-08-23): rating/reviews were hardcoded
                                                4.8/0 for EVERY VA, identical and fabricated —
                                                same issue already found and fixed on
                                                BooksPage.jsx and AssessmentsPage.jsx. Now computed
                                                from real va_tasks.user_rating feedback (the actual
                                                thumbs-up/down users already give per task). A VA
                                                with no feedback yet shows that honestly rather than
                                                inventing a number. */}
                                            {va.rating !== null && va.rating !== undefined ? (
                                                <>
                                                    <span className="flex items-center gap-0.5 sm:gap-1"><Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400 fill-yellow-400" /> {va.rating.toFixed(1)}</span>
                                                    <span>({va.reviews} rating{va.reviews !== 1 ? 's' : ''})</span>
                                                </>
                                            ) : (
                                                <span className="text-slate-600">Not yet rated</span>
                                            )}
                                            <span className="flex items-center gap-0.5 sm:gap-1"><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {va.responseTime || va.processingTime}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            {va.featured && (
                                                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">⭐ Featured</span>
                                            )}
                                            {!isAccessible && (
                                                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-0.5 sm:gap-1">
                                                    <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Upgrade
                                                </span>
                                            )}
                                            {isSelected && (
                                                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded-full">Selected</span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <div className="mt-3 pt-3 border-t border-slate-700">
                                                <p className="text-xs sm:text-sm text-slate-400">{va.longDescription}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        )}

                        {virtualAssistants.length > 0 && filteredVAs.length === 0 && (
                            <div className="text-center py-8 sm:py-12 text-slate-400">
                                <Bot className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-slate-600" />
                                <p className="text-base sm:text-lg font-medium text-white mb-1">No assistants match your search</p>
                                <p className="text-sm">Try adjusting your search or filter criteria</p>
                                <button 
                                    onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                                    className="mt-4 text-primary-400 hover:underline text-sm"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}

                        {/* Task Execution Form */}
                        {selectedVA && (
                            <div ref={selectedPanelRef} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-6 mt-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl sm:text-3xl">{selectedVA.icon}</span>
                                            <h3 className="text-lg sm:text-xl font-bold text-white">{selectedVA.name}</h3>
                                            <span className="text-xs sm:text-sm text-primary-400 font-medium">
                                                ({selectedVA.execution_type === 'conversational' ? '2 credits per message' : '1 credit per use'})
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-xs sm:text-sm mt-1">{selectedVA.longDescription}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedVA(null);
                                            setInput('');
                                            setOutput(null);
                                        }}
                                        className="p-1 text-slate-400 hover:text-white transition flex-shrink-0"
                                    >
                                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </div>
                                
                                <form onSubmit={handleExecute} className="space-y-4">
                                    {selectedVA.execution_type === 'conversational' && (
                                        <div className="p-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400">
                                            {/* FIXED (2026-08-23): was "1 credit" — real cost for
                                                conversational VAs is 2 credits per message, since
                                                each turn resends the whole conversation as input
                                                tokens (a real ~1.56x average cost vs. a single-turn
                                                call, confirmed against actual OpenAI pricing). */}
                                            This assistant remembers your conversation — each message you send costs 2 credits, reflecting the real cost of maintaining context across the conversation.
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">What do you need help with?</label>
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            rows={4}
                                            placeholder={`Describe what you need help with...\n\nExample: "I'm applying for a Senior Software Engineer role at Google. Please help optimize my CV."`}
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                                            required
                                        />
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        // FIXED (2026-08-23): was disabled based on
                                        // eligibility.remaining < selectedVA.price — the
                                        // real backend always deducts exactly 1 credit,
                                        // so this could disable the button for a user who
                                        // could clearly afford the actual cost, whenever a
                                        // VA's dollar-value price field happened to be
                                        // higher than their remaining balance.
                                        disabled={loading || (eligibility && !eligibility.isUnlimited && eligibility.remaining < (selectedVA.execution_type === 'conversational' ? 2 : 1)) || !isVAAccessible(selectedVA.tier)}
                                        className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-xl hover:from-primary-700 to-sky-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition-all duration-200 text-sm sm:text-base"
                                    >
                                        {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                        {loading ? 'Processing...' : (selectedVA.execution_type === 'conversational' ? 'Send Message (2 credits)' : 'Execute Task (1 credit)')}
                                    </button>
                                </form>
                                
                                {/* Processing Progress */}
                                {isProcessing && (
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs sm:text-sm text-slate-400 mb-1">
                                            <span>Processing your request...</span>
                                            <span>{processingProgress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-1.5 sm:h-2">
                                            <div 
                                                className="bg-primary-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${processingProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-slate-500 mt-2 text-center">
                                            This may take a moment for quality checking
                                        </p>
                                    </div>
                                )}
                                
                                {/* NEW (2026-08-23): conversational VAs show a real
                                    growing thread (the actual point of "hiring an
                                    assistant" rather than running a one-shot tool) —
                                    single_turn VAs keep the original single-box
                                    output view unchanged below. */}
                                {selectedVA?.execution_type === 'conversational' && (conversations[selectedVA.id]?.length > 0) && (
                                    <div ref={resultRef} className="mt-4 sm:mt-6 p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3 max-h-96 overflow-y-auto">
                                        {conversations[selectedVA.id].map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                                                    msg.role === 'user'
                                                        ? 'bg-primary-600 text-white'
                                                        : 'bg-slate-700 text-slate-200'
                                                }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setConversations(prev => ({ ...prev, [selectedVA.id]: [] }))}
                                            className="text-xs text-slate-500 hover:text-slate-300"
                                        >
                                            Clear conversation
                                        </button>
                                    </div>
                                )}

                                {/* Result Output — single_turn VAs (the original,
                                    unchanged behavior) */}
                                {output && selectedVA?.execution_type !== 'conversational' && (
                                    <div ref={resultRef} className="mt-4 sm:mt-6 p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                            <h4 className="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                Result
                                            </h4>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => copyToClipboard(output)}
                                                    className="text-slate-400 hover:text-white text-xs sm:text-sm flex items-center gap-1"
                                                >
                                                    <Copy className="w-3 h-3" /> Copy
                                                </button>
                                                <button
                                                    onClick={() => setOutput(null)}
                                                    className="text-slate-400 hover:text-white text-xs sm:text-sm"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-slate-300 whitespace-pre-wrap max-h-72 sm:max-h-96 overflow-y-auto prose prose-invert prose-xs sm:prose-sm">
                                            {output}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        </>
                        )}
                    </>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="space-y-3 sm:space-y-4">
                        {(loadingHistory || refreshing) && taskHistory.length === 0 ? (
                            <div className="text-center py-8 sm:py-12">
                                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400 animate-spin mx-auto mb-3" />
                                <p className="text-slate-400 text-sm sm:text-base">Loading history...</p>
                            </div>
                        ) : taskHistory.length === 0 ? (
                            <div className="text-center py-8 sm:py-12 text-slate-400">
                                <History className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-slate-600" />
                                <p className="text-base sm:text-lg font-medium text-white mb-1">No task history yet</p>
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
                                    const va = virtualAssistants.find(v => v.id === task.va_id);
                                    const isExpanded = expandedTask === task.id;
                                    return (
                                        <div key={task.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-slate-700 transition">
                                            <div className="flex flex-wrap justify-between items-start gap-2 sm:gap-3">
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <div className="text-2xl sm:text-3xl">{va?.icon || '🤖'}</div>
                                                    <div>
                                                        <h3 className="text-white font-semibold text-sm sm:text-base">{va?.name || task.va_name || task.va_id}</h3>
                                                        <p className="text-[10px] sm:text-xs text-slate-500">{new Date(task.created_at).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 sm:gap-2">
                                                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                                                        task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                        task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                        {task.status === 'completed' ? '✓ Done' : 
                                                         task.status === 'failed' ? '❌ Failed' : '⏳ Processing'}
                                                    </span>
                                                    {task.output && (
                                                        <button 
                                                            onClick={() => setExpandedTask(isExpanded ? null : task.id)} 
                                                            className="p-1 text-slate-400 hover:text-white transition"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 sm:mt-2 line-clamp-2">{task.input}</p>
                                            {task.execution_time_ms && (
                                                <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Completed in {(task.execution_time_ms / 1000).toFixed(1)}s</p>
                                            )}
                                            {isExpanded && task.output && (
                                                <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-slate-800/50 rounded-lg">
                                                    <p className="text-slate-300 text-xs sm:text-sm whitespace-pre-wrap">{task.output.substring(0, 500)}...</p>
                                                    {task.output.length > 500 && (
                                                        <button 
                                                            onClick={() => copyToClipboard(task.output)}
                                                            className="mt-2 text-[10px] sm:text-xs text-primary-400 hover:underline"
                                                        >
                                                            Copy full result
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 sm:mt-3 pt-2 border-t border-slate-800">
                                                <div className="flex items-center gap-1.5 sm:gap-2">
                                                    <button 
                                                        onClick={() => submitFeedback(task.id, 'positive')} 
                                                        className={`text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded transition ${
                                                            feedback[task.id] === 'positive' || task.user_rating === 5 
                                                                ? 'bg-emerald-500/20 text-emerald-400' 
                                                                : 'text-slate-500 hover:text-emerald-400'
                                                        }`}
                                                    >
                                                        <ThumbsUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Helpful
                                                    </button>
                                                    <button 
                                                        onClick={() => submitFeedback(task.id, 'negative')} 
                                                        className={`text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded transition ${
                                                            feedback[task.id] === 'negative' || (task.user_rating && task.user_rating < 3)
                                                                ? 'bg-red-500/20 text-red-400' 
                                                                : 'text-slate-500 hover:text-red-400'
                                                        }`}
                                                    >
                                                        <ThumbsDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Not Helpful
                                                    </button>
                                                </div>
                                                {task.output && !isExpanded && (
                                                    <button onClick={() => setExpandedTask(task.id)} className="text-[10px] sm:text-xs text-primary-400 hover:text-primary-300 flex items-center gap-0.5 sm:gap-1">
                                                        View result <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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
