import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, Briefcase, Search, RefreshCw, Loader2, 
  AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, 
  Globe, Clock, MapPin, Building, ThumbsUp, ThumbsDown, X, Square, Save
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Public job APIs configuration
const JOB_API_SOURCES = [
  {
    name: 'UK Jobs API',
    country: 'GB',
    url: 'https://www.reed.co.uk/api/1.0/search?keywords=jobs&location=london&resultsToTake=10',
    apiKey: import.meta.env.VITE_REED_API_KEY,
    transformer: (job) => ({
      title: job.jobTitle,
      company: job.employerName,
      location: job.locationName,
      description: job.jobDescription,
      salary_range: job.minimumSalary ? `£${job.minimumSalary} - £${job.maximumSalary}` : null,
      job_type: job.contractType?.toLowerCase() || 'full-time'
    })
  },
  {
    name: 'Adzuna API',
    country: 'GB',
    url: `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${import.meta.env.VITE_ADZUNA_APP_ID}&app_key=${import.meta.env.VITE_ADZUNA_API_KEY}&results_per_page=10`,
    apiKeyRequired: true,
    transformer: (job) => ({
      title: job.title,
      company: job.company?.display_name,
      location: job.location?.display_name,
      description: job.description,
      salary_range: job.salary_min ? `£${job.salary_min} - £${job.salary_max}` : null,
      job_type: job.contract_type || 'full-time'
    })
  },
  {
    name: 'Arbeitnow API',
    country: 'DE',
    url: 'https://www.arbeitnow.com/api/job-board-api',
    transformer: (job) => ({
      title: job.title,
      company: job.company_name,
      location: job.location,
      description: job.description,
      salary_range: job.salary || null,
      job_type: job.job_type || 'full-time'
    })
  },
  {
    name: 'Remotive API',
    country: 'US',
    url: 'https://remotive.com/api/remote-jobs',
    transformer: (job) => ({
      title: job.title,
      company: job.company_name,
      location: 'Remote',
      description: job.description,
      salary_range: job.salary || null,
      job_type: job.job_type || 'full-time'
    })
  }
];

