// src/pages/admin/AdminExternalJobs.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RefreshCw, Loader2, CheckCircle, XCircle, Clock, Globe, Briefcase, MapPin, Building, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sample jobs for demonstration (will work without API keys)
const SAMPLE_EXTERNAL_JOBS = [
  { title: 'Senior Software Engineer', company: 'Tech Corp', location: 'London, UK', country: 'GB', description: 'Looking for experienced software engineer with 5+ years experience.', salary: '£80,000 - £100,000', source: 'LinkedIn', type: 'full-time' },
  { title: 'HR Business Partner', company: 'Global HR Ltd', location: 'Manchester, UK', country: 'GB', description: 'Join our growing HR team.', salary: '£55,000 - £70,000', source: 'Indeed', type: 'full-time' },
  { title: 'Product Manager', company: 'Innovate Ltd', location: 'Lagos, Nigeria', country: 'NG', description: 'Lead product development for SaaS platform.', salary: '₦15,000,000 - ₦25,000,000', source: 'Jobberman', type: 'full-time' },
  { title: 'Data Analyst', company: 'Data Corp', location: 'Toronto, Canada', country: 'CA', description: 'Analyze business data and create reports.', salary: 'CAD 70,000 - CAD 90,000', source: 'Glassdoor', type: 'full-time' },
  { title: 'DevOps Engineer', company: 'Cloud Systems', location: 'Berlin, Germany', country: 'DE', description: 'Kubernetes and AWS experience required.', salary: '€70,000 - €90,000', source: 'Stack Overflow', type: 'full-time' },
  { title: 'Marketing Specialist', company: 'Market Pro', location: 'Sydney, Australia', country: 'AU', description: 'Digital marketing expert needed.', salary: 'AUD 80,000 - AUD 100,000', source: 'Seek', type: 'full-time' },
  { title: 'Sales Director', company: 'Sales Force', location: 'Paris, France', country: 'FR', description: 'Lead sales team for enterprise clients.', salary: '€90,000 - €120,000', source: 'Welcome to the Jungle', type: 'full-time' }
];

