// FIXED (2026-08-27): this stub had literally no links anywhere on it.
// TwoFactorSettings.jsx just got a real route added (/settings/security)
// after being found completely orphaned - without a link from here, it
// would still be unreachable in practice, since nobody would know the
// exact URL to type. Kept everything else as the deliberate stub it
// already was - not over-building beyond what's actually needed.

import { Link } from 'react-router-dom';
import { ShieldCheck, ChevronRight } from 'lucide-react';

export default function UserSettings() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-4">
          <p className="text-slate-400">Account settings and preferences coming soon.</p>
        </div>
        <Link
          to="/settings/security"
          className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-primary-500/30 transition"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary-400" />
            <div>
              <p className="text-white font-medium">Security</p>
              <p className="text-slate-400 text-sm">Two-factor authentication and login security</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </Link>
      </div>
    </div>
  );
}
