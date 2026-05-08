// src/pages/JobDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Briefcase, MapPin, DollarSign, Calendar, Clock, Building, 
  Users, CheckCircle, XCircle, Award, TrendingUp, Save, 
  Share2, Flag, ExternalLink, Loader2, Heart, Bookmark,
  FileText, Send, ChevronLeft, Eye
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userSkills, setUserSkills] = useState([]);
  const [matchScore, setMatchScore] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [similarJobs, setSimilarJobs] = useState([]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
        
        const { data: skills } = await supabase
          .from('user_skills')
          .select('skill_name')
          .eq('user_id', session.user.id)
          .eq('verification_status', 'verified');
        setUserSkills(skills || []);
      }
      
      // Get job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (jobError) throw jobError;
      setJob(jobData);
      
      // Calculate match score if user has skills
      if (userSkills.length > 0 && jobData.requirements) {
        // Simple matching algorithm
        const reqSkills = jobData.requirements.toLowerCase();
        const matchingSkills = userSkills.filter(skill => 
          reqSkills.includes(skill.skill_name.toLowerCase())
        );
        const score = Math.min(100, Math.round((matchingSkills.length / 5) * 100));
        setMatchScore(score);
      }
      
      // Check if job is saved
      if (session?.user) {
        const { data: saved } = await supabase
          .from('saved_jobs')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('job_id', id)
          .single();
        setIsSaved(!!saved);
      }
      
      // Load similar jobs
      if (jobData) {
        const { data: similar } = await supabase
          .from('jobs')
          .select('id, title, company, location, salary_range, created_at')
          .eq('status', 'approved')
          .neq('id', id)
          .ilike('title', `%${jobData.title.split(' ')[0]}%`)
          .limit(3);
        setSimilarJobs(similar || []);
      }
      
    } catch (err) {
      console.error('Error loading job:', err);
      toast.error('Failed to load job details');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  }

  async function toggleSaveJob() {
    if (!user) {
      toast.error('Please sign in to save jobs');
      navigate('/sign-in');
      return;
    }
    
    try {
      if (isSaved) {
        await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', id);
        setIsSaved(false);
        toast.success('Job removed from saved');
      } else {
        await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: id });
        setIsSaved(true);
        toast.success('Job saved successfully');
      }
    } catch (err) {
      toast.error('Failed to save job');
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
      let cvUrl = null;
      
      // Upload CV if provided
      if (cvFile) {
        const fileName = `${user.id}-${Date.now()}-${cvFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('cvs')
          .upload(fileName, cvFile);
        
        if (uploadError) throw uploadError;
        cvUrl = uploadData.path;
      }
      
      // Submit application
      const { error: applyError } = await supabase
        .from('job_applications')
        .insert({
          job_id: id,
          user_id: user.id,
          cover_letter: coverLetter,
          cv_url: cvUrl,
          match_score: matchScore || 0,
          status: 'submitted'
        });
      
      if (applyError) throw applyError;
      
      toast.success('Application submitted successfully!');
      setShowApplyForm(false);
      setCoverLetter('');
      setCvFile(null);
      
    } catch (err) {
      console.error('Application error:', err);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
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
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Jobs
        </button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-white">{job.title}</h1>
                  <div className="flex items-center gap-2 mt-2 text-slate-400">
                    <Building className="w-4 h-4" />
                    <span>{job.company}</span>
                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                    <MapPin className="w-4 h-4" />
                    <span>{job.location || 'Remote'}</span>
                  </div>
                </div>
                <button
                  onClick={toggleSaveJob}
                  className={`p-2 rounded-lg transition ${isSaved ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  <Bookmark className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 text-slate-400">
                  <DollarSign className="w-4 h-4" />
                  <span>{job.salary_range || 'Competitive'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Eye className="w-4 h-4" />
                  <span>{job.views || 0} views</span>
                </div>
              </div>
            </div>
            
            {/* Match Score Card */}
            {matchScore && (
              <div className="bg-gradient-to-r from-primary-600/20 to-purple-600/20 border border-primary-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-primary-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Your Match Score</h3>
                    <p className="text-slate-400">Based on your verified skills</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-3xl font-bold text-primary-400">{matchScore}%</div>
                    <div className="w-32 h-2 bg-slate-700 rounded-full mt-1">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${matchScore}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Job Description */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Job Description</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{job.description}</p>
            </div>
            
            {/* Requirements */}
            {job.requirements && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Requirements</h2>
                <p className="text-slate-300 whitespace-pre-wrap">{job.requirements}</p>
              </div>
            )}
            
            {/* Apply Button */}
            <button
              onClick={() => setShowApplyForm(true)}
              className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" /> Apply Now
            </button>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Application Form Modal (Inline) */}
            {showApplyForm && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Apply for this position</h2>
                <form onSubmit={handleApply} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cover Letter</label>
                    <textarea
                      rows={6}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      placeholder="Tell us why you're a great fit for this role..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Upload CV</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setCvFile(e.target.files[0])}
                      className="w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-500"
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
              </div>
            )}
            
            {/* Similar Jobs */}
            {similarJobs.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Similar Jobs</h2>
                <div className="space-y-3">
                  {similarJobs.map(similar => (
                    <Link key={similar.id} to={`/jobs/${similar.id}`} className="block p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition">
                      <h3 className="font-medium text-white">{similar.title}</h3>
                      <p className="text-sm text-slate-400">{similar.company}</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                        <span>{similar.location}</span>
                        <span>{similar.salary_range}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
