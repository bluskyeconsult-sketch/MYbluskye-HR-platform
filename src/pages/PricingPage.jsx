// FIXED (2026-08-23) — full pricing/cost harmony pass. Every
// ai_credits_monthly and assessments_included number below was
// significantly wrong versus the real, confirmed backend values
// (TIER_MONTHLY_ALLOWANCE and the assessments limits object in
// index.js) — in both directions: some tiers overpromised credits
// customers would never actually receive (Professional showed 100,
// really 25 — a 4x overstatement), others massively undersold real
// benefits already being delivered (Registered showed 1 assessment,
// really 10). Every number below now matches the real backend exactly.
// Also: conversational Virtual Assistants (a new feature — remember
// the conversation within a session) cost 2 credits per message, not
// 1, and require a paid plan — reflected in the tooltip and a new note.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, HelpCircle, CreditCard, Briefcase, Brain, FileText, Bell, Bookmark, MessageCircle, Users, Zap, Loader2 } from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    price: 0,
    priceYearly: 0,
    badge: null,
    color: 'from-slate-600 to-slate-500',
    buttonColor: 'bg-slate-700 hover:bg-slate-600',
    popular: false,
    features: {
      job_browsing: true,
      job_applications: { value: 0, limit: 0 },
      job_posting: false,
      view_applicants: false,
      skill_submission: false,
      trust_score_visibility: false,
      contact_professionals: false,
      // FIXED (2026-08-23): was 5 (this one happened to already be
      // correct) — kept as-is, matches TIER_MONTHLY_ALLOWANCE.free
      // exactly.
      ai_credits_monthly: 5,
      // FIXED (2026-08-23): was 0 — the real backend actually grants
      // free-tier users 3 assessments/month; this was underselling a
      // real benefit already being delivered.
      assessments_included: 3,
      saved_jobs: 0,
      job_alerts: 0,
      newsletter: true,
      articles_access: true,
      affiliate_program: false,
      company_profile: false,
      team_accounts: 0,
      api_access: false
    }
  },
  {
    name: 'Registered',
    price: 0,
    priceYearly: 0,
    badge: 'Most Popular for Job Seekers',
    color: 'from-sky-600 to-sky-500',
    buttonColor: 'bg-sky-600 hover:bg-sky-500',
    popular: true,
    features: {
      job_browsing: true,
      job_applications: { value: 'Unlimited', limit: null },
      job_posting: false,
      view_applicants: false,
      skill_submission: { value: '3 total', limit: 3 },
      trust_score_visibility: true,
      contact_professionals: false,
      // FIXED (2026-08-23): was 20 — real backend allowance is 10.
      ai_credits_monthly: 10,
      // FIXED (2026-08-23): was 1 — real backend allowance is 10, a
      // significant real benefit that was being massively undersold.
      assessments_included: 10,
      saved_jobs: { value: '10 jobs', limit: 10 },
      job_alerts: { value: '3 alerts', limit: 3 },
      newsletter: true,
      articles_access: true,
      affiliate_program: true,
      company_profile: false,
      team_accounts: 0,
      api_access: false
    }
  },
  {
    name: 'Professional',
    price: 39.99,
    priceYearly: 399.99,
    badge: 'Best Value',
    color: 'from-emerald-600 to-emerald-500',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-500',
    popular: false,
    features: {
      job_browsing: true,
      job_applications: { value: 'Unlimited', limit: null },
      job_posting: false,
      view_applicants: false,
      skill_submission: { value: 'Unlimited', limit: null },
      trust_score_visibility: true,
      contact_professionals: true,
      // FIXED (2026-08-23): was 100 — real backend allowance is 25. This
      // was a 4x overstatement of a real, paid benefit — customers were
      // being promised credits the backend would never actually grant.
      ai_credits_monthly: 25,
      // FIXED (2026-08-23): was 5 — real backend allowance is 50.
      assessments_included: 50,
      saved_jobs: { value: 'Unlimited', limit: null },
      job_alerts: { value: 'Unlimited', limit: null },
      newsletter: true,
      articles_access: true,
      affiliate_program: true,
      company_profile: false,
      team_accounts: 0,
      api_access: false
    }
  },
  {
    name: 'Employer',
    price: 129.99,
    priceYearly: 1299.99,
    badge: 'For Hiring Teams',
    color: 'from-purple-600 to-purple-500',
    buttonColor: 'bg-purple-600 hover:bg-purple-500',
    popular: false,
    features: {
      job_browsing: true,
      job_applications: false,
      job_posting: { value: '20 jobs/month', limit: 20 },
      view_applicants: true,
      skill_submission: false,
      trust_score_visibility: true,
      contact_professionals: true,
      // FIXED (2026-08-23): was 60 — real backend allowance is 20, a 3x
      // overstatement of a real, paid benefit.
      ai_credits_monthly: 20,
      // FIXED (2026-08-23): was 3 — real backend allowance is 30.
      assessments_included: 30,
      saved_jobs: false,
      job_alerts: { value: '10 alerts', limit: 10 },
      newsletter: true,
      articles_access: true,
      affiliate_program: true,
      company_profile: true,
      team_accounts: 0,
      api_access: false
    }
  },
  {
    name: 'Business',
    price: 399.99,
    priceYearly: 3999.99,
    badge: 'Enterprise',
    color: 'from-amber-600 to-amber-500',
    buttonColor: 'bg-amber-600 hover:bg-amber-500',
    popular: false,
    features: {
      job_browsing: true,
      job_applications: false,
      job_posting: { value: 'Unlimited', limit: null },
      view_applicants: true,
      skill_submission: false,
      trust_score_visibility: true,
      contact_professionals: true,
      // FIXED (2026-08-23): this comment previously said "300 — even the
      // top tier stays capped... generous for normal use" — an earlier
      // attempt at the same real concern (protecting against runaway
      // OpenAI cost from one account), but landed on a different number
      // (300) than what was actually decided and built into the real
      // backend since then: 200/month, following an explicit decision
      // that business tier gets a high-but-finite cap, not true
      // unlimited. This was a genuine, confirmed customer-facing
      // overstatement (300 promised, 200 actually delivered) — now
      // matches exactly.
      ai_credits_monthly: 200,
      // FIXED (2026-08-23): was 10 — real backend allowance is 100.
      assessments_included: 100,
      saved_jobs: false,
      job_alerts: { value: 'Unlimited', limit: null },
      newsletter: true,
      articles_access: true,
      affiliate_program: true,
      company_profile: true,
      team_accounts: { value: '5 users', limit: 5 },
      api_access: true
    }
  }
];

