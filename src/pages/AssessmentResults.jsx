// src/pages/AssessmentResults.jsx
// COMPLETE PROFESSIONAL ASSESSMENT RESULTS PAGE - With unified API, report download, sharing, and detailed insights

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Award, Download, Share2, TrendingUp, CheckCircle, Loader2, 
    AlertCircle, BarChart3, FileText, Mail, Twitter, Linkedin,
    Printer, Star, ThumbsUp, Target, Zap, Shield, Users,
    Calendar, Clock, ChevronRight, Home
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
);

export default function AssessmentResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [canDownload, setCanDownload] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        loadResult();
    }, [id]);

    async function loadResult() {
        try {
            setLoading(true);
            
            // Get current user
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                navigate('/sign-in?redirect=/assessment-results/' + id);
                return;
            }
            setUser(authUser);
            
            // Get user profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();
            setProfile(profileData);
            
            // Check download eligibility
            const canDownloadTiers = ['registered', 'professional', 'employer', 'business', 'admin', 'super_admin'];
            const isAdmin = profileData?.user_type === 'admin' || profileData?.user_type === 'super_admin';
            setCanDownload(canDownloadTiers.includes(profileData?.tier) || isAdmin);
            
            // ✅ Using unified API
            const response = await fetch(`/api/index?action=assessment-results&id=${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (!data.success) throw new Error(data.error);
            
            // Verify ownership
            if (data.data.user_id !== authUser.id && !isAdmin) {
                throw new Error('Unauthorized access');
            }
            
            setResult(data.data);
            
        } catch (error) {
            console.error('Error loading result:', error);
            toast.error(error.message || 'Failed to load results');
        } finally {
            setLoading(false);
        }
    }

    async function downloadReport() {
        if (!canDownload) {
            toast.error('Upgrade to Professional to download reports');
            navigate('/pricing');
            return;
        }
        
        setDownloading(true);
        
        try {
            // ✅ Using unified API for report generation
            const response = await fetch('/api/index?action=assessment-generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAssessmentId: id, userId: user?.id })
            });
            
            const data = await response.json();
            
            if (data.success && data.reportUrl) {
                window.open(data.reportUrl, '_blank');
                toast.success('Report generated successfully');
            } else {
                throw new Error(data.error || 'Failed to generate report');
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.error(error.message || 'Failed to generate report');
        } finally {
            setDownloading(false);
        }
    }

    async function shareViaEmail() {
        if (!shareEmail.trim()) {
            toast.error('Please enter an email address');
            return;
        }
        
        setSharing(true);
        
        try {
            // ✅ Using unified API for email sharing
            const response = await fetch('/api/index?action=assessment-share-results', {
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
                toast.success(`Results shared with ${shareEmail}`);
                setShowShareModal(false);
                setShareEmail('');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Share error:', error);
            toast.error(error.message || 'Failed to share results');
        } finally {
            setSharing(false);
        }
    }

    function handlePrint() {
        window.print();
    }

    function getPerformanceColor(percentage) {
        if (percentage >= 80) return 'text-emerald-400';
        if (percentage >= 60) return 'text-blue-400';
        if (percentage >= 40) return 'text-amber-400';
        return 'text-red-400';
    }

    function getPerformanceIcon(percentage) {
        if (percentage >= 80) return <Award className="w-6 h-6 text-emerald-400" />;
        if (percentage >= 60) return <ThumbsUp className="w-6 h-6 text-blue-400" />;
        if (percentage >= 40) return <Target className="w-6 h-6 text-amber-400" />;
        return <Zap className="w-6 h-6 text-red-400" />;
    }

    function getPerformanceMessage(percentage, level) {
        if (percentage >= 80) return '🎉 Outstanding! You excelled in this assessment.';
        if (percentage >= 60) return '👍 Good job! You have solid understanding.';
        if (percentage >= 40) return '📚 Good start! Keep learning and improving.';
        return '💪 Room to grow! Review the recommendations below.';
    }

    // Prepare chart data
    const dimensionScores = result?.dimension_scores || {};
    const dimensionNames = Object.keys(dimensionScores);
    const dimensionValues = Object.values(dimensionScores);
    
    const radarData = {
        labels: dimensionNames.map(d => d.replace(/_/g, ' ').toUpperCase()),
        datasets: [
            {
                label: 'Your Score',
                data: dimensionValues,
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                borderColor: 'rgba(14, 165, 233, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(14, 165, 233, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(14, 165, 233, 1)',
            },
            {
                label: 'Average Benchmark',
                data: dimensionValues.map(() => 60),
                backgroundColor: 'rgba(100, 116, 139, 0.2)',
                borderColor: 'rgba(100, 116, 139, 0.5)',
                borderWidth: 1,
                pointBackgroundColor: 'rgba(100, 116, 139, 0.5)',
                pointBorderColor: '#fff',
            }
        ]
    };
    
    const barData = {
        labels: dimensionNames.map(d => d.replace(/_/g, ' ').toUpperCase()),
        datasets: [
            {
                label: 'Score (%)',
                data: dimensionValues,
                backgroundColor: dimensionValues.map(v => 
                    v >= 80 ? 'rgba(16, 185, 129, 0.6)' :
                    v >= 60 ? 'rgba(59, 130, 246, 0.6)' :
                    v >= 40 ? 'rgba(245, 158, 11, 0.6)' :
                    'rgba(239, 68, 68, 0.6)'
                ),
                borderColor: dimensionValues.map(v => 
                    v >= 80 ? 'rgb(16, 185, 129)' :
                    v >= 60 ? 'rgb(59, 130, 246)' :
                    v >= 40 ? 'rgb(245, 158, 11)' :
                    'rgb(239, 68, 68)'
                ),
                borderWidth: 1,
                borderRadius: 8,
            }
        ]
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            r: {
                beginAtZero: true,
                max: 100,
                ticks: { stepSize: 20, color: '#94a3b8' },
                grid: { color: '#1e293b' }
            },
            y: {
                beginAtZero: true,
                max: 100,
                ticks: { stepSize: 20, color: '#94a3b8' },
                grid: { color: '#1e293b' }
            },
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: '#1e293b' }
            }
        },
        plugins: {
            legend: { labels: { color: '#cbd5e1' } },
            tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#94a3b8' }
        }
    };

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

    if (!result) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Result Not Found</h1>
                    <p className="text-slate-400 mb-6">We couldn't find your assessment results.</p>
                    <Link to="/assessments" className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        <Home className="w-4 h-4" /> Browse Assessments
                    </Link>
                </div>
            </div>
        );
    }

    const insights = result.insights || {};
    const dimensionScoresObj = result.dimension_scores || {};
    const hasDimensions = Object.keys(dimensionScoresObj).length > 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12 print:py-4 print:bg-white">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8 print:mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20 print:shadow-none print:bg-gray-200">
                        <Award className="w-10 h-10 text-white print:text-gray-700" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 print:text-black">Your Assessment Results</h1>
                    <p className="text-slate-400 print:text-gray-600">{result.assessment?.title}</p>
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-500 print:text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(result.completed_at).toLocaleDateString()}</span>
                        <Clock className="w-3 h-3 ml-2" />
                        <span>{Math.floor(result.time_spent_seconds / 60)} min {result.time_spent_seconds % 60} sec</span>
                    </div>
                </div>

                {/* Score Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center mb-6 print:bg-gray-100 print:border-gray-300">
                    <div className="relative inline-block">
                        <div className={`text-7xl font-bold ${getPerformanceColor(result.percentage)} mb-2`}>
                            {result.percentage}%
                        </div>
                        {getPerformanceIcon(result.percentage)}
                    </div>
                    <div className="text-xl text-white mb-2 print:text-black">
                        {result.performance_level === 'excellent' && '🎉 Excellent Performance!'}
                        {result.performance_level === 'good' && '👍 Good Work!'}
                        {result.performance_level === 'average' && '📚 Good Start!'}
                        {result.performance_level === 'needs_improvement' && '💪 Room to Grow!'}
                    </div>
                    <p className="text-slate-400 print:text-gray-600">
                        {getPerformanceMessage(result.percentage, result.performance_level)}
                    </p>
                    <p className="text-sm text-slate-500 mt-2 print:text-gray-500">
                        Score: {result.score} / {result.max_score}
                    </p>
                </div>

                {/* Chart Visualization */}
                {hasDimensions && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6 print:bg-gray-100 print:border-gray-300">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 print:text-black">
                            <BarChart3 className="w-5 h-5 text-primary-400" />
                            Performance Overview
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="h-80">
                                <Radar data={radarData} options={chartOptions} />
                            </div>
                            <div className="h-80">
                                <Bar data={barData} options={chartOptions} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Dimension Scores */}
                {hasDimensions && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6 print:bg-gray-100 print:border-gray-300">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 print:text-black">
                            <Target className="w-5 h-5 text-primary-400" />
                            Breakdown by Dimension
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(dimensionScoresObj).map(([dimension, score]) => (
                                <div key={dimension}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-300 print:text-gray-700">
                                            {dimension.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                        <span className={`font-semibold ${getPerformanceColor(score)}`}>{score}%</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2.5 print:bg-gray-300">
                                        <div 
                                            className={`h-2.5 rounded-full transition-all ${
                                                score >= 80 ? 'bg-emerald-500' :
                                                score >= 60 ? 'bg-blue-500' :
                                                score >= 40 ? 'bg-amber-500' :
                                                'bg-red-500'
                                            }`}
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

                {/* Strengths */}
                {insights.strengths?.length > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 mb-6 print:bg-green-50 print:border-green-200">
                        <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2 print:text-green-700">
                            <CheckCircle className="w-5 h-5" /> Your Strengths
                        </h3>
                        <ul className="space-y-2">
                            {insights.strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-slate-300 print:text-gray-700">
                                    <Star className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Areas for Improvement */}
                {insights.improvements?.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-6 print:bg-yellow-50 print:border-yellow-200">
                        <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2 print:text-yellow-700">
                            <Target className="w-5 h-5" /> Areas for Improvement
                        </h3>
                        <ul className="space-y-2">
                            {insights.improvements.map((i, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-slate-300 print:text-gray-700">
                                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                    {i}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Recommendations */}
                {insights.recommendations?.length > 0 && (
                    <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-6 mb-6 print:bg-blue-50 print:border-blue-200">
                        <h3 className="text-lg font-semibold text-primary-400 mb-3 flex items-center gap-2 print:text-blue-700">
                            <TrendingUp className="w-5 h-5" /> Personalized Recommendations
                        </h3>
                        <ul className="space-y-2">
                            {insights.recommendations.map((r, i) => (
                                <li key={i} className="flex items-start gap-2 text-slate-300 print:text-gray-700">
                                    <ChevronRight className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                                    {r}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Answer Review Section (if answers are available) */}
                {result.answers && result.answers.length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6 print:bg-gray-100 print:border-gray-300">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 print:text-black">
                            <FileText className="w-5 h-5 text-primary-400" />
                            Answer Review
                        </h3>
                        <details className="cursor-pointer">
                            <summary className="text-primary-400 hover:text-primary-300 transition">
                                View detailed answer analysis
                            </summary>
                            <div className="mt-4 space-y-4">
                                {result.answers.slice(0, 5).map((answer, idx) => (
                                    <div key={idx} className="p-3 bg-slate-800/50 rounded-lg">
                                        <p className="text-white text-sm font-medium mb-1">Question {idx + 1}</p>
                                        <p className="text-slate-300 text-sm">{answer.question_text}</p>
                                        <p className="text-slate-400 text-xs mt-2">
                                            Your answer: <span className="text-primary-400">{answer.user_answer}</span>
                                        </p>
                                        {answer.is_correct !== undefined && (
                                            <span className={`text-xs mt-1 inline-block ${answer.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {result.answers.length > 5 && (
                                    <p className="text-center text-slate-500 text-sm">+ {result.answers.length - 5} more answers</p>
                                )}
                            </div>
                        </details>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-4 justify-center print:hidden">
                    {canDownload && (
                        <button
                            onClick={downloadReport}
                            disabled={downloading}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {downloading ? 'Generating...' : 'Download Report (PDF)'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                    >
                        <Share2 className="w-4 h-4" /> Share Results
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <Link to="/assessments" className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2">
                        Take Another Assessment
                    </Link>
                </div>

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
                                        const text = `I scored ${result.percentage}% on the ${result.assessment?.title} assessment!`;
                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
                                    }}
                                    className="flex-1 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center justify-center gap-2"
                                >
                                    <Twitter className="w-4 h-4" /> Twitter
                                </button>
                                <button
                                    onClick={() => {
                                        const text = `I scored ${result.percentage}% on the ${result.assessment?.title} assessment. Check out my results!`;
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

// Import missing icon
import { X } from 'lucide-react';
