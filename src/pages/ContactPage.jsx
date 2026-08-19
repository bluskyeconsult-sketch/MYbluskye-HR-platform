// src/pages/ContactPage.jsx
// COMPLETE PROFESSIONAL CONTACT PAGE - With unified API, form validation, and ODUSBABA Chat integration
//
// FIXED (2026-08-16):
// 1. Imported apiCall, isAuthenticated, getCurrentUser from
//    '../lib/supabase' — none of these exist there (every other file this
//    session imports only the singleton { supabase }). This would have
//    broken the page immediately: isAuthenticated() runs inside a
//    useEffect on mount, so calling an undefined function would likely
//    crash the whole component before a visitor ever saw the form.
// 2. Form submission called apiCall('contact-submit', ...) — that action
//    doesn't exist anywhere in the backend either. Fixed to a direct
//    Supabase insert into a real contact_messages table, matching the
//    established pattern for simple forms elsewhere in this project.
// 3. The chat-widget-opening button used the same fragile CSS-class
//    guessing hack found in ProductsPage.jsx. Replaced with the same
//    real, stable custom event ('odusbaba:open-chat').
// 4. Response-time claims were genuinely contradictory across the page —
//    "24 hours" appeared twice, "4 hours" appeared twice, in different
//    places. Made consistent. Also removed an unverifiable "4.9/5 Support
//    Rating" (same class of fictitious-sounding specific number found and
//    removed elsewhere this session) and corrected "7 countries" to the
//    real confirmed 8 (matching JobsPage.jsx's COUNTRIES list).

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Mail, MapPin, MessageCircle, Send, CheckCircle, Clock, 
    Shield, AlertCircle, Loader2, Sparkles, Building2, 
    Globe, Headphones, Star, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
        priority: 'normal'
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // Load user data if logged in
    useEffect(() => {
        loadUserData();
    }, []);

    async function loadUserData() {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            setUser(currentUser);
            setFormData(prev => ({
                ...prev,
                name: currentUser.user_metadata?.full_name || '',
                email: currentUser.email || ''
            }));
        }
    }

    const validateForm = () => {
        const errors = {};
        
        if (!formData.name.trim()) {
            errors.name = 'Name is required';
        } else if (formData.name.length < 2) {
            errors.name = 'Name must be at least 2 characters';
        }
        
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }
        
        if (!formData.subject.trim()) {
            errors.subject = 'Subject is required';
        } else if (formData.subject.length < 3) {
            errors.subject = 'Subject must be at least 3 characters';
        }
        
        if (!formData.message.trim()) {
            errors.message = 'Message is required';
        } else if (formData.message.length < 10) {
            errors.message = 'Message must be at least 10 characters';
        } else if (formData.message.length > 2000) {
            errors.message = 'Message cannot exceed 2000 characters';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear validation error for this field when user starts typing
        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setSubmitting(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('contact_messages')
                .insert({
                    name: formData.name,
                    email: formData.email,
                    subject: formData.subject,
                    message: formData.message,
                    priority: formData.priority,
                    user_id: user?.id || null
                });

            if (insertError) throw insertError;
            
            setSubmitted(true);
            setFormData({ name: '', email: '', subject: '', message: '', priority: 'normal' });
            
            // Scroll to top to show success message
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
        } catch (err) {
            console.error('Contact form error:', err);
            setError(err.message || 'Failed to send message. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const openChatWidget = () => {
        // FIXED (2026-08-16): was guessing at the chat widget's button via
        // CSS selectors — same fragile pattern found in ProductsPage.jsx.
        // Uses the same real, stable custom event now.
        window.dispatchEvent(new CustomEvent('odusbaba:open-chat'));
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
                <div className="max-w-2xl mx-auto px-4 text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Message Sent Successfully!</h1>
                    <p className="text-slate-400 mb-4">
                        Thank you for reaching out to ODUSBABA. Our support team will respond as soon as possible.
                    </p>
                    <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                        <p className="text-slate-300 text-sm">
                            <Clock className="w-4 h-4 inline mr-1 text-primary-400" />
                            We aim to respond within 24 hours during business days.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link 
                            to="/" 
                            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-flex items-center gap-2"
                        >
                            Return Home
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                        <button
                            onClick={openChatWidget}
                            className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition inline-flex items-center gap-2"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Chat with ODUSBABA AI
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm mb-4">
                        <MessageCircle className="w-4 h-4" />
                        24/7 Support Available
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Get in Touch</h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Have questions? We'd love to hear from you. Our team is here to help.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Contact Information Cards */}
                    <div className="lg:col-span-1 space-y-5">
                        
                        {/* ODUSBABA Chat Card - PRIMARY CONTACT METHOD */}
                        <div className="bg-gradient-to-br from-primary-900/30 to-primary-800/10 border border-primary-500/30 rounded-2xl p-6 text-center hover:scale-[1.02] transition-all duration-300">
                            <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-primary-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">ODUSBABA AI Chat</h2>
                            <p className="text-slate-400 text-sm mb-4">
                                Get instant answers 24/7. Our AI assistant is ready to help with:
                            </p>
                            <ul className="text-sm text-slate-400 space-y-2 mb-6 text-left">
                                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Account & profile questions</li>
                                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Job search assistance</li>
                                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Platform navigation</li>
                                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Technical support</li>
                            </ul>
                            <button
                                onClick={openChatWidget}
                                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 font-medium shadow-lg shadow-primary-500/20"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Start AI Chat Now
                            </button>
                            <p className="text-xs text-slate-500 mt-3">
                                ✨ Available 24/7 • Instant responses
                            </p>
                        </div>

                        {/* Email Support Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center hover:border-primary-500/30 transition-all">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-primary-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-3">Email Support</h2>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-slate-500 text-xs mb-1">General Inquiries</p>
                                    <a href="mailto:support@bluskyeconsult.com" className="text-primary-400 hover:underline break-all">
                                        support@bluskyeconsult.com
                                    </a>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs mb-1">Partnerships</p>
                                    <a href="mailto:partners@bluskyeconsult.com" className="text-primary-400 hover:underline break-all">
                                        partners@bluskyeconsult.com
                                    </a>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs mb-1">Legal Matters</p>
                                    <a href="mailto:legal@bluskyeconsult.com" className="text-primary-400 hover:underline break-all">
                                        legal@bluskyeconsult.com
                                    </a>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-4 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" /> Response within 24 hours
                            </p>
                        </div>

                        {/* Office Location Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center hover:border-primary-500/30 transition-all">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Building2 className="w-8 h-8 text-primary-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Our Location</h2>
                            <p className="text-slate-300">
                                Oxford, United Kingdom
                            </p>
                            <div className="mt-3 flex items-center justify-center gap-2">
                                <Globe className="w-4 h-4 text-primary-400" />
                                <span className="text-sm text-slate-500">Global operations across 8 countries</span>
                            </div>
                        </div>

                        {/* Trust & Safety Badge */}
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Shield className="w-5 h-5 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold text-sm">Trust & Security</span>
                            </div>
                            <p className="text-xs text-slate-400">
                                All communications are encrypted and secure. We never share your personal information.
                            </p>
                            <div className="flex items-center justify-center gap-4 mt-3">
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> GDPR Compliant
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Send us a Message</h2>
                            <p className="text-slate-400 text-sm mb-6">
                                Fill out the form below and we'll get back to you as soon as possible.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Full Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        disabled={submitting}
                                        className={`w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                                            validationErrors.name ? 'border-red-500' : 'border-slate-700'
                                        }`}
                                        placeholder="John Doe"
                                    />
                                    {validationErrors.name && (
                                        <p className="text-xs text-red-400 mt-1">{validationErrors.name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Email Address <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={submitting}
                                        className={`w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                                            validationErrors.email ? 'border-red-500' : 'border-slate-700'
                                        }`}
                                        placeholder="john@example.com"
                                    />
                                    {validationErrors.email && (
                                        <p className="text-xs text-red-400 mt-1">{validationErrors.email}</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Subject <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    disabled={submitting}
                                    className={`w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                                        validationErrors.subject ? 'border-red-500' : 'border-slate-700'
                                    }`}
                                    placeholder="How can we help you?"
                                />
                                {validationErrors.subject && (
                                    <p className="text-xs text-red-400 mt-1">{validationErrors.subject}</p>
                                )}
                            </div>
                            
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Priority
                                </label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    disabled={submitting}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="normal">Normal - General inquiry</option>
                                    <option value="high">High - Urgent matter</option>
                                    <option value="low">Low - Just browsing</option>
                                </select>
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Message <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    disabled={submitting}
                                    rows={6}
                                    className={`w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition resize-none ${
                                        validationErrors.message ? 'border-red-500' : 'border-slate-700'
                                    }`}
                                    placeholder="Please describe your question or concern in detail..."
                                />
                                <div className="flex justify-between mt-1">
                                    {validationErrors.message && (
                                        <p className="text-xs text-red-400">{validationErrors.message}</p>
                                    )}
                                    <p className={`text-xs ${formData.message.length > 1900 ? 'text-amber-400' : 'text-slate-500'} ml-auto`}>
                                        {formData.message.length}/2000 characters
                                    </p>
                                </div>
                            </div>
                            
                            {error && (
                                <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}
                            
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-xl hover:from-primary-700 hover:to-sky-700 transition-all duration-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-500/20"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sending message...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Send Message
                                    </>
                                )}
                            </button>
                            
                            <div className="mt-4 text-center">
                                <p className="text-xs text-slate-500">
                                    By submitting this form, you agree to our{' '}
                                    <Link to="/legal/privacy" className="text-primary-400 hover:underline">
                                        Privacy Policy
                                    </Link>
                                    . We'll never share your information.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
                
                {/* Quick Response Note */}
                <div className="mt-10 text-center">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 rounded-full">
                        <Headphones className="w-4 h-4 text-primary-400" />
                        <span className="text-slate-400 text-sm">We respond within 24 hours</span>
                        <div className="w-px h-4 bg-slate-700 mx-2"></div>
                        <Clock className="w-4 h-4 text-primary-400" />
                        <span className="text-slate-400 text-sm">24/7 AI Chat available</span>
                    </div>
                </div>
                
            </div>
        </div>
    );
}
