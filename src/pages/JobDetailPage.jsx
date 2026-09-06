// src/pages/JobDetailPage.jsx
//
// FIXED (2026-08-07):
// 1. Was creating its own separate Supabase client instead of importing the
//    shared singleton — same disconnected-session bug as SavedJobsPage.jsx /
//    UserApplications.jsx. Now imports the shared client.
// 2. Race condition: checkUser() and loadJob() both ran independently from the
//    same useEffect, and loadJob() read the `user` state variable to decide
//    whether to check saved-job status. Since state updates are async, loadJob
//    almost always saw the stale initial `user === null`, so the "already
//    saved" bookmark indicator was unreliable. Now sequenced: fetch the user
//    first, then load the job with that resolved user passed in directly.
// 3. handleApply() inserted into job_applications using `user_id` and
//    `status: 'submitted'`. The confirmed real job_applications handler
//    (api/index.js) filters applications by `applicant_id`, not `user_id` —
//    the insert was almost certainly failing outright with a column error.
//    `'submitted'` also doesn't match the status values used elsewhere
//    (`pending`/`accepted`/`rejected`). Fixed to use `applicant_id` and
//    `status: 'pending'`, and removed a speculative `applied_at` field in
//    favor of the table's default timestamp column.
// 4. `job_reports` table used in handleReport() is not confirmed to exist in
//    the real schema — flagged with a comment, not changed, since guessing a
//    different table name risks being equally wrong.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Briefcase, MapPin, DollarSign, Calendar, Clock, Building, 
  Users, CheckCircle, Award, TrendingUp, Save, Bookmark,
  Share2, Flag, ExternalLink, Loader2, ArrowLeft, Send, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

// Sample job for fallback
// FIXED (2026-08-16): this used to be SAMPLE_JOB, a completely fabricated
// job posting ("Tech Innovations", invented salary and requirements)
// shown to real users whenever a job ID didn't resolve — a deleted job, a
// stale bookmark, a bad link. The user had no way to tell it wasn't real,
// and could have tried to "apply" to a company that doesn't exist. The
// proper "Job Not Found" state already existed further down in this file
// and was fully built — it just never triggered because fake data was set
// instead. Removed entirely; both fallback sites now set null directly,
// correctly triggering the real not-found state.

