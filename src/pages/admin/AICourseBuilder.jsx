// src/pages/admin/AICourseBuilder.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Sparkles, Loader2, BookOpen, Clock, Users, 
  CheckCircle, XCircle, ChevronRight, Save,
  Plus, Trash2, Edit, Eye, EyeOff, TrendingUp,
  FileText, Video, HelpCircle, Award, Zap
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { generateCourseOutline, generateModuleContent, generateQuiz, getTrendingTopics, analyzeLearningProgress } from '../../services/courseAIService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AICourseBuilder() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [courseData, setCourseData] = useState({
    topic: '',
    level: 'beginner',
    targetAudience: 'general',
    title: '',
    description: '',
    modules: [],
    totalDuration: 0
  });
  const [generatedCourse, setGeneratedCourse] = useState(null);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [expandedModule, setExpandedModule] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
    loadTrendingTopics();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        window.location.href = '/dashboard';
        return;
      }
      
      setIsAuthorized(true);
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadTrendingTopics() {
    const topics = await getTrendingTopics('technology');
    setTrendingTopics(topics);
  }

  async function generateCourse() {
    if (!courseData.topic.trim()) {
      toast.error('Please enter a course topic');
      return;
    }
    
    setGenerating(true);
    toast.loading('AI is designing your course...', { id: 'generate' });
    
    try {
      const result = await generateCourseOutline(
        courseData.topic,
        courseData.level,
        courseData.targetAudience
      );
      
      setGeneratedCourse(result);
      setCourseData({
        ...courseData,
        title: result.title,
        description: result.description,
        modules: result.modules,
        totalDuration: result.estimatedDuration
      });
      setStep(2);
      toast.success('Course outline generated!', { id: 'generate' });
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('Failed to generate course', { id: 'generate' });
    } finally {
      setGenerating(false);
    }
  }

  async function generateModuleContents() {
    setLoading(true);
    toast.loading('Generating module content...', { id: 'modules' });
    
    try {
      const updatedModules = [];
      for (const module of courseData.modules) {
        const content = await generateModuleContent(
          module.title,
          module.description,
          courseData.topic
        );
        updatedModules.push({ ...module, ...content });
      }
      
      setCourseData({ ...courseData, modules: updatedModules });
      setStep(3);
      toast.success('Module content generated!', { id: 'modules' });
    } catch (err) {
      console.error('Module generation error:', err);
      toast.error('Failed to generate module content', { id: 'modules' });
    } finally {
      setLoading(false);
    }
  }

  async function generateModuleQuiz(moduleIndex) {
    const module = courseData.modules[moduleIndex];
    if (!module) return;
    
    toast.loading(`Generating quiz for ${module.title}...`, { id: 'quiz' });
    
    try {
      const quiz = await generateQuiz(moduleIndex, module.content || module.description);
      const updatedModules = [...courseData.modules];
      updatedModules[moduleIndex] = { ...module, quiz };
      setCourseData({ ...courseData, modules: updatedModules });
      toast.success('Quiz generated!', { id: 'quiz' });
    } catch (err) {
      console.error('Quiz generation error:', err);
      toast.error('Failed to generate quiz', { id: 'quiz' });
    }
  }

  async function publishCourse() {
    setPublishing(true);
    toast.loading('Publishing course...', { id: 'publish' });
    
    try {
      // Insert course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: courseData.title,
          description: courseData.description,
          level: courseData.level,
          duration_minutes: courseData.totalDuration,
          price: 0,
          status: 'published',
          created_by: user?.id,
          ai_generated: true,
          topic: courseData.topic
        })
        .select()
        .single();
      
      if (courseError) throw courseError;
      
      // Insert modules
      for (let i = 0; i < courseData.modules.length; i++) {
        const module = courseData.modules[i];
        const { error: moduleError } = await supabase
          .from('course_modules')
          .insert({
            course_id: course.id,
            title: module.title,
            description: module.description,
            content: module.content || '',
            order_index: i,
            duration_minutes: module.estimatedMinutes || 30
          });
        
        if (moduleError) throw moduleError;
        
        // Insert quiz if exists
        if (module.quiz) {
          const { error: quizError } = await supabase
            .from('course_quizzes')
            .insert({
              module_id: module.id,
              questions: module.quiz.questions,
              passing_score: module.quiz.passingScore
            });
          
          if (quizError) throw quizError;
        }
      }
      
      toast.success('Course published successfully!', { id: 'publish' });
      setTimeout(() => {
        window.location.href = '/admin/courses';
      }, 2000);
    } catch (err) {
      console.error('Publish error:', err);
      toast.error('Failed to publish course', { id: 'publish' });
    } finally {
      setPublishing(false);
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary-400" />
            AI Course Builder
          </h1>
          <p className="text-slate-400 mt-2">Create professional courses powered by artificial intelligence</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 max-w-2xl">
          {[
            { step: 1, label: 'Define Topic', icon: FileText },
            { step: 2, label: 'Review Outline', icon: BookOpen },
            { step: 3, label: 'Generate Content', icon: Sparkles },
            { step: 4, label: 'Publish', icon: Rocket }
          ].map((s) => (
            <div key={s.step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s.step ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {step > s.step ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={`ml-2 text-sm ${step >= s.step ? 'text-white' : 'text-slate-500'}`}>
                {s.label}
              </span>
              {s.step < 4 && <div className={`w-16 h-0.5 mx-2 ${step > s.step ? 'bg-primary-500' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Topic Definition */}
        {step === 1 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-4">What course would you like to create?</h2>
              <p className="text-slate-400 mb-6">Our AI will generate a complete course outline, content, and assessments.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Course Topic *</label>
                  <input
                    type="text"
                    value={courseData.topic}
                    onChange={(e) => setCourseData({ ...courseData, topic: e.target.value })}
                    placeholder="e.g., Python Programming for Data Science"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Level</label>
                    <select
                      value={courseData.level}
                      onChange={(e) => setCourseData({ ...courseData, level: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Target Audience</label>
                    <select
                      value={courseData.targetAudience}
                      onChange={(e) => setCourseData({ ...courseData, targetAudience: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    >
                      <option value="general">General Public</option>
                      <option value="students">Students</option>
                      <option value="professionals">Working Professionals</option>
                      <option value="executives">Executives</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Trending Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {trendingTopics.slice(0, 8).map((topic) => (
                      <button
                        key={topic}
                        onClick={() => setCourseData({ ...courseData, topic })}
                        className="px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition"
                      >
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={generateCourse}
                  disabled={generating || !courseData.topic}
                  className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {generating ? 'Generating Course...' : 'Generate Course Outline'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review Outline */}
        {step === 2 && generatedCourse && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-2">{generatedCourse.title}</h2>
              <p className="text-slate-400 mb-4">{generatedCourse.description}</p>
              
              <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-slate-800">
                <span className="flex items-center gap-2 text-slate-400"><Clock className="w-4 h-4" /> {generatedCourse.estimatedDuration} min</span>
                <span className="flex items-center gap-2 text-slate-400"><BookOpen className="w-4 h-4" /> {generatedCourse.totalModules} modules</span>
                <span className="flex items-center gap-2 text-slate-400"><Users className="w-4 h-4" /> {generatedCourse.targetAudience}</span>
                <span className="flex items-center gap-2 text-slate-400"><Award className="w-4 h-4" /> Certificate included</span>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-3">Course Modules</h3>
              <div className="space-y-3">
                {generatedCourse.modules.map((module, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-white">Module {idx + 1}: {module.title}</h4>
                        <p className="text-sm text-slate-400 mt-1">{module.description}</p>
                      </div>
                      <span className="text-sm text-slate-500">{module.estimatedMinutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
                Back
              </button>
              <button onClick={generateModuleContents} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center gap-2">
                Continue to Content Generation <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Content Generation */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Course Content</h2>
              <p className="text-slate-400 mb-6">Review and edit the AI-generated content for each module.</p>
              
              <div className="space-y-4">
                {courseData.modules.map((module, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedModule(expandedModule === idx ? null : idx)}
                      className="w-full p-4 flex justify-between items-center hover:bg-slate-800/80 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                          <span className="text-primary-400 font-bold">{idx + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-white text-left">{module.title}</h3>
                          <p className="text-sm text-slate-400 text-left">{module.estimatedMinutes} min</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expandedModule === idx ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {expandedModule === idx && (
                      <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Content</label>
                          <textarea
                            value={module.content || ''}
                            onChange={(e) => {
                              const updatedModules = [...courseData.modules];
                              updatedModules[idx].content = e.target.value;
                              setCourseData({ ...courseData, modules: updatedModules });
                            }}
                            rows={6}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                          />
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            onClick={() => generateModuleQuiz(idx)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 flex items-center gap-2"
                          >
                            <HelpCircle className="w-4 h-4" />
                            Generate Quiz
                          </button>
                        </div>
                        
                        {module.quiz && (
                          <div className="bg-slate-900/50 rounded-lg p-4">
                            <h4 className="font-medium text-white mb-2">Quiz Questions</h4>
                            <div className="space-y-3">
                              {module.quiz.questions?.map((q, qIdx) => (
                                <div key={qIdx} className="text-sm">
                                  <p className="text-white">{qIdx + 1}. {q.text}</p>
                                  <p className="text-slate-400 ml-4">✓ {q.correctAnswer}</p>
                                  <p className="text-xs text-slate-500 ml-4">{q.explanation}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
                Back
              </button>
              <button onClick={publishCourse} disabled={publishing} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center gap-2">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Publish Course
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