const benefitCategories = [
  { key: 'job_browsing', label: 'Job Browsing', icon: Briefcase, tooltip: 'Browse and search job listings' },
  { key: 'job_applications', label: 'Job Applications', icon: FileText, tooltip: 'Apply to jobs posted on platform' },
  { key: 'job_posting', label: 'Job Posting', icon: Briefcase, tooltip: 'Post job openings' },
  { key: 'view_applicants', label: 'View Applicants', icon: Users, tooltip: 'See who applied to your jobs' },
  { key: 'skill_submission', label: 'Skill Submission', icon: Brain, tooltip: 'Submit skills for verification' },
  { key: 'trust_score_visibility', label: 'Trust Score', icon: Zap, tooltip: 'See your verified trust score' },
  { key: 'contact_professionals', label: 'Contact Professionals', icon: MessageCircle, tooltip: 'Message other users' },
  { key: 'ai_credits_monthly', label: 'AI Credits (Monthly)', icon: Zap, tooltip: 'One shared credit pool for AI Chat, HR Tools, and single-turn Virtual Assistant tasks (1 credit each) — conversational Virtual Assistants, which remember your conversation, cost 2 credits per message and require a paid plan' },
  { key: 'assessments_included', label: 'Assessments (Monthly)', icon: Brain, tooltip: 'Psychometric assessments included' },
  { key: 'saved_jobs', label: 'Saved Jobs', icon: Bookmark, tooltip: 'Save jobs for later' },
  { key: 'job_alerts', label: 'Job Alerts', icon: Bell, tooltip: 'Email notifications for new jobs' },
  { key: 'newsletter', label: 'Newsletter', icon: Bell, tooltip: 'Weekly platform updates' },
  { key: 'articles_access', label: 'Articles & Publications', icon: FileText, tooltip: 'Access to HR articles' },
  { key: 'affiliate_program', label: 'Affiliate Program', icon: Zap, tooltip: 'Earn commissions on referrals' },
  { key: 'company_profile', label: 'Company Profile', icon: Briefcase, tooltip: 'Branded company page' },
  { key: 'team_accounts', label: 'Team Accounts', icon: Users, tooltip: 'Additional user seats' },
  { key: 'api_access', label: 'API Access', icon: Zap, tooltip: 'Programmatic access' }
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  // NEW (2026-08-16): Free Access Mode notice — checks the same
  // system_config flag the backend uses to bypass payment, so users
  // actually know upgrades are free right now and payment is coming later.
  const [freeAccessMode, setFreeAccessMode] = useState(false);

  useEffect(() => {
    supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'free_access_mode')
      .maybeSingle()
      .then(({ data }) => setFreeAccessMode(data?.config_value?.enabled === true))
      .catch(() => {});
  }, []);

  // FIXED (2026-08-09): the Subscribe button for every paid tier previously
  // linked to /pricing/checkout, a route that doesn't exist anywhere in
  // App.jsx — every paid subscription attempt has always dead-ended,
  // independent of Stripe not being connected yet. Now calls the real
  // create-checkout-session action (Phase D) and redirects to Stripe's
  // hosted checkout page.
  const [checkoutLoading, setCheckoutLoading] = useState(null); // tracks which tier is loading

  async function handleSubscribe(tierName) {
    setCheckoutLoading(tierName);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Stripe checkout needs a real userId to attribute the payment to
        // — send them to sign up first, then back to pricing.
        window.location.href = `/sign-up?redirect=/pricing`;
        return;
      }

      // FIXED (2026-08-28): confirmed severe, live regression - sent
      // userId with no Authorization header. A backend security fix
      // now requires a matching real auth token whenever userId is
      // claimed, meaning every real tier upgrade attempt has been
      // failing with 401 since that fix went out.
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/index?action=create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          tierName: tierName.toLowerCase(),
          userId: user.id,
          userEmail: user.email
        })
      });

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Unable to start checkout: ' + error.message);
      setCheckoutLoading(null);
    }
  }

  function formatValue(value, key) {
    if (value === true) return <Check className="w-5 h-5 text-emerald-400 mx-auto" />;
    if (value === false) return <X className="w-5 h-5 text-slate-500 mx-auto" />;
    if (typeof value === 'object' && value !== null) {
      return <span className="text-sm text-white">{value.value}</span>;
    }
    if (typeof value === 'number') return <span className="text-sm text-white">{value}</span>;
    if (typeof value === 'string') return <span className="text-sm text-white">{value}</span>;
    return <span className="text-sm text-white">{value}</span>;
  }

  // NEW (2026-08-16): the credit-purchase section below was pure display —
  // no click handlers at all, despite looking like real pricing tiles.
  // Wired to the same Stripe checkout pattern as tier subscriptions, but
  // as a one-time payment (mode: 'payment') adding to va_credits.balance
  // instead of upgrading the account tier.
  const [creditCheckoutLoading, setCreditCheckoutLoading] = useState(null);

  async function handlePurchaseCredits(credits) {
    setCreditCheckoutLoading(credits);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/sign-up?redirect=/pricing`;
        return;
      }

      // FIXED (2026-08-28): same confirmed regression as tier upgrades
      // above - every real credit purchase attempt has been failing.
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/index?action=create-credit-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ credits, userId: user.id, userEmail: user.email })
      });

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Credit checkout error:', error);
      alert('Unable to start checkout: ' + error.message);
      setCreditCheckoutLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include core features with no hidden fees.
          </p>
        </div>

        {/* NEW (2026-08-16): Free Access Mode notice — only shows when the
            admin toggle is actually on, so users know upgrades are free
            right now and understand payment is coming later. */}
        {freeAccessMode && (
          <div className="max-w-2xl mx-auto mb-8 bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 text-center">
            <p className="text-sky-400 font-semibold text-sm mb-1">🎉 Free Access During Testing</p>
            <p className="text-slate-300 text-sm">
              We're in a testing period — every tier below is free to activate right now, no payment required.
              This will change to paid access in the future; we'll let you know before that happens.
            </p>
          </div>
        )}

        {/* Billing Toggle */}
        {/* FIXED (2026-08-30): confirmed real, serious issue - this
            toggle only ever changed the DISPLAYED price. The actual
            checkout request never sent a billing-cycle field, and the
            backend maps each tier to exactly one Stripe Price ID with
            no monthly/yearly branching at all. A customer selecting
            Yearly and seeing a discounted annual total could have been
            charged a completely different, disconnected amount. Real
            annual billing needs separate Price objects created in
            Stripe first - deliberately not guessed at here. Disabled
            the interactive toggle until that's genuinely wired,
            replaced with an honest "coming soon" note rather than
            silently removing the concept. billingCycle is now forced
            to 'monthly' so no code path can reach the yearly display
            math at all. */}
        <div className="flex justify-center mb-10">
          <div className="bg-slate-900 p-1 rounded-lg inline-flex items-center gap-3">
            <button
              className="px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white"
            >
              Monthly
            </button>
            <span className="px-4 py-2 text-xs text-slate-500 italic">
              Annual billing coming soon
            </span>
          </div>
        </div>

        {/* Price Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-slate-900/50 border rounded-xl p-6 text-center transition-all hover:-translate-y-1 ${
                tier.popular ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-slate-800'
              }`}
            >
              {tier.badge && (
                <span className={`absolute -top-3 left-1/2 transform -translate-x-1/2 text-xs px-3 py-1 rounded-full bg-gradient-to-r ${tier.color} text-white`}>
                  {tier.badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">
                  ${tier.price}
                </span>
                <span className="text-slate-400">/month</span>
                {tier.price === 0 && <p className="text-xs text-emerald-400 mt-1">Free forever</p>}
              </div>
              <button
                onClick={() => tier.price === 0 ? (window.location.href = '/sign-up') : handleSubscribe(tier.name)}
                disabled={checkoutLoading === tier.name}
                className={`block w-full py-2 rounded-lg text-white font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${tier.buttonColor}`}
              >
                {checkoutLoading === tier.name ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</>
                ) : (
                  tier.price === 0 ? 'Get Started' : (freeAccessMode ? 'Activate Free' : 'Subscribe Now')
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Full Benefits Table */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="px-4 py-4 text-left text-white font-semibold">Feature</th>
                  {tiers.map(tier => (
                    <th key={tier.name} className="px-4 py-4 text-center text-white font-semibold">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {benefitCategories.map((category, idx) => (
                  <tr key={category.key} className={`border-b border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <category.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-300">{category.label}</span>
                        <div className="group relative inline-block">
                          <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
                          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-800 text-xs text-slate-300 p-2 rounded whitespace-nowrap z-10">
                            {category.tooltip}
                          </div>
                        </div>
                      </div>
                    </td>
                    {tiers.map(tier => (
                      <td key={tier.name} className="px-4 py-3 text-center">
                        {formatValue(tier.features[category.key], category.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Credit Pricing Section */}
        <div className="mt-12 bg-slate-900/30 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 text-center">Need Extra? Purchase Credits</h2>
          {/* FIXED (2026-08-23): previously claimed credits also cover
              "assessments beyond your plan's included limits" — checked
              against the real assessment eligibility logic
              (checkAssessmentEligibility in assessmentService.js) and
              confirmed it never references va_credits at all; assessment
              limits are a separate, fixed monthly counter with no
              purchase mechanism. Purchasing credits would not have
              delivered what this promised — corrected to only claim
              what credits actually do. */}
          <p className="text-slate-400 text-center mb-2">Get additional AI Chat, HR Tools, and Virtual Assistant tasks beyond your plan's included monthly credits</p>
          {/* NEW (2026-08-23): conversational VAs (a new feature — the
              assistant remembers your conversation across messages) cost
              more per use than single-turn tasks, reflecting the real,
              higher compute cost of maintaining conversation history —
              and require a paid plan. Stated plainly here since it's a
              real pricing difference customers should know about before
              buying credits. */}
          <p className="text-slate-500 text-sm text-center mb-6">
            Most tasks cost 1 credit. Conversational assistants that remember your conversation cost 2 credits per message and require a paid plan.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
            {[
              { credits: 5, price: '$25', perCredit: '$5/credit' },
              { credits: 10, price: '$45', perCredit: '$4.50/credit' },
              { credits: 25, price: '$95', perCredit: '$3.80/credit', bestValue: true },
              { credits: 50, price: '$165', perCredit: '$3.30/credit' },
              { credits: 100, price: '$299', perCredit: '$2.99/credit' }
            ].map((pack) => (
              <button
                key={pack.credits}
                onClick={() => handlePurchaseCredits(pack.credits)}
                disabled={creditCheckoutLoading === pack.credits}
                className={`bg-slate-800 hover:bg-slate-700 rounded-lg p-3 text-center transition disabled:opacity-60 disabled:cursor-not-allowed ${pack.bestValue ? 'border border-emerald-500/30' : ''}`}
              >
                <div className="text-lg font-bold text-white">{pack.credits} Credits</div>
                <div className="text-emerald-400">{pack.price}</div>
                <div className="text-xs text-slate-500">{pack.perCredit}</div>
                {pack.bestValue && <span className="text-xs text-emerald-400">Best Value</span>}
                {creditCheckoutLoading === pack.credits && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Redirecting...</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">Credits never expire — unused credits carry over and add to next month's allowance.</p>
        </div>

        {/* Free Tier Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            All prices in USD. Geo-pricing available for different regions.{' '}
            <a href="/contact" className="text-emerald-400 hover:underline">Contact sales</a> for enterprise pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
