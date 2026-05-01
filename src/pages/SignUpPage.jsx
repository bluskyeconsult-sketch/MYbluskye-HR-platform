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
  const [userType, setUserType] = useState('job_seeker');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Determine tier based on user type
    let tier = 'free';
    let redirectPath = '/dashboard';
    
    if (userType === 'employer' || userType === 'business') {
      tier = 'employer';
      redirectPath = '/employer/dashboard';
    } else if (userType === 'freelancer') {
      tier = 'registered';
      redirectPath = '/dashboard';
    } else {
      tier = 'free';
      redirectPath = '/dashboard';
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: fullName, 
          user_type: userType,
          tier: tier,
          company_name: companyName
        } 
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user) {
      // Create company profile for employers
      if (userType === 'employer' || userType === 'business') {
        await supabase.from('company_profiles').insert({
          user_id: data.user.id,
          company_name: companyName || 'My Company',
          industry: '',
          company_size: ''
        });
      }
      
      alert('Account created! Please check your email for confirmation.');
      navigate('/sign-in');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-slate-400 mb-6">Join ODUSBABA today</p>
        
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
            <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">I want to</label>
            <select 
              value={userType} 
              onChange={(e) => setUserType(e.target.value)} 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="job_seeker">Find a job (Job Seeker)</option>
              <option value="freelancer">Offer my skills (Freelancer)</option>
              <option value="employer">Hire talent (Employer)</option>
              <option value="business">Hire at scale (Business)</option>
            </select>
          </div>
          
          {(userType === 'employer' || userType === 'business') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" placeholder="Your company name" />
            </div>
          )}
          
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50">
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account? <Link to="/sign-in" className="text-emerald-400 hover:underline">Sign In</Link>
        </p>
        <p className="text-center text-xs text-slate-500 mt-4">
          By signing up, you agree to our <Link to="/legal/terms" className="text-emerald-400 hover:underline">Terms</Link>
        </p>
      </div>
    </div>
  );
}
