import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, GraduationCap, Mic, Volume2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [generatingAudio, setGeneratingAudio] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 10;
    
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        content: '',
        category: '',
        level: 'beginner',
        duration_minutes: 60,
        price: 0,
        thumbnail_url: '',
        cover_image: '',
        tags: [],
        published: false
    });
    
    const [moduleForm, setModuleForm] = useState({ title: '', content: '', order_index: 0, audio_url: '', audio_generated: false });
    const [showModuleForm, setShowModuleForm] = useState(false);
    const [editingModule, setEditingModule] = useState(null);

    useEffect(() => { loadCourses(); }, []);

    async function loadCourses() {
        const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
        setCourses(data || []);
        setLoading(false);
    }

    async function loadModules(courseId) {
        const { data } = await supabase.from('course_modules').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
        setModules(data || []);
    }

    function generateSlug(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    async function saveCourse() {
        const slug = formData.slug || generateSlug(formData.title);
        if (editing) {
            await supabase.from('courses').update({ ...formData, slug }).eq('id', editing);
        } else {
            await supabase.from('courses').insert({ ...formData, slug });
        }
        setShowForm(false);
        setEditing(null);
        setFormData({ title: '', slug: '', description: '', content: '', category: '', level: 'beginner', duration_minutes: 60, price: 0, thumbnail_url: '', cover_image: '', tags: [], published: false });
        loadCourses();
    }

    async function saveModule() {
        if (editingModule) {
            await supabase.from('course_modules').update(moduleForm).eq('id', editingModule);
        } else {
            await supabase.from('course_modules').insert({ ...moduleForm, course_id: selectedCourse.id });
        }
        setShowModuleForm(false);
        setEditingModule(null);
        setModuleForm({ title: '', content: '', order_index: modules.length, audio_url: '', audio_generated: false });
        loadModules(selectedCourse.id);
    }

    async function generateAudio(moduleId, content) {
        setGeneratingAudio(true);
        try {
            const response = await fetch('/api/generate-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moduleId, content, voice: 'alloy' })
            });
            const data = await response.json();
            if (response.ok) {
                await supabase.from('course_modules').update({ audio_url: data.audioUrl, audio_generated: true }).eq('id', moduleId);
                loadModules(selectedCourse.id);
                alert('✅ Audio generated successfully!');
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setGeneratingAudio(false);
        }
    }

    async function deleteCourse(id) {
        if (confirm('Delete this course and all modules? This cannot be undone.')) {
            await supabase.from('courses').delete().eq('id', id);
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
