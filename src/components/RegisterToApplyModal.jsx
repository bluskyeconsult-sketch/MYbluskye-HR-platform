// src/components/RegisterToApplyModal.jsx
//
// NEW (2026-10-12): shown when someone clicks Apply without being allowed to apply yet.
//   mode 'signedOut' -> Register / Sign in
//   mode 'free'      -> See plans (upgrade to Registered)
// Used by the Jobs list and the job page so the message is the same everywhere.

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { X, Briefcase, CheckCircle } from 'lucide-react';

export default function RegisterToApplyModal({ mode, jobTitle, returnTo, onClose }) {
    const reduce = useReducedMotion();
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const signedOut = mode === 'signedOut';
    const back = encodeURIComponent(returnTo || (typeof window !== 'undefined' ? window.location.pathname : '/jobs'));

    return (
        <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
            initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} role="dialog" aria-modal="true" aria-label="Register to apply"
        >
            <motion.div
                className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
                initial={reduce ? false : { opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/20 text-primary-300"><Briefcase className="w-6 h-6" /></div>
                <h2 className="text-xl font-bold text-white">{signedOut ? 'Register to apply' : 'Upgrade to apply'}</h2>
                {jobTitle ? <p className="mt-1 text-sm text-slate-400">for {jobTitle}</p> : null}
                <p className="mt-3 text-slate-300">
                    {signedOut
                        ? 'Applying is for registered members. Create your account to apply, and keep every application in one place.'
                        : 'Your Free plan can browse and save jobs, but applying needs a Registered account. Upgrade to apply to as many jobs as you like.'}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    {['Apply with your CV and cover letter', 'Track every application, including ones made on employer sites', 'Save jobs and get job alerts'].map((t) => (
                        <li key={t} className="flex items-start gap-2"><CheckCircle className="mt-0.5 w-4 h-4 flex-shrink-0 text-emerald-400" />{t}</li>
                    ))}
                </ul>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    {signedOut ? (
                        <>
                            <Link to="/sign-up?tier=registered" className="flex-1 rounded-lg bg-primary-600 py-2.5 text-center font-medium text-white hover:bg-primary-500">Register</Link>
                            <Link to={`/sign-in?redirect=${back}`} className="flex-1 rounded-lg border border-slate-600 py-2.5 text-center font-medium text-slate-200 hover:bg-slate-800">Sign in</Link>
                        </>
                    ) : (
                        <Link to="/pricing" className="flex-1 rounded-lg bg-primary-600 py-2.5 text-center font-medium text-white hover:bg-primary-500">See plans</Link>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
