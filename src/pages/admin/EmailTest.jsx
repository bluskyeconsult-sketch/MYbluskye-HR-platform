// src/pages/admin/EmailTest.jsx
// Email configuration test page - No client-side SMTP variables

import { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function EmailTest() {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    async function handleTest(e) {
        e.preventDefault();
        
        if (!email) {
            setResult({ success: false, message: 'Please enter an email address' });
            return;
        }

        setSending(true);
        setResult(null);
        
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    to: email, 
                    subject: 'ODUSBABA Email Test - ' + new Date().toLocaleString(), 
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head><meta charset="UTF-8"></head>
                        <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                                <h1 style="color: #10b981;">✅ Email Configuration Successful!</h1>
                                <p>Your ODUSBABA email system is working correctly.</p>
                                <p>This test email confirms that SMTP and all configurations are set up properly.</p>
                                <hr style="border-color: #1e293b; margin: 20px 0;">
                                <p style="color: #475569; font-size: 12px;">BluSkye Integrated Consult - Creating Value for Partnership</p>
                            </div>
                        </body>
                        </html>
                    `
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                setResult({ success: true, message: 'Test email sent successfully! Check your inbox.' });
            } else {
                setResult({ success: false, message: data.error || `HTTP ${response.status}: Failed to send email` });
            }
        } catch (error) {
            console.error('Email test error:', error);
            setResult({ success: false, message: error.message || 'Network error. Please check your connection.' });
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
                
                <form onSubmit={handleTest} className="flex gap-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        required
                    />
                    <button
                        type="submit"
                        disabled={sending}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? 'Sending...' : 'Send Test Email'}
                    </button>
                </form>

                {result && (
                    <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                        result.success 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {result.success ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                        <span className="text-sm">{result.message}</span>
                    </div>
                )}
            </div>

            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <strong>Note:</strong> Email may take a few minutes to arrive. Check spam folder if not received.
                </p>
            </div>

            <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                <p className="text-primary-400 text-sm">
                    💡 <strong>Tip:</strong> SMTP credentials are configured on the server. The API endpoint will use them automatically.
                </p>
            </div>
        </div>
    );
}
