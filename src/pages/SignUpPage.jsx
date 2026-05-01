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
  const [selectedTier, setSelectedTier] = useState('free');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const tiers = [
    { 
      id: 'free', 
      name: 'Free', 
      price: '$0', 
      description: 'Browse jobs only',
      userType: 'free',
      requiresPayment: false,
      redirect: '/dashboard'
    },
    { 
      id: 'registered', 
      name: 'Registered', 
      price: '$0', 
      description: 'Apply to jobs, submit skills',
      userType: 'registered',
      requiresPayment: false,
      redirect: '/dashboard'
    },
    { 
      id: 'professional', 
      name: 'Professional', 
      price: '$39.99/month', 
      description: 'Unlimited applications, AI features',
      userType: 'professional',
      requiresPayment: true,
      redirect: '/dashboard'
    },
    { 
      id: 'employer', 
      name: 'Employer', 
      price: '$129.99/month', 
      description: 'Post jobs, view applicants',
      userType: 'employer',
      requiresPayment: true,
      redirect: '/employer/dashboard'
    },
    { 
      id: 'business', 
      name: 'Business', 
      price: '$399.99/month', 
      description: 'Unlimited jobs, team accounts (5 users)',
      userType: 'business',
      requiresPayment: true,
      redirect: '/employer/dashboard'
    }
  ];

  async function handleSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const selected = tiers.find(t => t.id === selectedTier);
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: fullName, 
          user_type: selected.userType,
          tier: selectedTier,
          company_name: companyName
        } 
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user) {
      // Create company profile for employers
      if (selectedTier === 'employer' || selectedTier === 'business') {
        await supabase.from('company_profiles').insert({
          user_id: data.user.id,
          company_name: companyName || 'My Company'
        });
      }
      
      if (selected.requiresPayment) {
        // Redirect to Stripe checkout
        alert(`Please complete payment for ${selected.name} plan (${selected.price})`);
        // In production: window.location.href = '/checkout?tier=' + selectedTier;
        navigate('/pricing');
      } else {
        alert('Account created! Please check your email for confirmation.');
        navigate('/sign-in');
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-slate-400 mb-6">Choose the plan that works for you</p>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500" required />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500" required />
            <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
          </div>
          
          {(selectedTier === 'employer' || selectedTier === 'business') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500" placeholder="Your company name" />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Select your plan</label>
            <div className="space-y-3">
              {tiers.map(tier => (
                <label key={tier.id} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedTier === tier.id 
                    ? 'border-primary-500 bg-primary-500/10' 
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}>
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      name="tier"
                      value={tier.id}
                      checked={selectedTier === tier.id}
                      onChange={() => setSelectedTier(tier.id)}
                      className="w-4 h-4 text-primary-500"
                    />
                    <div>
                      <div className="font-semibold text-white">{tier.name}</div>
                      <div className="text-sm text-slate-400">{tier.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary-400">{tier.price}</div>
                    {tier.id === 'business' && <div className="text-xs text-slate-500">5 team accounts</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50">
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account? <Link to="/sign-in" className="text-primary-400 hover:underline">Sign In</Link>
        </p>
        <p className="text-center text-xs text-slate-500 mt-4">
          By signing up, you agree to our <Link to="/legal/terms" className="text-primary-400 hover:underline">Terms</Link>
        </p>
      </div>
    </div>
  );
}
