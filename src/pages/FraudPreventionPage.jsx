import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Flag, 
  Mail, 
  Phone, 
  Clock,
  Fingerprint,
  Lock,
  UserCheck,
  Eye,
  FileText,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  Award,
  TrendingUp,
  BarChart3
} from 'lucide-react';

export default function FraudPreventionPage() {
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // FIXED (2026-08-16): this form never actually saved anything —
  // "Simulate API call - Replace with actual backend" — now saves to the
  // real fraud_reports table, the same one AdminFraudReports.jsx already
  // manages.
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('fraud_reports').insert({
        report_type: reportType,
        description: reportDescription,
        reported_by: user?.id || null,
        status: 'pending'
      });

      if (error) throw error;

      setReportSubmitted(true);
      setReportType('');
      setReportDescription('');
      setTimeout(() => setReportSubmitted(false), 5000);
    } catch (error) {
      console.error('Fraud report submission error:', error);
      alert('Failed to submit report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // FIXED (2026-08-16): every stat below was fabricated — no ML model with
  // a measured "detection rate" exists (the real fraud detection built
  // this session is a simple rule-based database trigger), no transaction-
  // monitoring AI exists (payments go through Stripe directly), and the
  // specific counts ("5,000+ verified", "1M+ requests", "10,000+ scams
  // prevented") don't match this platform's actual confirmed scale
  // anywhere else in the codebase. Presenting invented statistics on a
  // page specifically about fraud protection is a serious credibility and
  // litigation risk — replaced with accurate descriptions of what the
  // platform actually does, with no fabricated numbers.
  const securityFeatures = [
    {
      icon: Shield,
      title: "Automated Fraud Screening",
      description: "New job listings are automatically checked for common red flags before going live",
      color: "purple"
    },
    {
      icon: UserCheck,
      title: "Manual Skill Verification",
      description: "Professional profiles are reviewed by our team before appearing on the marketplace",
      color: "blue"
    },
    {
      icon: Fingerprint,
      title: "Rate Limiting",
      description: "Automated protections help prevent abuse and bulk fraudulent activity",
      color: "green"
    },
    {
      icon: Award,
      title: "Employer Verification",
      description: "Employers can submit business verification to build trust with candidates",
      color: "yellow"
    },
    {
      icon: Flag,
      title: "User Reporting System",
      description: "Report suspicious activity directly — our team reviews every report",
      color: "red"
    },
    {
      icon: BarChart3,
      title: "Admin Review",
      description: "Flagged listings and reports are reviewed by our team before action is taken",
      color: "indigo"
    }
  ];

  const commonScams = [
    {
      type: "Fake Job Offers",
      signs: [
        "Requests for upfront payment for training",
        "Too good to be true salary offers",
        "Poor grammar and unprofessional communication",
        "Requests for sensitive personal information"
      ],
      action: "Never pay for job opportunities. Report immediately."
    },
    {
      type: "Identity Theft",
      signs: [
        "Requests for ID/social security numbers",
        "Suspicious links asking for login details",
        "Impersonation of legitimate companies",
        "Urgent requests for personal information"
      ],
      action: "Never share sensitive info outside our secure platform."
    },
    {
      type: "Payment Fraud",
      signs: [
        "Requests to move conversations off-platform",
        "Overpayment then refund requests",
        "Fake payment confirmations",
        "Requests for wire transfers"
      ],
      action: "Keep all transactions within BluSkye platform."
    }
  ];

  const safetyTips = [
    {
      tip: "Always verify profiles",
      description: "Check verification badges and review history before engaging",
      icon: CheckCircle
    },
    {
      tip: "Keep communication on platform",
      description: "Never move conversations to external apps or email",
      icon: Lock
    },
    {
      tip: "Report suspicious activity",
      description: "Use our reporting system immediately for any concerns",
      icon: Flag
    },
    {
      tip: "Enable 2FA on your account",
      description: "Add an extra layer of security to your profile",
      icon: Shield
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-purple-600/10" />
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-sm mb-4">
              <Shield className="w-4 h-4" />
              Security First
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Fraud Prevention & Security
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Your safety is our priority. Learn how we protect you and what you can do to stay secure.
            </p>
          </div>
        </div>
      </div>

      {/* FIXED (2026-08-16): removed fabricated stats (99.9% detection
          rate, 10,000+ scams prevented, etc.) — none had any real system
          or measurement behind them. */}

      {/* Security Features Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Our Security Layers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityFeatures.map((feature, idx) => (
            <div key={idx} className="group bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-purple-500/30 hover:bg-slate-900/70 transition-all">
              <div className={`w-12 h-12 rounded-lg bg-${feature.color}-600/20 flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm mb-3">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Common Scams Section */}
      <div className="bg-slate-900/30 border-y border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Common Scams to Avoid</h2>
            <p className="text-slate-400">Stay informed about the latest fraud tactics</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {commonScams.map((scam, idx) => (
              <div key={idx} className="bg-red-950/20 border border-red-800/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="text-lg font-semibold text-white">{scam.type}</h3>
                </div>
                <ul className="space-y-2 mb-4">
                  {scam.signs.map((sign, signIdx) => (
                    <li key={signIdx} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      {sign}
                    </li>
                  ))}
                </ul>
                <div className="bg-red-600/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-400 font-medium">{scam.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety Tips */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Safety Tips</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {safetyTips.map((tip, idx) => (
            <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
                <tip.icon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{tip.tip}</h3>
              <p className="text-sm text-slate-400">{tip.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What to Do If You Suspect Fraud */}
      <div className="max-w-4xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-600/10 to-purple-600/10 border border-red-500/20 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-2xl font-bold text-white">Suspected Fraud?</h2>
          </div>
          <p className="text-slate-300 mb-6">
            If you encounter suspicious activity or believe you've been targeted by fraud:
          </p>
          <ol className="space-y-3 mb-6">
            <li className="flex items-start gap-2 text-slate-300">
              <span className="font-bold text-red-400">1.</span>
              Stop all communication with the suspected party immediately
            </li>
            <li className="flex items-start gap-2 text-slate-300">
              <span className="font-bold text-red-400">2.</span>
              Take screenshots of all communications as evidence
            </li>
            <li className="flex items-start gap-2 text-slate-300">
              <span className="font-bold text-red-400">3.</span>
              Report using the form below or email security@bluskyeconsult.com
            </li>
            <li className="flex items-start gap-2 text-slate-300">
              <span className="font-bold text-red-400">4.</span>
              Change your password and enable 2FA if not already active
            </li>
          </ol>
        </div>
      </div>

      {/* Report Fraud Form */}
      <div className="max-w-4xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Report Suspicious Activity</h2>
          <p className="text-slate-400 mb-6">
            Help us keep the community safe by reporting any suspicious behavior.
          </p>
          
          {reportSubmitted ? (
            <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-400">Thank you for your report. Our team will review it shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Type of Suspicious Activity
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select a type</option>
                  <option value="fake_job">Fake Job Offer</option>
                  <option value="payment_fraud">Payment Fraud</option>
                  <option value="identity_theft">Identity Theft Attempt</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Please provide details about the suspicious activity..."
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4" />
                    Submit Report
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Contact & Resources */}
      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Contact Security Team</h3>
            </div>
            <p className="text-slate-400 mb-2">For urgent security concerns:</p>
            <a href="mailto:security@bluskyeconsult.com" className="text-purple-400 hover:text-purple-300">
              security@bluskyeconsult.com
            </a>
            <p className="text-xs text-slate-500 mt-4">We aim to respond to critical security issues as quickly as possible</p>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Additional Resources</h3>
            </div>
            <ul className="space-y-2">
              <li>
                <Link to="/legal/terms" className="text-slate-400 hover:text-purple-400 text-sm flex items-center gap-1">
                  Terms of Service <ChevronRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="text-slate-400 hover:text-purple-400 text-sm flex items-center gap-1">
                  Privacy Policy <ChevronRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link to="/safety-tips" className="text-slate-400 hover:text-purple-400 text-sm flex items-center gap-1">
                  More Safety Tips <ChevronRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
