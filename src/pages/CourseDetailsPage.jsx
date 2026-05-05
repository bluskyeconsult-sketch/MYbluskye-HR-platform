import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Play, CheckCircle, Lock, Volume2, Award, Clock, BookOpen, ChevronRight, User, Star } from 'lucide-react';
import { getCourse, enrollInCourse, getUserEnrollment, updateModuleProgress } from '../services/courseService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CourseDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrollment, setEnrollment] = useState(null);
    const [user, setUser] = useState(null);
    const [currentModule, setCurrentModule] = useState(null);
    const [review, setReview] = useState({ rating: 0, text: '' });
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => { loadData(); }, [id]);

    async function loadData() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        const courseData = await getCourse(id);
        setCourse(courseData);
        
        if (user) {
            const userEnrollment = await getUserEnrollment(user.id, id);
            setEnrollment(userEnrollment);
            if (userEnrollment?.last_accessed_module_id) {
                const lastModule = courseData.modules?.find(m => m.id === userEnrollment.last_accessed_module_id);
                if (lastModule) setCurrentModule(lastModule);
            } else if (courseData.modules?.length > 0) {
                setCurrentModule(courseData.modules[0]);
            }
        }
        setLoading(false);
    }

    async function handleEnroll() {
        if (!user) {
            navigate('/sign-in');
            return;
        }
        const newEnrollment = await enrollInCourse(user.id, id);
        setEnrollment(newEnrollment);
        if (course.modules?.length > 0) {
            setCurrentModule(course.modules[0]);
        }
    }

    async function handleModuleComplete(moduleId, completed) {
        const result = await updateModuleProgress(user.id, id, moduleId, completed);
        const updatedEnrollment = await getUserEnrollment(user.id, id);
        setEnrollment(updatedEnrollment);
        if (result.completed) {
            alert('🎉 Congratulations! You have completed the course. Your certificate is now available in your dashboard.');
        }
    }

    async function submitReview() {
        if (!user) { navigate('/sign-in'); return; }
        if (review.rating === 0) { alert('Please select a rating'); return; }
        setSubmittingReview(true);
        try {
            await addCourseReview(id, user.id, review.rating, review.text);
            alert('Review submitted!');
            setReview({ rating: 0, text: '' });
            loadData();
        } catch (err) { alert('Error: ' + err.message); }
        setSubmittingReview(false);
    }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading course...</div></div>;
    if (!course) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-slate-400">Course not found</p></div>;

    const isEnrolled = !!enrollment;
    const isCompleted = enrollment?.status === 'completed';
    const progress = enrollment?.progress_percent || 0;

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2"><span>{course.category}</span><span>•</span><span className="capitalize">{course.level}</span></div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{course.title}</h1>
                            <p className="text-slate-400 text-lg mb-4">{course.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <span className="flex items-center gap-1 text-slate-300"><Clock className="w-4 h-4" /> {course.duration_minutes} min</span>
                                <span className="flex items-center gap-1 text-slate-300"><BookOpen className="w-4 h-4" /> {course.modules?.length || 0} modules</span>
                                <span className="flex items-center gap-1 text-yellow-400"><span>★</span> {course.rating || 0} ({course.enrollment_count || 0} students)</span>
                                {course.instructor_name && <span className="flex items-center gap-1 text-slate-300"><User className="w-4 h-4" /> {course.instructor_name}</span>}
                            </div>
                        </div>
                        <div className="w-full lg:w-80">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center sticky top-24">
                                {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-4" />}
                                <div className="text-3xl font-bold text-primary-400">${course.price}</div>
                                {!isEnrolled ? (<button onClick={handleEnroll} className="mt-4 w-full py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors">Enroll Now</button>) : isCompleted ? (<div className="mt-4 p-3 bg-success/20 text-success rounded-lg"><CheckCircle className="w-5 h-5 inline mr-2" /> Course Completed! <a href={`/certificate/${enrollment.id}`} className="underline ml-2">View Certificate</a></div>) : (<div className="mt-4"><div className="w-full bg-slate-700 rounded-full h-2 mb-2"><div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div></div><p className="text-slate-400 text-sm">{progress}% Complete</p></div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Course Content */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Modules List */}
                    <div className="lg:w-96"><div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden sticky top-24"><div className="p-4 border-b border-slate-800 bg-slate-900"><h2 className="font-bold text-white">Course Modules ({course.modules?.length || 0})</h2></div><div className="divide-y divide-slate-800">{course.modules?.map((module, idx) => (<div key={module.id} className={`p-4 cursor-pointer hover:bg-slate-800/50 transition-colors ${currentModule?.id === module.id ? 'bg-slate-800/50 border-l-2 border-primary-500' : ''}`} onClick={() => setCurrentModule(module)}><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><span className="text-sm text-slate-500">Module {idx + 1}</span><h3 className="font-medium text-white">{module.title}</h3></div></div>{enrollment?.completed_modules?.includes(module.id) ? <CheckCircle className="w-5 h-5 text-success" /> : <Play className="w-5 h-5 text-slate-500" />}</div></div>))}</div></div></div>

                    {/* Module Content */}
                    <div className="flex-1"><div className="bg-slate-900 border border-slate-800 rounded-xl p-6"><h2 className="text-xl font-bold text-white mb-4">{currentModule?.title}</h2>{currentModule?.audio_url && (<div className="mb-6 p-4 bg-slate-800/50 rounded-lg"><div className="flex items-center gap-3"><Volume2 className="w-5 h-5 text-primary-400" /><audio controls className="flex-1" src={currentModule.audio_url}><source src={currentModule.audio_url} type="audio/mpeg" /></audio></div></div>)}<div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: currentModule?.content || '<p>No content available for this module.</p>' }} /><div className="mt-6 flex justify-between"><button disabled={!currentModule} onClick={() => { const idx = course.modules.findIndex(m => m.id === currentModule?.id); if (idx > 0) setCurrentModule(course.modules[idx - 1]); }} className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50">Previous</button>{!enrollment?.completed_modules?.includes(currentModule?.id) ? (<button onClick={() => handleModuleComplete(currentModule?.id, true)} className="px-4 py-2 bg-success text-white rounded-lg">Mark Complete</button>) : (<button onClick={() => handleModuleComplete(currentModule?.id, false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Mark Incomplete</button>)}<button disabled={!currentModule} onClick={() => { const idx = course.modules.findIndex(m => m.id === currentModule?.id); if (idx < course.modules.length - 1) setCurrentModule(course.modules[idx + 1]); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg disabled:opacity-50">Next</button></div></div></div>
                </div>

                {/* Reviews Section */}
                {user && isEnrolled && (<div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6"><h3 className="text-xl font-bold text-white mb-4">Rate this Course</h3><div className="flex items-center gap-2 mb-3">{...[1,2,3,4,5].map(star => (<button key={star} onClick={() => setReview({ ...review, rating: star })} className={`text-2xl ${star <= review.rating ? 'text-yellow-400' : 'text-slate-600'}`}>★</button>))}</div><textarea rows={3} value={review.text} onChange={e => setReview({ ...review, text: e.target.value })} placeholder="Share your experience..." className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /><button onClick={submitReview} disabled={submittingReview} className="mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Submit Review</button></div>)}
            </div>
        </div>
    );
}