export default function AdminExternalJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => { checkAuth(); loadJobs(); loadStats(); }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/admin-login'; return; }
    setUser(session.user);
    
    const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', session.user.id).single();
    if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
      window.location.href = '/dashboard';
      return;
    }
    setIsAuthorized(true);
  }

  async function loadJobs() {
    try {
      const { data } = await supabase.from('external_jobs').select('*').order('created_at', { ascending: false });
      setJobs(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('external_jobs').select('status');
      const total = data?.length || 0;
      const pending = data?.filter(j => j.status === 'pending_approval').length || 0;
      const approved = data?.filter(j => j.status === 'approved').length || 0;
      const rejected = data?.filter(j => j.status === 'rejected').length || 0;
      setStats({ total, pending, approved, rejected });
    } catch (err) { console.error(err); }
  }

  async function fetchExternalJobs() {
    setFetching(true);
    toast.loading('Fetching external jobs...', { id: 'fetch' });
    
    try {
      let newCount = 0;
      for (const job of SAMPLE_EXTERNAL_JOBS) {
        const { error } = await supabase.from('external_jobs').insert({
          title: job.title,
          company: job.company,
          location: job.location,
          source_country: job.country,
          source_name: job.source,
          description: job.description,
          salary_range: job.salary,
          job_type: job.type,
          status: 'pending_approval',
          fetched_at: new Date().toISOString(),
          fetched_by: user?.id
        });
        if (!error) newCount++;
      }
      toast.success(`Fetched ${newCount} new jobs`, { id: 'fetch' });
      await loadJobs();
      await loadStats();
    } catch (err) {
      toast.error('Failed to fetch jobs', { id: 'fetch' });
    } finally {
      setFetching(false);
    }
  }

  async function approveJob(id) {
    try {
      const { data: job } = await supabase.from('external_jobs').select('*').eq('id', id).single();
      await supabase.from('jobs').insert({
        title: job.title,
        company: job.company,
        location: job.location,
        country_code: job.source_country,
        description: job.description,
        salary_range: job.salary_range,
        job_type: job.job_type,
        status: 'approved',
        is_active: true
      });
      await supabase.from('external_jobs').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id);
      toast.success('Job approved and added to job board');
      await loadJobs();
      await loadStats();
    } catch (err) { toast.error('Failed to approve'); }
  }

  async function rejectJob(id) {
    try {
      await supabase.from('external_jobs').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id);
      toast.success('Job rejected');
      await loadJobs();
      await loadStats();
    } catch (err) { toast.error('Failed to reject'); }
  }

  async function deleteJob(id) {
    try {
      await supabase.from('external_jobs').delete().eq('id', id);
      toast.success('Job deleted');
      await loadJobs();
      await loadStats();
    } catch (err) { toast.error('Failed to delete'); }
  }

  function getStatusBadge(status) {
    switch(status) {
      case 'approved': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400"><XCircle className="w-3 h-3" /> Rejected</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400"><Clock className="w-3 h-3" /> Pending</span>;
    }
  }

  function getCountryFlag(countryCode) {
    const flags = { GB: '🇬🇧', US: '🇺🇸', NG: '🇳🇬', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷' };
    return flags[countryCode] || '🌍';
  }

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary-400" /> External Jobs Moderation
            </h1>
            <p className="text-slate-400 text-sm">Fetch and moderate jobs from external sources</p>
          </div>
          <button onClick={fetchExternalJobs} disabled={fetching} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Fetch External Jobs
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Pending</p><p className="text-2xl font-bold text-amber-400">{stats.pending}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Approved</p><p className="text-2xl font-bold text-emerald-400">{stats.approved}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Rejected</p><p className="text-2xl font-bold text-red-400">{stats.rejected}</p></div>
        </div>

        {/* Jobs Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
            <Globe className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">No external jobs found. Click "Fetch External Jobs" to import listings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr><th className="px-4 py-3 text-left text-white text-sm">Source</th><th className="px-4 py-3 text-left text-white text-sm">Title / Company</th><th className="px-4 py-3 text-left text-white text-sm">Location</th><th className="px-4 py-3 text-left text-white text-sm">Status</th><th className="px-4 py-3 text-left text-white text-sm">Actions</th></tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <React.Fragment key={job.id}>
                    <tr className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-3"><span className="flex items-center gap-2"><span className="text-xl">{getCountryFlag(job.source_country)}</span><span className="text-sm">{job.source_name}</span></span></td>
                      <td className="px-4 py-3"><div><p className="font-medium text-white">{job.title}</p><p className="text-sm text-slate-400">{job.company}</p></div></td>
                      <td className="px-4 py-3 text-slate-300 text-sm"><MapPin className="w-3 h-3 inline mr-1" /> {job.location || 'Remote'}</td>
                      <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                      <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => approveJob(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-emerald-500/20"><ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /></button><button onClick={() => rejectJob(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><ThumbsDown className="w-3.5 h-3.5 text-red-400" /></button><button onClick={() => setExpandedId(expandedId === job.id ? null : job.id)} className="p-1.5 bg-slate-800 rounded"><ChevronDown className="w-3.5 h-3.5" /></button><button onClick={() => deleteJob(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></div></td>
                    </tr>
                    {expandedId === job.id && (
                      <tr className="border-t border-slate-800 bg-slate-900/30"><td colSpan="5" className="px-6 py-4"><div><h4 className="text-sm font-semibold text-white mb-1">Description</h4><p className="text-slate-400 text-sm">{job.description}</p>{job.salary_range && <div className="mt-2"><h4 className="text-sm font-semibold text-white mb-1">Salary</h4><p className="text-slate-400 text-sm">{job.salary_range}</p></div>}</div></td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { ChevronDown } from 'lucide-react';
