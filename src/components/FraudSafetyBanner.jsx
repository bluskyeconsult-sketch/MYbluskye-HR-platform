import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function FraudSafetyBanner() {
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('fraud-banner-dismissed');
        if (saved) setDismissed(true);
    }, []);

    function handleDismiss() {
        localStorage.setItem('fraud-banner-dismissed', 'true');
        setDismissed(true);
    }

    if (dismissed) return null;

    return (
        <div className="bg-gradient-to-r from-red-900/30 to-amber-900/30 border border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            Stay Safe on ODUSBABA
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Important</span>
                        </h3>
                        <div className="text-sm text-slate-300 mt-1 space-y-1">
                            <p>✅ Always verify employer details before sharing personal information</p>
                            <p>✅ Never pay money to secure a job or for "training materials"</p>
                            <p>✅ Report suspicious job posts or messages immediately</p>
                            <p>✅ We will NEVER ask for your banking passwords or OTPs</p>
                            <p className="text-xs text-amber-400 mt-2">⚠️ BluSkye Consult is not responsible for transactions made outside our platform</p>
                        </div>
                    </div>
                </div>
                <button onClick={handleDismiss} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
