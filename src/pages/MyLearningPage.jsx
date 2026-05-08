// src/pages/MyLearningPage.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp, CheckCircle, Play, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function MyLearningPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalHours: 0, completedCourses: 0, inProgressCourses: 0 });

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/sign-in';
      return;
    }
    setUser(session.user);
    await loadEnrollments(session.user.id);
  }

  async function loadEnrollments(userId) {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*, courses:course_id(*)')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      
      setEnrollments(data || []);
      
      const completed = data?.filter(e => e.progress_percent === 100).length || 0;
      const totalHours = data?.reduce((sum, e) => sum + (e.courses?.duration_minutes || 0) / 60, 0) || 0;
      
      setStats({
        totalHours: Math.round(totalHours),
        completedCourses: completed,
        inProgressCourses: (data?.length || 0) - completed
      });
    } catch (err) {
      console.error('Error loading enrollments:', err);
      toast.error('Failed to load your courses');
    } finally {
      setLoading(false);
    }
  }

  async function generateCertificate(courseId) {
    toast.loading('Generating certificate...', { id: 'cert' });
    try {
      const enrollment = enrollments.find(e => e.course_id === courseId);
      if (!enrollment || enrollment.progress_percent !== 100) {
        toast.error('Complete the course first to get certificate');
        return;
      }
      
      const { data: certificate, error } = await supabase
        .from('course_certificates')
        .insert({
          enrollment_id: enrollment.id,
          certificate_number: `ODC-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          issued_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Certificate generated!', { id: 'cert' });
      
      // Create PDF and download (simplified)
      const win = window.open();
      win.document.write(`
        <html>
          <head><title>Certificate of Completion</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>Certificate of Completion</h1>
            <p>This certifies that</p>
            <h2>${user?.email}</h2>
            <p>has successfully completed</p>
            <h3>${enrollment.courses.title}</h3>
            <p>Certificate Number: ${certificate.certificate_number}</p>
            <p>Issued: ${new Date().toLocaleDateString()}</p>
          </body>
        </html>
      `);
      win.document.close();
    } catch (err) {
      console.error('Certificate error:', err);
      toast.error('Failed to generate certificate');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Learning</h1>
        <p className="text-slate-400 mb-8">Track your course progress and achievements</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalHours}h</p>
                <p className="text-sm text-slate-400">Total Learning Hours</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.completedCourses}</p>
                <p className="text-sm text-slate-400">Courses Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.inProgressCourses}</p>
                <p className="text-sm text-slate-400">In Progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enrolled Courses */}
        <h2 className="text-xl font-semibold text-white mb-4">Your Courses</h2>
        
        {enrollments.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
            <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">You haven't enrolled in any courses yet.</p>
            <Link to="/courses" className="inline-block mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500">
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{enrollment.courses?.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {enrollment.courses?.duration_minutes} min</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {enrollment.courses?.level}</span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-400 mb-1">
                      <span>Progress</span>
                      <span>{enrollment.progress_percent || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${enrollment.progress_percent || 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Link
                      to={`/courses/${enrollment.course_id}`}
                      className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Continue Learning
                    </Link>
                    {enrollment.progress_percent === 100 && (
                      <button
                        onClick={() => generateCertificate(enrollment.course_id)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center gap-2"
                      >
                        <Award className="w-4 h-4" />
                        Certificate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
