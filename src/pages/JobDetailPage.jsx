// src/pages/JobDetailPage.jsx
//
// FIXED (2026-08-07):
// 1. Was creating its own separate Supabase client instead of importing the
//    shared singleton — same disconnected-session bug as SavedJobsPage.jsx /
//    UserApplications.jsx. Now imports the shared client.
// 2. Race condition: checkUser() and loadJob() both ran independently from the
//    same useEffect, and loadJob() read the `user` state variable to decide
//    whether to check saved-job status. Since state updates are async, loadJob
//    almost always saw the stale initial `user === null`, so the "already
//    saved" bookmark indicator was unreliable. Now sequenced: fetch the user
//    first, then load the job with that resolved user passed in directly.
// 3. handleApply() inserted into job_applications using `user_id` and
//    `status: 'submitted'`. The confirmed real job_applications handler
//    (api/index.js) filters applications by `applicant_id`, not `user_id` —
//    the insert was almost certainly failing outright with a column error.
//    `'submitted'` also doesn't match the status values used elsewhere
//    (`pending`/`accepted`/`rejected`). Fixed to use `applicant_id` and
//    `status: 'pending'`, and removed a speculative `applied_at` field in
//    favor of the table's default timestamp column.
// 4. `job_reports` table used in handleReport() is not confirmed to exist in
//    the real schema — flagged with a comment, not changed, since guessing a
//    different table name risks being equally wrong.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Briefcase, MapPin, DollarSign, Calendar, Clock, Building, 
  Users, CheckCircle, Award, TrendingUp, Save, Bookmark,
  Share2, Flag, ExternalLink, Loader2, ArrowLeft, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

// Sample job for fallback
const SAMPLE_JOB = {
  id: 'sample',
  title: 'Senior Software Engineer',
  company: 'Tech Innovations',
  location: 'London, UK',
  country_code: 'GB',
  description: 'We are looking for an experienced software engineer to join our growing team. You will be responsible for building scalable web applications using React, Node.js, and cloud technologies.',
  requirements: '5+ years of experience with React, Node.js, and cloud platforms. Strong problem-solving skills and team collaboration.',
  salary_range: '£80,000 - £100,000',
  job_type: 'full-time',
  is_remote: false,
  created_at: new Date().toISOString(),
  status: 'approved'
};

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // FIXED: sequenced instead of two independent async calls racing each
    // other — fetch the user first, then load the job with that user in hand.
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);
      await loadJob(currentUser);
    }
    init();
  }, [id]);

  async function loadJob(currentUser) {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
      if (error || !data) {
        setJob(SAMPLE_JOB);
      } else {
        setJob(data);
      }

      if (currentUser) {
        const { data: savedCheck } = await supabase
          .from('saved_jobs')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('job_id', id)
          .maybeSingle();
        setSaved(!!savedCheck);
      }
    } catch (err) {
      console.error('Error loading job:', err);
      setJob(SAMPLE_JOB);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user) {
      toast.error('Please sign in to save jobs');
      navigate('/sign-in');
      return;
    }
    
    if (saved) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', id);
      setSaved(false);
      toast.success('Job removed from saved');
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: id });
      setSaved(true);
      toast.success('Job saved!');
    }
  }

  async function handleReport() {
    if (!user) {
      toast.error('Please sign in to report');
      return;
    }
    const reason = prompt('Please explain why you are reporting this job:');
    if (reason) {
      // NOTE: `job_reports` is not confirmed to exist in the real schema —
      // the platform's fraud-reporting feature elsewhere is generally
      // referred to as `fraud_reports`. Left as-is rather than guessed, since
      // this may be a genuinely distinct table for job-specific reports.
      // Worth confirming directly in Supabase before relying on this.
      await supabase.from('job_reports').insert({ job_id: id, user_id: user.id, reason });
      toast.success('Thank you for reporting. We will review it.');
    }
  }

  async function handleApply(e) {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to apply');
      navigate('/sign-in');
      return;
    }
    
    setSubmitting(true);
    try {
      // FIXED: applicant_id (not user_id) to match the confirmed real
      // job_applications schema; status 'pending' (not 'submitted') to match
      // the status values the rest of the app filters on; removed the
      // speculative applied_at field in favor of the table's own timestamp default.
      await supabase.from('job_applications').insert({
        job_id: id,
        applicant_id: user.id,
        cover_letter: coverLetter,
        status: 'pending'
      });
      toast.success('Application submitted successfully!');
      setShowApplyForm(false);
      setCoverLetter('');
    } catch (err) {
      console.error('Error submitting application:', err);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  }

  function getCountryFlag(code) {
    const flags = { GB: '🇬🇧', US: '🇺🇸', NG: '🇳🇬', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷' };
    return flags[code] || '🌍';
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: job?.title,
          text: `Check out this job: ${job?.title} at ${job?.company}`,
          url: window.location.href
        });
      } catch (err) { console.log('Share cancelled'); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">Job not found</p>
          <Link to="/jobs" className="mt-4 inline-block text-primary-400 hover:underline">Back to Jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </button>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getCountryFlag(job.country_code)}</span>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{job.title}</h1>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Building className="w-4 h-4" />
                <span>{job.company}</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                <MapPin className="w-4 h-4" />
                <span>{job.location || 'Remote'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition">
                <Bookmark className={`w-5 h-5 ${saved ? 'fill-primary-400 text-primary-400' : 'text-slate-400'}`} />
              </button>
              <button onClick={handleShare} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition">
                <Share2 className="w-5 h-5 text-slate-400" />
              </button>
              <button onClick={handleReport} className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 transition">
                <Flag className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Job Meta */}
          <div className="flex flex-wrap gap-4 py-4 border-y border-slate-800 mb-6">
            <div className="flex items-center gap-2 text-slate-400">
              <DollarSign className="w-4 h-4" />
              <span>{job.salary_range || 'Competitive'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span>{job.job_type || 'full-time'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
            </div>
            {job.is_remote && <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">Remote</span>}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-3">Job Description</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Requirements */}
          {job.requirements && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-3">Requirements</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{job.requirements}</p>
            </div>
          )}

          {/* Apply Button */}
          {!showApplyForm ? (
            <button
              onClick={() => setShowApplyForm(true)}
              className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" /> Apply Now
            </button>
          ) : (
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Cover Letter</label>
                <textarea
                  rows={6}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  placeholder="Tell us why you're a great fit for this role..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Submit Application'}
                </button>
                <button type="button" onClick={() => setShowApplyForm(false)} className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
