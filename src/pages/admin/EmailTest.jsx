import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { sendTestEmail } from '../../services/emailService';
import { Mail, Send, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function EmailTest() {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [emailLogs, setEmailLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    async function loadEmailLogs() {
        setLoadingLogs(true);
        const { data, error } = await supabase
            .from('email_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (!error && data) {
            setEmailLogs(data);
        }
        setLoadingLogs(false);
    }

    useEffect(() => {
        loadEmailLogs();
    }, []);

    async function handleTest() {
        if (!email) {
            alert('Please enter an email address');
            return;
        }

        setSending(true);
        setResult(null);
        
        const response = await sendTestEmail(email);
        
        if (response.success) {
            setResult({ success: true, message: 'Test email sent successfully! Check your inbox.' });
            loadEmailLogs();
        } else {
            setResult({ success: false, message: `Failed: ${response.error}` });
        }
        setSending(false);
    }

    return (
        <div className="p-6 max-w-4xl mx-auto min-h-screen bg-background">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary-400" />
                Email Configuration Test
            </h1>

            {/* Test Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Send Test Email</h2>
                <p className="text-slate-400 mb-4">Enter an email address to verify SMTP is working correctly.</p>
                
                <div className="flex gap-4 flex-col sm:flex-row">
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
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2 disabled:opacity-50 justify-center"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? 'Sending...' : 'Send Test Email'}
                    </button>
                </div>

                {result && (
                    <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${result.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {result.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {result.message}
                    </div>
                )}
            </div>

            {/* Email Logs Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 className="text-xl font-semibold text-white">Recent Email Logs</h2>
                    <button
                        onClick={loadEmailLogs}
                        className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-sm flex items-center gap-2"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                    </button>
                </div>

                {loadingLogs ? (
                    <p className="text-slate-400 text-center py-8">Loading logs...</p>
                ) : emailLogs.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No emails sent yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800">
                                <tr>
                                    <th className="px-3 py-2 text-left text-white">Date</th>
                                    <th className="px-3 py-2 text-left text-white">Recipient</th>
                                    <th className="px-3 py-2 text-left text-white">Type</th>
                                    <th className="px-3 py-2 text-left text-white">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {emailLogs.map(log => (
                                    <tr key={log.id} className="border-t border-slate-800">
                                        <td className="px-3 py-2 text-slate-300 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-slate-300 break-all max-w-[150px] truncate">{log.recipient}</td>
                                        <td className="px-3 py-2 text-slate-300">{log.email_type || 'notification'}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                log.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' :
                                                log.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SMTP Configuration Status */}
            <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                <h3 className="text-primary-400 font-semibold mb-2">SMTP Configuration Status</h3>
                <p className="text-sm text-slate-300">
                    Host: smtp.hostinger.com<br />
                    Port: 465<br />
                    User: josephodugboye@bluskyeconsult.com
                </p>
                <p className="text-xs text-slate-500 mt-2">
                    Make sure these environment variables are set in Vercel.
                </p>
            </div>

            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-400">
                    ⚠️ <strong>Note:</strong> DNS records (SPF, DKIM, DMARC) may take 24-48 hours to propagate. 
                    Test emails may go to spam until then.
                </p>
            </div>
        </div>
    );
}
