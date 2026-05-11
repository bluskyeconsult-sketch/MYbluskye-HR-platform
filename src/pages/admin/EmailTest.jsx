// src/pages/admin/EmailTest.jsx
// Fixed error handling for email test

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function EmailTest() {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    async function handleTest() {
        if (!email) {
            alert('Please enter an email address');
            return;
        }

        setSending(true);
        setResult(null);
        
        try {
            // Call the email API with proper error handling
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    to: email, 
                    subject: 'ODUSBABA Email Test', 
                    html: '<h1>Test Email</h1><p>If you receive this, your email is working!</p>',
                    emailType: 'test'
                })
            });
            
            // Check if response is OK before parsing JSON
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                setResult({ success: true, message: 'Test email sent successfully! Check your inbox.' });
            } else {
                setResult({ success: false, message: `Failed: ${data.error || 'Unknown error'}` });
            }
        } catch (error) {
            console.error('Email test error:', error);
            setResult({ success: false, message: `Failed: ${error.message}` });
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary-400" />
                Email Configuration Test
            </h1>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Send Test Email</h2>
                <p className="text-slate-400 mb-4">Enter an email address to verify SMTP is working correctly.</p>
                
                <div className="flex gap-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    />
                    <button
                        onClick={handleTest}
                        disabled={sending}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? 'Sending...' : 'Send Test Email'}
                    </button>
                </div>

                {result && (
                    <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                        result.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {result.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {result.message}
                    </div>
                )}
            </div>

            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-400 text-sm">
                    ⚠️ <strong>Note:</strong> Email may take a few minutes to arrive. Check spam folder if not received.
                </p>
            </div>
        </div>
    );
}
