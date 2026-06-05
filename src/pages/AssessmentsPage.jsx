// src/pages/AssessmentsPage.jsx
// ODUSBABA ASSESSMENTS PAGE v3.0 - PRODUCTION READY
// ✅ Unified API integration
// ✅ Search, filters, user results tracking
// ✅ Real question counts from database
// ✅ Eligibility checking with service layer

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Brain, Clock, TrendingUp, Award, Search, Loader2, 
    AlertCircle, Star, Users, FileText, CheckCircle, 
    BarChart3, Sparkles, HelpCircle, RefreshCw, Shield,
    Zap, Target, ThumbsUp, BookOpen, ChevronRight
} from 'lucide-react';
import { checkAssessmentEligibility } from '../services/assessmentService';

// ============================================
// CATEGORIES CONFIGURATION
// ============================================

const CATEGORIES = [
    { id: 'all', name: 'All Assessments', icon: Brain, description: 'View all assessments' },
    { id: 'personality', name: 'Personality', icon: Star, description: 'Understand your character traits' },
    { id: 'emotional_intelligence', name: 'EQ', icon: Brain, description: 'Measure emotional awareness' },
    { id: 'leadership', name: 'Leadership', icon: Users, description: 'Evaluate leadership potential' },
    { id: 'communication', name: 'Communication', icon: FileText, description: 'Assess communication skills' },
    { id: 'problem_solving', name: 'Problem Solving', icon: Brain, description: 'Test analytical abilities' },
    { id: 'team_collaboration', name: 'Team', icon: Users, description: 'Measure teamwork skills' },
    { id: 'career_aptitude', name: 'Career', icon: TrendingUp, description: 'Discover career paths' }
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function AssessmentsPage() {
    const [assessments, setAssessments] = useState([]);
    const [filteredAssessments, setFilteredAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [userResults, setUserResults] = useState({});
    const [questionCounts, setQuestionCounts] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [eligibility, setEligibility] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null);
    const [showDebug, setShowDebug] = useState(false);

    // ============================================
    // INITIALIZATION
    // ============================================

    useEffect(() => {
        checkUser();
        loadAllData();
    }, []);

    useEffect(() => {
        filterAssessments();
    }, [assessments, searchQuery, selectedCategory]);

    // ============================================
    // USER AND ELIGIBILITY FUNCTIONS
    // ============================================

    async function checkUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            await loadUserEligibility();
        }
    }

    async function loadUserEligibility() {
        try {
            const eligibilityData = await checkAssessmentEligibility(user.id);
            setEligibility(eligibilityData);
        } catch (err) {
            console.error('Error loading eligibility:', err);
            setEligibility({ remaining: 5, limit: 5, isUnlimited: false });
        }
    }

    // ============================================
    // DATA LOADING FUNCTIONS
    // ============================================

    async function loadAllData() {
        setRefreshing(true);
        await Promise.all([
            loadAssessments(),
            loadUserResults(),
            debugDatabase()
        ]);
        setRefreshing(false);
    }

    async function loadAssessments() {
        try {
            setLoading(true);
            
            // Get user eligibility first
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const eligibilityData = await checkAssessmentEligibility(authUser.id);
                setEligibility(eligibilityData);
            }
            
            // Load assessments from Supabase
            const { data, error: supabaseError } = await supabase
                .from('assessments')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });
            
            if (supabaseError) throw supabaseError;
            
            console.log(`✅ Loaded ${data?.length || 0} assessments`);
            
            // Get real question counts for each assessment
            const enhancedData = await Promise.all((data || []).map(async (assessment) => {
                const realCount = await getRealQuestionCount(assessment.id);
                return {
                    ...assessment,
                    display_question_count: realCount > 0 ? realCount : (assessment.question_count || 20)
                };
            }));
            
            // Safe filtering - ensure valid data
            const safeData = enhancedData.filter(a => a && a.id && a.title);
            setAssessments(safeData);
            setFilteredAssessments(safeData);
            
            if (safeData.length === 0) {
                console.warn("⚠️ No active assessments found.");
            }
        } catch (err) {
            console.error('❌ Error loading assessments:', err);
            setError('Failed to load assessments. Please refresh the page.');
            setAssessments([]);
            setFilteredAssessments([]);
        } finally {
            setLoading(false);
        }
    }

    async function getRealQuestionCount(assessmentId) {
        try {
            const { data, error } = await supabase
                .from('assessment_questions')
                .select('id', { count: 'exact', head: true })
                .eq('assessment_id', assessmentId);
            
            if (error) throw error;
            return data?.length || 0;
        } catch (err) {
            console.warn(`Could not get question count for ${assessmentId}:`, err);
            return 0;
        }
    }

    async function loadUserResults() {
        if (!user) return;
        
        try {
            const { data, error } = await supabase
                .from('user_assessments')
                .select('assessment_id, score, percentage, completed_at, performance_level')
                .eq('user_id', user.id)
                .eq('status', 'completed');
            
            if (error) throw error;
            
            const resultsMap = {};
            (data || []).forEach(r => {
                resultsMap[r.assessment_id] = {
                    score: r.score,
                    percentage: r.percentage,
                    completed_at: r.completed_at,
                    performance_level: r.performance_level
                };
            });
            setUserResults(resultsMap);
            console.log(`✅ Loaded ${data?.length || 0} user assessment results`);
        } catch (err) {
            console.warn('Could not load user results:', err);
        }
    }

    async function debugDatabase() {
        console.log("🔍 [DEBUG] Starting database diagnostic...");
        
        try {
            const { data: assessmentsData, error } = await supabase
                .from('assessments')
                .select('id, title, question_count, is_active')
                .eq('is_active', true);
            
            if (error) throw error;
            
            const countsMap = {};
            for (const assessment of assessmentsData || []) {
                const count = await getRealQuestionCount(assessment.id);
                countsMap[assessment.id] = count;
            }
            
            setQuestionCounts(countsMap);
            setDebugInfo({
                assessmentsCount: assessmentsData?.length || 0,
                assessmentsList: assessmentsData?.map(a => ({ 
                    title: a.title, 
                    storedCount: a.question_count || 0,
                    realCount: countsMap[a.id] || 0,
                    needsUpdate: a.question_count !== countsMap[a.id],
                    isActive: a.is_active 
                })) || [],
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("❌ [DEBUG] Unexpected error:", err);
            setDebugInfo({ error: err.message });
        }
    }

    // ============================================
    // FILTERING FUNCTIONS
    // ============================================

    function filterAssessments() {
        let filtered = [...assessments];
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a => 
                a.title?.toLowerCase().includes(query) ||
                a.description?.toLowerCase().includes(query)
            );
        }
        
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(a => a.assessment_type === selectedCategory);
        }
        
        filtered.sort((a, b) => {
            const titleA = a?.title || '';
            const titleB = b?.title || '';
            return titleA.localeCompare(titleB);
        });
        
        setFilteredAssessments(filtered);
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function getDisplayQuestionCount(assessment) {
        if (assessment.display_question_count) return assessment.display_question_count;
        if (assessment.question_count && assessment.question_count > 0) return assessment.question_count;
        return 20;
    }

    function getCategoryColor(type) {
        const colors = {
            personality: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
            emotional_intelligence: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
            leadership: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
            communication: 'from-green-500/20 to-green-600/20 border-green-500/30',
            problem_solving: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
            team_collaboration: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
            career_aptitude: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30'
        };
        return colors[type] || 'from-primary-500/20 to-primary-600/20 border-primary-500/30';
    }

    function getCategoryIcon(type) {
        const icons = {
            personality: Brain,
            emotional_intelligence: Star,
            leadership: Users,
            communication: FileText,
            problem_solving: Brain,
            team_collaboration: Users,
            career_aptitude: TrendingUp
        };
        return icons[type] || Award;
    }

    function getPerformanceBadge(percentage) {
        if (percentage >= 80) return { label: 'Excellent', color: 'bg-emerald-500/20 text-emerald-400', icon: Award };
        if (percentage >= 60) return { label: 'Good', color: 'bg-blue-500/20 text-blue-400', icon: ThumbsUp };
        if (percentage >= 40) return { label: 'Average', color: 'bg-amber-500/20 text-amber-400', icon: Target };
        return { label: 'Needs Improvement', color: 'bg-red-500/20 text-red-400', icon: AlertCircle };
    }

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Loading assessments...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // ERROR STATE
    // ============================================

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Assessments</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            Try Again
                        </button>
                        <button onClick={debugDatabase} className="px-6 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
                            Run Diagnostic
                        </button>
                        <Link to="/" className="px-6 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Brain className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Professional Assessments
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Discover your potential with science-backed assessments
                    </p>
                    
                    {/* Credit Info */}
                    {user && eligibility && (
                        <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                            eligibility.remaining <= 3 && !eligibility.isUnlimited
                                ? 'bg-amber-500/20 text-amber-400' 
                                : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                            <Shield className="w-3 h-3" />
                            {eligibility.isUnlimited ? (
                                'Unlimited assessments'
                            ) : (
                                `${eligibility.remaining} of ${eligibility.limit} assessments remaining this month`
                            )}
                        </div>
                    )}
                    
                    {/* Debug and Refresh Buttons */}
                    <div className="flex items-center justify-center gap-3 mt-4">
                        <button
                            onClick={() => setShowDebug(!showDebug)}
                            className="text-xs text-slate-500 hover:text-slate-400 transition flex items-center gap-1"
                        >
                            <BarChart3 className="w-3 h-3" />
                            {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
                        </button>
                        <button
                            onClick={loadAllData}
                            disabled={refreshing}
                            className="text-xs text-slate-500 hover:text-slate-400 transition flex items-center gap-1"
                        >
                            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Eligibility Banner */}
                {eligibility && !eligibility.isUnlimited && eligibility.remaining < 3 && (
                    <div className={`mb-6 p-4 rounded-xl text-center ${
                        eligibility.remaining > 0 
                            ? 'bg-amber-500/10 border border-amber-500/20' 
                            : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                        {eligibility.remaining > 0 ? (
                            <p className="text-amber-400">
                                ⚠️ You have <span className="font-bold">{eligibility.remaining}</span> assessment{eligibility.remaining !== 1 ? 's' : ''} remaining this month.
                            </p>
                        ) : (
                            <p className="text-red-400">
                                ❌ You've used all {eligibility.limit} assessments this month. 
                                <a href="/pricing" className="underline ml-1 hover:text-red-300">Upgrade to continue</a>
                            </p>
                        )}
                    </div>
                )}

                {/* Debug Panel */}
                {showDebug && debugInfo && (
                    <div className="mb-6 p-4 bg-slate-900/80 border border-slate-700 rounded-xl">
                        <h3 className="text-sm font-semibold text-primary-400 mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Database Diagnostic
                        </h3>
                        <div className="text-xs text-slate-400 space-y-1">
                            <p>📊 Total Assessments: {debugInfo.assessmentsCount}</p>
                            {debugInfo.assessmentsList?.slice(0, 5).map((a, i) => (
                                <p key={i} className="ml-4">
                                    • {a.title}: Stored: {a.storedCount} questions, Actual: {a.realCount} questions
                                    {a.needsUpdate && (
                                        <span className="text-amber-400 ml-2">⚠️ Update needed!</span>
                                    )}
                                    {!a.isActive && <span className="text-red-400 ml-2">❌ Inactive</span>}
                                </p>
                            ))}
                            {debugInfo.assessmentsList?.length > 5 && (
                                <p className="ml-4 text-slate-500">+ {debugInfo.assessmentsList.length - 5} more assessments</p>
                            )}
                            {debugInfo.assessmentsCount === 0 && (
                                <p className="text-amber-400 mt-2">
                                    ⚠️ No assessments found! Add assessments via Admin Panel.
                                </p>
                            )}
                            <p className="text-slate-500 text-xs mt-2">Last check: {new Date(debugInfo.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                )}

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search assessments by title or description..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
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
                                    title={cat.description}
                                >
                                    <Icon className="w-4 h-4" />
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                    <p className="text-slate-400 text-sm">
                        Showing <span className="text-white font-medium">{filteredAssessments.length}</span> of{' '}
                        <span className="text-white font-medium">{assessments.length}</span> assessments
                    </p>
                    <div className="flex gap-2">
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-sm text-primary-400 hover:text-primary-300 transition"
                            >
                                Clear search
                            </button>
                        )}
                        {selectedCategory !== 'all' && (
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className="text-sm text-slate-400 hover:text-white transition"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                </div>

                {/* Assessments Grid */}
                {filteredAssessments.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                        <HelpCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No assessments found</h3>
                        <p className="text-slate-400">
                            {assessments.length === 0 
                                ? 'No assessments are currently available. Please check back soon.'
                                : `No assessments match "${searchQuery}" or the selected category.`}
                        </p>
                        {(searchQuery || selectedCategory !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('all');
                                }}
                                className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
                            >
                                Clear All Filters
                            </button>
                        )}
                        {assessments.length === 0 && (
                            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <p className="text-amber-400 text-sm">
                                    💡 Tip: You need to add assessments to your database. 
                                    Go to Admin Panel → Assessment Manager to create assessments.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAssessments.map(assessment => {
                            const Icon = getCategoryIcon(assessment.assessment_type);
                            const userResult = userResults[assessment.id];
                            const performanceBadge = userResult ? getPerformanceBadge(userResult.percentage) : null;
                            const questionCount = getDisplayQuestionCount(assessment);
                            const canTake = (!userResult && eligibility && (eligibility.remaining > 0 || eligibility.isUnlimited)) || 
                                           (userResult && eligibility?.canRetake);
                            
                            return (
                                <div 
                                    key={assessment.id} 
                                    className={`bg-gradient-to-br ${getCategoryColor(assessment.assessment_type)} border rounded-xl p-6 hover:-translate-y-1 transition-all duration-300 group`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition">
                                            <Icon className="w-6 h-6 text-primary-400" />
                                        </div>
                                        {userResult && (
                                            <div className="text-right">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${performanceBadge.color} flex items-center gap-1`}>
                                                    {performanceBadge.icon && <performanceBadge.icon className="w-3 h-3" />}
                                                    {performanceBadge.label}
                                                </span>
                                                <p className="text-lg font-bold text-white mt-1">{userResult.percentage}%</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{assessment.title}</h3>
                                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{assessment.description || 'No description available'}</p>
                                    
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Clock className="w-4 h-4" />
                                            <span>{assessment.time_limit_minutes || 15} min</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <FileText className="w-4 h-4" />
                                            <span>{questionCount} {questionCount === 1 ? 'question' : 'questions'}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Warning if no questions */}
                                    {questionCount === 0 && (
                                        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-center">
                                            <p className="text-red-400 text-xs flex items-center justify-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                No questions available
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Assessment Link */}
                                    <Link to={`/assessments/${assessment.id}`}>
                                        <button 
                                            disabled={questionCount === 0 || (!canTake && !userResult && eligibility?.remaining === 0)}
                                            className={`w-full py-2.5 rounded-lg transition flex items-center justify-center gap-2 ${
                                                questionCount === 0 || (!canTake && !userResult && eligibility?.remaining === 0)
                                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                                    : 'bg-primary-600 text-white hover:bg-primary-700 group-hover:shadow-lg group-hover:shadow-primary-500/20'
                                            }`}
                                        >
                                            {questionCount === 0 ? (
                                                'Unavailable'
                                            ) : userResult ? (
                                                <>Retake Assessment <ChevronRight className="w-4 h-4" /></>
                                            ) : (
                                                <>Start Assessment <ChevronRight className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    </Link>
                                    
                                    {/* Credit warning for retake */}
                                    {userResult && eligibility && eligibility.remaining === 0 && !eligibility.isUnlimited && !eligibility.canRetake && (
                                        <p className="text-xs text-amber-400 text-center mt-2">
                                            No credits remaining this month
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Footer Note */}
                {user && eligibility && eligibility.remaining === 0 && !eligibility.isUnlimited && (
                    <div className="mt-8 text-center">
                        <Link to="/pricing" className="text-sm text-primary-400 hover:text-primary-300 transition">
                            Upgrade to continue taking assessments →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
