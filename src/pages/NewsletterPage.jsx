// src/pages/NewsletterPage.jsx
// COMPLETE NEWSLETTER PAGE - Copy and replace entire file

import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Send, Users, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { subscribeToNewsletter } from '../services/newsletterService';

export default function NewsletterPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [error, setError] = useState('');

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const result = await subscribeToNewsletter(email, name || null, 'newsletter_page');
            if (result.success) {
                setSubscribed(true);
                setEmail('');
                setName('');
            } else {
                setError(result.error || 'Subscription failed. Please try again.');
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (subscribed) {
        return (
            <div className="min-h-screen bg-slate-950 py-20">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Thank You for Subscribing!</h1>
                    <p className="text-slate-400 mb-6">
                        You've been added to our newsletter list. Check your inbox for our welcome email.
                    </p>
                    <a href="/" className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Return Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Mail className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        ODUSBABA Newsletter
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Stay informed with the latest insights, job opportunities, and career advice delivered to your inbox weekly.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                        <Users className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">5,000+</p>
                        <p className="text-sm text-slate-400">Subscribers</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                        <Mail className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">Weekly</p>
                        <p className="text-sm text-slate-400">Newsletter</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                        <TrendingUp className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">45%</p>
                        <p className="text-sm text-slate-400">Open Rate</p>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 md:p-8">
                    <h2 className="text-xl font-bold text-white mb-4 text-center">Subscribe Now</h2>
                    <p className="text-slate-400 text-center mb-6">
                        Get weekly career insights, job alerts, and exclusive content.
                    </p>
                    
                    <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
                        <div className="mb-4">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name (optional)"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                            />
                        </div>
                        <div className="mb-4">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Your Email Address *"
                                required
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                            />
                        </div>
                        
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {loading ? 'Subscribing...' : 'Subscribe Now'}
                        </button>
                    </form>
                    
                    <p className="text-xs text-slate-500 text-center mt-4">
                        We respect your privacy. Unsubscribe at any time.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-center">
                        <Calendar className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                        <h3 className="text-white font-semibold mb-1">Weekly Digest</h3>
                        <p className="text-slate-400 text-sm">Every Tuesday morning</p>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-center">
                        <TrendingUp className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                        <h3 className="text-white font-semibold mb-1">Job Alerts</h3>
                        <p className="text-slate-400 text-sm">New opportunities matching your skills</p>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-center">
                        <Mail className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                        <h3 className="text-white font-semibold mb-1">Exclusive Content</h3>
                        <p className="text-slate-400 text-sm">Career tips and industry insights</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
