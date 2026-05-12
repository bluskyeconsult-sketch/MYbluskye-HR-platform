// src/pages/admin/AdminJobs.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, Search, Loader2, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function AdminJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        checkAdminAndLoadJobs();
    }, []);

    async function checkAdminAndLoadJobs() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.email !== 'bluskyeconsult@gmail.com') {
            window.location.href = '/admin-login';
            return;
        }
        await loadJobs();
    }

    async function loadJobs() {
        const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
        setJobs(data || []);
        setLoading(false);
    }

    async function toggleJobStatus(jobId, currentStatus) {
        await supabase.from('jobs').update({ is_active: !currentStatus }).eq('id', jobId);
        loadJobs();
    }

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>;

    const filteredJobs = jobs.filter(j => j.title?.toLowerCase().includes(searchTerm.toLowerCase()) || j.company?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6"><div><h1 className="text-2xl font-bold text-white">Manage Jobs</h1><p className="text-slate-400">View and moderate all job listings</p></div><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search jobs..." className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" /></div></div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-800/50 border-b border-slate-800"><tr><th className="px-4 py-3 text-left text-white text-sm">Title</th><th className="px-4 py-3 text-left text-white text-sm">Company</th><th className="px-4 py-3 text-left text-white text-sm">Location</th><th className="px-4 py-3 text-left text-white text-sm">Status</th><th className="px-4 py-3 text-left text-white text-sm">Action</th></tr></thead><tbody>{filteredJobs.map(job => (<tr key={job.id} className="border-b border-slate-800 hover:bg-slate-800/30"><td className="px-4 py-3 text-white text-sm">{job.title}</td><td className="px-4 py-3 text-slate-300 text-sm">{job.company}</td><td className="px-4 py-3 text-slate-300 text-sm">{job.location || 'Remote'}</td><td className="px-4 py-3">{job.is_active ? <span className="text-emerald-400 text-sm">Active</span> : <span className="text-red-400 text-sm">Inactive</span>}</td><td className="px-4 py-3"><button onClick={() => toggleJobStatus(job.id, job.is_active)} className={`px-3 py-1 rounded-lg text-xs ${job.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}>{job.is_active ? 'Deactivate' : 'Activate'}</button></td></tr>))}</tbody></table></div></div>
        </div>
    );
}
