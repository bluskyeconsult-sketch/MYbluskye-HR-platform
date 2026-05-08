// src/pages/MyLearningPage.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Award, Download, CheckCircle, Play, ChevronRight, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function MyLearningPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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
      setLoading(true);
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*, courses:course_id(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEnrollments(data || []);
    } catch (err) {
      console.error('Error loading enrollments:', err);
      toast.error('Failed to load your courses');
    } finally {
      setLoading(false);
    }
  }

  async function downloadCertificate(certificate) {
    toast.loading('Preparing certificate...', { id: 'cert' });
    try {
      // In production, generate PDF from certificate data
      // For now, create a simple HTML certificate
      const certHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Certificate of Completion</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>Certificate of Completion</h1>
          <p>This certifies that</p>
          <h2>${user?.email}</h2>
          <p>has successfully completed</p>
          <h3>${certificate.course_title}</h3>
          <p>on ${new Date(certificate.completed_at).toLocaleDateString()}</p>
          <p>Certificate Number: ${certificate.certificate_number}</p>
        </body>
        </html>
      `;
      const blob = new Blob([certHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificate.certificate_number}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Certificate downloaded', { id: 'cert' });
    } catch (err) {
      toast.error('Failed to download certificate', { id: 'cert' });
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
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Learning</h1>
        <p className="text-slate-400 mb-8">Track your course progress and certificates</p>

        {enrollments.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">You haven't enrolled in any courses yet.</p>
            <Link to="/courses" className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500">Browse Courses →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {enrollments.map(enrollment => (
              <div key={enrollment.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{enrollment.courses?.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Started {new Date(enrollment.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mb-4"><div className="flex justify-between text-sm text-slate-400 mb-1"><span>Progress</span><span>{enrollment.progress_percent || 0}%</span></div><div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${enrollment.progress_percent || 0}%` }}></div></div></div>
                  <div className="flex gap-3">
                    <Link to={`/courses/${enrollment.courses?.id}`} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Continue Learning</Link>
                    {enrollment.progress_percent === 100 && enrollment.certificate_url && (
                      <button onClick={() => downloadCertificate(enrollment)} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"><Download className="w-5 h-5" /></button>
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
