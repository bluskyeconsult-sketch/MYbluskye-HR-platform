import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, user_type: 'tester', is_tester: true } }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user) {
      const testerExpiry = new Date();
      testerExpiry.setDate(testerExpiry.getDate() + 28);
      
      await supabase.from('profiles').update({
        user_type: 'tester',
        is_tester: true,
        tester_expires_at: testerExpiry.toISOString(),
        tier: 'free'
      }).eq('id', data.user.id);
      
      await supabase.from('tester_allocations').insert({
        user_id: data.user.id,
        allocated_uses: 20,
        used_uses: 0,
        remaining_uses: 20,
        expires_at: testerExpiry.toISOString(),
        status: 'active'
      });
      
      alert('Tester account created! You have 4 weeks of free access.');
      navigate('/tester-login');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Join ODUSBABA</h1>
        <p className="text-slate-400 mb-6">4 weeks free tester access - No credit card required</p>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50">
            {loading ? 'Creating account...' : 'Start 4-Week Free Trial'}
          </button>
        </form>
        
        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account? <Link to="/sign-in" className="text-emerald-400 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
