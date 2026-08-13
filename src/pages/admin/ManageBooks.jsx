// src/pages/admin/EmailTest.jsx
// COMPLETE EMAIL TEST PAGE - Test SMTP configuration with error handling
//
// FIXED (2026-08-07): posted to /api/send-email, which doesn't exist
// anywhere in this project — the real email endpoint is
// /api/index?action=email, already confirmed working. This test page has
// never actually been able to send a real email until now.

import { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, Loader2, AlertCircle, HelpCircle, Shield } from 'lucide-react';

export default function EmailTest() {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('basic');

    const emailTemplates = {
        basic: {
            name: 'Basic Test',
            subject: 'ODUSBABA Email Test',
            html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 30px;">
                        <div style="text-align: center;">
                            <div style="font-size: 48px;">📧</div>
                            <h1 style="color: #10b981;">Email Test Successful!</h1>
                        </div>
                        <p style="color: #94a3b8;">Your ODUSBABA email system is working correctly.</p>
                        <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Test Details:</strong></p>
                            <p style="margin: 8px 0 0; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
                            <p style="margin: 4px 0 0; font-size: 12px;">Server: Vercel Serverless</p>
                        </div>
                        <hr style="border-color: #1e293b; margin: 20px 0;">
                        <p style="color: #475569; font-size: 12px; text-align: center;">BluSkye Integrated Consult - Creating Value for Partnership</p>
                    </div>
                </body>
                </html>
            `
        },
        newsletter: {
            name: 'Newsletter Style',
            subject: 'ODUSBABA Newsletter Test',
            html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #0ea5e9, #3b82f6); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">ODUSBABA Newsletter</h1>
                            <p style="color: #cbd5e1; margin-top: 8px;">Test Edition</p>
                        </div>
                        <div style="padding: 30px; color: #94a3b8;">
                            <h2 style="color: white;">Welcome to the Test!</h2>
                            <p>This is a test newsletter to verify your email configuration.</p>
                            <ul>
                                <li>✅ SMTP configured correctly</li>
                                <li>✅ Templates working</li>
                                <li>✅ Email delivery confirmed</li>
                            </ul>
                            <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin-top: 20px;">
                                <p style="margin: 0;">💡 <strong>Next Steps:</strong> Your email system is ready for production!</p>
                            </div>
                        </div>
                        <div style="background-color: #0a0f1c; padding: 20px; text-align: center; font-size: 12px; color: #475569;">
                            <p>BluSkye Integrated Consult - Creating Value for Partnership</p>
                            <p><a href="https://www.bluskyeconsult.com" style="color: #0ea5e9;">Visit ODUSBABA</a></p>
                        </div>
                    </div>
                </body>
                </html>
            `
        },
        welcome: {
            name: 'Welcome Email',
            subject: 'Welcome to ODUSBABA!',
            html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 30px;">
                        <div style="text-align: center;">
                            <div style="font-size: 48px;">🎉</div>
                            <h1 style="color: #0ea5e9;">Welcome to ODUSBABA!</h1>
                        </div>
                        <p style="color: #94a3b8;">Hello,</p>
                        <p style="color: #94a3b8;">Thank you for testing our email system. Your account is ready to go!</p>
                        <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Get started with:</strong></p>
                            <ul style="margin-top: 8px;">
                                <li>🤖 AI Career Assistant</li>
                                <li>📄 CV Optimization</li>
                                <li>💼 Job Matching</li>
                            </ul>
                        </div>
                        <div style="text-align: center;">
                            <a href="https://www.bluskyeconsult.com/dashboard" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Go to Dashboard →</a>
                        </div>
                        <hr style="border-color: #1e293b; margin: 20px 0;">
                        <p style="color: #475569; font-size: 12px; text-align: center;">BluSkye Integrated Consult</p>
                    </div>
                </body>
                </html>
            `
        }
    };

    const handleTemplateChange = (templateKey) => {
        setSelectedTemplate(templateKey);
        setResult(null);
    };

    async function handleTest(e) {
        e.preventDefault();
        
        if (!email) {
            setResult({ success: false, message: 'Please enter an email address' });
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        if (!emailRegex.test(email)) {
            setResult({ success: false, message: 'Please enter a valid email address' });
            return;
        }

        setSending(true);
        setResult(null);
        
        const template = emailTemplates[selectedTemplate];
        
        try {
            const response = await fetch('/api/index?action=email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    to: email, 
                    subject: `${template.subject} - ${new Date().toLocaleString()}`, 
                    html: template.html
                })
            });
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}`);
            }
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                setResult({ 
                    success: true, 
                    message: `✅ Test email sent successfully! Check your inbox (${email}).`,
                    details: { messageId: data.messageId }
                });
                setEmail('');
            } else {
                setResult({ 
                    success: false, 
                    message: data.error || `HTTP ${response.status}: Failed to send` 
                });
            }
        } catch (error) {
            console.error('Email test error:', error);
            setResult({ 
                success: false, 
                message: error.message || 'Network error. Please try again.' 
            });
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <Mail className="w-6 h-6 text-primary-400" />
                    Email Configuration Test
                </h1>
                <p className="text-slate-400">Verify your SMTP settings are working correctly</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Send className="w-5 h-5 text-primary-400" />
                            Send Test Email
                        </h2>
                        
                        <form onSubmit={handleTest} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@bluskyeconsult.com"
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                    disabled={sending}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    Email Template
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(emailTemplates).map(([key, template]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleTemplateChange(key)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                                selectedTemplate === key
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            {template.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-lg shadow-primary-500/20"
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
                                <div>
                                    <span className="text-sm">{result.message}</span>
                                    {result.details?.messageId && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Message ID: {result.details.messageId}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Panel */}
                <div className="space-y-4">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-5 h-5 text-emerald-400" />
                            <h3 className="text-white font-semibold">SMTP Status</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Host:</span>
                                <span className="text-white font-mono text-xs">
                                    {import.meta.env.VITE_SMTP_HOST || 'Not set'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Port:</span>
                                <span className="text-white">{import.meta.env.VITE_SMTP_PORT || '587'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">User:</span>
                                <span className="text-white">{import.meta.env.VITE_SMTP_USER ? '✓ Configured' : 'Not set'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-amber-400" />
                            <h3 className="text-white font-semibold">Important Notes</h3>
                        </div>
                        <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                            <li>Email may take a few minutes to arrive</li>
                            <li>Check your spam/junk folder if not received</li>
                            <li>Some email providers may delay first-time emails</li>
                            <li>Rate limit: 1 email per minute per address</li>
                        </ul>
                    </div>

                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <HelpCircle className="w-5 h-5 text-sky-400" />
                            <h3 className="text-white font-semibold">Troubleshooting</h3>
                        </div>
                        <ul className="text-xs text-slate-400 space-y-1">
                            <li>• Ensure SMTP credentials are correct</li>
                            <li>• Check if SMTP port is open (587 or 465)</li>
                            <li>• Verify sender email is authorized</li>
                            <li>• Check Vercel environment variables</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
