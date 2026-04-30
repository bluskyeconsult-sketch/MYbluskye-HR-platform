import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { registerTester } from '../../services/testerService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TesterRegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await registerTester(email, password, fullName, inviteCode);
    if (result.success) { navigate('/tester-login'); }
    else { setError(result.error); setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Become a Tester</h1>
        <p className="text-slate-400 mb-6">Join our testing program with an invite code</p>
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-300 mb-1">Invite Code</label><input type="text" placeholder="Enter your invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500" required /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500" required /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500" required /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500" required /></div>
          <button type="submit" disabled={loading} className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">{loading ? 'Registering...' : 'Register as Tester'}</button>
        </form>
      </div>
    </div>
  );
}
