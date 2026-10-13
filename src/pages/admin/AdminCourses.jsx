// src/pages/admin/AdminCourses.jsx
//
// EARLIER FIXES (2026-08-07): shared Supabase client; field names aligned
// with the public catalogue (is_published, duration_hours, category,
// image_url).
//
// REWORKED (2026-10-13), after a full review:
// 1. Add Course / Edit used a small pop-up form that could not edit
//    lessons, AI content, audio or illustrations - while the real editor
//    (CourseEditor, routes /admin/courses/new and /admin/courses/:id/edit)
//    already does all of that. A course created in the pop-up was an empty
//    shell. Add and Edit now open the real editor, so there is one way to
//    build a course.
// 2. Pagination did nothing: Prev/Next changed the page number but nothing
//    reloaded the list. Search only worked when the refresh button was
//    pressed. Both now reload automatically (search waits briefly while
//    you type).
// 3. Bulk delete never worked and could report success falsely: the
//    selection was stored in a shape the delete step did not read, so it
//    deleted nothing and still said "Course deleted". Deleting now handles
//    one course or many, checks the database's answer, and says honestly
//    what was and was not deleted.
// 4. No database write was checked for errors, so a refused save showed a
//    success message. All writes now report failures.
// 5. The pop-up edited a full copy of the course row, including id and
//    timestamps. That is gone with the pop-up.
// 6. Removed the dependency on ConfirmModal (never reviewed); the browser
//    confirm dialog is used, as on the other admin pages.
// 7. Added bulk Publish / Unpublish, a preview image, and a link to the
//    real editor on every card. Page-level admin check kept as a second
//    line of defence behind the route guard.

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, GraduationCap, Search, RefreshCw, Loader2, CheckCircle, Square, Eye, EyeOff } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

