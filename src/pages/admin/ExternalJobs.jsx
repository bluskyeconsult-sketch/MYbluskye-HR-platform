// src/pages/admin/ExternalJobs.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ExternalJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchExternalJobs() {
            try {
                const { data, error } = await supabase
                    .from('external_jobs')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                setJobs(data || []);
            } catch (err) {
                console.error('Error loading external jobs:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchExternalJobs();
    }, []);

    if (loading) {
        return (
            <div className="p-8 text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                <p className="mt-2 text-slate-400">Loading external jobs...</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-6">External Jobs Manager</h1>
            {jobs.length === 0 ? (
                <p className="text-slate-400">No external jobs found.</p>
            ) : (
                <div className="space-y-4">
                    {jobs.map(job => (
                        <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <h3 className="text-white font-semibold">{job.title}</h3>
                            <p className="text-slate-400 text-sm">{job.source}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
