import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user) {
      // Get user profile to determine redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, tier')
        .eq('id', data.user.id)
        .single();
      
      // Role-based redirect
      if (profile?.user_type === 'admin' || profile?.user_type === 'super_admin') {
        navigate('/admin/dashboard');
      } else if (profile?.user_type === 'employer' || profile?.user_type === 'business') {
        navigate('/employer/dashboard');
      } else if (profile?.user_type === 'tester') {
        navigate('/tester/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Sign In</h1>
        <p className="text-slate-400 mb-6">Welcome back to ODUSBABA</p>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="text-center mt-4">
          <Link to="/forgot-password" className="text-sm text-slate-400 hover:text-white">Forgot password?</Link>
        </div>
        
        <p className="text-center text-slate-400 text-sm mt-6">
          Don't have an account? <Link to="/sign-up" className="text-emerald-400 hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
