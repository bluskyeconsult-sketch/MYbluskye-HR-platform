// src/pages/admin/AdminCourses.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, GraduationCap, Search, RefreshCw, Loader2, AlertCircle, CheckCircle, X, Save, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import AIAssistButton from '../../components/AIAssistButton';
import { useAIAssist } from '../../hooks/useAIAssist';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiIdea, setAiIdea] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', level: 'beginner', duration_minutes: 60, price: 0, thumbnail_url: '', status: 'draft'
  });
  const [modules, setModules] = useState([]);

  const { generateCourseContent, loading: aiLoading } = useAIAssist();
  const itemsPerPage = 20;
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];

  // Load courses on mount
  useEffect(() => { loadCourses(); }, []);

  async function loadCourses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      setError('Failed to load courses');
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  async function handleAIGenerate() {
    if (!aiIdea.trim()) {
      toast.error('Please enter a course idea');
      return;
    }
    
    const result = await generateCourseContent(aiIdea);
    
    if (result.success) {
      setFormData({
        ...formData,
        title: result.data.title,
        description: result.data.description,
        level: result.data.level || 'beginner',
        category: result.data.category || 'technology'
      });
      if (result.data.modules) {
        setModules(result.data.modules.map((m, idx) => ({ ...m, order_index: idx })));
      }
      setShowAiModal(false);
      setAiIdea('');
      toast.success('Course content generated! Review and adjust as needed.');
    } else {
      toast.error('Failed to generate content. Please try again.');
    }
  }

  async function saveCourse() {
    if (!formData.title.trim()) { toast.error('Title is required'); return; }
    if (formData.price < 0) { toast.error('Price cannot be negative'); return; }
    
    try {
      const courseData = { ...formData, price: parseFloat(formData.price), duration_minutes: parseInt(formData.duration_minutes) };
      
      if (editing) {
        await supabase.from('courses').update(courseData).eq('id', editing);
        toast.success('Course updated');
      } else {
        const { data: newCourse } = await supabase.from('courses').insert(courseData).select().single();
        // Save modules if any
        for (const module of modules) {
          await supabase.from('course_modules').insert({ ...module, course_id: newCourse.id });
        }
        toast.success('Course created');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadCourses();
    } catch (err) {
      toast.error('Failed to save course');
    }
  }

  function resetForm() {
    setFormData({ title: '', description: '', level: 'beginner', duration_minutes: 60, price: 0, thumbnail_url: '', status: 'draft' });
    setModules([]);
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary-400" /> Course Management
          </h1>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Course
          </button>
        </div>

        {/* AI Assist Modal */}
        {showAiModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Course Generator
                </h2>
                <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Describe your course idea and let AI generate the content for you.
              </p>
              <textarea
                rows={4}
                value={aiIdea}
                onChange={(e) => setAiIdea(e.target.value)}
                placeholder="e.g., A comprehensive React course for beginners covering hooks, state management, and building real-world applications..."
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 mb-4"
              />
              <div className="flex gap-3">
                <button onClick={handleAIGenerate} disabled={aiLoading} className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 flex items-center justify-center gap-2">
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Course
                </button>
                <button onClick={() => setShowAiModal(false)} className="flex-1 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Course Form */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{editing ? 'Edit Course' : 'Create New Course'}</h2>
              <AIAssistButton onClick={() => setShowAiModal(true)} isLoading={aiLoading} label="AI Generate Course" />
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Course Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <textarea placeholder="Description" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <div className="grid grid-cols-2 gap-4">
                <select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input type="number" placeholder="Duration (minutes)" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <input type="text" placeholder="Thumbnail URL" value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-lg font-semibold text-white mb-3">Course Modules</h3>
                {modules.map((module, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-3 mb-2">
                    <div className="flex gap-3">
                      <input type="text" placeholder="Module Title" value={module.title} onChange={e => { const newModules = [...modules]; newModules[idx].title = e.target.value; setModules(newModules); }} className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
                      <input type="number" placeholder="Duration (min)" value={module.duration} onChange={e => { const newModules = [...modules]; newModules[idx].duration = parseInt(e.target.value); setModules(newModules); }} className="w-28 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
                      <button onClick={() => { setModules(modules.filter((_, i) => i !== idx)); }} className="p-2 text-red-400 hover:text-red-300">✕</button>
                    </div>
                    <textarea placeholder="Module Description" value={module.description} onChange={e => { const newModules = [...modules]; newModules[idx].description = e.target.value; setModules(newModules); }} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" rows={2} />
                  </div>
                ))}
                <button onClick={() => setModules([...modules, { title: '', description: '', duration: 30, order_index: modules.length }])} className="text-primary-400 text-sm hover:text-primary-300">+ Add Module</button>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={saveCourse} className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Save Course</button>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white">{course.title}</h3>
              <p className="text-slate-400 text-sm mt-2 line-clamp-2">{course.description}</p>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-primary-400 font-bold">${course.price}</span>
                <span className="text-xs text-slate-500">{course.duration_minutes} min</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setEditing(course.id); setFormData(course); setShowForm(true); }} className="flex-1 py-1.5 bg-slate-700 rounded-lg text-sm">Edit</button>
                <button onClick={() => deleteCourse(course.id)} className="flex-1 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}            await supabase.from('courses').delete().eq('id', id);
            loadCourses();
            if (selectedCourse?.id === id) setSelectedCourse(null);
        }
    }

    async function deleteModule(id) {
        if (confirm('Delete this module?')) {
            await supabase.from('course_modules').delete().eq('id', id);
            loadModules(selectedCourse.id);
        }
    }

    const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
    const paginatedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Loading courses...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white">Course Management</h1>
                <div className="flex gap-3">
                    <input type="text" placeholder="Search courses..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm w-64" />
                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600 transition-colors">
                        <Plus className="w-4 h-4" /> Add Course
                    </button>
                </div>
            </div>

            {/* Course Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">{editing ? 'Edit Course' : 'New Course'}</h2>
                            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-300 mb-1">Title *</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required /></div>
                            <div><label className="block text-sm font-medium text-slate-300 mb-1">Slug (URL)</label><input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="auto-generated from title" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
                            <div><label className="block text-sm font-medium text-slate-300 mb-1">Description *</label><textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required /></div>
                            <div><label className="block text-sm font-medium text-slate-300 mb-1">Content (HTML supported)</label><textarea rows={5} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm" /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-300 mb-1">Category</label><input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="e.g., HR, Technology" /></div>
                                <div><label className="block text-sm font-medium text-slate-300 mb-1">Level</label><select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-300 mb-1">Duration (minutes)</label><input type="number" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
                                <div><label className="block text-sm font-medium text-slate-300 mb-1">Price ($)</label><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-300 mb-1">Thumbnail URL</label><input type="url" value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="https://..." /></div>
                            <div><label className="block text-sm font-medium text-slate-300 mb-1">Tags (comma separated)</label><input type="text" value={formData.tags.join(',')} onChange={e => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim())})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="HR, Recruitment, Leadership" /></div>
                            <div className="flex items-center gap-3"><input type="checkbox" id="published" checked={formData.published} onChange={e => setFormData({...formData, published: e.target.checked})} className="w-4 h-4" /><label htmlFor="published" className="text-white">Published (visible to users)</label></div>
                            <div className="flex gap-3 pt-4"><button onClick={saveCourse} className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success-dark">Save Course</button><button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Cancel</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCourses.map(course => (
                    <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3"><GraduationCap className="w-8 h-8 text-primary-400" /><div><h3 className="text-lg font-semibold text-white">{course.title}</h3><p className="text-sm text-slate-400">{course.level} • {course.duration_minutes} min</p></div></div>
                            <div className="flex gap-2"><button onClick={() => { setEditing(course.id); setFormData(course); setShowForm(true); }} className="text-primary-400 hover:text-primary-300"><Edit className="w-4 h-4" /></button><button onClick={() => deleteCourse(course.id)} className="text-danger hover:text-red-400"><Trash2 className="w-4 h-4" /></button></div>
                        </div>
                        <p className="text-slate-400 text-sm mt-3 line-clamp-2">{course.description}</p>
                        <div className="mt-3 flex justify-between items-center"><span className="text-primary-400 font-bold">${course.price}</span><span className={`text-xs px-2 py-1 rounded-full ${course.published ? 'bg-success/20 text-success' : 'bg-amber-500/20 text-amber-400'}`}>{course.published ? 'Published' : 'Draft'}</span></div>
                        <button onClick={() => { setSelectedCourse(course); loadModules(course.id); }} className="mt-3 w-full py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors">Manage Modules</button>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (<div className="flex justify-center gap-2 mt-8"><button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button><span className="px-3 py-1 text-slate-400">Page {currentPage} of {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button></div>)}

            {/* Module Management Modal */}
            {selectedCourse && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Modules: {selectedCourse.title}</h2>
                            <button onClick={() => setSelectedCourse(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4">
                            <button onClick={() => setShowModuleForm(true)} className="mb-4 px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600"><Plus className="w-4 h-4" /> Add Module</button>
                            {modules.map((module, idx) => (
                                <div key={module.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-3">
                                    <div className="flex justify-between items-start"><h3 className="text-lg font-semibold text-white">Module {idx + 1}: {module.title}</h3><div className="flex gap-2"><button onClick={() => { setEditingModule(module.id); setModuleForm(module); setShowModuleForm(true); }} className="text-primary-400 hover:text-primary-300"><Edit className="w-4 h-4" /></button><button onClick={() => deleteModule(module.id)} className="text-danger hover:text-red-400"><Trash2 className="w-4 h-4" /></button></div></div>
                                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{module.content?.substring(0, 150)}...</p>
                                    <div className="mt-3 flex gap-3 items-center">
                                        {module.audio_generated ? <span className="text-xs text-success flex items-center gap-1"><Volume2 className="w-3 h-3" /> Audio Generated</span> : <button onClick={() => generateAudio(module.id, module.content)} disabled={generatingAudio} className="text-xs text-primary-400 flex items-center gap-1"><Mic className="w-3 h-3" /> Generate AI Audio</button>}
                                        {module.audio_url && <audio controls className="h-8"><source src={module.audio_url} type="audio/mpeg" /></audio>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Module Form Modal */}
            {showModuleForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h2 className="text-xl font-bold text-white">{editingModule ? 'Edit Module' : 'New Module'}</h2><button onClick={() => { setShowModuleForm(false); setEditingModule(null); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
                        <div className="p-4 space-y-4">
                            <input type="text" placeholder="Module Title" value={moduleForm.title} onChange={e => setModuleForm({...moduleForm, title: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            <textarea placeholder="Module Content (HTML supported)" rows={8} value={moduleForm.content} onChange={e => setModuleForm({...moduleForm, content: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm" />
                            <input type="number" placeholder="Order Index" value={moduleForm.order_index} onChange={e => setModuleForm({...moduleForm, order_index: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            <div className="flex gap-3"><button onClick={saveModule} className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success-dark"><Save className="w-4 h-4 inline mr-1" /> Save Module</button><button onClick={() => { setShowModuleForm(false); setEditingModule(null); }} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Cancel</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
