// src/pages/admin/TestingModeSettings.jsx
// Admin settings for testing mode

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FlaskConical, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function TestingModeSettings() {
    const [testingMode, setTestingMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkAdminAndLoadSettings();
    }, []);

    async function checkAdminAndLoadSettings() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.email !== 'bluskyeconsult@gmail.com') {
            window.location.href = '/admin-login';
            return;
        }
        setUser(user);
        await loadSettings();
    }

    async function loadSettings() {
        const { data, error } = await supabase
            .from('system_config')
            .select('config_value')
            .eq('config_key', 'testing_mode')
            .single();
        
        if (!error && data) {
            setTestingMode(data.config_value === 'enabled');
        }
        setLoading(false);
    }

    async function toggleTestingMode() {
        setSaving(true);
        const newValue = !testingMode;
        
        await supabase
            .from('system_config')
            .upsert({
                config_key: 'testing_mode',
                config_value: newValue ? 'enabled' : 'disabled',
                updated_at: new Date().toISOString()
            });
        
        setTestingMode(newValue);
        setSaving(false);
        alert(`Testing mode ${newValue ? 'enabled' : 'disabled'}. New registrations will ${newValue ? 'become testers' : 'be regular users'}.`);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-2">Testing Mode Settings</h1>
            <p className="text-slate-400 mb-8">Configure tester account creation behavior</p>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <FlaskConical className="w-8 h-8 text-primary-400" />
                        <div>
                            <h2 className="text-xl font-semibold text-white">Testing Mode</h2>
                            <p className="text-slate-400 text-sm">When enabled, all new registrations become testers automatically</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleTestingMode}
                        disabled={saving}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                            testingMode 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                        {testingMode ? 'Disable Testing Mode' : 'Enable Testing Mode'}
                    </button>
                </div>

                <div className={`p-4 rounded-lg mt-4 ${testingMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800/50'}`}>
                    <div className="flex items-start gap-3">
                        {testingMode ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                        ) : (
                            <XCircle className="w-5 h-5 text-slate-400 mt-0.5" />
                        )}
                        <div>
                            <p className="text-white font-medium">
                                Testing mode is currently {testingMode ? 'ENABLED' : 'DISABLED'}
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                {testingMode 
                                    ? 'New users will automatically become testers with limited uses and 30-day access.'
                                    : 'New users will register as regular users (free tier).'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                        <p className="text-amber-400 text-sm">
                            <strong>Note:</strong> Existing tester accounts are not affected by this setting. 
                            This only applies to new registrations.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