export default function AdminExternalJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [formData, setFormData] = useState({
    title: '', company: '', location: '', source_name: '', source_country: 'GB', description: '', 
    salary_range: '', job_type: 'full-time', external_apply_url: '', status: 'pending_approval'
  });

  const itemsPerPage = 20;
  const jobTypes = ['full-time', 'part-time', 'contract', 'freelance', 'internship', 'remote'];

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Admin privileges required.');
        window.location.href = '/dashboard';
        return;
      }
      
      setIsAuthorized(true);
      loadJobs();
      loadStats();
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('external_jobs').select('status');
      const total = data?.length || 0;
      const pending = data?.filter(j => j.status === 'pending_approval').length || 0;
      const approved = data?.filter(j => j.status === 'approved').length || 0;
      const rejected = data?.filter(j => j.status === 'rejected').length || 0;
      setStats({ pending, approved, rejected, total });
    } catch (err) { console.error(err); }
  }

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase.from('external_jobs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (selectedSource !== 'all') query = query.eq('source_name', selectedSource);
      if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      setJobs(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      setError('Failed to load external jobs');
      toast.error('Failed to load external jobs');
    } finally { setLoading(false); }
  }

  async function fetchExternalJobs() {
    setFetching(true);
    toast.loading('Fetching jobs from external APIs...', { id: 'fetch-jobs' });
    
    try {
      let allJobs = [];
      
      // Try to fetch from each API
      for (const source of JOB_API_SOURCES) {
        try {
          // Skip if API key required but not available
          if (source.apiKeyRequired && !source.apiKey) {
            console.log(`Skipping ${source.name} - no API key`);
            continue;
          }
          
          const response = await fetch(source.url);
          if (!response.ok) {
            console.log(`Failed to fetch from ${source.name}: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          let jobs = [];
          
          // Parse based on API response structure
          if (source.name === 'Adzuna API' && data.results) {
            jobs = data.results;
          } else if (source.name === 'Arbeitnow API' && data.data) {
            jobs = data.data;
          } else if (source.name === 'Remotive API' && data.jobs) {
            jobs = data.jobs;
          } else if (source.name === 'UK Jobs API' && data.results) {
            jobs = data.results;
          }
          
          for (const job of jobs) {
            try {
              const transformed = source.transformer(job);
              allJobs.push({
                ...transformed,
                source_name: source.name,
                source_country: source.country,
                status: 'pending_approval',
                created_at: new Date().toISOString()
              });
            } catch (transformErr) {
              console.error(`Error transforming job from ${source.name}:`, transformErr);
            }
          }
        } catch (sourceErr) {
          console.error(`Error fetching from ${source.name}:`, sourceErr);
        }
      }
      
      // If no real jobs fetched, use sample data for demonstration
      if (allJobs.length === 0) {
        console.log('No real jobs fetched, using sample data');
        allJobs = getSampleExternalJobs();
      }
      
      // Check for duplicates before inserting
      const { data: existingJobs } = await supabase
        .from('external_jobs')
        .select('title, company, source_name');
      
      const existingKeys = new Set(
        existingJobs?.map(job => `${job.title}|${job.company}|${job.source_name}`) || []
      );
      
      let newCount = 0;
      for (const job of allJobs) {
        const jobKey = `${job.title}|${job.company}|${job.source_name}`;
        if (existingKeys.has(jobKey)) continue;
        
        const { error } = await supabase.from('external_jobs').insert({
          title: job.title,
          company: job.company,
          location: job.location || 'Remote',
          source_name: job.source_name,
          source_country: job.source_country,
          description: job.description || 'No description provided.',
          salary_range: job.salary_range,
          job_type: job.job_type || 'full-time',
          status: 'pending_approval',
          created_at: new Date().toISOString()
        });
        
        if (!error) newCount++;
      }
      
      if (newCount > 0) {
        toast.success(`Fetched ${newCount} new external jobs`, { id: 'fetch-jobs' });
      } else {
        toast.info('No new jobs found. Check back later!', { id: 'fetch-jobs' });
      }
      
      await loadJobs();
      await loadStats();
      
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to fetch external jobs. Please try again.', { id: 'fetch-jobs' });
    } finally {
      setFetching(false);
    }
  }

  function getSampleExternalJobs() {
    return [
      { title: 'Senior Software Engineer', company: 'Tech Corp UK', location: 'London, UK', source_name: 'Sample API', source_country: 'GB', description: 'Looking for experienced software engineer with 5+ years experience.', salary_range: '£80,000 - £100,000', job_type: 'full-time' },
      { title: 'Frontend Developer', company: 'Web Solutions', location: 'Manchester, UK', source_name: 'Sample API', source_country: 'GB', description: 'React, TypeScript, Next.js experience required.', salary_range: '£55,000 - £70,000', job_type: 'full-time' },
      { title: 'Data Scientist', company: 'AI Innovations', location: 'Berlin, Germany', source_name: 'Sample API', source_country: 'DE', description: 'Machine Learning, Python, TensorFlow experience.', salary_range: '€70,000 - €90,000', job_type: 'full-time' },
      { title: 'Product Manager', company: 'StartUp Labs', location: 'Paris, France', source_name: 'Sample API', source_country: 'FR', description: 'Lead product development for SaaS platform.', salary_range: '€65,000 - €85,000', job_type: 'full-time' },
      { title: 'DevOps Engineer', company: 'Cloud Systems', location: 'Remote', source_name: 'Sample API', source_country: 'US', description: 'Kubernetes, AWS, CI/CD experience required.', salary_range: '$120,000 - $150,000', job_type: 'remote' }
    ];
  }

  async function approveJob(id) {
    try { 
      await supabase.from('external_jobs').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id); 
      toast.success('Job approved and will appear in main jobs board');
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

  async function deleteJob(id) { setShowDeleteConfirm({ id, type: 'delete' }); }
  
  async function confirmDelete() {
    try { 
      await supabase.from('external_jobs').delete().eq('id', showDeleteConfirm.id); 
      toast.success('Job deleted'); 
      await loadJobs(); 
      await loadStats(); 
    } catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  function getStatusBadge(status) {
    if (status === 'approved') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400"><CheckCircle className="w-3 h-3" /> Approved</span>;
    if (status === 'rejected') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400"><XCircle className="w-3 h-3" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400"><Clock className="w-3 h-3" /> Pending</span>;
  }

  function getCountryFlag(countryCode) {
    const flags = { GB: '🇬🇧', US: '🇺🇸', NG: '🇳🇬', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷' };
    return flags[countryCode] || '🌍';
  }

  const uniqueSources = [...new Set(jobs.map(j => j.source_name).filter(Boolean))];

  useEffect(() => { setCurrentPage(1); if (isAuthorized) loadJobs(); }, [searchTerm, selectedSource, selectedStatus]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      
      <ConfirmModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={confirmDelete} title="Confirm Delete" message="Delete this job? This cannot be undone." />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary-400" /> External Jobs Moderation
            </h1>
            <p className="text-slate-400 text-sm">Fetch and moderate jobs from external APIs</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchExternalJobs} disabled={fetching} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-500 disabled:opacity-50">
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {fetching ? 'Fetching...' : 'Fetch Jobs from APIs'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Pending</p><p className="text-2xl font-bold text-amber-400">{stats.pending}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Approved</p><p className="text-2xl font-bold text-emerald-400">{stats.approved}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Rejected</p><p className="text-2xl font-bold text-red-400">{stats.rejected}</p></div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search by title or company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
            <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="all">All Sources</option>{uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="all">All Status</option><option value="pending_approval">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
            <button onClick={loadJobs} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Jobs Table */}
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
        : error ? <div className="text-center py-12 text-red-400">{error}<button onClick={loadJobs} className="ml-2 text-primary-400">Retry</button></div>
        : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No external jobs found</p>
            <button onClick={fetchExternalJobs} disabled={fetching} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Fetch Jobs from APIs</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr><th className="px-4 py-3 text-left text-white text-sm">Source</th><th className="px-4 py-3 text-left text-white text-sm">Title / Company</th><th className="px-4 py-3 text-left text-white text-sm">Location</th><th className="px-4 py-3 text-left text-white text-sm">Status</th><th className="px-4 py-3 text-left text-white text-sm">Actions</th></tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-4 py-3"><span className="flex items-center gap-1"><span>{getCountryFlag(job.source_country)}</span> <span className="text-sm text-slate-300">{job.source_name}</span></span></td>
                    <td className="px-4 py-3"><div><p className="font-medium text-white">{job.title}</p><p className="text-sm text-slate-400">{job.company}</p></div></td>
                    <td className="px-4 py-3 text-slate-300 text-sm"><MapPin className="w-3 h-3 inline mr-1" /> {job.location || 'Remote'}</td>
                    <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                    <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => approveJob(job.id)} disabled={job.status === 'approved'} className="p-1.5 bg-slate-800 rounded hover:bg-emerald-500/20"><ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /></button><button onClick={() => rejectJob(job.id)} disabled={job.status === 'rejected'} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><ThumbsDown className="w-3.5 h-3.5 text-red-400" /></button><button onClick={() => deleteJob(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && <div className="flex justify-between mt-6"><span>Page {currentPage} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg">Prev</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg">Next</button></div></div>}
          </div>
        )}
      </div>
    </div>
  );
}