const SEO_URL_BASE = 'https://bluskyeconsult.com';

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // NEW (2026-08-22): currency was hardcoded to GBP regardless of
    // source_country, despite this platform sourcing jobs from the US,
    // Nigeria, Canada, Australia, Germany, and Ireland (confirmed via
    // JOB_SOURCES in the job-fetch pipeline). A US job listed with GBP
    // salary figures in structured data is simply wrong information
    // handed to Google, not just a cosmetic gap.
    const CURRENCY_BY_COUNTRY = {
      GB: 'GBP', US: 'USD', NG: 'NGN', CA: 'CAD',
      AU: 'AUD', DE: 'EUR', IE: 'EUR'
    };

    // NEW (2026-08-22): Google requires validThrough on JobPosting
    // structured data to keep a listing eligible for job rich
    // results — without it, Google may treat the posting as stale
    // indefinitely or decline to show it at all. No explicit expiry
    // column is confirmed to exist on `jobs`, so this computes a
    // reasonable 45-day window from datePosted rather than guessing
    // at an unconfirmed column name. If a real expiry field does
    // exist, prefer that instead once confirmed.
    function computeValidThrough(postedAt) {
      const posted = postedAt ? new Date(postedAt) : new Date();
      const validThrough = new Date(posted);
      validThrough.setDate(validThrough.getDate() + 45);
      return validThrough.toISOString();
    }

    // NEW (2026-08-16): JobPosting structured data (JSON-LD) — unlocks
    // Google's dedicated job-search rich results. Only injected for real,
    // successfully-loaded jobs; removed on unmount/navigation so it never
    // lingers and describes the wrong job on a different page.
    if (!job || job.id === 'sample') return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'job-posting-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org/',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description || '',
      datePosted: job.posted_at || job.created_at,
      validThrough: computeValidThrough(job.posted_at || job.created_at),
      employmentType: (job.job_type || 'FULL_TIME').toUpperCase().replace('-', '_'),
      hiringOrganization: {
        '@type': 'Organization',
        name: job.company || 'Employer',
      },
      jobLocation: {
        '@type': 'Place',
        address: { '@type': 'PostalAddress', addressLocality: job.location || '', addressCountry: job.source_country || '' }
      },
      ...(job.salary_min && job.salary_max ? {
        baseSalary: {
          '@type': 'MonetaryAmount',
          currency: CURRENCY_BY_COUNTRY[job.source_country] || 'GBP',
          value: { '@type': 'QuantitativeValue', minValue: job.salary_min, maxValue: job.salary_max, unitText: 'YEAR' }
        }
      } : {}),
      directApply: !!job.external_apply_url,
      url: `${SEO_URL_BASE}/jobs/${job.id}`
    });
    document.head.appendChild(script);

    document.title = `${job.title} at ${job.company || 'Employer'} | ODUSBABA Jobs`;

    // NEW (2026-08-16): Open Graph + Twitter Card meta tags — this is
    // what actually controls how the page looks when shared on
    // LinkedIn, Facebook, Twitter/X, or WhatsApp. Without these, a shared
    // job link shows no preview at all (or a generic, unhelpful one) —
    // real, lost marketing reach every time someone shares a listing.
    const metaTags = [
      { property: 'og:title', content: `${job.title} at ${job.company || 'Employer'}` },
      { property: 'og:description', content: (job.description || '').substring(0, 200) },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SEO_URL_BASE}/jobs/${job.id}` },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: `${job.title} at ${job.company || 'Employer'}` },
      { name: 'twitter:description', content: (job.description || '').substring(0, 200) }
    ];

    const addedTags = [];
    metaTags.forEach(tag => {
      const el = document.createElement('meta');
      if (tag.property) el.setAttribute('property', tag.property);
      if (tag.name) el.setAttribute('name', tag.name);
      el.setAttribute('content', tag.content);
      el.setAttribute('data-dynamic-seo', 'true');
      document.head.appendChild(el);
      addedTags.push(el);
    });

    return () => {
      const existing = document.getElementById('job-posting-jsonld');
      if (existing) existing.remove();
      addedTags.forEach(el => el.remove());
    };
  }, [job]);

  useEffect(() => {
    // FIXED: sequenced instead of two independent async calls racing each
    // other — fetch the user first, then load the job with that user in hand.
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);
      await loadJob(currentUser);
    }
    init();
  }, [id]);

  async function loadJob(currentUser) {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
      if (error || !data) {
        setJob(null);
      } else {
        setJob(data);
      }

      if (currentUser) {
        const { data: savedCheck } = await supabase
          .from('saved_jobs')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('job_id', id)
          .maybeSingle();
        setSaved(!!savedCheck);
      }
    } catch (err) {
      console.error('Error loading job:', err);
      setJob(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user) {
      toast.error('Please sign in to save jobs');
      navigate('/sign-in');
      return;
    }
    
    if (saved) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', id);
      setSaved(false);
      toast.success('Job removed from saved');
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: id });
      setSaved(true);
      toast.success('Job saved!');
    }
  }

  async function handleReport() {
    if (!user) {
      toast.error('Please sign in to report');
      return;
    }
    const reason = prompt('Please explain why you are reporting this job:');
    if (reason) {
      // CONFIRMED (2026-09-04): job_reports was checked directly against
      // the real schema and didn't exist - see create-job-reports-table.sql,
      // which creates it with real RLS policies. This insert is correct
      // once that migration has been run.
      await supabase.from('job_reports').insert({ job_id: id, user_id: user.id, reason });
      toast.success('Thank you for reporting. We will review it.');
    }
  }

  const [cvFile, setCvFile] = useState(null);
  const [uploadingCv, setUploadingCv] = useState(false);

  async function handleApply(e) {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to apply');
      navigate('/sign-in');
      return;
    }
    
    setSubmitting(true);
    try {
      // NEW: upload the CV to the private job-cvs bucket first, under
      // the applicant's own user id folder - matches the folder-based
      // ownership check the bucket's storage policies require.
      let cvUrl = null;
      if (cvFile) {
        setUploadingCv(true);
        const filePath = `${user.id}/${Date.now()}_${cvFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('job-cvs')
          .upload(filePath, cvFile);
        setUploadingCv(false);
        if (uploadError) {
          toast.error('Failed to upload CV: ' + uploadError.message);
          setSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('job-cvs').getPublicUrl(filePath);
        cvUrl = urlData?.publicUrl || filePath;
      }

      // FIXED: applicant_id (not user_id) to match the confirmed real
      // job_applications schema; status 'pending' (not 'submitted') to match
      // the status values the rest of the app filters on; removed the
      // speculative applied_at field in favor of the table's own timestamp default.
      await supabase.from('job_applications').insert({
        job_id: id,
        applicant_id: user.id,
        cover_letter: coverLetter,
        cv_url: cvUrl,
        status: 'pending'
      });
      toast.success('Application submitted successfully!');
      setShowApplyForm(false);
      setCoverLetter('');
      setCvFile(null);
    } catch (err) {
      console.error('Error submitting application:', err);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  }

  function getCountryFlag(code) {
    const flags = { GB: '🇬🇧', US: '🇺🇸', NG: '🇳🇬', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷' };
    return flags[code] || '🌍';
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: job?.title,
          text: `Check out this job: ${job?.title} at ${job?.company}`,
          url: window.location.href
        });
      } catch (err) { console.log('Share cancelled'); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">Job not found</p>
          <Link to="/jobs" className="mt-4 inline-block text-primary-400 hover:underline">Back to Jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </button>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-2xl">{getCountryFlag(job.country_code)}</span>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{job.title}</h1>
                {/* NEW (2026-08-27): same real badges JobsPage.jsx already
                    shows on the list view - added here too so this
                    information isn't lost when someone opens the full
                    detail page. */}
                {job.sponsorship_eligible && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Visa Sponsorship
                  </span>
                )}
                {job.source_type === 'authoritative' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Building className="w-4 h-4" />
                <span>{job.company}</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                <MapPin className="w-4 h-4" />
                <span>{job.location || 'Remote'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition">
                <Bookmark className={`w-5 h-5 ${saved ? 'fill-primary-400 text-primary-400' : 'text-slate-400'}`} />
              </button>
              <button onClick={handleShare} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition">
                <Share2 className="w-5 h-5 text-slate-400" />
              </button>
              <button onClick={handleReport} className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 transition">
                <Flag className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Job Meta */}
          <div className="flex flex-wrap gap-4 py-4 border-y border-slate-800 mb-6">
            <div className="flex items-center gap-2 text-slate-400">
              <DollarSign className="w-4 h-4" />
              <span>{job.salary_range || 'Competitive'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span>{job.job_type || 'full-time'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
            </div>
            {job.is_remote && <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">Remote</span>}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-3">Job Description</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Requirements */}
          {job.requirements && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-3">Requirements</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{job.requirements}</p>
            </div>
          )}

          {/* Apply Button */}
          {/* NEW: external jobs (sourced from another job board) should
              submit through that source's own application process, not
              this internal form - the internal form's cover letter and
              CV upload only make sense for jobs posted directly on this
              platform by a real employer account here. */}
          {job.external_apply_url ? (
            <a
              href={job.external_apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" /> Apply on {job.source_name || 'Original Site'}
            </a>
          ) : !showApplyForm ? (
            <button
              onClick={() => setShowApplyForm(true)}
              className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" /> Apply Now
            </button>
          ) : (
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Cover Letter</label>
                <textarea
                  rows={6}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  placeholder="Tell us why you're a great fit for this role..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">CV / Resume (optional)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:text-sm"
                />
                {cvFile && <p className="text-xs text-slate-400 mt-1">{cvFile.name}</p>}
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : uploadingCv ? 'Uploading CV...' : 'Submit Application'}
                </button>
                <button type="button" onClick={() => setShowApplyForm(false)} className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
