// src/pages/AssessmentsPage.jsx
// COMPLETE ASSESSMENTS PAGE - With search, filters, categories, user results tracking, and debugging

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Brain, Clock, TrendingUp, Award, Search, Loader2, 
    AlertCircle, Star, Users, FileText, CheckCircle, Filter,
    BarChart3, Sparkles
} from 'lucide-react';

export default function AssessmentsPage() {
    const [assessments, setAssessments] = useState([]);
    const [filteredAssessments, setFilteredAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [userResults, setUserResults] = useState({});
    const [debugInfo, setDebugInfo] = useState(null);
    const [showDebug, setShowDebug] = useState(false);

    const categories = [
        { id: 'all', name: 'All Assessments', icon: Brain },
        { id: 'personality', name: 'Personality', icon: Star },
        { id: 'emotional_intelligence', name: 'EQ', icon: Brain },
        { id: 'leadership', name: 'Leadership', icon: Users },
        { id: 'communication', name: 'Communication', icon: FileText },
        { id: 'problem_solving', name: 'Problem Solving', icon: Brain },
        { id: 'team_collaboration', name: 'Team', icon: Users },
        { id: 'career_aptitude', name: 'Career', icon: TrendingUp }
    ];

    useEffect(() => {
        loadAssessments();
        loadUserResults();
        debugDatabase();
    }, []);

    useEffect(() => {
        filterAssessments();
    }, [assessments, searchQuery, selectedCategory]);

    // Debug function to check database content
    async function debugDatabase() {
        console.log("🔍 [DEBUG] Starting database diagnostic...");
        
        try {
            // Check assessments table
            const { data: assessmentsData, error: assessmentsError } = await supabase
                .from('assessments')
                .select('id, title, assessment_type, question_count, time_limit_minutes, is_active');
            
            console.log("📊 [DEBUG] Assessments in DB:", assessmentsData);
            if (assessmentsError) console.error("❌ [DEBUG] Assessments error:", assessmentsError);
            
            // Check questions count for each assessment
            if (assessmentsData && assessmentsData.length > 0) {
                for (const assessment of assessmentsData) {
                    const { count, error: countError } = await supabase
                        .from('assessment_questions')
                        .select('*', { count: 'exact', head: true })
                        .eq('assessment_id', assessment.id);
                    
                    console.log(`📝 [DEBUG] "${assessment.title}" has ${count || 0} questions`);
                    if (countError) console.error(`❌ [DEBUG] Questions error for ${assessment.title}:`, countError);
                }
            } else {
                console.warn("⚠️ [DEBUG] No assessments found in database!");
            }
            
            // Check user_results if user is logged in
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userResultsData, error: userResultsError } = await supabase
                    .from('user_assessments')
                    .select('assessment_id, percentage, status')
                    .eq('user_id', user.id);
                
                console.log("👤 [DEBUG] User results:", userResultsData);
                if (userResultsError) console.error("❌ [DEBUG] User results error:", userResultsError);
            }
            
            setDebugInfo({
                assessmentsCount: assessmentsData?.length || 0,
                assessmentsList: assessmentsData?.map(a => ({ 
                    title: a.title, 
                    questionCount: a.question_count,
                    isActive: a.is_active 
                })) || [],
                timestamp: new Date().toISOString()
            });
            
        } catch (err) {
            console.error("❌ [DEBUG] Unexpected error:", err);
            setDebugInfo({ error: err.message });
        }
    }

    async function loadAssessments() {
        try {
            setLoading(true);
            console.log("🔄 Loading assessments from Supabase...");
            
            const { data, error } = await supabase
                .from('assessments')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            
            console.log(`✅ Loaded ${data?.length || 0} assessments`);
            
            // Safe filtering - ensure valid data
            const safeData = (data || []).filter(a => a && a.id && a.title);
            setAssessments(safeData);
            setFilteredAssessments(safeData);
            
            if (safeData.length === 0) {
                console.warn("⚠️ No active assessments found. Check if assessments exist and is_active=true");
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

    async function loadUserResults() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        try {
            const { data, error } = await supabase
                .from('user_assessments')
                .select('assessment_id, score, percentage, completed_at, performance_level')
                .eq('user_id', user.id)
                .eq('status', 'completed');
            
            if (!error && data) {
                const resultsMap = {};
                data.forEach(r => {
                    resultsMap[r.assessment_id] = {
                        score: r.score,
                        percentage: r.percentage,
                        completed_at: r.completed_at,
                        performance_level: r.performance_level
                    };
                });
                setUserResults(resultsMap);
                console.log(`✅ Loaded ${data.length} user assessment results`);
            }
        } catch (err) {
            console.warn('Could not load user results:', err);
        }
    }

    function filterAssessments() {
        let filtered = [...assessments];
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a => 
                a.title?.toLowerCase().includes(query) ||
                a.description?.toLowerCase().includes(query)
            );
        }
        
        // Category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(a => a.assessment_type === selectedCategory);
        }
        
        // Safe sort with fallback
        filtered.sort((a, b) => {
            const titleA = a?.title || '';
            const titleB = b?.title || '';
            return titleA.localeCompare(titleB);
        });
        
        setFilteredAssessments(filtered);
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
        if (percentage >= 80) return { label: 'Excellent', color: 'bg-emerald-500/20 text-emerald-400' };
        if (percentage >= 60) return { label: 'Good', color: 'bg-blue-500/20 text-blue-400' };
        if (percentage >= 40) return { label: 'Average', color: 'bg-amber-500/20 text-amber-400' };
        return { label: 'Needs Improvement', color: 'bg-red-500/20 text-red-400' };
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Loading assessments...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Assessments</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
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

    return (
        <div className="min-h-screen bg-slate-950 py-12">
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
                    
                    {/* Debug Button (Admin only - optional) */}
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="mt-4 text-xs text-slate-500 hover:text-slate-400 transition flex items-center gap-1 mx-auto"
                    >
                        <BarChart3 className="w-3 h-3" />
                        {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
                    </button>
                </div>

                {/* Debug Panel */}
                {showDebug && debugInfo && (
                    <div className="mb-6 p-4 bg-slate-900/80 border border-slate-700 rounded-xl">
                        <h3 className="text-sm font-semibold text-primary-400 mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Database Diagnostic
                        </h3>
                        <div className="text-xs text-slate-400 space-y-1">
                            <p>📊 Total Assessments: {debugInfo.assessmentsCount}</p>
                            {debugInfo.assessmentsList?.map((a, i) => (
                                <p key={i} className="ml-4">
                                    • {a.title}: {a.questionCount} questions, {a.isActive ? '✅ Active' : '❌ Inactive'}
                                </p>
                            ))}
                            {debugInfo.assessmentsCount === 0 && (
                                <p className="text-amber-400 mt-2">
                                    ⚠️ No assessments found! Add assessments via Admin Panel or SQL.
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
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                                    selectedCategory === cat.id
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                <cat.icon className="w-4 h-4" />
                                {cat.name}
                            </button>
                        ))}
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
                        <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
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
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${performanceBadge.color}`}>
                                                    {performanceBadge.label}
                                                </span>
                                                <p className="text-lg font-bold text-white mt-1">{userResult.percentage}%</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{assessment.title}</h3>
                                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{assessment.description}</p>
                                    
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Clock className="w-4 h-4" />
                                            <span>{assessment.time_limit_minutes || 15} min</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <FileText className="w-4 h-4" />
                                            <span>{assessment.question_count || 20} questions</span>
                                        </div>
                                    </div>
                                    
                                    <Link to={`/assessments/${assessment.id}`}>
                                        <button className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition group-hover:shadow-lg group-hover:shadow-primary-500/20">
                                            {userResult ? 'Retake Assessment →' : 'Start Assessment →'}
                                        </button>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
