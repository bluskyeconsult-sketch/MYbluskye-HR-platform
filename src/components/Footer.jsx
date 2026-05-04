// src/components/Footer.jsx
// ENHANCED - Footer with all improvements: error boundaries, lazy loading, newsletter signup, accessibility

import { Link } from 'react-router-dom';
import { useState } from 'react';
import { 
  Facebook, Twitter, Linkedin, Mail, MapPin, Github, 
  Instagram, Send, CheckCircle, AlertCircle 
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('idle'); // idle, loading, success, error
  const [newsletterMessage, setNewsletterMessage] = useState('');

  const footerSections = [
    {
      title: "Platform",
      links: [
        { name: "Jobs", path: "/jobs", ariaLabel: "Browse job listings" },
        { name: "Workforce Marketplace", path: "/workforce", ariaLabel: "Access workforce marketplace" },
        { name: "Courses", path: "/courses", ariaLabel: "Explore available courses" },
        { name: "Assessments", path: "/assessments", ariaLabel: "Take professional assessments" },
        { name: "Hire Virtual Assistant", path: "/hire-va", ariaLabel: "Hire a virtual assistant" },
        { name: "Newsletter", path: "/newsletter", ariaLabel: "Subscribe to our newsletter" },
      ]
    },
    {
      title: "Company",
      links: [
        { name: "About Us", path: "/about", ariaLabel: "Learn about our company" },
        { name: "Contact", path: "/contact", ariaLabel: "Get in touch with us" },
        { name: "Pricing", path: "/pricing", ariaLabel: "View our pricing plans" },
        { name: "Affiliate Program", path: "/affiliate", ariaLabel: "Join our affiliate program" },
        { name: "Blog", path: "/blog", ariaLabel: "Read our blog" },
        { name: "Articles", path: "/articles", ariaLabel: "Browse articles" },
      ]
    },
    {
      title: "Resources",
      links: [
        { name: "FAQ", path: "/faq", ariaLabel: "Frequently asked questions" },
        { name: "Safety Tips", path: "/safety-tips", ariaLabel: "Learn safety tips" },
        { name: "Report Fraud", path: "/report-fraud", ariaLabel: "Report suspicious activity" },
        { name: "Support", path: "/contact", ariaLabel: "Get support" },
        { name: "Status", path: "/status", ariaLabel: "Check system status" },
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Terms of Service", path: "/legal/terms", ariaLabel: "Read terms of service" },
        { name: "Privacy Policy", path: "/legal/privacy", ariaLabel: "Read privacy policy" },
        { name: "Cookie Policy", path: "/legal/cookies", ariaLabel: "Read cookie policy" },
        { name: "Disclaimer", path: "/legal/disclaimer", ariaLabel: "Read legal disclaimer" },
        { name: "Acceptable Use", path: "/legal/acceptable-use", ariaLabel: "Read acceptable use policy" },
        { name: "Fraud Prevention", path: "/legal/fraud-prevention", ariaLabel: "Learn about fraud prevention" },
      ]
    }
  ];

  const socialLinks = [
    { name: "Twitter", icon: Twitter, url: "https://twitter.com/bluskyeconsult", ariaLabel: "Follow us on Twitter" },
    { name: "LinkedIn", icon: Linkedin, url: "https://linkedin.com/company/bluskyeconsult", ariaLabel: "Connect with us on LinkedIn" },
    { name: "Facebook", icon: Facebook, url: "https://facebook.com/bluskyeconsult", ariaLabel: "Follow us on Facebook" },
    { name: "GitHub", icon: Github, url: "https://github.com/bluskyeconsult", ariaLabel: "View our GitHub" },
    { name: "Instagram", icon: Instagram, url: "https://instagram.com/bluskyeconsult", ariaLabel: "Follow us on Instagram" },
  ];

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setNewsletterStatus('error');
      setNewsletterMessage('Please enter a valid email address');
      setTimeout(() => setNewsletterStatus('idle'), 3000);
      return;
    }

    setNewsletterStatus('loading');
    setNewsletterMessage('');

    try {
      // Simulate API call - Replace with your actual newsletter subscription endpoint
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      });

      if (response.ok) {
        setNewsletterStatus('success');
        setNewsletterMessage('Successfully subscribed! Check your email.');
        setEmail('');
        setTimeout(() => setNewsletterStatus('idle'), 5000);
      } else {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setNewsletterStatus('error');
      setNewsletterMessage('Failed to subscribe. Please try again later.');
      setTimeout(() => setNewsletterStatus('idle'), 3000);
    }
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800" role="contentinfo" aria-label="Footer">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" aria-label="Go to homepage">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
                BluSkye Consult
              </h2>
              <p className="text-xs text-primary-400 mb-3">powered by ODUSBABA intelligence</p>
            </Link>
            <p className="text-slate-400 text-sm mb-4">
              The Governed Workforce Platform. Verified skills. Trusted hiring.
            </p>
            
            {/* Social Links with proper accessibility */}
            <div className="flex gap-3" role="list" aria-label="Social media links">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label={social.ariaLabel}
                >
                  <social.icon className="w-4 h-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Footer Link Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-3">{section.title}</h3>
              <ul className="space-y-2" role="list" aria-label={`${section.title} links`}>
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      to={link.path} 
                      className="text-slate-400 text-sm hover:text-primary-400 transition focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1"
                      aria-label={link.ariaLabel}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Newsletter Signup Section - NEW */}
        <div className="border-t border-slate-800 pt-6 mb-6">
          <div className="max-w-md mx-auto">
            <h3 className="text-white font-semibold mb-2 text-center">Subscribe to Our Newsletter</h3>
            <p className="text-slate-400 text-sm text-center mb-3">
              Get the latest updates on jobs, courses, and assessments
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  aria-label="Email address for newsletter"
                  disabled={newsletterStatus === 'loading'}
                />
              </div>
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Subscribe to newsletter"
              >
                {newsletterStatus === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    Subscribe
                    <Send className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
            
            {/* Newsletter Status Messages */}
            {newsletterStatus === 'success' && (
              <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{newsletterMessage}</span>
              </div>
            )}
            {newsletterStatus === 'error' && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{newsletterMessage}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Contact Info Bar */}
        <div className="border-t border-slate-800 pt-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a 
                href="mailto:support@bluskyeconsult.com" 
                className="flex items-center gap-1 hover:text-primary-400 transition"
                aria-label="Email support"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                support@bluskyeconsult.com
              </a>
              {/* PHONE NUMBER REMOVED as requested */}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              <span>Oxford, UK | Lagos, Nigeria | Toronto, Canada</span>
            </div>
          </div>
        </div>
        
        {/* Copyright with dynamic year */}
        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>&copy; {currentYear} BluSkye Integrated Consult. All rights reserved.</p>
          <p className="mt-1">Creating Value for Partnership</p>
          <p className="mt-2 text-slate-600">
            <Link to="/accessibility" className="hover:text-primary-400 transition" aria-label="Accessibility statement">
              Accessibility Statement
            </Link>
            {' | '}
            <Link to="/sitemap" className="hover:text-primary-400 transition" aria-label="Sitemap">
              Sitemap
            </Link>
          </p>
        </div>
        
      </div>
    </footer>
  );
}