export default function AdminCourses() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selected, setSelected] = useState(new Set());
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState(null);
    const searchTimer = useRef(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { navigate('/admin-login', { replace: true }); return; }
                const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', session.user.id).single();
                if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
                    navigate('/dashboard', { replace: true });
                    return;
                }
                if (!cancelled) setIsAuthorized(true);
            } catch {
                navigate('/admin-login', { replace: true });
            }
        })();
        return () => { cancelled = true; };
    }, [navigate]);

    // Wait for the typing to pause, then search from page 1.
    function onSearchChange(value) {
        setSearchInput(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setSearchTerm(value.trim());
            setCurrentPage(1);
        }, 350);
    }
    useEffect(() => () => clearTimeout(searchTimer.current), []);

    const loadCourses = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('courses')
                .select('id, title, description, category, duration_hours, price, image_url, is_published, created_at', { count: 'exact' })
                .order('created_at', { ascending: false });
            if (searchTerm) {
                // Commas and brackets would break the filter syntax.
                const safe = searchTerm.replace(/[,()%*]/g, ' ');
                query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`);
            }
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const { data, error, count } = await query.range(from, from + ITEMS_PER_PAGE - 1);
            if (error) throw error;
            setCourses(data || []);
            setTotalCount(count || 0);
            setLoadError('');
        } catch (err) {
            console.error('Failed to load courses:', err);
            setLoadError(err.message || 'Could not load courses.');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, currentPage]);

    useEffect(() => {
        if (isAuthorized) loadCourses();
    }, [isAuthorized, loadCourses]);

    async function setPublished(ids, published) {
        setBusy(true);
        setNotice(null);
        const { data, error } = await supabase.from('courses').update({ is_published: published }).in('id', ids).select('id');
        setBusy(false);
        if (error) {
            setNotice({ type: 'error', text: `Could not update: ${error.message}` });
            return;
        }
        setNotice({ type: 'ok', text: `${data?.length || 0} course${data?.length === 1 ? '' : 's'} ${published ? 'published' : 'moved to draft'}.` });
        setSelected(new Set());
        loadCourses();
    }

    async function deleteCourses(ids) {
        const label = ids.length === 1 ? 'this course' : `these ${ids.length} courses`;
        if (!confirm(`Permanently delete ${label}? This cannot be undone.\n\nIf members have started a course, unpublishing it is usually safer than deleting it.`)) return;
        setBusy(true);
        setNotice(null);
        const { data, error } = await supabase.from('courses').delete().in('id', ids).select('id');
        setBusy(false);
        if (error) {
            setNotice({ type: 'error', text: `Could not delete: ${error.message}. If the course has lessons or enrolments linked to it, unpublish it instead.` });
            return;
        }
        const deleted = data?.length || 0;
        if (deleted < ids.length) {
            setNotice({ type: 'error', text: `Deleted ${deleted} of ${ids.length}. The rest were not removed (check permissions or linked records).` });
        } else {
            setNotice({ type: 'ok', text: `${deleted} course${deleted === 1 ? '' : 's'} deleted.` });
        }
        setSelected(new Set());
        loadCourses();
    }

    function toggleSelect(id) {
        const next = new Set(selected);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelected(next);
    }
    function toggleSelectAll() {
        setSelected(selected.size === courses.length ? new Set() : new Set(courses.map(c => c.id)));
    }

    if (!isAuthorized) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
    }

    return (
        <div className="px-4 py-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Course Management</h1>
                    <p className="text-slate-400 text-sm">{totalCount} course{totalCount === 1 ? '' : 's'}. Add and Edit open the full course editor (lessons, AI content, audio, images).</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/admin/ai-course-builder" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm flex items-center gap-2">AI Course Builder</Link>
                    <Link to="/admin/courses/new" className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Course</Link>
                </div>
            </div>

            {notice && (
                <div className={`mb-4 p-3 rounded-lg text-sm border ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{notice.text}</div>
            )}
            {loadError && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">Could not load courses: {loadError}</div>}

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by title, description or category..."
                            value={searchInput}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                    <button onClick={loadCourses} title="Refresh" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"><RefreshCw className="w-4 h-4" /></button>
                </div>
            </div>

            {selected.size > 0 && (
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-white text-sm">{selected.size} selected</span>
                    <div className="flex gap-2 flex-wrap">
                        <button disabled={busy} onClick={() => setPublished([...selected], true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"><Eye className="w-4 h-4" /> Publish</button>
                        <button disabled={busy} onClick={() => setPublished([...selected], false)} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"><EyeOff className="w-4 h-4" /> Move to draft</button>
                        <button disabled={busy} onClick={() => deleteCourses([...selected])} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
            ) : courses.length === 0 ? (
                <div className="text-center py-12">
                    <GraduationCap className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400">{searchTerm ? 'No courses match your search.' : 'No courses yet. Add one, or generate one with the AI Course Builder.'}</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-3">
                        <button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400 text-sm hover:text-white">
                            {selected.size === courses.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />} Select all on this page ({courses.length})
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <div key={course.id} className={`bg-slate-900/50 border rounded-xl overflow-hidden ${selected.has(course.id) ? 'border-primary-500/50' : 'border-slate-800'}`}>
                                {course.image_url && <img src={course.image_url} alt="" className="w-full h-32 object-cover" loading="lazy" />}
                                <div className="p-5">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-white">{course.title}</h3>
                                            <p className="text-sm text-slate-400">{course.category || 'No category'} • {course.duration_hours ?? '?'} hrs</p>
                                        </div>
                                        <button onClick={() => toggleSelect(course.id)} aria-label="Select course">
                                            {selected.has(course.id) ? <CheckCircle className="w-5 h-5 text-primary-400" /> : <Square className="w-5 h-5 text-slate-500" />}
                                        </button>
                                    </div>
                                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{course.description}</p>
                                    <div className="mt-3 flex justify-between items-center">
                                        <span className="text-xl font-bold text-primary-400">{Number(course.price) > 0 ? `$${Number(course.price).toFixed(2)}` : 'Free'}</span>
                                        <button
                                            disabled={busy}
                                            onClick={() => setPublished([course.id], !course.is_published)}
                                            title={course.is_published ? 'Click to move to draft' : 'Click to publish'}
                                            className={`text-xs px-2 py-1 rounded-full disabled:opacity-50 ${course.is_published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
                                        >
                                            {course.is_published ? 'published' : 'draft'}
                                        </button>
                                    </div>
                                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
                                        <Link to={`/admin/courses/${course.id}/edit`} className="flex-1 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 flex items-center justify-center gap-1.5"><Edit className="w-3.5 h-3.5" /> Edit</Link>
                                        <button disabled={busy} onClick={() => deleteCourses([course.id])} className="flex-1 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 disabled:opacity-50 flex items-center justify-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6 text-slate-400 text-sm">
                            <span>Page {currentPage} of {totalPages}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 text-white rounded-lg disabled:opacity-40">Prev</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 text-white rounded-lg disabled:opacity-40">Next</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
