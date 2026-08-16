import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield } from 'lucide-react';

// FIXED (2026-08-16): disconnected Supabase client (same pattern found and
// fixed repeatedly this session) — now uses the shared singleton. Also
// wired into App.jsx, since this component was never actually mounted
// anywhere on the live site.

export default function TermsPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndTerms();
  }, []);

  async function checkUserAndTerms() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('terms_accepted_at')
        .eq('id', user.id)
        .single();

      if (!profile?.terms_accepted_at) {
        setIsOpen(true);
      }
    }
    setLoading(false);
  }

  async function acceptTerms() {
    if (!agreed) {
      alert('You must accept the Terms of Service to continue.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    setIsOpen(false);
  }

  if (loading || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Terms of Service</h2>
              <p className="text-sm text-slate-400">Please read and accept to continue</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm text-slate-300">
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
            <p className="font-semibold text-primary-400 mb-2">⚠️ Important Legal Notice</p>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>By proceeding, you agree to these terms</li>
              <li>We are NOT liable for any hiring or career outcomes</li>
              <li>AI advice is for informational purposes only</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-white">1. Acceptance of Terms</p>
            <p className="text-slate-400">By accessing or using this platform, you agree to these Terms of Service.</p>
          </div>

          <div>
            <p className="font-semibold text-white">2. Account Responsibility</p>
            <p className="text-slate-400">You are responsible for maintaining the security of your account.</p>
          </div>

          <div>
            <p className="font-semibold text-white">3. Limitation of Liability</p>
            <p className="text-slate-400">BluSkye Integrated Consult shall not be liable for any indirect, incidental, or consequential damages.</p>
          </div>

          <div>
            <p className="font-semibold text-white">4. AI Disclaimer</p>
            <p className="text-slate-400">AI-powered features are informational only. They do not constitute professional legal, financial, or career advice.</p>
          </div>

          <div>
            <p className="font-semibold text-white">5. Data Privacy</p>
            <p className="text-slate-400">Your data is handled according to our Privacy Policy. You may request deletion at any time.</p>
          </div>

          <div>
            <p className="font-semibold text-white">6. Governing Law</p>
            <p className="text-slate-400">These terms are governed by the laws of the United Kingdom.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-5">
          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-primary-500"
            />
            <span className="text-sm text-slate-300">
              I have read and agree to the Terms of Service and Privacy Policy
            </span>
          </label>

          <button
            onClick={acceptTerms}
            disabled={!agreed}
            className="w-full py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Accept & Continue
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            <a href="/legal/terms" className="text-primary-400 hover:underline">View full terms</a>
            {' • '}
            <a href="/legal/privacy" className="text-primary-400 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
