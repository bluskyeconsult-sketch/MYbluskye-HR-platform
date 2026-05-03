// src/pages/ContactPage.jsx
// COMPLETE - Contact page with ODUSBABA Chat, no phone number

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Send, CheckCircle, Clock, Shield } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Send to your email service
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to send message');

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Message Sent!</h1>
          <p className="text-slate-400 mb-6">
            Thank you for reaching out. Our team will respond within 24 hours.
          </p>
          <p className="text-slate-500 text-sm mb-6">
            In the meantime, you can chat with ODUSBABA AI for immediate assistance.
          </p>
          <Link 
            to="/" 
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Contact Us</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Get in touch with our team. We're here to help!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Information Cards */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* ODUSBABA Chat Card - PRIMARY CONTACT METHOD */}
            <div className="bg-gradient-to-br from-primary-900/30 to-primary-800/10 border border-primary-500/30 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-primary-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">ODUSBABA AI Chat</h2>
              <p className="text-slate-400 text-sm mb-4">
                Get instant answers 24/7. Our AI assistant can help with:
              </p>
              <ul className="text-sm text-slate-400 space-y-1 mb-4 text-left">
                <li>• Account questions</li>
                <li>• Job search assistance</li>
                <li>• Platform navigation</li>
                <li>• Technical support</li>
              </ul>
              <button
                onClick={() => {
                  // Find and open the ODUSBABA chat widget
                  const chatButton = document.querySelector('button[aria-label*="chat"]') || 
                                    document.querySelector('.fixed.bottom-6.right-6');
                  if (chatButton) chatButton.click();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                Start Chat Now
              </button>
              <p className="text-xs text-slate-500 mt-3">
                Available 24/7 • Instant responses
              </p>
            </div>

            {/* Email Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Email Us</h2>
              <div className="space-y-2">
                <p className="text-slate-300 text-sm">
                  <span className="text-slate-500">General Inquiries:</span><br />
                  <a href="mailto:support@bluskyeconsult.com" className="text-primary-400 hover:underline">
                    support@bluskyeconsult.com
                  </a>
                </p>
                <p className="text-slate-300 text-sm">
                  <span className="text-slate-500">Legal Matters:</span><br />
                  <a href="mailto:legal@bluskyeconsult.com" className="text-primary-400 hover:underline">
                    legal@bluskyeconsult.com
                  </a>
                </p>
                <p className="text-slate-300 text-sm">
                  <span className="text-slate-500">Partnerships:</span><br />
                  <a href="mailto:partners@bluskyeconsult.com" className="text-primary-400 hover:underline">
                    partners@bluskyeconsult.com
                  </a>
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Response within 24 hours
              </p>
            </div>

            {/* Location Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-primary-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Our Location</h2>
              <p className="text-slate-300">
                Oxford, United Kingdom
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Global operations spanning 7 countries
              </p>
            </div>

            {/* Trust Badge */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-sm">Trust & Safety</span>
              </div>
              <p className="text-xs text-slate-400">
                All communications are encrypted and secure. We never share your information.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Send us a Message</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                  placeholder="How can we help you?"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="5"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none"
                  placeholder="Please describe your question or concern in detail..."
                />
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Sending...' : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
              
              <p className="text-xs text-slate-500 text-center mt-4">
                By submitting this form, you agree to our <Link to="/legal/privacy" className="text-primary-400 hover:underline">Privacy Policy</Link>.
                We'll never share your information.
              </p>
            </form>
          </div>
        </div>
        
        {/* Quick Response Note */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full">
            <Clock className="w-4 h-4 text-primary-400" />
            <span className="text-slate-400 text-sm">Average response time: &lt; 4 hours</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
