// src/components/JobCard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building, MapPin, DollarSign, Clock, Bookmark, BookmarkCheck, TrendingUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function JobCard({ job, showMatchScore = false, onSaveToggle }) {
  const [isSaved, setIsSaved] = useState(false);
  const [user, setUser] = useState(null);
  const [matchScore, setMatchScore] = useState(null);

  useEffect(() => {
    checkUser();
    if (showMatchScore && job.id) {
      calculateMatchScore();
    }
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    
    if (session?.user) {
      const { data: saved } = await supabase
        .from('saved_jobs')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('job_id', job.id)
        .single();
      setIsSaved(!!saved);
    }
  }

  async function calculateMatchScore() {
    if (!user) return;
    
    const { data: skills } = await supabase
      .from('user_skills')
      .select('skill_name')
      .eq('user_id', user.id)
      .eq('verification_status', 'verified');
    
    if (skills && skills.length > 0 && job.requirements) {
      const reqSkills = job.requirements.toLowerCase();
      const matching = skills.filter(s => reqSkills.includes(s.skill_name.toLowerCase()));
      const score = Math.min(100, Math.round((matching.length / 5) * 100));
      setMatchScore(score);
    }
  }

  async function handleSaveToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      window.location.href = '/sign-in';
      return;
    }
    
    if (isSaved) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', job.id);
      setIsSaved(false);
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: job.id });
      setIsSaved(true);
    }
    if (onSaveToggle) onSaveToggle();
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 hover:-translate-y-1 transition-all duration-200">
      <div className="flex justify-between items-start">
        <Link to={`/jobs/${job.id}`} className="flex-1">
          <h3 className="text-lg font-semibold text-white hover:text-primary-400 transition">{job.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
            <Building className="w-3.5 h-3.5" />
            <span>{job.company}</span>
          </div>
        </Link>
        <button onClick={handleSaveToggle} className="p-1.5 rounded-lg hover:bg-slate-800 transition">
          {isSaved ? <BookmarkCheck className="w-5 h-5 text-primary-400" /> : <Bookmark className="w-5 h-5 text-slate-500" />}
        </button>
      </div>
      
      <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-400">
        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location || 'Remote'}</span>
        <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> {job.salary_range || 'Competitive'}</span>
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(job.created_at).toLocaleDateString()}</span>
      </div>
      
      <p className="text-slate-400 text-sm mt-3 line-clamp-2">{job.description?.substring(0, 120)}...</p>
      
      <div className="flex justify-between items-center mt-4">
        {showMatchScore && matchScore && (
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="w-3 h-3 text-primary-400" />
            <span className="text-primary-400">{matchScore}% Match</span>
          </div>
        )}
        <Link to={`/jobs/${job.id}`} className="text-primary-400 text-sm hover:underline ml-auto">
          View Details →
        </Link>
      </div>
    </div>
  );
}
