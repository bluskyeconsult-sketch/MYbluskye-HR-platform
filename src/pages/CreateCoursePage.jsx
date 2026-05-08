// src/pages/CreateCoursePage.jsx
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CreateCoursePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiIdea, setAiIdea] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'beginner',
    duration_minutes: 60,
    price: 0,
    thumbnail_url: '',
    status: 'draft'
  });

  const generateWithAI = async () => {
    if (!aiIdea.trim()) {
      toast.error('Please describe your course idea');
      return;
    }

    setAiGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const words = aiIdea.split(' ').slice(0, 5).join(' ');
      setFormData({
        ...formData,
        title: `${words} - Complete Masterclass`,
        description: `This comprehensive course covers everything you need to know about ${aiIdea}. Learn from industry experts and gain practical skills. Includes hands-on projects and real-world examples.`,
        level: 'beginner',
        duration_minutes: 120,
        price: 0
      });
      setShowAiModal(false);
      setAiIdea('');
      toast.success('AI generated course content!');
      setAiGenerating(false);
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Course title is required');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create a course');
        navigate('/sign-in');
        return;
      }

      const { error } = await supabase.from('courses').insert({
        ...formData,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      
      toast.success('Course created successfully!');
      navigate('/courses');
    } catch (err) {
      console.error('Error creating course:', err);
      toast.error('Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <button onClick={() => navigate('/courses')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </button>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Create New Course</h1>
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500"
            >
              <Sparkles className="w-4 h-4" />
              AI Assist
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Course Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Complete Web Development Bootcamp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="What will students learn in this course?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Thumbnail URL (Optional)</label>
              <input
                type="text"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Creating...' : 'Create Course'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/courses')}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Course Assistant
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Describe your course idea, and AI will generate the title and description for you.
            </p>
            <textarea
              value={aiIdea}
              onChange={(e) => setAiIdea(e.target.value)}
              placeholder="e.g., Create a beginner-friendly course about Python programming for data science..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={generateWithAI}
                disabled={aiGenerating}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate
              </button>
              <button
                onClick={() => setShowAiModal(false)}
                className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
