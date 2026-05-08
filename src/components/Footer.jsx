// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Mail, MapPin, Github, Instagram } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Platform",
      links: [
        { name: "Jobs", path: "/jobs" },
        { name: "Workforce Marketplace", path: "/workforce" },
        { name: "Courses", path: "/courses" },
        { name: "Assessments", path: "/assessments" },
        { name: "Hire Virtual Assistant", path: "/hire-va" },
        { name: "Newsletter", path: "/newsletter" },
      ]
    },
    {
      title: "Company",
      links: [
        { name: "About Us", path: "/about" },
        { name: "Contact", path: "/contact" },
        { name: "Pricing", path: "/pricing" },
        { name: "Affiliate Program", path: "/affiliate" },
        { name: "Blog", path: "/blog" },
        { name: "Articles", path: "/articles" },
      ]
    },
    {
      title: "Resources",
      links: [
        { name: "FAQ", path: "/faq" },
        { name: "Safety Tips", path: "/safety-tips" },
        { name: "Report Fraud", path: "/report-fraud" },
        { name: "Support", path: "/contact" },
        { name: "Status", path: "/status" },
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Terms of Service", path: "/legal/terms" },
        { name: "Privacy Policy", path: "/legal/privacy" },
        { name: "Cookie Policy", path: "/legal/cookies" },
        { name: "Disclaimer", path: "/legal/disclaimer" },
        { name: "Acceptable Use", path: "/legal/acceptable-use" },
        { name: "Fraud Prevention", path: "/legal/fraud-prevention" },
      ]
    }
  ];

  const socialLinks = [
    { name: "Twitter", icon: Twitter, url: "https://twitter.com/bluskyeconsult" },
    { name: "LinkedIn", icon: Linkedin, url: "https://linkedin.com/company/bluskyeconsult" },
    { name: "Facebook", icon: Facebook, url: "https://facebook.com/bluskyeconsult" },
    { name: "GitHub", icon: Github, url: "https://github.com/bluskyeconsult-sketch" },
    { name: "Instagram", icon: Instagram, url: "https://instagram.com/bluskyeconsult" },
  ];

  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          
          {/* Brand Column with Logo Component */}
          <div className="lg:col-span-1">
            <Logo size="md" showText={true} linkTo="/" />
            <p className="text-slate-400 text-sm mt-3 mb-4">
              The Governed Workforce Platform. Verified skills. Trusted hiring.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Footer Link Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-3">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link to={link.path} className="text-slate-400 text-sm hover:text-primary-400 transition">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Contact Info Bar */}
        <div className="border-t border-slate-800 pt-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                support@bluskyeconsult.com
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Oxford, UK | Lagos, Nigeria | Toronto, Canada
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>&copy; {currentYear} BluSkye Integrated Consult. All rights reserved.</p>
          <p className="mt-1">Creating Value for Partnership</p>
        </div>
        
      </div>
    </footer>
  );
}
