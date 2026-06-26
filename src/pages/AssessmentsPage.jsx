// src/pages/AssessmentsPage.jsx - UNIFIED & OPTIMIZED
// ODUSBABA ASSESSMENTS PAGE - Complete with All Features & Clean Mobile Design

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Brain, Clock, TrendingUp, Award, Search, Loader2, 
    AlertCircle, Star, Users, FileText, CheckCircle, 
    BarChart3, Sparkles, HelpCircle, RefreshCw, Shield,
    Zap, Target, ThumbsUp, BookOpen, ChevronRight, X
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/index';

// ============================================
// CATEGORIES CONFIGURATION
// ============================================

const CATEGORIES = [
    { id: 'all', name: 'All', icon: Brain, description: 'All assessments' },
    { id: 'personality', name: 'Personality', icon: Star, description: 'Character traits' },
    { id: 'emotional_intelligence', name: 'EQ', icon: Brain, description: 'Emotional awareness' },
    { id: 'leadership', name: 'Leadership', icon: Users, description: 'Leadership potential' },
    { id: 'communication', name: 'Communication', icon: FileText, description: 'Communication skills' },
    { id: 'problem_solving', name: 'Problem Solving', icon: Brain, description: 'Analytical abilities' },
    { id: 'team_collaboration', name: 'Team', icon: Users, description: 'Teamwork skills' },
    { id: 'career_aptitude', name: 'Career', icon: TrendingUp, description: 'Career paths' }
];

// ============================================
// MOCK DATA (Fallback)
// ============================================

