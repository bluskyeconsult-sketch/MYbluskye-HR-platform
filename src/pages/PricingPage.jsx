import { useState } from 'react';
import { Check, X, HelpCircle, CreditCard, Briefcase, Brain, FileText, Bell, Bookmark, MessageCircle, Users, Zap } from 'lucide-react';

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
      va_tasks_included: 0,
      assessments_included: 0,
      ai_chat_messages: 5,
      cv_analysis: 1,
      skill_gap_analysis: 1,
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
      va_tasks_included: 1,
      assessments_included: 1,
      ai_chat_messages: 20,
      cv_analysis: 3,
      skill_gap_analysis: 5,
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
      va_tasks_included: 10,
      assessments_included: 5,
      ai_chat_messages: 100,
      cv_analysis: 20,
      skill_gap_analysis: 20,
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
      va_tasks_included: 5,
      assessments_included: 3,
      ai_chat_messages: 50,
      cv_analysis: 10,
      skill_gap_analysis: 10,
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
      va_tasks_included: 20,
      assessments_included: 10,
      ai_chat_messages: 'Unlimited',
      cv_analysis: 'Unlimited',
      skill_gap_analysis: 'Unlimited',
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
  { key: 'va_tasks_included', label: 'VA Tasks (Monthly)', icon: Zap, tooltip: 'Virtual Assistant tasks included' },
  { key: 'assessments_included', label: 'Assessments (Monthly)', icon: Brain, tooltip: 'Psychometric assessments included' },
  { key: 'ai_chat_messages', label: 'AI Chat Messages', icon: MessageCircle, tooltip: 'Messages with ODUSBABA AI' },
  { key: 'cv_analysis', label: 'CV Analyses', icon: FileText, tooltip: 'AI-powered CV analysis' },
  { key: 'skill_gap_analysis', label: 'Skill Gap Analyses', icon: Brain, tooltip: 'Identify skill gaps' },
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include core features with no hidden fees.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-slate-900 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'monthly' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'yearly' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly <span className="text-emerald-400 text-xs ml-1">Save 17%</span>
            </button>
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
                  ${billingCycle === 'monthly' ? tier.price : (tier.priceYearly / 12).toFixed(2)}
                </span>
                <span className="text-slate-400">/month</span>
                {billingCycle === 'yearly' && tier.priceYearly > 0 && (
                  <p className="text-xs text-slate-500 mt-1">Billed annually (${tier.priceYearly}/year)</p>
                )}
                {tier.price === 0 && <p className="text-xs text-emerald-400 mt-1">Free forever</p>}
              </div>
              <a
                href={tier.price === 0 ? '/sign-up' : '/pricing/checkout'}
                className={`block w-full py-2 rounded-lg text-white font-medium transition-all ${tier.buttonColor}`}
              >
                {tier.price === 0 ? 'Get Started' : 'Subscribe Now'}
              </a>
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
          <p className="text-slate-400 text-center mb-6">Get additional VA tasks and assessments beyond your plan's included limits</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">5 Credits</div>
              <div className="text-emerald-400">$25</div>
              <div className="text-xs text-slate-500">$5/credit</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">10 Credits</div>
              <div className="text-emerald-400">$45</div>
              <div className="text-xs text-slate-500">$4.50/credit</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center border border-emerald-500/30">
              <div className="text-lg font-bold text-white">25 Credits</div>
              <div className="text-emerald-400">$95</div>
              <div className="text-xs text-slate-500">$3.80/credit</div>
              <span className="text-xs text-emerald-400">Best Value</span>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">50 Credits</div>
              <div className="text-emerald-400">$165</div>
              <div className="text-xs text-slate-500">$3.30/credit</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">100 Credits</div>
              <div className="text-emerald-400">$299</div>
              <div className="text-xs text-slate-500">$2.99/credit</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">Credits never expire. Use for any VA task or assessment.</p>
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
