// src/pages/admin/TestingModeSettings.jsx
// COMPLETE - Tester mode persists on refresh with database sync

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FlaskConical, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function TestingModeSettings() {
    const [testingMode, setTestingMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);
    const [syncStatus, setSyncStatus] = useState(null); // 'success', 'error', or null

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
        setLoading(true);
        setSyncStatus(null);
        
        // Try to get from database first
        const { data, error } = await supabase
            .from('system_config')
            .select('config_value')
            .eq('config_key', 'testing_mode')
            .single();
        
        if (!error && data) {
            const enabled = data.config_value === 'enabled';
            setTestingMode(enabled);
            // Also sync to localStorage for fallback
            localStorage.setItem('testing_mode', enabled ? 'enabled' : 'disabled');
            setSyncStatus('success');
        } else {
            // Fallback to localStorage if database read fails
            const saved = localStorage.getItem('testing_mode');
            const enabled = saved === 'enabled';
            setTestingMode(enabled);
            setSyncStatus('error');
            console.warn('Failed to load from database, using localStorage fallback');
        }
        
        setLoading(false);
    }

    async function toggleTestingMode() {
        setSaving(true);
        const newValue = !testingMode;
        const stringValue = newValue ? 'enabled' : 'disabled';
        
        // Save to database
        const { error: dbError } = await supabase
            .from('system_config')
            .upsert({
                config_key: 'testing_mode',
                config_value: stringValue,
                updated_at: new Date().toISOString(),
                updated_by: user?.id
            }, {
                onConflict: 'config_key'
            });
        
        if (dbError) {
            console.error('Failed to save to database:', dbError);
            // Fallback to localStorage
            localStorage.setItem('testing_mode', stringValue);
            setSyncStatus('error');
        } else {
            setSyncStatus('success');
        }
        
        setTestingMode(newValue);
        setSaving(false);
        
        // Show confirmation
        alert(`Testing mode ${newValue ? 'enabled' : 'disabled'}. New registrations will ${newValue ? 'become testers' : 'be regular users'}.`);
    }

    async function syncFromDatabase() {
        setSaving(true);
        await loadSettings();
        setSaving(false);
        
        if (syncStatus === 'success') {
            alert('Settings synced from database successfully');
        } else {
            alert('Could not sync from database. Using localStorage fallback.');
        }
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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Testing Mode Settings</h1>
                    <p className="text-slate-400">Configure tester account creation behavior</p>
                </div>
                <button
                    onClick={syncFromDatabase}
                    disabled={saving}
                    className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm transition"
                >
                    <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                    Sync from Database
                </button>
            </div>

            {/* Sync Status Indicator */}
            {syncStatus === 'error' && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <p className="text-amber-400 text-sm">
                        Using localStorage fallback. Database connection may be unavailable.
                    </p>
                </div>
            )}

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
                                Testing mode is currently <span className={testingMode ? 'text-emerald-400' : 'text-slate-400'}>
                                    {testingMode ? 'ENABLED' : 'DISABLED'}
                                </span>
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                {testingMode 
                                    ? 'New users will automatically become testers with limited uses and 30-day access.'
                                    : 'New users will register as regular users (free tier).'}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                                Setting is stored in database and localStorage. Changes persist across page refreshes.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                        <div className="text-amber-400 text-sm">
                            <p className="font-medium mb-1">Important Notes:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Existing tester accounts are not affected by this setting</li>
                                <li>This only applies to new registrations</li>
                                <li>Setting is automatically synced between database and localStorage</li>
                                <li>Admin access required to change this setting</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
