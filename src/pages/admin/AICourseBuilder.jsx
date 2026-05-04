// src/pages/admin/AICourseBuilder.jsx
// AI-Powered Course Builder for Admin/Trainer

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Sparkles, Loader2, BookOpen, Clock, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { autoCreateCourse, generateCourseAudio } from '../../services/courseBuilderService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AICourseBuilder() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      setError('Please enter a course topic');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setProgress('Creating course structure...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in as admin');
        setIsGenerating(false);
        return;
      }
      
      setProgress('Generating modules and lessons with AI...');
      
      const result = await autoCreateCourse(topic, description, user.id);
      
      if (result.success) {
        setSuccess(`Course "${topic}" created successfully!`);
        setProgress('');
        
        // Redirect to edit the new course
        setTimeout(() => {
          navigate(`/admin/courses/edit/${result.courseId}`);
        }, 2000);
      } else {
        setError(result.error || 'Failed to create course');
      }
      
    } catch (err) {
      console.error('Course creation error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Course Builder</h1>
          <p className="text-slate-400">
            Generate a complete course with AI-powered content, audio narration, and quizzes
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          
          {/* Topic */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Course Topic *</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., AI for HR Professionals, Leadership Skills, Data Analytics"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Enter a clear topic for the AI to generate content</p>
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Course Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              placeholder="Describe what students will learn in this course..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>
          
          {/* Difficulty */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          
          {/* Progress */}
          {progress && (
            <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                <p className="text-primary-400">{progress}</p>
              </div>
            </div>
          )}
          
          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}
          
          {/* Success */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-green-400">{success}</p>
              </div>
            </div>
          )}
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Course...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Course with AI
              </>
            )}
          </button>
          
          <p className="text-xs text-slate-500 text-center mt-4">
            AI will create: 4-6 modules, 12-18 lessons, audio narration, and quizzes
          </p>
          
        </form>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-center">
            <BookOpen className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">Structured Content</h3>
            <p className="text-xs text-slate-400">Modules, lessons, and quizzes</p>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-center">
            <Clock className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">Audio Narration</h3>
            <p className="text-xs text-slate-400">AI text-to-speech for every lesson</p>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-center">
            <Users className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">Certificates</h3>
            <p className="text-xs text-slate-400">Automatic upon completion</p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
