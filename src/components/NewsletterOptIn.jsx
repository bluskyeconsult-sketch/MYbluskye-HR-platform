// src/components/NewsletterOptIn.jsx
// A signed-in member chooses for themselves whether to receive the newsletter. Nothing is switched on for them.
import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../lib/authFetch';
import { Mail } from 'lucide-react';

export default function NewsletterOptIn() {
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    useEffect(() => { authenticatedFetch('newsletter-member-status', {}).then(r => setStatus(r.status)).catch(() => setStatus('error')); }, []);
    const set = async (subscribe) => {
        setBusy(true); setMsg('');
        try { const r = await authenticatedFetch('newsletter-member-set', { subscribe }); setStatus(r.status); setMsg(subscribe ? 'You are subscribed.' : 'You are unsubscribed.'); }
        catch (e) { setMsg(e.message); } finally { setBusy(false); }
    };
    if (status === null || status === 'error') return null;
    const on = status === 'active';
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary-400 mt-0.5" />
                <div className="flex-1">
                    <p className="text-white font-medium">ODUSBABA newsletter</p>
                    <p className="text-slate-400 text-sm">{on ? 'You receive our newsletter: new jobs, career advice and platform news.' : status === 'pending' ? 'Please click the confirmation link we emailed you to start receiving the newsletter.' : 'Get new jobs, career advice and platform news in your inbox. You can stop at any time.'}</p>
                    {msg && <p className="text-xs text-amber-200 mt-1">{msg}</p>}
                </div>
                <button disabled={busy || status === 'pending'} onClick={() => set(!on)} className={`px-4 py-2 rounded-lg text-sm disabled:opacity-40 ${on ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-primary-600 hover:bg-primary-500 text-white'}`}>{on ? 'Unsubscribe' : 'Subscribe'}</button>
            </div>
        </div>
    );
}
