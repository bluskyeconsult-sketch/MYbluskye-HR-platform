// src/lib/applyGate.js
//
// NEW (2026-10-12): one rule for "who may apply", used by the Jobs list and the job page,
// for BOTH on-site applications and links out to an employer's own site.
//
//   signed out        -> asked to register (or sign in)
//   Free tier         -> asked to register / upgrade to Registered
//   Registered and up -> may apply
//
// It also holds the "I applied elsewhere" tracker, which writes to the user's own
// career_applications rows (the same tracker the Career Coach uses; RLS keeps each
// person's rows private).

export function applyGate({ user, capabilities, loading = false }) {
    if (!user) return 'signedOut';
    if (loading) return 'ok';                       // never wrongly block while permissions are still loading
    if (capabilities && capabilities.canApplyJobs === false) return 'free';
    return 'ok';
}

// Records "I applied on the employer's site" for this person and job. Safe to call twice.
export async function markAppliedElsewhere(supabase, user, job) {
    if (!user || !job?.id) return { ok: false, error: 'not signed in' };
    try {
        const { data: existing, error: findErr } = await supabase
            .from('career_applications')
            .select('id')
            .eq('user_id', user.id)
            .eq('job_id', job.id)
            .limit(1);
        if (findErr) throw findErr;
        const now = new Date().toISOString();
        if (existing && existing.length) {
            const { error } = await supabase
                .from('career_applications')
                .update({ status: 'applied', applied_at: now, updated_at: now })
                .eq('id', existing[0].id)
                .eq('user_id', user.id);
            if (error) throw error;
            return { ok: true, id: existing[0].id };
        }
        const { data, error } = await supabase
            .from('career_applications')
            .insert({
                user_id: user.id,
                job_source: 'board',
                job_id: job.id,
                title: String(job.title || 'Job').slice(0, 300),
                company: job.company ? String(job.company).slice(0, 300) : null,
                apply_url: job.external_apply_url || null,
                status: 'applied',
                applied_at: now
            })
            .select('id')
            .single();
        if (error) throw error;
        return { ok: true, id: data?.id };
    } catch (e) {
        return { ok: false, error: e.message || 'could not save' };
    }
}

export async function isTrackedElsewhere(supabase, user, jobId) {
    if (!user || !jobId) return false;
    try {
        const { data } = await supabase
            .from('career_applications')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('job_id', jobId)
            .limit(1);
        return !!(data && data.length && data[0].status !== 'prepared');
    } catch {
        return false;
    }
}

export const ELSEWHERE_STATUSES = [
    { id: 'applied', label: 'Applied' },
    { id: 'interview', label: 'Interview' },
    { id: 'offer', label: 'Offer' },
    { id: 'rejected', label: 'Not successful' },
    { id: 'withdrawn', label: 'Withdrawn' }
];
