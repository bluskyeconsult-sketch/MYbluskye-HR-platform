// src/pages/CourseDetailsPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Clock, BookOpen, Users, Star, ArrowLeft, Play, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadCourse();
    checkUser();
  }, [id]);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  }

  async function loadCourse() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCourse(data);

      if (user) {
        const { data: enrollment } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('course_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        setEnrolled(!!enrollment);
      }
    } catch (err) {
      console.error('Error loading course:', err);
      toast.error('Course not found');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll() {
    if (!user) {
      toast.error('Please sign in to enroll');
      navigate('/sign-in');
      return;
    }

    try {
      const { error } = await supabase.from('course_enrollments').insert({
        course_id: id,
        user_id: user.id,
        progress: 0,
        started_at: new Date().toISOString()
      });

      if (error) throw error;
      setEnrolled(true);
      toast.success('Successfully enrolled!');
    } catch (err) {
      toast.error('Failed to enroll');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <button onClick={() => navigate('/courses')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h1 className="text-3xl font-bold text-white mb-3">{course.title}</h1>
              <p className="text-slate-400">{course.description}</p>
              
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-800">
                <span className="flex items-center gap-2 text-slate-400"><Clock className="w-4 h-4" /> {course.duration_minutes} min</span>
                <span className="flex items-center gap-2 text-slate-400"><BookOpen className="w-4 h-4" /> {course.level}</span>
                <span className="flex items-center gap-2 text-slate-400"><Star className="w-4 h-4" /> {course.rating || 'New'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center sticky top-24">
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-48 object-cover rounded-xl mb-4" />
              )}
              <div className="text-3xl font-bold text-primary-400 mb-4">${course.price}</div>
              
              {enrolled ? (
                <div className="text-center text-emerald-400">✓ You are enrolled in this course</div>
              ) : (
                <button onClick={handleEnroll} className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition">
                  Enroll Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
