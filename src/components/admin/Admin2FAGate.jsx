// src/components/admin/Admin2FAGate.jsx  (NEW 2026-11-11)
// Wraps every admin page. Admin pages only render after the server confirms this sign-in session has passed
// its two-factor check. The check is enforced by the API (not just by this screen).
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Loader2, KeyRound } from 'lucide-react';
import { authenticatedFetch } from '../../lib/authFetch';
import { setAdminProof, clearAdminProof } from '../../lib/adminProof';

export default function Admin2FAGate({ children }) {
    const [state, setState] = useState({ loading: true });
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const check = useCallback(async () => {
        try {
            const s = await authenticatedFetch('admin-2fa-status', {});
            setState({ loading: false, ...s });
        } catch (e) {
            setState({ loading: false, failed: true, message: e.message });
        }
    }, []);

    useEffect(() => {
        check();
        const onNeeded = () => { clearAdminProof(); check(); };
        window.addEventListener('admin-2fa-needed', onNeeded);
        return () => window.removeEventListener('admin-2fa-needed', onNeeded);
    }, [check]);

    const submit = async (e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setBusy(true); setError('');
        try {
            const r = await authenticatedFetch('verify-2fa', { userId: state.userId, code: code.trim() });
            if (r && r.valid && r.proof) { setAdminProof(r.proof); setCode(''); await check(); }
            else setError('That code was not accepted. Try the next code, or a backup code.');
        } catch (err) {
            setError(err.message || 'That code was not accepted.');
        } finally { setBusy(false); }
    };

    if (state.loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-400 animate-spin" /></div>;
    }
    if (state.failed) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 p-6">Could not check your admin access. Please refresh, or sign in again. <button className="ml-3 underline" onClick={check}>Retry</button></div>;
    }
    if (!state.isAdmin || !state.enforced || state.verified) return children;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <h1 className="text-white text-lg font-bold">Admin two-factor check</h1>
                </div>
                {!state.enrolled ? (
                    <>
                        <p className="text-slate-300 text-sm mb-4">Two-factor sign-in is not set up on this account. The admin area is closed until it is.</p>
                        <Link to="/settings/security" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-lg"><KeyRound className="w-4 h-4" /> Set up two-factor now</Link>
                    </>
                ) : (
                    <form onSubmit={submit}>
                        <p className="text-slate-300 text-sm mb-3">Enter the 6-digit code from your authenticator app (or a backup code) to open the admin area.</p>
                        <input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456"
                               className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white tracking-widest text-center text-lg mb-3" />
                        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                        <button disabled={busy} className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">{busy ? 'Checking...' : 'Open admin area'}</button>
                    </form>
                )}
            </div>
        </div>
    );
}
