import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Eye, Database, Cookie, Mail, Globe, 
  Users, FileText, Clock, Lock, AlertCircle,
  CheckCircle, ExternalLink, ChevronRight, Heart,
  Server, Cloud, Briefcase, CreditCard
} from 'lucide-react';

export default function PrivacyPage() {
  // Track page view for analytics
  useEffect(() => {
    try {
      console.log('Privacy Policy Page Viewed', {
        timestamp: new Date().toISOString(),
        path: window.location.pathname
      });
    } catch (err) {}
  }, []);

  const sections = [
    {
      id: "information-collected",
      title: "1. Information We Collect",
      icon: Database,
      content: "We collect several types of information from and about users of our Platform:",
      subsections: [
        {
          title: "Information You Provide Directly",
          items: [
            "Name, email address, and password (account information)",
            "Professional information (CV, job history, skills, certifications)",
            "Payment information (processed securely by Stripe - we do not store full payment details)",
            "Assessment results and VA task inputs/outputs",
            "Communication preferences and newsletter subscriptions",
            "Support requests and correspondence"
          ]
        },
        {
          title: "Information Collected Automatically",
          items: [
            "IP address and approximate location data",
            "Device and browser information (type, version, OS)",
            "Usage data (pages visited, features used, time spent)",
            "Referring URLs and exit pages",
            "Cookies and similar tracking technologies (see Section 8)",
            "Performance and analytics data"
          ]
        },
        {
          title: "Information from Third Parties",
          items: [
            "Authentication data (if you sign up via Google/LinkedIn)",
            "Payment confirmation from Stripe",
            "Fraud prevention data from security services"
          ]
        }
      ]
    },
    {
      id: "how-we-use",
      title: "2. How We Use Your Information",
      icon: Eye,
      content: "We use your information for the following purposes:",
      items: [
        "Provide, maintain, and improve our services",
        "Process your VA tasks and assessments",
        "Send job alerts and newsletters (you may opt out at any time)",
        "Calculate trust scores and verify skills",
        "Prevent fraud, abuse, and multiple account creation",
        "Comply with legal obligations",
        "Analyze usage patterns to improve user experience",
        "Communicate important service updates"
      ]
    },
    {
      id: "legal-basis",
      title: "3. Legal Basis for Processing (GDPR)",
      icon: FileText,
      content: "Under GDPR, we process your data based on:",
      items: [
        "Contractual necessity: To provide services you request",
        "Legitimate interests: To improve our platform and prevent fraud",
        "Legal obligations: To comply with tax and regulatory requirements",
        "Consent: For marketing communications (which you can withdraw)"
      ]
    },
    {
      id: "data-sharing",
      title: "4. Data Sharing & Disclosure",
      icon: Users,
      content: "We may share your information with:",
      subsections: [
        {
          title: "With Your Consent",
          items: [
            "Employers (when you apply for jobs through our platform)",
            "Skill verifiers (when you request certification)"
          ]
        },
        {
          title: "Service Providers",
          items: [
            "Supabase (database and authentication)",
            "Stripe (payment processing)",
            "OpenAI (AI-powered VA tasks and assessments)",
            "Cloud providers (AWS/Google Cloud for hosting)",
            "Analytics providers (to improve our services)"
          ]
        },
        {
          title: "Legal & Safety",
          items: [
            "Law enforcement when required by law",
            "To protect our rights and prevent fraud",
            "In connection with business transfers (merger, acquisition)"
          ]
        }
      ],
      important: "We do NOT sell your personal information to third parties. We do NOT share your data for cross-context behavioral advertising."
    },
    {
      id: "data-retention",
      title: "5. Data Retention",
      icon: Clock,
      content: "We retain your data for different periods depending on the type:",
      items: [
        "CV/Resume files: Deleted 30 days after upload or when you delete them",
        "VA task inputs/outputs: Available for download for 7 days",
        "Assessment results: Retained permanently in your profile",
        "Chat logs: Retained for 90 days for quality improvement",
        "Account data: Retained until account deletion",
        "Transaction records: Retained for 7 years (tax/legal compliance)",
        "Marketing data: Retained until you unsubscribe"
      ],
      note: "You may request deletion of specific data by contacting privacy@bluskyeconsult.com"
    },
    {
      id: "your-rights",
      title: "6. Your Privacy Rights (GDPR/CCPA)",
      icon: Shield,
      content: "Depending on your location, you have the following rights:",
      items: [
        "Right to Access: Request a copy of your personal data",
        "Right to Rectification: Correct inaccurate or incomplete data",
        "Right to Erasure: Request deletion of your data (Right to be Forgotten)",
        "Right to Restrict Processing: Limit how we use your data",
        "Right to Data Portability: Receive your data in a portable format",
        "Right to Object: Object to processing for direct marketing",
        "Right to Withdraw Consent: Withdraw consent at any time",
        "Right to Non-Discrimination: CCPA - equal service regardless of choices"
      ],
      howTo: "To exercise these rights, email privacy@bluskyeconsult.com. We will respond within 30 days."
    },
    {
      id: "data-security",
      title: "7. Data Security",
      icon: Lock,
      content: "We implement industry-standard security measures to protect your data:",
      items: [
        "Encryption at rest (AES-256) for stored data",
        "Encryption in transit (TLS 1.3) for data transmission",
        "Regular security audits and penetration testing",
        "Access controls and authentication requirements",
        "Employee confidentiality agreements",
        "Incident response procedures"
      ],
      note: "While we take security seriously, no method of transmission is 100% secure."
    },
    {
      id: "cookies",
      title: "8. Cookies & Tracking Technologies",
      icon: Cookie,
      content: "We use cookies and similar technologies to:",
      items: [
        "Essential Cookies: Required for authentication and platform functionality",
        "Functional Cookies: Remember your preferences and settings",
        "Analytics Cookies: Understand how users interact with our platform",
        "Marketing Cookies: Personalize advertisements (with consent)"
      ],
      link: "For detailed information, see our <a href='/legal/cookies' class='text-primary-400 hover:underline'>Cookie Policy</a>",
      note: "You can control cookies through your browser settings. Disabling essential cookies may affect platform functionality."
    },
    {
      id: "international-transfers",
      title: "9. International Data Transfers",
      icon: Globe,
      content: "Your information may be transferred to and processed in countries outside your residence, including the United Kingdom, United States, and European Union.",
      items: [
        "We ensure appropriate safeguards are in place (Standard Contractual Clauses)",
        "We comply with GDPR requirements for international transfers",
        "Data is stored on servers located in the UK and EU"
      ]
    },
    {
      id: "children-privacy",
      title: "10. Children's Privacy",
      icon: Heart,
      content: "Our services are not directed to children under 16 years of age. We do not knowingly collect personal information from children under 16.",
      items: [
        "If you are a parent/guardian and believe your child has provided data, contact us",
        "We will promptly delete any discovered child data",
        "Account creation requires age verification (16+)"
      ]
    },
    {
      id: "california-privacy",
      title: "11. California Privacy Rights (CCPA)",
      icon: Shield,
      content: "California residents have additional rights under the CCPA:",
      items: [
        "Right to know what personal information is collected",
        "Right to delete personal information",
        "Right to opt-out of the sale of personal information (we do not sell data)",
        "Right to non-discrimination for exercising rights",
        "Right to access information about data sharing"
      ],
      note: "California residents may contact privacy@bluskyeconsult.com to exercise these rights."
    },
    {
      id: "data-breaches",
      title: "12. Data Breach Notification",
      icon: AlertCircle,
      content: "In the event of a data breach that affects your personal information:",
      items: [
        "We will notify affected users within 72 hours of discovery",
        "We will report to relevant supervisory authorities as required",
        "We will provide guidance on protective measures"
      ]
    },
    {
      id: "third-party-links",
      title: "13. Third-Party Links",
      icon: ExternalLink,
      content: "Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these sites. We encourage you to read their privacy policies."
    },
    {
      id: "changes-to-policy",
      title: "14. Changes to This Privacy Policy",
      icon: FileText,
      content: "We may update this Privacy Policy from time to time. We will notify you of material changes by:",
      items: [
        "Email notification to your registered address",
        "Notice on our platform when you log in",
        "Updating the 'Last updated' date at the top of this policy"
      ],
      note: "Continued use of the platform after changes constitutes acceptance of the updated policy."
    },
    {
      id: "contact-us",
      title: "15. Contact Information",
      icon: Mail,
      content: "If you have questions about this Privacy Policy or your data:",
      contact: {
        email: "privacy@bluskyeconsult.com",
        dpo: "Data Protection Officer: dpo@bluskyeconsult.com",
        address: "BluSkye Integrated Consult, Oxford, United Kingdom",
        responseTime: "We aim to respond within 30 days"
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
              <Shield className="w-4 h-4" />
              Privacy & Data Protection
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-slate-400">
              Last updated: <span className="text-white">May 1, 2026</span>
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm">
              <Link to="/legal/terms" className="text-primary-400 hover:text-primary-300 flex items-center gap-1">
                Terms of Service <ExternalLink className="w-3 h-3" />
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

      {/* Summary Card */}
      <div className="max-w-4xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-primary-600/10 to-purple-600/10 border border-primary-500/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary-400" />
            Privacy Commitment
          </h2>
          <p className="text-slate-300 text-sm mb-3">
            At ODUSBABA, we are committed to protecting your privacy. We collect only the data necessary to provide our services,
            never sell your personal information, and give you control over your data.
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="px-2 py-1 bg-slate-800 rounded-full text-slate-400">GDPR Compliant</span>
            <span className="px-2 py-1 bg-slate-800 rounded-full text-slate-400">CCPA Ready</span>
            <span className="px-2 py-1 bg-slate-800 rounded-full text-slate-400">Data Minimization</span>
            <span className="px-2 py-1 bg-slate-800 rounded-full text-slate-400">Encryption at Rest</span>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="max-w-4xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-400" />
            Table of Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

      {/* Privacy Content */}
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
              
              <div className="pl-11 space-y-4">
                <p className="text-slate-300 leading-relaxed">
                  {section.content}
                </p>
                
                {section.subsections?.map((subsection, subIdx) => (
                  <div key={subIdx} className="mt-4">
                    <h3 className="text-md font-medium text-white mb-2">
                      {subsection.title}
                    </h3>
                    <ul className="space-y-2">
                      {subsection.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                
                {section.items && (
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                
                {section.howTo && (
                  <div className="bg-primary-500/5 border border-primary-500/20 rounded-lg p-4 mt-3">
                    <p className="text-primary-400 text-sm font-medium">
                      📝 {section.howTo}
                    </p>
                  </div>
                )}
                
                {section.important && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
                    <p className="text-amber-400 text-sm font-medium">
                      ⚠️ {section.important}
                    </p>
                  </div>
                )}
                
                {section.link && (
                  <div className="bg-slate-800/30 rounded-lg p-3 mt-3">
                    <p className="text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: section.link }} />
                  </div>
                )}
                
                {section.note && (
                  <p className="text-sm text-slate-500 italic mt-2">
                    Note: {section.note}
                  </p>
                )}
                
                {section.contact && (
                  <div className="bg-slate-800/30 rounded-lg p-4 mt-3 space-y-2">
                    <p className="text-slate-300 text-sm">
                      📧 Email: <a href={`mailto:${section.contact.email}`} className="text-primary-400 hover:underline">
                        {section.contact.email}
                      </a>
                    </p>
                    {section.contact.dpo && (
                      <p className="text-slate-300 text-sm">
                        🔒 DPO: <a href={`mailto:${section.contact.dpo}`} className="text-primary-400 hover:underline">
                          {section.contact.dpo}
                        </a>
                      </p>
                    )}
                    <p className="text-slate-300 text-sm">
                      📍 Address: {section.contact.address}
                    </p>
                    <p className="text-slate-400 text-xs">
                      ⏱️ {section.contact.responseTime}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Acknowledgment Section */}
        <div className="mt-8 p-6 bg-primary-500/5 border border-primary-500/20 rounded-xl text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Your Privacy Matters</h3>
          <p className="text-slate-400 text-sm mb-4">
            We are committed to transparency and giving you control over your personal data.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Print Policy
            </button>
            <a
              href="mailto:privacy@bluskyeconsult.com"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Contact Privacy Team
            </a>
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" /> GDPR Compliant
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" /> CCPA Ready
          </span>
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> SOC2 Type II
          </span>
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" /> International Transfers
          </span>
        </div>
      </div>
    </div>
  );
}
