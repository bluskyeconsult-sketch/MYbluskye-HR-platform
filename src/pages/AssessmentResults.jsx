// src/pages/AssessmentResults.jsx
// Assessment Results Page with Report Download

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Award, Download, Share2, TrendingUp, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function AssessmentResults() {
    const { id } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [user, setUser] = useState(null);
    const [canDownload, setCanDownload] = useState(false);

    useEffect(() => {
        loadResult();
    }, [id]);

    async function loadResult() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        const { data, error } = await supabase
            .from('user_assessments')
            .select('*, assessment:assessments(*)')
            .eq('id', id)
            .eq('user_id', user?.id)
            .single();
        
        if (error) {
            console.error('Error loading result:', error);
        } else {
            setResult(data);
            
            // Check if user can download based on tier
            const { data: profile } = await supabase
                .from('profiles')
                .select('tier')
                .eq('id', user?.id)
                .single();
            
            const canDownloadTiers = ['registered', 'professional', 'employer', 'business'];
            setCanDownload(canDownloadTiers.includes(profile?.tier));
        }
        setLoading(false);
    }

    async function downloadReport() {
        if (!canDownload) {
            alert('Upgrade to Professional to download reports');
            return;
        }
        
        setDownloading(true);
        
        // Generate report (call API)
        const response = await fetch('/api/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAssessmentId: id })
        });
        
        const data = await response.json();
        
        if (data.reportUrl) {
            window.open(data.reportUrl, '_blank');
        }
        setDownloading(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Result Not Found</h1>
                    <Link to="/assessments" className="text-primary-400 hover:underline">Browse Assessments</Link>
                </div>
            </div>
        );
    }

    const insights = result.insights || {};
    const dimensionScores = result.dimension_scores || {};

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Award className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Your Assessment Results</h1>
                    <p className="text-slate-400">{result.assessment?.title}</p>
                </div>

                {/* Score Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center mb-6">
                    <div className="text-6xl font-bold text-primary-400 mb-2">{result.percentage}%</div>
                    <div className="text-xl text-white mb-2">
                        {result.performance_level === 'excellent' && '🎉 Excellent Performance!'}
                        {result.performance_level === 'good' && '👍 Good Work!'}
                        {result.performance_level === 'average' && '📚 Good Start!'}
                        {result.performance_level === 'needs_improvement' && '💪 Room to Grow!'}
                    </div>
                    <p className="text-slate-400">{insights.summary || `You scored ${result.percentage}% on this assessment.`}</p>
                </div>

                {/* Dimension Scores */}
                {Object.keys(dimensionScores).length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Breakdown by Dimension</h3>
                        {Object.entries(dimensionScores).map(([dimension, score]) => (
                            <div key={dimension} className="mb-3">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-300">{dimension.replace(/_/g, ' ').toUpperCase()}</span>
                                    <span className="text-white">{score}%</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${score}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Insights */}
                {insights.strengths?.length > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" /> Your Strengths
                        </h3>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                            {insights.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                )}

                {insights.recommendations?.length > 0 && (
                    <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-semibold text-primary-400 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" /> Recommendations
                        </h3>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                            {insights.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-4 justify-center">
                    {canDownload && (
                        <button
                            onClick={downloadReport}
                            disabled={downloading}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                        >
                            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download Report
                        </button>
                    )}
                    <button
                        onClick={() => navigator.share?.({ title: 'ODUSBABA Assessment Results', text: `I scored ${result.percentage}% on ${result.assessment?.title}` })}
                        className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 flex items-center gap-2"
                    >
                        <Share2 className="w-4 h-4" /> Share Results
                    </button>
                    <Link to="/assessments" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Take Another Assessment
                    </Link>
                </div>

                {!canDownload && (
                    <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                        <p className="text-amber-400 text-sm">
                            Upgrade to Professional to download your report as PDF.
                            <Link to="/pricing" className="underline ml-2">Upgrade Now</Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
