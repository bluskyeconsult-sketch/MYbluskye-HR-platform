// src/components/admin/TesterModeToggle.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, AlertCircle, CheckCircle, Loader2, Users, Calendar, Clock } from 'lucide-react';

export default function TesterModeToggle() {
    const [testingMode, setTestingMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState({ totalTesters: 0, activeTesters: 0, expiringSoon: 0 });
    const [settings, setSettings] = useState({
        default_tester_days: 30,
        default_tester_uses: 10,
        auto_approve: true,
        max_testers: 100
    });

    useEffect(() => {
        loadSettings();
        loadTesterStats();
    }, []);

    async function loadSettings() {
        try {
            // Load from system_config
            const { data: modeData } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'testing_mode')
                .single();
            
            setTestingMode(modeData?.config_value === 'enabled');
            
            // Load tester settings
            const { data: daysData } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'tester_days')
                .single();
            
            const { data: usesData } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'tester_uses')
                .single();
            
            setSettings(prev => ({
                ...prev,
                default_tester_days: daysData?.config_value ? parseInt(daysData.config_value) : 30,
                default_tester_uses: usesData?.config_value ? parseInt(usesData.config_value) : 10
            }));
        } catch (err) {
            console.error('Error loading settings:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadTesterStats() {
        const { data: testers } = await supabase
            .from('profiles')
            .select('id, user_type, tester_expires_at')
            .eq('user_type', 'tester');
        
        const now = new Date();
        const expiringSoon = testers?.filter(t => {
            if (!t.tester_expires_at) return false;
            const expiry = new Date(t.tester_expires_at);
            const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
            return daysLeft <= 7 && daysLeft > 0;
        }).length || 0;
        
        setStats({
            totalTesters: testers?.length || 0,
            activeTesters: testers?.filter(t => {
                if (!t.tester_expires_at) return true;
                return new Date(t.tester_expires_at) > now;
            }).length || 0,
            expiringSoon
        });
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
        alert(`Testing mode ${newValue ? 'enabled' : 'disabled'}. New registrations will ${newValue ? 'become testers' : 'be regular users'}.`);
        setSaving(false);
    }

    async function updateSetting(key, value) {
        setSettings(prev => ({ ...prev, [key]: value }));
        
        await supabase
            .from('system_config')
            .upsert({
                config_key: `tester_${key === 'default_tester_days' ? 'days' : 'uses'}`,
                config_value: value.toString(),
                updated_at: new Date().toISOString()
            });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-primary-400" />
                    <div>
                        <h3 className="text-white font-semibold">Tester Registration Mode</h3>
                        <p className="text-slate-400 text-sm">Control who can register as testers</p>
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

            {/* Status Banner */}
            <div className={`p-4 rounded-lg mb-6 ${testingMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800/50'}`}>
                <div className="flex items-start gap-3">
                    {testingMode ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-slate-400 mt-0.5" />
                    )}
                    <div>
                        <p className="text-white font-medium">
                            Testing mode is currently <span className={testingMode ? 'text-emerald-400' : 'text-slate-400'}>
                                {testingMode ? 'ENABLED' : 'DISABLED'}
                            </span>
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                            {testingMode 
                                ? 'New users will automatically become testers with limited uses and access.'
                                : 'New users will register as regular users (free tier).'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/30 rounded-lg p-3 text-center">
                    <Users className="w-5 h-5 text-primary-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{stats.totalTesters}</p>
                    <p className="text-xs text-slate-500">Total Testers</p>
                </div>
                <div className="bg-slate-800/30 rounded-lg p-3 text-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{stats.activeTesters}</p>
                    <p className="text-xs text-slate-500">Active Testers</p>
                </div>
                <div className="bg-slate-800/30 rounded-lg p-3 text-center">
                    <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{stats.expiringSoon}</p>
                    <p className="text-xs text-slate-500">Expiring Soon (7d)</p>
                </div>
            </div>

            {/* Settings */}
            {testingMode && (
                <div className="border-t border-slate-800 pt-4 mt-2">
                    <h4 className="text-white text-sm font-medium mb-3">Tester Settings</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Tester Access (Days)</label>
                            <input
                                type="number"
                                value={settings.default_tester_days}
                                onChange={(e) => updateSetting('default_tester_days', parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                min="1"
                                max="365"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Free Uses</label>
                            <input
                                type="number"
                                value={settings.default_tester_uses}
                                onChange={(e) => updateSetting('default_tester_uses', parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                min="1"
                                max="100"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
