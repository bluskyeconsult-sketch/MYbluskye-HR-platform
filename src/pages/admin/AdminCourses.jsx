// src/pages/admin/AdminCourses.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, GraduationCap, Search, RefreshCw, Loader2, CheckCircle, XCircle, Eye, EyeOff, X, Square, Save } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCourses, setSelectedCourses] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '', description: '', level: 'beginner', duration_minutes: 60, price: 0, thumbnail_url: '', status: 'draft'
  });

  const itemsPerPage = 10;

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      setUser(session.user);
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', session.user.id).single();
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        window.location.href = '/dashboard';
        return;
      }
      setIsAuthorized(true);
      loadCourses();
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadCourses() {
    try {
      setLoading(true);
      let query = supabase.from('courses').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      setCourses(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      toast.error('Failed to load courses');
    } finally { setLoading(false); }
  }

  async function saveCourse() {
    if (!formData.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('courses').update(formData).eq('id', editing);
        toast.success('Course updated');
      } else {
        await supabase.from('courses').insert(formData);
        toast.success('Course created');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadCourses();
    } catch (err) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  async function deleteCourse(id) { setShowDeleteConfirm({ id }); }
  async function confirmDelete() {
    try { await supabase.from('courses').delete().eq('id', showDeleteConfirm.id); toast.success('Course deleted'); await loadCourses(); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try { await supabase.from('courses').update({ status: newStatus }).eq('id', id); toast.success(`Course ${newStatus}`); await loadCourses(); }
    catch (err) { toast.error('Failed to update status'); }
  }

  function resetForm() {
    setFormData({ title: '', description: '', level: 'beginner', duration_minutes: 60, price: 0, thumbnail_url: '', status: 'draft' });
  }

  function handleEdit(course) { setEditing(course.id); setFormData(course); setShowForm(true); }
  function toggleSelectCourse(id) { const newSet = new Set(selectedCourses); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedCourses(newSet); }
  function toggleSelectAll() { setSelectedCourses(selectedCourses.size === courses.length ? new Set() : new Set(courses.map(c => c.id))); }

  if (!isAuthorized) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" />
      <ConfirmModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={confirmDelete} title="Confirm Delete" message="Delete this course?" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Course Management</h1>
          <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Add Course</button>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div><button onClick={loadCourses} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button></div>
        </div>

        {selectedCourses.size > 0 && <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between"><span>{selectedCourses.size} selected</span><button onClick={() => setShowDeleteConfirm({ ids: Array.from(selectedCourses), type: 'bulk', count: selectedCourses.size })} className="px-4 py-2 bg-red-600 rounded-lg"><Trash2 className="w-4 h-4" /> Delete</button></div>}

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : courses.length === 0 ? <div className="text-center py-12"><GraduationCap className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p>No courses found</p></div> : (
          <>
            <div className="flex items-center gap-2 mb-3"><button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400">{selectedCourses.size === courses.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />} Select All ({courses.length})</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <div key={course.id} className="bg-slate-900/50 border rounded-xl overflow-hidden">
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <div><h3 className="font-semibold text-white">{course.title}</h3><p className="text-sm text-slate-400">{course.level} • {course.duration_minutes} min</p></div>
                      <button onClick={() => toggleSelectCourse(course.id)}>{selectedCourses.has(course.id) ? <CheckCircle className="w-5 h-5 text-primary-400" /> : <Square className="w-5 h-5 text-slate-500" />}</button>
                    </div>
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{course.description}</p>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xl font-bold text-primary-400">${course.price}</span>
                      <button onClick={() => toggleStatus(course.id, course.status)} className={`text-xs px-2 py-1 rounded-full ${course.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{course.status}</button>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t"><button onClick={() => handleEdit(course)} className="flex-1 py-1.5 bg-slate-700 rounded-lg text-sm"><Edit className="w-3.5 h-3.5" /> Edit</button><button onClick={() => deleteCourse(course.id)} className="flex-1 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm"><Trash2 className="w-3.5 h-3.5" /> Delete</button></div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && <div className="flex justify-between mt-6"><span>Page {currentPage} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg">Prev</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg">Next</button></div></div>}
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl p-6 max-w-lg w-full">
            <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white">{editing ? 'Edit' : 'Add'} Course</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <input type="text" placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              <textarea placeholder="Description" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              <div className="grid grid-cols-2 gap-4"><select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select><input type="number" placeholder="Duration (min)" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="draft">Draft</option><option value="published">Published</option></select></div>
              <input type="text" placeholder="Thumbnail URL" value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              <div className="flex gap-3 pt-4"><button onClick={saveCourse} disabled={saving} className="flex-1 py-2 bg-primary-600 rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Saving...' : 'Save'}</button><button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-slate-700 rounded-lg">Cancel</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
