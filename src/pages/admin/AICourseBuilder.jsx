import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Sparkles, Loader2, BookOpen, Clock, Users, AlertCircle } from 'lucide-react';
import { autoCreateCourse, generateCourseAudio } from '../../services/courseBuilderService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AICourseBuilder() {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('intermediate');
    const [durationHours, setDurationHours] = useState(5);
    const [targetAudience, setTargetAudience] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [audioGenerating, setAudioGenerating] = useState(false);
    const [audioResult, setAudioResult] = useState(null);

    async function handleGenerateCourse(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        const { data: { user } } = await supabase.auth.getUser();
        
        const response = await autoCreateCourse(topic, level, durationHours, targetAudience, user?.id);
        
        if (response.success) {
            setResult({ courseId: response.courseId, message: response.message });
            setTopic('');
            setTargetAudience('');
        } else {
            setError(response.error);
        }
        setLoading(false);
    }

    async function handleGenerateAudio(courseId) {
        setAudioGenerating(true);
        setAudioResult(null);
        
        const response = await generateCourseAudio(courseId);
        
        setAudioResult(response);
        setAudioGenerating(false);
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-white mb-2">AI Course Builder</h1>
                <p className="text-slate-400 mb-8">Generate complete courses using AI in minutes</p>

                {/* Course Generation Form */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Create New Course with AI
                    </h2>
                    
                    <form onSubmit={handleGenerateCourse} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Course Topic</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., Python Programming, Project Management, Digital Marketing"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Difficulty Level</label>
                                <select
                                    value={level}
                                    onChange={(e) => setLevel(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                    <option value="expert">Expert</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Duration (hours)</label>
                                <input
                                    type="number"
                                    value={durationHours}
                                    onChange={(e) => setDurationHours(parseInt(e.target.value))}
                                    min="1"
                                    max="100"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Target Audience</label>
                            <textarea
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                placeholder="e.g., Beginners with no prior experience, professionals looking to upskill..."
                                rows={3}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                required
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {loading ? 'Generating Course...' : 'Generate Course with AI'}
                        </button>
                    </form>
                    
                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    
                    {result && (
                        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <p className="text-emerald-400 font-semibold">✅ {result.message}</p>
                            <div className="flex gap-3 mt-3">
                                <a href={`/admin/courses/${result.courseId}`} className="px-3 py-1 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600">
                                    Edit Course
                                </a>
                                <button
                                    onClick={() => handleGenerateAudio(result.courseId)}
                                    disabled={audioGenerating}
                                    className="px-3 py-1 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-500 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {audioGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Audio'}
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {audioResult && (
                        <div className="mt-4 p-4 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                            <p className="text-sky-400">🎧 Audio Generation Complete: {audioResult.succeeded} of {audioResult.total} lessons</p>
                            {audioResult.failed > 0 && (
                                <p className="text-amber-400 text-sm mt-1">⚠️ {audioResult.failed} lessons failed. You can retry manually.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                    <h3 className="text-primary-400 font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> How AI Course Builder Works
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                        <li>AI generates complete course outline with modules and lessons</li>
                        <li>Each lesson includes detailed content, examples, and quiz questions</li>
                        <li>Course is saved as DRAFT (review before publishing)</li>
                        <li>You can edit, add videos, or regenerate sections</li>
                        <li>Click "Generate Audio" to add text-to-speech narration</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
