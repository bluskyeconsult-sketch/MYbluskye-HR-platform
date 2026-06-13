// src/pages/AssessmentResults.jsx
// ODUSBABA ASSESSMENT RESULTS PAGE v3.0 - PRODUCTION READY
// ✅ Complete results display
// ✅ AI-powered insights
// ✅ Report download & sharing (Unified API)
// ✅ Answer review section
// ✅ No external chart dependencies

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Award, Download, Share2, TrendingUp, CheckCircle, Loader2, 
    AlertCircle, BarChart3, FileText, Mail, Twitter, Linkedin,
    Printer, Star, ThumbsUp, Target, Zap, Shield, Users,
    Calendar, Clock, ChevronRight, Home, ChevronLeft, Sparkles,
    Brain, X
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/index';

// ============================================
// MAIN COMPONENT
// ============================================

export default function AssessmentResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [canDownload, setCanDownload] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [sharing, setSharing] = useState(false);

    // ============================================
    // LOAD RESULTS (Unified API)
    // ============================================

    useEffect(() => {
        loadResults();
    }, [id]);

    async function loadResults() {
        try {
            setLoading(true);
            
            // Get current user
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                navigate('/sign-in?redirect=/assessment-results/' + id);
                return;
            }
            setUser(authUser);
            
            // Get user profile for download eligibility
            const { data: profileData } = await supabase
                .from('profiles')
                .select('tier, user_type, full_name')
                .eq('id', authUser.id)
                .single();
            setProfile(profileData);
            
            // Check download eligibility
            const canDownloadTiers = ['registered', 'professional', 'employer', 'business', 'admin', 'super_admin'];
            const isAdmin = profileData?.user_type === 'admin' || profileData?.user_type === 'super_admin';
            setCanDownload(canDownloadTiers.includes(profileData?.tier) || isAdmin);
            
            // ✅ Using unified API for assessment results
            const session = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE}?action=assessment-results&id=${id}`, {
                headers: { 
                    'Authorization': `Bearer ${session.data.session?.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.data) {
                // Verify ownership
                if (data.data.user_id !== authUser.id && !isAdmin) {
                    throw new Error('Unauthorized access');
                }
                setResults(data.data);
            } else {
                throw new Error(data.error || 'Results not found');
            }
        } catch (err) {
            console.error('Error loading results:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // ============================================
    // DOWNLOAD REPORT (Unified API)
    // ============================================

    async function handleDownloadReport() {
        if (!canDownload) {
            alert('Upgrade to Professional to download reports');
            navigate('/pricing');
            return;
        }
        
        setDownloading(true);
        try {
            // ✅ Using unified API for report generation
            const session = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE}?action=assessment-generate-report`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.data.session?.access_token}`
                },
                body: JSON.stringify({
                    userAssessmentId: id,
                    userId: user?.id
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.reportUrl) {
                window.open(data.reportUrl, '_blank');
            } else {
                throw new Error(data.error || 'Failed to generate report');
            }
        } catch (err) {
            console.error('Error downloading report:', err);
            alert(err.message || 'Failed to generate report. Please try again.');
        } finally {
            setDownloading(false);
        }
    }

    // ============================================
    // SHARE FUNCTIONS
    // ============================================

    async function handleShare() {
        const shareUrl = `${window.location.origin}/assessment-results/${id}`;
        const shareText = `I scored ${results?.percentage}% on the ${results?.assessment?.title} assessment!`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My Assessment Results',
                    text: shareText,
                    url: shareUrl
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            navigator.clipboard.writeText(shareUrl);
            alert('Link copied to clipboard!');
        }
    }

    async function shareViaEmail() {
        if (!shareEmail.trim()) {
            alert('Please enter an email address');
            return;
        }
        
        setSharing(true);
        
        try {
            // ✅ Using unified API for sharing results
            const response = await fetch(`${API_BASE}?action=assessment-share-results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAssessmentId: id,
                    recipientEmail: shareEmail,
                    senderName: profile?.full_name || user?.email,
                    shareUrl: window.location.href
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Results shared with ${shareEmail}`);
                setShowShareModal(false);
                setShareEmail('');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Share error:', error);
            alert(error.message || 'Failed to share results');
        } finally {
            setSharing(false);
        }
    }

    function handlePrint() {
        window.print();
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function getPerformanceColor(percentage) {
        if (percentage >= 80) return 'emerald';
        if (percentage >= 60) return 'blue';
        if (percentage >= 40) return 'amber';
        return 'red';
    }

    function getPerformanceMessage(percentage, level) {
        if (percentage >= 80) return '🎉 Outstanding! You excelled in this assessment.';
        if (percentage >= 60) return '👍 Good job! You have solid understanding.';
        if (percentage >= 40) return '📚 Good start! Keep learning and improving.';
        return '💪 Room to grow! Review the recommendations below.';
    }

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Loading your results...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // ERROR STATE
    // ============================================

    if (error || !results) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Results Not Found</h1>
                    <p className="text-slate-400 mb-6">{error || 'Unable to load assessment results'}</p>
                    <Link to="/assessments" className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        <Home className="w-4 h-4" /> Browse Assessments
                    </Link>
                </div>
            </div>
        );
    }

    // ============================================
    // MAIN RENDER
    // ============================================

    const insights = results.insights || {};
    const dimensionScores = results.dimension_scores || {};
    const hasDimensions = Object.keys(dimensionScores).length > 0;
    const performanceColor = getPerformanceColor(results.percentage);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12 print:py-4 print:bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Back Button */}
                <Link to="/assessments" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition print:hidden">
                    <ChevronLeft className="w-4 h-4" /> Back to Assessments
                </Link>

                {/* Header */}
                <div className="text-center mb-8 print:mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20 print:shadow-none print:bg-gray-200">
                        <Award className="w-10 h-10 text-white print:text-gray-700" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 print:text-black">Your Assessment Results</h1>
                    <p className="text-slate-400 print:text-gray-600">{results.assessment?.title}</p>
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-500 print:text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(results.completed_at).toLocaleDateString()}</span>
                        <Clock className="w-3 h-3 ml-2" />
                        <span>{Math.floor(results.time_spent_seconds / 60)} min {results.time_spent_seconds % 60} sec</span>
                    </div>
                </div>

                {/* Score Card */}
                <div className={`bg-gradient-to-r from-${performanceColor}-900/30 to-${performanceColor}-800/30 border border-${performanceColor}-500/30 rounded-2xl p-8 text-center mb-8 print:bg-gray-100 print:border-gray-300`}>
                    <div className={`text-7xl font-bold text-${performanceColor}-400 mb-2 print:text-gray-800`}>
                        {results.percentage}%
                    </div>
                    <p className="text-slate-300 text-lg print:text-gray-600">Overall Score</p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm print:bg-gray-200 print:text-gray-700">
                        <Star className="w-3 h-3 fill-emerald-400" />
                        {results.performance_level?.toUpperCase()}
                    </div>
                    <p className="text-slate-400 mt-3 print:text-gray-600">
                        {getPerformanceMessage(results.percentage, results.performance_level)}
                    </p>
                    <p className="text-sm text-slate-500 mt-2 print:text-gray-500">
                        Score: {Math.round(results.score)} / {results.max_score}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
                        {canDownload && (
                            <button
                                onClick={handleDownloadReport}
                                disabled={downloading}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {downloading ? 'Generating...' : 'Download Report'}
                            </button>
                        )}
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                        >
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" /> Print
                        </button>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center print:bg-gray-100 print:border-gray-300">
                        <Clock className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white print:text-gray-800">{Math.floor(results.time_spent_seconds / 60)}m {results.time_spent_seconds % 60}s</p>
                        <p className="text-xs text-slate-500 print:text-gray-500">Time Spent</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center print:bg-gray-100 print:border-gray-300">
                        <FileText className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white print:text-gray-800">{results.answers?.length || 0}</p>
                        <p className="text-xs text-slate-500 print:text-gray-500">Questions</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center print:bg-gray-100 print:border-gray-300">
                        <Target className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white print:text-gray-800">{Math.round(results.score)}/{results.max_score}</p>
                        <p className="text-xs text-slate-500 print:text-gray-500">Points Earned</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center print:bg-gray-100 print:border-gray-300">
                        <Brain className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white print:text-gray-800">{hasDimensions ? Object.keys(dimensionScores).length : 0}</p>
                        <p className="text-xs text-slate-500 print:text-gray-500">Dimensions</p>
                    </div>
                </div>

                {/* AI Insights Section */}
                {(insights.summary || insights.strengths?.length > 0) && (
                    <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6 mb-8 print:bg-gray-100 print:border-gray-300">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-full print:bg-gray-300">
                                <Sparkles className="w-5 h-5 text-purple-400 print:text-gray-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-semibold mb-2 print:text-gray-800">AI-Powered Insights</h3>
                                {insights.summary && (
                                    <p className="text-slate-300 print:text-gray-600">{insights.summary}</p>
                                )}
                                
                                {insights.strengths?.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-emerald-400 text-sm font-medium mb-2 flex items-center gap-1 print:text-green-700">
                                            <CheckCircle className="w-3 h-3" /> Strengths
                                        </p>
                                        <ul className="space-y-1">
                                            {insights.strengths.map((s, i) => (
                                                <li key={i} className="flex items-start gap-2 text-slate-300 text-sm print:text-gray-700">
                                                    <Star className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {insights.improvements?.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-amber-400 text-sm font-medium mb-2 flex items-center gap-1 print:text-yellow-700">
                                            <AlertCircle className="w-3 h-3" /> Areas for Improvement
                                        </p>
                                        <ul className="space-y-1">
                                            {insights.improvements.map((i, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm print:text-gray-700">
                                                    <Target className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                                    {i}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {insights.recommendations?.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-primary-400 text-sm font-medium mb-2 flex items-center gap-1 print:text-blue-700">
                                            <Zap className="w-3 h-3" /> Recommendations
                                        </p>
                                        <ul className="space-y-1">
                                            {insights.recommendations.map((r, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm print:text-gray-700">
                                                    <ChevronRight className="w-3 h-3 text-primary-400 mt-0.5 flex-shrink-0" />
                                                    {r}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Dimension Scores */}
                {hasDimensions && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8 print:bg-gray-100 print:border-gray-300">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 print:text-gray-800">
                            <BarChart3 className="w-5 h-5 text-primary-400" />
                            Breakdown by Dimension
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(dimensionScores).map(([dimension, score]) => (
                                <div key={dimension}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-300 print:text-gray-700 capitalize">
                                            {dimension.replace(/_/g, ' ')}
                                        </span>
                                        <span className={`font-semibold text-${getPerformanceColor(score)}-400`}>{score}%</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2.5 print:bg-gray-300">
                                        <div 
                                            className={`h-2.5 rounded-full transition-all bg-${getPerformanceColor(score)}-500`}
                                            style={{ width: `${score}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 print:text-gray-500">
                                        {score >= 80 ? 'Excellent' : score >= 60 ? 'Proficient' : score >= 40 ? 'Developing' : 'Needs Improvement'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Answer Review Section */}
                {results.answers && results.answers.length > 0 && (
                    <details className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8 print:bg-gray-100 print:border-gray-300">
                        <summary className="text-white font-semibold cursor-pointer hover:text-primary-400 transition flex items-center gap-2 print:text-gray-800">
                            <FileText className="w-4 h-4" />
                            Review Your Answers
                        </summary>
                        <div className="mt-4 space-y-4">
                            {results.answers.slice(0, 10).map((answer, idx) => (
                                <div key={idx} className="border-b border-slate-800 pb-3 last:border-0 print:border-gray-300">
                                    <p className="text-white text-sm font-medium mb-1 print:text-gray-800">{answer.question_text}</p>
                                    <p className="text-slate-400 text-sm print:text-gray-600">
                                        Your answer: <span className="text-primary-400">{answer.user_answer}</span>
                                    </p>
                                    {answer.is_correct !== undefined && (
                                        <span className={`text-xs ${answer.is_correct ? 'text-emerald-400' : 'text-red-400'} print:${answer.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                                            {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                                        </span>
                                    )}
                                    {answer.score !== undefined && (
                                        <p className="text-xs text-slate-500 mt-1">Score: {answer.score}/{answer.max_score}</p>
                                    )}
                                </div>
                            ))}
                            {results.answers.length > 10 && (
                                <p className="text-center text-slate-500 text-sm">+ {results.answers.length - 10} more questions</p>
                            )}
                        </div>
                    </details>
                )}

                {/* Upgrade Prompt */}
                {!canDownload && (
                    <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center print:hidden">
                        <p className="text-amber-400 text-sm flex items-center justify-center gap-2">
                            <Shield className="w-4 h-4" />
                            Upgrade to Professional to download your report as PDF.
                            <Link to="/pricing" className="underline hover:text-amber-300 ml-1">Upgrade Now</Link>
                        </p>
                    </div>
                )}

                {/* Next Steps */}
                <div className="mt-8 p-6 bg-slate-900/30 border border-slate-800 rounded-xl text-center print:hidden">
                    <h3 className="text-white font-semibold mb-2">Ready to take the next step?</h3>
                    <p className="text-slate-400 text-sm mb-4">Based on your results, here are some recommended actions</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link to="/courses" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                            Browse Recommended Courses
                        </Link>
                        <Link to="/hire-va" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition">
                            Hire a Virtual Assistant
                        </Link>
                        <Link to="/assessments" className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition">
                            Take Another Assessment
                        </Link>
                    </div>
                </div>

                {/* Share Modal */}
                {showShareModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Share2 className="w-5 h-5 text-primary-400" />
                                    Share Your Results
                                </h3>
                                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <p className="text-slate-400 text-sm mb-4">
                                Share your assessment results with colleagues, mentors, or potential employers.
                            </p>
                            
                            <div className="flex gap-3 mb-4">
                                <button
                                    onClick={() => {
                                        const text = `I scored ${results.percentage}% on the ${results.assessment?.title} assessment!`;
                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
                                    }}
                                    className="flex-1 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center justify-center gap-2"
                                >
                                    <Twitter className="w-4 h-4" /> Twitter
                                </button>
                                <button
                                    onClick={() => {
                                        const text = `I scored ${results.percentage}% on the ${results.assessment?.title} assessment. Check out my results!`;
                                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(text)}`, '_blank');
                                    }}
                                    className="flex-1 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition flex items-center justify-center gap-2"
                                >
                                    <Linkedin className="w-4 h-4" /> LinkedIn
                                </button>
                            </div>
                            
                            <div className="border-t border-slate-700 pt-4">
                                <label className="block text-sm text-slate-400 mb-2">Or share via email</label>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={shareEmail}
                                        onChange={(e) => setShareEmail(e.target.value)}
                                        placeholder="colleague@example.com"
                                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <button
                                        onClick={shareViaEmail}
                                        disabled={sharing}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
