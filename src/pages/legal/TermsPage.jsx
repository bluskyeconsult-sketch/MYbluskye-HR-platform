import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, AlertCircle, CreditCard, Users, Briefcase, 
  BookOpen, Zap, Scale, Heart, Mail, Clock, CheckCircle,
  AlertTriangle, FileText, ExternalLink, ChevronRight
} from 'lucide-react';

export default function TermsPage() {
  // Track page view for analytics
  useEffect(() => {
    try {
      console.log('Terms Page Viewed', {
        timestamp: new Date().toISOString(),
        path: window.location.pathname
      });
    } catch (err) {}
  }, []);

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      icon: Shield,
      content: "By accessing or using ODUSBABA (the 'Platform'), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform."
    },
    {
      id: "eligibility",
      title: "2. Eligibility",
      icon: Users,
      content: "You must be at least 16 years old to use this Platform. By using the Platform, you represent that you meet this requirement. ODUSBABA reserves the right to verify age and eligibility."
    },
    {
      id: "account-registration",
      title: "3. Account Registration",
      icon: FileText,
      content: "You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials. Notify us immediately of any unauthorized access.",
      highlight: "Single Account Policy: Each user may maintain only one active account. Creating multiple accounts is prohibited and will result in suspension of all associated accounts."
    },
    {
      id: "account-tiers",
      title: "4. User Accounts & Tiers",
      icon: Users,
      content: "ODUSBABA offers five account tiers with different benefits:",
      list: [
        "Free Tier: Limited browsing access only. Cannot apply to jobs or submit skills.",
        "Registered Tier: Free tier with extended benefits including job applications, skill submission, and basic AI features.",
        "Professional Tier: Paid monthly subscription with unlimited access to core features.",
        "Employer Tier: Paid monthly subscription for hiring organizations.",
        "Business Tier: Paid monthly subscription for enterprises with team accounts."
      ],
      note: "Tier benefits are subject to change. Current benefits are displayed on the Pricing page."
    },
    {
      id: "job-applications",
      title: "5. Job Applications",
      icon: Briefcase,
      content: "Job applications are free for all Registered users. This is a marketing feature designed to help job seekers find opportunities. ODUSBABA does not guarantee job placement or interview success. Employers are responsible for the accuracy of job postings."
    },
    {
      id: "job-alerts",
      title: "6. Job Alerts & Newsletter",
      icon: Mail,
      content: "Job alerts and newsletter subscriptions are free for all Registered users. You may unsubscribe at any time by clicking the 'Unsubscribe' link in any email or adjusting your account settings."
    },
    {
      id: "virtual-assistant",
      title: "7. Virtual Assistant Services",
      icon: Zap,
      content: "Virtual Assistant (VA) services are AI-powered automated task execution tools. Each tier includes a monthly quota of VA tasks. Additional tasks may be purchased using Credits.",
      quality: "Quality Guarantee: If a VA task does not meet quality standards, you may reject the output. After 3 rejections, the task will be reviewed by a human administrator."
    },
    {
      id: "assessments",
      title: "8. Assessments",
      icon: BookOpen,
      content: "Psychometric and skill assessments are AI-scored tools for self-evaluation. Results are for informational purposes only and do not constitute professional certification or guarantee of job placement."
    },
    {
      id: "credit-system",
      title: "9. Credit System",
      icon: CreditCard,
      content: "Credits are virtual currency used to purchase additional VA tasks and assessments beyond your plan's included limits.",
      list: [
        "Credits are non-refundable",
        "Credits expire 12 months from purchase date",
        "Credits may be transferred between accounts only with admin approval",
        "Unused credits are not refunded upon account cancellation",
        "Credits have no cash value and cannot be exchanged for money"
      ]
    },
    {
      id: "no-double-charging",
      title: "10. No Double Charging",
      icon: Shield,
      content: "Your monthly subscription includes specified quotas for VA tasks, assessments, and AI features. Credits are only required for services exceeding these included quotas. You will never be charged twice for the same service."
    },
    {
      id: "payments",
      title: "11. Payments & Subscriptions",
      icon: CreditCard,
      content: "Subscription fees are billed monthly or annually depending on your selected plan. Refunds are provided within 14 days of purchase for unused services. After 14 days, subscription fees are non-refundable.",
      note: "All payments are processed securely through our payment processors. ODUSBABA does not store full payment information."
    },
    {
      id: "affiliate-program",
      title: "12. Affiliate Program",
      icon: Heart,
      content: "Registered users may participate in the affiliate program. Commissions are earned on qualifying referrals and paid upon request after reaching minimum payout thresholds ($50).",
      list: [
        "Commission rates vary by product tier",
        "Payouts processed monthly via PayPal or bank transfer",
        "Fraudulent referrals will result in account termination",
        "Affiliates must comply with our Affiliate Agreement"
      ]
    },
    {
      id: "prohibited-conduct",
      title: "13. Prohibited Conduct",
      icon: AlertTriangle,
      content: "The following activities are strictly prohibited:",
      list: [
        "Creating multiple accounts to exploit free tier benefits",
        "Scraping or data mining the platform",
        "Posting fraudulent job listings",
        "Submitting false skill claims",
        "Harassing, abusing, or harming other users",
        "Attempting to bypass security measures",
        "Uploading malicious code or viruses",
        "Impersonating any person or entity",
        "Posting discriminatory job listings"
      ]
    },
    {
      id: "suspension",
      title: "14. Account Suspension & Termination",
      icon: AlertCircle,
      content: "ODUSBABA reserves the right to suspend or terminate accounts that violate these Terms, including creating multiple accounts or abusing free tier benefits. We may also terminate accounts for any reason at our sole discretion.",
      note: "Upon termination, you lose access to all purchased credits and subscription benefits. No refunds will be provided for terminated accounts."
    },
    {
      id: "intellectual-property",
      title: "15. Intellectual Property",
      icon: FileText,
      content: "All content on the Platform, including logos, designs, text, graphics, software, and code, is owned by BluSkye Integrated Consult or its licensors. You may not copy, modify, distribute, or create derivative works without explicit permission."
    },
    {
      id: "limitation-liability",
      title: "16. Limitation of Liability",
      icon: Scale,
      content: "To the fullest extent permitted by law, ODUSBABA and BluSkye Integrated Consult shall not be liable for any indirect, incidental, special, consequential, or exemplary damages arising from use of the platform, including but not limited to loss of profits, data, or business opportunities."
    },
    {
      id: "indemnification",
      title: "17. Indemnification",
      icon: Shield,
      content: "You agree to indemnify and hold harmless BluSkye Integrated Consult, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Platform or violation of these Terms."
    },
    {
      id: "ai-disclaimer",
      title: "18. AI Disclaimer",
      icon: Zap,
      content: "AI-powered features are for informational purposes only. They do not constitute professional legal, financial, or career advice. AI-generated content may contain errors or inaccuracies. Users should review all AI-generated outputs before relying on them."
    },
    {
      id: "governing-law",
      title: "19. Governing Law",
      icon: Scale,
      content: "These terms shall be governed by and construed in accordance with the laws of the United Kingdom. Any disputes arising from these terms shall be resolved in the courts of the United Kingdom."
    },
    {
      id: "changes",
      title: "20. Changes to Terms",
      icon: Clock,
      content: "ODUSBABA may update these Terms at any time. We will notify users of material changes via email or platform notification. Continued use of the platform after changes constitutes acceptance of updated Terms."
    },
    {
      id: "contact",
      title: "21. Contact Information",
      icon: Mail,
      content: "If you have questions about these Terms, please contact us:",
      contact: {
        email: "support@bluskyeconsult.com",
        address: "BluSkye Integrated Consult, Oxford, United Kingdom"
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-purple-600/10" />
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-600/20 text-primary-400 rounded-full text-sm mb-4">
              <FileText className="w-4 h-4" />
              Legal Document
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Terms of Service
            </h1>
            <p className="text-slate-400">
              Last updated: <span className="text-white">May 1, 2026</span>
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm">
              <Link to="/legal/privacy" className="text-primary-400 hover:text-primary-300 flex items-center gap-1">
                Privacy Policy <ExternalLink className="w-3 h-3" />
              </Link>
              <span className="text-slate-600">•</span>
              <Link to="/legal/cookies" className="text-primary-400 hover:text-primary-300 flex items-center gap-1">
                Cookie Policy <ExternalLink className="w-3 h-3" />
              </Link>
              <span className="text-slate-600">•</span>
              <Link to="/legal/disclaimer" className="text-primary-400 hover:text-primary-300 flex items-center gap-1">
                Disclaimer <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="max-w-4xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-400" />
            Table of Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm text-slate-400 hover:text-primary-400 transition-colors flex items-center gap-1"
              >
                <ChevronRight className="w-3 h-3" />
                {section.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Terms Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20 sm:px-6 lg:px-8">
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              id={section.id}
              className={`p-6 ${idx !== sections.length - 1 ? 'border-b border-slate-800' : ''} scroll-mt-20`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <section.icon className="w-4 h-4 text-primary-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  {section.title}
                </h2>
              </div>
              
              <div className="pl-11 space-y-3">
                <p className="text-slate-300 leading-relaxed">
                  {section.content}
                </p>
                
                {section.highlight && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 my-3">
                    <p className="text-amber-400 text-sm font-medium">
                      ⚠️ {section.highlight}
                    </p>
                  </div>
                )}
                
                {section.list && (
                  <ul className="space-y-2 mt-3">
                    {section.list.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                
                {section.quality && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 my-3">
                    <p className="text-emerald-400 text-sm font-medium">
                      ✓ {section.quality}
                    </p>
                  </div>
                )}
                
                {section.note && (
                  <p className="text-sm text-slate-500 italic mt-2">
                    Note: {section.note}
                  </p>
                )}
                
                {section.contact && (
                  <div className="mt-3 space-y-1">
                    <p className="text-slate-300">
                      📧 Email: <a href={`mailto:${section.contact.email}`} className="text-primary-400 hover:underline">
                        {section.contact.email}
                      </a>
                    </p>
                    <p className="text-slate-300">
                      📍 Address: {section.contact.address}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Acknowledgment Section */}
        <div className="mt-8 p-6 bg-primary-500/5 border border-primary-500/20 rounded-xl text-center">
          <h3 className="text-lg font-semibold text-white mb-2">By using ODUSBABA, you acknowledge that:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="w-4 h-4 text-primary-400" />
              You have read and understand these Terms
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="w-4 h-4 text-primary-400" />
              You agree to be bound by these Terms
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="w-4 h-4 text-primary-400" />
              You are eligible to use the Platform
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="w-4 h-4 text-primary-400" />
              You will comply with all applicable laws
            </div>
          </div>
        </div>

        {/* Print Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" />
            Print Terms
          </button>
        </div>
      </div>
    </div>
  );
}
