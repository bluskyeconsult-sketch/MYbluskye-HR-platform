// src/pages/AccountOnHoldPage.jsx   (NEW 2026-11-13)
//
// What a member sees when the security system has put their account on hold (activity that looked automated or unusual).
// It is shown in place of the whole site by the hold check in App.jsx, so a held account cannot use anything else.
// The member can: read what is happening, prove they are a real person (human check) and say how they use ODUSBABA, or sign out.
// Nothing is deleted and no reason is shown (so an attacker learns nothing about what tripped the alarm).
// The server (api/index.js) refuses every action except hold-status and submit-hold-verification while a hold is on, which also
// freezes credits. When an admin releases the account this page notices within 30 seconds and opens the site again.

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { authenticatedFetch } from '../lib/authFetch';
import TurnstileBox from '../components/TurnstileBox';
import { ShieldAlert, Loader2, CheckCircle, LogOut, Send } from 'lucide-react';

export default function AccountOnHoldPage() {
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const captcha = useRef(null); // human check; does nothing until VITE_TURNSTILE_SITE_KEY is set

    // already sent a message earlier? and has an admin released the account since?
    useEffect(() => {
        let stop = false;
        async function check() {
            try {
                const d = await authenticatedFetch('hold-status');
                if (stop || !d) return;
                if (d.held === false) { window.location.href = '/dashboard'; return; }
                if (d.submitted) setSent(true);
            } catch { /* keep the page as it is */ }
        }
        check();
        const timer = setInterval(() => { if (!document.hidden) check(); }, 30000);
        return () => { stop = true; clearInterval(timer); };
    }, []);

    async function submit(e) {
        e.preventDefault();
        setError('');
        if (message.trim().length < 20) { setError('Please write at least a couple of sentences about how you plan to use ODUSBABA.'); return; }
        setBusy(true);
        try {
            const captchaToken = await captcha.current?.getToken();
            captcha.current?.reset();
            await authenticatedFetch('submit-hold-verification', { message: message.trim(), captchaToken: captchaToken || undefined });
            setSent(true);
        } catch (err) {
            setError(err.message || 'Could not send your message. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    async function signOut() {
        try { await supabase.auth.signOut(); } catch { /* go to sign-in either way */ }
        window.location.href = '/sign-in';
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
            <div className="max-w-lg w-full">
                <div className="text-center mb-6">
                    <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your account is on hold</h1>
                    <p className="text-slate-400">
                        To keep ODUSBABA safe for everyone, we pause an account when its activity looks automated or unusual. This is a quick check, not a penalty.
                        Your details and saved work are safe, and nothing has been deleted. Tools and credits are paused until we have heard from you.
                    </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 sm:p-8">
                    {sent ? (
                        <div className="text-center py-2">
                            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <h2 className="text-xl font-semibold text-white mb-2">Thank you, we have your message</h2>
                            <p className="text-slate-400 text-sm">
                                We review these by hand, usually within one working day. You will get an email when your account is active again, and this page will
                                open the site on its own if you leave it open.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label htmlFor="hold-message" className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Tell us how you plan to use ODUSBABA
                                </label>
                                <textarea
                                    id="hold-message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={5}
                                    maxLength={1000}
                                    placeholder="For example: I am a care worker looking for sponsored jobs and I want to try the CV and interview tools."
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">{message.trim().length}/1000. Please write as yourself, in your own words.</p>
                            </div>

                            <TurnstileBox ref={captcha} action="hold-verify" className="flex justify-center" />

                            {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}

                            <button
                                type="submit"
                                disabled={busy}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {busy ? 'Sending...' : 'Confirm I am a real person and send'}
                            </button>
                        </form>
                    )}
                </div>

                <div className="flex items-center justify-between mt-5 text-sm">
                    <Link to="/contact" className="text-primary-400 hover:text-primary-300">Contact support</Link>
                    <button onClick={signOut} className="text-slate-400 hover:text-white flex items-center gap-1.5"><LogOut className="w-4 h-4" /> Sign out</button>
                </div>
            </div>
        </div>
    );
}