const MOCK_ASSESSMENTS = [
    {
        id: 'mock-1',
        title: 'Career Aptitude Test',
        description: 'Discover your ideal career path based on your skills and interests',
        assessment_type: 'career_aptitude',
        question_count: 15,
        time_limit_minutes: 25,
        difficulty: 'intermediate',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        id: 'mock-2',
        title: 'Leadership Potential Assessment',
        description: 'Evaluate your leadership capabilities and identify growth areas',
        assessment_type: 'leadership',
        question_count: 20,
        time_limit_minutes: 30,
        difficulty: 'advanced',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        id: 'mock-3',
        title: 'Communication Skills Evaluation',
        description: 'Assess your communication effectiveness in the workplace',
        assessment_type: 'communication',
        question_count: 12,
        time_limit_minutes: 20,
        difficulty: 'intermediate',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        id: 'mock-4',
        title: 'Problem Solving Skills Test',
        description: 'Test your analytical and problem-solving abilities',
        assessment_type: 'problem_solving',
        question_count: 10,
        time_limit_minutes: 25,
        difficulty: 'intermediate',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        id: 'mock-5',
        title: 'Emotional Intelligence Assessment',
        description: 'Evaluate your EQ and interpersonal skills',
        assessment_type: 'emotional_intelligence',
        question_count: 15,
        time_limit_minutes: 25,
        difficulty: 'advanced',
        is_active: true,
        created_at: new Date().toISOString()
    }
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
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [eligibility, setEligibility] = useState(null);
    const [showMockWarning, setShowMockWarning] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

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

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
            await loadUserEligibility(user.id);
        }
    };

    const loadUserEligibility = async (userId) => {
        try {
            const response = await fetch(`${API_BASE}?action=user-eligibility&userId=${userId}&type=assessments`);
            const data = await response.json();
            
            if (data.success) {
                setEligibility(data.data);
            } else {
                setEligibility({ remaining: 5, limit: 5, isUnlimited: false, canRetake: true });
            }
        } catch (err) {
            console.error('Error loading eligibility:', err);
            setEligibility({ remaining: 5, limit: 5, isUnlimited: false, canRetake: true });
        }
    };

    // ============================================
    // DATA LOADING FUNCTIONS
    // ============================================

    const loadAllData = async () => {
        setRefreshing(true);
        await Promise.all([
            loadAssessments(),
            loadUserResults()
        ]);
        setRefreshing(false);
    };

    const loadAssessments = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Get user for eligibility
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                await loadUserEligibility(authUser.id);
            }
            
            // Try main endpoint
            const response = await fetch(`${API_BASE}?action=assessments-list`, {
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data && data.data.length > 0) {
                // Get real question counts
                const enhancedData = await Promise.all(data.data.map(async (assessment) => {
                    try {
                        const countResponse = await fetch(`${API_BASE}?action=assessment-question-count&assessmentId=${assessment.id}`);
                        const countData = await countResponse.json();
                        const realCount = countData.success ? countData.count : 0;
                        
                        return {
                            ...assessment,
                            display_question_count: realCount > 0 ? realCount : (assessment.question_count || 20)
                        };
                    } catch {
                        return {
                            ...assessment,
                            display_question_count: assessment.question_count || 20
                        };
                    }
                }));
                
                const safeData = enhancedData.filter(a => a && a.id && a.title);
                setAssessments(safeData);
                setFilteredAssessments(safeData);
                setShowMockWarning(false);
            } else {
                // Try debug endpoint
                const debugResponse = await fetch(`${API_BASE}?action=assessments-debug`);
                const debugData = await debugResponse.json();
                
                if (debugData.success && debugData.data?.assessments?.length > 0) {
                    setAssessments(debugData.data.assessments);
                    setFilteredAssessments(debugData.data.assessments);
                    setShowMockWarning(true);
                    setError('Showing assessments from debug data');
                } else {
                    // Use mock data
                    setAssessments(MOCK_ASSESSMENTS);
                    setFilteredAssessments(MOCK_ASSESSMENTS);
                    setShowMockWarning(true);
                    setError('No assessments found. Showing sample data.');
                }
            }
        } catch (error) {
            console.error('Error loading assessments:', error);
            // Use mock data on error
            setAssessments(MOCK_ASSESSMENTS);
            setFilteredAssessments(MOCK_ASSESSMENTS);
            setShowMockWarning(true);
            setError('Unable to load assessments. Showing sample data.');
        } finally {
            setLoading(false);
        }
    };

    const loadUserResults = async () => {
        if (!user) return;
        
        try {
            const response = await fetch(`${API_BASE}?action=user-assessment-results&userId=${user.id}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                const resultsMap = {};
                data.data.forEach(r => {
                    resultsMap[r.assessment_id] = {
                        score: r.score,
                        percentage: r.percentage,
                        completed_at: r.completed_at,
                        performance_level: r.performance_level
                    };
                });
                setUserResults(resultsMap);
            }
        } catch (err) {
            console.warn('Could not load user results:', err);
        }
    };

    // ============================================
    // FILTERING FUNCTIONS
    // ============================================

    const filterAssessments = () => {
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
    };

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const getDisplayQuestionCount = (assessment) => {
        if (assessment.display_question_count) return assessment.display_question_count;
        if (assessment.question_count && assessment.question_count > 0) return assessment.question_count;
        return 20;
    };

    const getCategoryColor = (type) => {
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
    };

    const getCategoryIcon = (type) => {
        const icons = {
            personality: Star,
            emotional_intelligence: Brain,
            leadership: Users,
            communication: FileText,
            problem_solving: Brain,
            team_collaboration: Users,
            career_aptitude: TrendingUp
        };
        return icons[type] || Award;
    };

    const getPerformanceBadge = (percentage) => {
        if (percentage >= 80) return { label: 'Excellent', color: 'bg-emerald-500/20 text-emerald-400', icon: Award };
        if (percentage >= 60) return { label: 'Good', color: 'bg-blue-500/20 text-blue-400', icon: ThumbsUp };
        if (percentage >= 40) return { label: 'Average', color: 'bg-amber-500/20 text-amber-400', icon: Target };
        return { label: 'Needs Improvement', color: 'bg-red-500/20 text-red-400', icon: AlertCircle };
    };

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        loadAllData();
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('all');
    };

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
    // MAIN RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-8 sm:py-12">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
                        Professional Assessments
                    </h1>
                    <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
                        Discover your potential with science-backed assessments
                    </p>
                    
                    {/* Eligibility Badge */}
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
                                `${eligibility.remaining} of ${eligibility.limit} remaining this month`
                            )}
                        </div>
                    )}
                    
                    {/* Refresh Button */}
                    <button
                        onClick={handleRetry}
                        disabled={refreshing}
                        className="mt-4 text-xs text-slate-500 hover:text-slate-400 transition flex items-center gap-1 mx-auto"
                    >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {/* Mock Data Warning */}
                {showMockWarning && (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-amber-400 text-sm">{error || 'Showing sample assessments'}</p>
                            <p className="text-slate-500 text-xs mt-1">Add assessments via Admin Panel to see real data</p>
                        </div>
                    </div>
                )}

                {/* Eligibility Warning */}
                {eligibility && !eligibility.isUnlimited && eligibility.remaining < 3 && (
                    <div className={`mb-6 p-4 rounded-xl text-center ${
                        eligibility.remaining > 0 
                            ? 'bg-amber-500/10 border border-amber-500/20' 
                            : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                        {eligibility.remaining > 0 ? (
                            <p className="text-amber-400 text-sm">
                                ⚠️ You have <span className="font-bold">{eligibility.remaining}</span> assessment{eligibility.remaining !== 1 ? 's' : ''} remaining this month.
                            </p>
                        ) : (
                            <p className="text-red-400 text-sm">
                                ❌ You've used all {eligibility.limit} assessments this month. 
                                <Link to="/pricing" className="underline ml-1 hover:text-red-300">Upgrade to continue</Link>
                            </p>
                        )}
                    </div>
                )}

                {/* Search and Filter - Mobile Friendly */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search assessments..."
                            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {CATEGORIES.map(cat => {
                            const Icon = cat.icon;
                            const isActive = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap transition ${
                                        isActive
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                    title={cat.description}
                                >
                                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                    <p className="text-slate-400 text-xs sm:text-sm">
                        Showing <span className="text-white font-medium">{filteredAssessments.length}</span> of{' '}
                        <span className="text-white font-medium">{assessments.length}</span> assessments
                    </p>
                    {(searchQuery || selectedCategory !== 'all') && (
                        <button
                            onClick={clearFilters}
                            className="text-xs sm:text-sm text-primary-400 hover:text-primary-300 transition flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Clear filters
                        </button>
                    )}
                </div>

                {/* Assessments Grid */}
                {filteredAssessments.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 sm:p-12 text-center">
                        <HelpCircle className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No assessments found</h3>
                        <p className="text-slate-400 text-sm">
                            {assessments.length === 0 
                                ? 'No assessments are currently available. Please check back soon.'
                                : `No assessments match "${searchQuery}"`}
                        </p>
                        {(searchQuery || selectedCategory !== 'all') && (
                            <button
                                onClick={clearFilters}
                                className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                                    className={`bg-gradient-to-br ${getCategoryColor(assessment.assessment_type)} border rounded-xl p-4 sm:p-6 hover:-translate-y-1 transition-all duration-300 group`}
                                >
                                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition">
                                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
                                        </div>
                                        {userResult && (
                                            <div className="text-right">
                                                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${performanceBadge.color} flex items-center gap-1`}>
                                                    {performanceBadge.icon && <performanceBadge.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                                    {performanceBadge.label}
                                                </span>
                                                <p className="text-base sm:text-lg font-bold text-white mt-1">{userResult.percentage}%</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2 line-clamp-1">{assessment.title}</h3>
                                    <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{assessment.description || 'No description available'}</p>
                                    
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500">
                                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            <span>{assessment.time_limit_minutes || 15} min</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500">
                                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            <span>{questionCount} {questionCount === 1 ? 'question' : 'questions'}</span>
                                        </div>
                                    </div>
                                    
                                    {/* No questions warning */}
                                    {questionCount === 0 && (
                                        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-center">
                                            <p className="text-red-400 text-[10px] sm:text-xs flex items-center justify-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                No questions available
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Assessment Link */}
                                    <Link to={`/assessments/${assessment.id}`}>
                                        <button 
                                            disabled={questionCount === 0 || (!canTake && !userResult && eligibility?.remaining === 0)}
                                            className={`w-full py-2 sm:py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base ${
                                                questionCount === 0 || (!canTake && !userResult && eligibility?.remaining === 0)
                                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                                    : 'bg-primary-600 text-white hover:bg-primary-700 group-hover:shadow-lg group-hover:shadow-primary-500/20'
                                            }`}
                                        >
                                            {questionCount === 0 ? (
                                                'Unavailable'
                                            ) : userResult ? (
                                                <>Retake <ChevronRight className="w-4 h-4" /></>
                                            ) : (
                                                <>Start <ChevronRight className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Footer */}
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
