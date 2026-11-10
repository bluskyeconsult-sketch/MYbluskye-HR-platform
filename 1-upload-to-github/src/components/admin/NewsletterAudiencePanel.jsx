// src/components/admin/NewsletterAudiencePanel.jsx
// One reconciled picture of members and newsletter subscribers. Registering is recommended, never required:
// nobody loses the newsletter for not registering. The only removal is blocking an address that is a danger to others or the site.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { authenticatedFetch } from '../../lib/authFetch';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NewsletterAudiencePanel({ onChanged }) {
    const [a, setA] = useState(null);
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState('');
    const [blockEmail, setBlockEmail] = useState('');
    const [blockWhy, setBlockWhy] = useState('');
    const load = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_audience_summary');
        if (error) setMsg('Could not load the audience numbers. Has 30-audience-reconcile-and-register-rule.sql been run?'); else setA(data);
    }, []);
    useEffect(() => { load(); }, [load]);
    const run = async (action, body, confirmText) => {
        if (confirmText && !confirm(confirmText)) return;
        setBusy(action); setMsg('');
        try {
            const r = await authenticatedFetch(action, body || {});
            setMsg(r.message || 'Done.');
            await load(); onChanged && onChanged();
        } catch (e) { setMsg(e.message); } finally { setBusy(''); }
    };
    if (!a) return <div className="mb-6 text-sm text-slate-500">{msg || 'Loading audience numbers...'}</div>;
    const row = (k, v, hint) => <tr key={k} className="border-t border-slate-800"><td className="py-1.5 pr-4 text-slate-300">{k}</td><td className="py-1.5 pr-4 text-white font-semibold text-right">{v}</td><td className="py-1.5 text-xs text-slate-500">{hint}</td></tr>;
    const inp = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white';
    return (
        <section className="mb-8 bg-slate-900/50 border border-slate-800 rounded-xl p-4" aria-labelledby="aud">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="aud" className="text-white font-semibold">Audience: members and subscribers, reconciled</h2><Link to="/admin/newsletter-subscribers" className="text-sm text-primary-400 hover:text-primary-300">View all subscribers</Link></div>
            <p className="text-xs text-slate-400 mt-1">Subscribers are matched to member accounts by email. Everyone keeps the newsletter; registering is strongly recommended, not required.</p>
            <table className="mt-3 w-full text-sm"><tbody>
                {row('Registered members', a.members, `${a.testers} of them are testers`)}
                {row('Subscribers (all rows)', a.subscribers_total, 'the lines below add up to this')}
                {row('  Active, with an account', a.active_members, 'receiving emails')}
                {row('  Active, no account yet', a.active_unregistered, `${a.not_yet_invited} not yet invited to register, ${a.invited} invited`)}
                {row('  Waiting to confirm their email', a.pending, 'not emailed until they confirm')}
                {row('  Unsubscribed', a.unsubscribed, 'never emailed again')}
                {row('  Blocked', a.blocked, 'danger to others or the site; never emailed')}
                {row('Members who are not subscribers', a.members_not_subscribed, 'registered but not on the newsletter list')}
            </tbody></table>
            <div className="mt-3">
                <button disabled={!!busy || a.active_unregistered === 0} onClick={() => run('admin-newsletter-nudge', {}, 'Send the friendly "create your free account" invitation to up to 100 subscribers without an account? They keep the newsletter either way.')} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg text-sm inline-flex items-center gap-2">{busy === 'admin-newsletter-nudge' && <Loader2 className="w-4 h-4 animate-spin" />}Invite subscribers to register ({a.not_yet_invited} not yet invited)</button>
                <p className="text-xs text-slate-500 mt-1">Each newsletter also carries a small "create your free account" box for subscribers without one. Up to 3 invitations per person, 21 days apart.</p>
            </div>
            <div className="mt-4 border-t border-slate-800 pt-3">
                <h3 className="text-sm text-slate-300 font-medium">Block an address (abuse, scraping or spam only)</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                    <input value={blockEmail} onChange={e => setBlockEmail(e.target.value)} placeholder="Email address" aria-label="Email to block" className={inp + ' flex-1 min-w-[12rem]'} />
                    <input value={blockWhy} onChange={e => setBlockWhy(e.target.value)} placeholder="Reason (optional)" aria-label="Reason" className={inp + ' flex-1 min-w-[10rem]'} />
                    <button disabled={!!busy || !blockEmail.includes('@')} onClick={() => run('admin-newsletter-block', { email: blockEmail, reason: blockWhy || 'abuse' }, `Block ${blockEmail} from all email? Use this only for abuse, scraping or spam sign-ups.`).then(() => setBlockEmail(''))} className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg text-sm">Block</button>
                </div>
            </div>
            {msg && <p className="mt-2 text-sm text-amber-200">{msg}</p>}
        </section>
    );
}
