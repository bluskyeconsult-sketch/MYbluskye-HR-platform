// src/components/admin/TesterModeToggle.jsx
// ODUSBABA TESTER MODE TOGGLE v2.0 - PRODUCTION READY
// ✅ Complete tester mode management
// ✅ Real-time statistics
// ✅ Configurable settings
// ✅ Admin-only access

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Shield, AlertCircle, CheckCircle, Loader2, Users, 
    Calendar, Clock, Settings, Save, RefreshCw, TrendingUp
} from 'lucide-react';

export default function TesterModeToggle() {
    const [testingMode, setTestingMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ 
        totalTesters: 0, 
        activeTesters: 0, 
        expiringSoon: 0,
        convertedTesters: 0,
        avgUses: 0
    });
    const [settings, setSettings] = useState({
        default_tester_days: 30,
        default_tester_uses: 10,
        auto_approve: true,
        max_testers: 100
    });
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAdminAndLoad();
    }, []);

    async function checkAdminAndLoad() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                window.location.href = '/admin-login';
                return;
            }
            
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', user.id)
                .single();
            
            const isAdminUser = profile?.user_type === 'admin' || 
                               profile?.user_type === 'super_admin' || 
                               user.email === 'bluskyeconsult@gmail.com';
            
            if (!isAdminUser) {
                window.location.href = '/admin-login';
                return;
            }
            
            setIsAdmin(true);
            await Promise.all([
                loadSettings(),
                loadTesterStats()
            ]);
        } catch (error) {
            console.error('Admin check error:', error);
            window.location.href = '/admin-login';
        }
    }

    async function loadSettings() {
        try {
            // Load testing mode status
            const { data: modeData, error: modeError } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'testing_mode')
                .maybeSingle();
            
            if (!modeError && modeData) {
                setTestingMode(modeData.config_value === 'enabled');
            }
            
            // Load tester days setting
            const { data: daysData } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'tester_days')
                .maybeSingle();
            
            // Load tester uses setting
            const { data: usesData } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'tester_uses')
                .maybeSingle();
            
            // Load max testers setting
            const { data: maxData } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'tester_max')
                .maybeSingle();
            
            setSettings(prev => ({
                ...prev,
                default_tester_days: daysData?.config_value ? parseInt(daysData.config_value) : 30,
                default_tester_uses: usesData?.config_value ? parseInt(usesData.config_value) : 10,
                max_testers: maxData?.config_value ? parseInt(maxData.config_value) : 100
            }));
        } catch (err) {
            console.error('Error loading settings:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadTesterStats() {
        try {
            // Get all testers
            const { data: testers, error } = await supabase
                .from('profiles')
                .select('id, user_type, tester_expires_at, created_at')
                .eq('user_type', 'tester');
            
            if (error) throw error;
            
            const now = new Date();
            
            // Calculate active testers (not expired)
            const activeTesters = testers?.filter(t => {
                if (!t.tester_expires_at) return true;
                return new Date(t.tester_expires_at) > now;
            }).length || 0;
            
            // Calculate expiring soon (within 7 days)
            const expiringSoon = testers?.filter(t => {
                if (!t.tester_expires_at) return false;
                const expiry = new Date(t.tester_expires_at);
                const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
                return daysLeft <= 7 && daysLeft > 0;
            }).length || 0;
            
            // Get converted testers (became paid users)
            const { data: converted } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_type', 'tester')
                .eq('converted_to_paid', true);
            
            // Get average VA uses for testers
            const { data: vaTasks } = await supabase
                .from('va_tasks')
                .select('user_id')
                .in('user_id', testers?.map(t => t.id) || []);
            
            const avgUses = testers?.length ? Math.round((vaTasks?.length || 0) / testers.length) : 0;
            
            setStats({
                totalTesters: testers?.length || 0,
                activeTesters,
                expiringSoon,
                convertedTesters: converted?.length || 0,
                avgUses
            });
        } catch (err) {
            console.error('Error loading tester stats:', err);
        }
    }

    async function toggleTestingMode() {
        if (!isAdmin) {
            alert('Admin access required to change testing mode');
            return;
        }
        
        setSaving(true);
        const newValue = !testingMode;
        
        try {
            const { error } = await supabase
                .from('system_config')
                .upsert({
                    config_key: 'testing_mode',
                    config_value: newValue ? 'enabled' : 'disabled',
                    updated_at: new Date().toISOString(),
                    updated_by: (await supabase.auth.getUser()).data.user?.id
                });
            
            if (error) throw error;
            
            setTestingMode(newValue);
            alert(`✅ Testing mode ${newValue ? 'enabled' : 'disabled'}.\n\nNew registrations will ${newValue ? 'become testers' : 'be regular users'}.`);
        } catch (error) {
            console.error('Error toggling testing mode:', error);
            alert('❌ Failed to change testing mode. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    async function updateSetting(key, value) {
        setSettings(prev => ({ ...prev, [key]: value }));
        
        let configKey;
        switch (key) {
            case 'default_tester_days':
                configKey = 'tester_days';
                break;
            case 'default_tester_uses':
                configKey = 'tester_uses';
                break;
            case 'max_testers':
                configKey = 'tester_max';
                break;
            default:
                return;
        }
        
        try {
            await supabase
                .from('system_config')
                .upsert({
                    config_key: configKey,
                    config_value: value.toString(),
                    updated_at: new Date().toISOString()
                });
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        }
    }

    async function refreshStats() {
        setRefreshing(true);
        await loadTesterStats();
        setRefreshing(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">Tester Registration Mode</h3>
                        <p className="text-slate-400 text-sm">Control who can register as testers</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={refreshStats}
                        disabled={refreshing}
                        className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition disabled:opacity-50"
                        title="Refresh stats"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={toggleTestingMode}
                        disabled={saving}
                        className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                            testingMode 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                        {testingMode ? 'Disable Testing Mode' : 'Enable Testing Mode'}
                    </button>
                </div>
            </div>

            {/* Status Banner */}
            <div className={`p-4 rounded-xl mb-6 transition-all duration-200 ${
                testingMode 
                    ? 'bg-emerald-500/10 border border-emerald-500/20' 
                    : 'bg-slate-800/30 border border-slate-700'
            }`}>
                <div className="flex items-start gap-3">
                    {testingMode ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                        <p className="text-white font-medium">
                            Testing mode is currently <span className={testingMode ? 'text-emerald-400' : 'text-slate-400'}>
                                {testingMode ? 'ENABLED' : 'DISABLED'}
                            </span>
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                            {testingMode 
                                ? '✨ New users will automatically become testers with limited uses and access.'
                                : '👤 New users will register as regular users (free tier).'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-800/30 rounded-xl p-3 text-center hover:bg-slate-800/50 transition">
                    <Users className="w-5 h-5 text-primary-400 mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalTesters}</p>
                    <p className="text-xs text-slate-500">Total Testers</p>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-3 text-center hover:bg-slate-800/50 transition">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-bold text-white">{stats.activeTesters}</p>
                    <p className="text-xs text-slate-500">Active Testers</p>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-3 text-center hover:bg-slate-800/50 transition">
                    <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-bold text-white">{stats.expiringSoon}</p>
                    <p className="text-xs text-slate-500">Expiring Soon (7d)</p>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-3 text-center hover:bg-slate-800/50 transition">
                    <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-bold text-white">{stats.avgUses}</p>
                    <p className="text-xs text-slate-500">Avg VA Uses</p>
                </div>
            </div>

            {/* Settings Panel */}
            {testingMode && (
                <div className="border-t border-slate-800 pt-5 mt-3">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-4 h-4 text-primary-400" />
                        <h4 className="text-white text-sm font-medium">Tester Configuration</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Tester Access (Days)</label>
                            <input
                                type="number"
                                value={settings.default_tester_days}
                                onChange={(e) => updateSetting('default_tester_days', parseInt(e.target.value) || 30)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                min="1"
                                max="365"
                            />
                            <p className="text-xs text-slate-500 mt-1">How many days testers have access</p>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Free VA Uses</label>
                            <input
                                type="number"
                                value={settings.default_tester_uses}
                                onChange={(e) => updateSetting('default_tester_uses', parseInt(e.target.value) || 10)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                min="1"
                                max="100"
                            />
                            <p className="text-xs text-slate-500 mt-1">Number of free VA tasks for testers</p>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Maximum Testers</label>
                            <input
                                type="number"
                                value={settings.max_testers}
                                onChange={(e) => updateSetting('max_testers', parseInt(e.target.value) || 100)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                min="1"
                                max="1000"
                            />
                            <p className="text-xs text-slate-500 mt-1">Maximum number of active testers</p>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500 text-center">
                        <p>⚡ Changes take effect immediately for new tester registrations</p>
                    </div>
                </div>
            )}
        </div>
    );
}
