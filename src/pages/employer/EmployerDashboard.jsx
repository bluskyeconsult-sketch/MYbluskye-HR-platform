import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { Briefcase, Users, TrendingUp, Calendar, Plus, Eye } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function EmployerDashboard() {
  const [stats, setStats] = useState({ jobs: 0, applications: 0, views: 0 });
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // Get company profile
      const { data: companyData } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCompany(companyData);
      
      // Get employer's jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*, applications:job_applications(count)')
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentJobs(jobs || []);
      setStats({
        jobs: jobs?.length || 0,
        applications: jobs?.reduce((sum, j) => sum + (j.applications?.[0]?.count || 0), 0) || 0,
        views: jobs?.reduce((sum, j) => sum + (j.view_count || 0), 0) || 0
      });
    }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Employer Dashboard</h1>
            <p className="text-slate-400 mt-1">Welcome back, {company?.company_name || user?.email}</p>
          </div>
          <Link to="/employer/jobs/new" className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600">
            <Plus className="w-4 h-4" /> Post a Job
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-primary-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.jobs}</div>
                <div className="text-sm text-slate-400">Active Jobs</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.applications}</div>
                <div className="text-sm text-slate-400">Total Applications</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-sky-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.views}</div>
                <div className="text-sm text-slate-400">Profile Views</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link to="/employer/jobs/new" className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition-all">
            <Plus className="w-6 h-6 text-primary-400 mx-auto mb-2" />
            <h3 className="text-white font-medium">Post a Job</h3>
            <p className="text-xs text-slate-400">Create new job listing</p>
          </Link>
          <Link to="/employer/jobs" className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition-all">
            <Briefcase className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <h3 className="text-white font-medium">My Jobs</h3>
            <p className="text-xs text-slate-400">View and manage jobs</p>
          </Link>
          <Link to="/employer/applications" className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition-all">
            <Users className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <h3 className="text-white font-medium">Applications</h3>
            <p className="text-xs text-slate-400">Review candidates</p>
          </Link>
          <Link to="/company-profile" className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition-all">
            <Building2 className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <h3 className="text-white font-medium">Company Profile</h3>
            <p className="text-xs text-slate-400">Update company info</p>
          </Link>
        </div>

        {/* Recent Jobs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Job Posts</h2>
          {recentJobs.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No jobs posted yet. <Link to="/employer/jobs/new" className="text-primary-400 hover:underline">Post your first job</Link></p>
          ) : (
            <div className="space-y-4">
              {recentJobs.map(job => (
                <div key={job.id} className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">{job.title}</h3>
                    <p className="text-sm text-slate-400">Posted {new Date(job.created_at).toLocaleDateString()} • {job.applications?.[0]?.count || 0} applications</p>
                  </div>
                  <Link to={`/employer/jobs/${job.id}`} className="text-primary-400 text-sm hover:underline">View</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
