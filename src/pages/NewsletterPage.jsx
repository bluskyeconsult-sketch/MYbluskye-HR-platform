import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubscribe(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: supabaseError } = await supabase
      .from('newsletter_subscribers')
      .upsert({ email, subscribed_at: new Date().toISOString() });

    if (supabaseError) {
      setError('Failed to subscribe. Please try again.');
    } else {
      setSubscribed(true);
    }
    setLoading(false);
  }

  if (subscribed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">You're Subscribed!</h1>
          <p className="text-slate-400">Thank you for subscribing to the ODUSBABA newsletter. You'll receive updates on new features, jobs, and HR insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">ODUSBABA Newsletter</h1>
          <p className="text-slate-400 text-lg">Stay updated with the latest HR insights, job opportunities, and platform features.</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Weekly Newsletter</h2>
              <p className="text-sm text-slate-400">No spam, unsubscribe anytime</p>
            </div>
          </div>

          <form onSubmit={handleSubscribe} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Subscribing...' : 'Subscribe to Newsletter'}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-6">
            By subscribing, you agree to our <a href="/legal/privacy" className="text-emerald-400 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
