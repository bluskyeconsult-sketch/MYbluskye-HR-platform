import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Brain, X, Send, Zap, Shield, Database, Users, BarChart3 } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BrainstormPartner() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        checkSuperAdmin();
    }, []);

    async function checkSuperAdmin() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', user.id)
                .single();
            setIsSuperAdmin(profile?.user_type === 'super_admin');
        }
    }

    async function sendMessage() {
        if (!input.trim() || loading) return;

        const userMsg = { id: Date.now(), sender: 'admin', message: input, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const lowerInput = input.toLowerCase();
        let response = '';

        if (lowerInput.includes('pending') || lowerInput.includes('approval')) {
            const { count: pendingJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('compliance_status', 'pending');
            const { count: pendingSkills } = await supabase.from('skills').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');
            response = `📊 **Platform Status**\n\n🔴 Pending Jobs: ${pendingJobs || 0}\n🟡 Pending Skills: ${pendingSkills || 0}\n\nUse /admin/jobs and /admin/skills to review.`;
        } 
        else if (lowerInput.includes('user') || lowerInput.includes('signup')) {
            const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: testers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'tester');
            response = `👥 **User Statistics**\n\nTotal Users: ${totalUsers || 0}\nTesters: ${testers || 0}\n\nAdmins: ${await getAdminCount()}`;
        }
        else if (lowerInput.includes('security') || lowerInput.includes('blocked')) {
            const { count: blockedIPs } = await supabase.from('blocked_ips').select('*', { count: 'exact', head: true });
            response = `🛡️ **Security Status**\n\nBlocked IPs: ${blockedIPs || 0}\n\nVisit /admin/security for details.`;
        }
        else {
            response = `🧠 **Brainstorm Partner Ready**

I can help you with:
📊 **Pending approvals** - "Show pending jobs"
👥 **User stats** - "How many users?"
🛡️ **Security** - "Show blocked IPs"
⚙️ **System config** - "Check system health"

What would you like to know?`;
        }

        const botMsg = { id: Date.now() + 1, sender: 'brain', message: response, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, botMsg]);
        setLoading(false);
    }

    async function getAdminCount() {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).in('user_type', ['admin', 'super_admin']);
        return count || 0;
    }

    if (!isSuperAdmin) return null;

    return (
        <>
            <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-24 right-6 z-50 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-500 transition-all">
                <Brain className="w-5 h-5" />
            </button>
            {isOpen && (
                <div className="fixed bottom-32 right-6 w-96 h-[500px] bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
                    <div className="p-3 bg-purple-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2"><Brain className="w-4 h-4" /><span className="font-bold">Brainstorm Partner</span></div>
                        <button onClick={() => setIsOpen(false)}><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.sender === 'admin' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                                    <p className="text-xs whitespace-pre-wrap">{msg.message}</p>
                                </div>
                            </div>
                        ))}
                        {loading && <div className="text-slate-400 text-xs">Thinking...</div>}
                    </div>
                    <div className="p-3 border-t border-slate-800 flex gap-2">
                        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="Ask about pending jobs, users, security..." className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-white text-sm" />
                        <button onClick={sendMessage} className="p-2 bg-purple-600 rounded-lg"><Send className="w-4 h-4" /></button>
                    </div>
                </div>
            )}
        </>
    );
}
