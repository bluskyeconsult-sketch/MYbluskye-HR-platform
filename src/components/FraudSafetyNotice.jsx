import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Mail, ExternalLink, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function FraudSafetyNotice() {
    const [dismissed, setDismissed] = useState(false);
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        const saved = localStorage.getItem('fraud-notice-dismissed');
        if (saved) setDismissed(true);
        loadNotice();
    }, []);

    async function loadNotice() {
        const { data } = await supabase.from('system_config').select('config_value').eq('config_key', 'fraud_safety_notice').single();
        if (data) setNotice(data.config_value);
    }

    function handleDismiss() {
        localStorage.setItem('fraud-notice-dismissed', 'true');
        setDismissed(true);
    }

    if (dismissed || !notice) return null;

    return (
        <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 mb-4 rounded-r-lg">
            <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h4 className="font-semibold text-amber-400">{notice.title || 'Stay Safe on ODUSBABA'}</h4>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300 list-disc list-inside">
                        {notice.points?.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-4">
                        <a href="/report-fraud" className="text-sm text-primary-400 hover:underline flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Report Suspicious Activity</a>
                        <a href={`mailto:${notice.report_email || 'fraud@bluskyeconsult.com'}`} className="text-sm text-primary-400 hover:underline flex items-center gap-1"><Mail className="w-3 h-3" /> Contact Safety Team</a>
                    </div>
                </div>
                <button onClick={handleDismiss} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
        </div>
    );
}
