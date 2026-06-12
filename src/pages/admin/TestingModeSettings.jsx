// src/pages/admin/TestingModeSettings.jsx
// ODUSBABA TESTING MODE SETTINGS v3.0 - PRODUCTION READY
// ✅ Complete tester mode management with database sync
// ✅ Tester statistics dashboard
// ✅ Admin-only access with proper authentication
// ✅ Persists across page refreshes

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    FlaskConical, Loader2, CheckCircle, XCircle, AlertCircle, 
    RefreshCw, Users, Calendar, Clock, Award, TrendingUp
} from 'lucide-react';

export default function TestingModeSettings() {
    const [testingMode, setTestingMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);
    const [syncStatus, setSyncStatus] = useState(null);
    const [testerStats, setTesterStats] = useState({ 
        total: 0, 
        active: 0, 
        expiringSoon: 0,
        converted: 0,
        avgUses: 0
    });
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAdminAndLoadSettings();
    }, []);

    async function checkAdminAndLoadSettings() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                window.location.href = '/admin-login';
                return;
            }
            
            // Check if user is admin or super_admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type, email')
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
            setUser(user);
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
        setLoading(true);
        setSyncStatus(null);
        
        try {
            // Try to get from database
            const { data, error } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'testing_mode')
                .maybeSingle();
            
            if (!error && data) {
                const enabled = data.config_value === 'enabled';
                setTestingMode(enabled);
                localStorage.setItem('testing_mode', enabled ? 'enabled' : 'disabled');
                setSyncStatus('success');
            } else {
                // Fallback to localStorage
                const saved = localStorage.getItem('testing_mode');
                const enabled = saved === 'enabled';
                setTestingMode(enabled);
                setSyncStatus('error');
                console.warn('Failed to load from database, using localStorage fallback');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            const saved = localStorage.getItem('testing_mode');
            setTestingMode(saved === 'enabled');
            setSyncStatus('error');
        } finally {
            setLoading(false);
        }
    }

    async function loadTesterStats() {
        try {
            // Get total testers
            const { count: total } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('user_type', 'tester');
            
            // Get expiring testers (within next 30 days)
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            
            const { count: expiringSoon } = await supabase
                .from('tester_allocations')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'active')
                .lt('expires_at', thirtyDaysFromNow.toISOString());
            
            // Get converted testers (became paid users)
            const { count: converted } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('user_type', 'tester')
                .eq('converted_to_paid', true);
            
            // Get average VA uses
            const { data: vaTasks } = await supabase
                .from('va_tasks')
                .select('user_id')
                .in('user_id', 
                    supabase.from('profiles').select('id').eq('user_type', 'tester')
                );
            
            const avgUses = vaTasks?.length ? Math.round(vaTasks.length / (total || 1)) : 0;
            
            setTesterStats({
                total: total || 0,
                active: total || 0,
                expiringSoon: expiringSoon || 0,
                converted: converted || 0,
                avgUses: avgUses
            });
        } catch (error) {
            console.error('Error loading tester stats:', error);
        }
    }

    async function toggleTestingMode() {
        if (!isAdmin) {
            alert('Admin access required to change testing mode');
            return;
        }
        
        setSaving(true);
        const newValue = !testingMode;
        const stringValue = newValue ? 'enabled' : 'disabled';
        
        try {
            // Save to database
            const { error: dbError } = await supabase
                .from('system_config')
                .upsert({
                    config_key: 'testing_mode',
                    config_value: stringValue,
                    updated_at: new Date().toISOString(),
                    updated_by: user?.id
                }, { onConflict: 'config_key' });
            
            if (dbError) throw dbError;
            
            setSyncStatus('success');
            setTestingMode(newValue);
            localStorage.setItem('testing_mode', stringValue);
            
            // Show confirmation
            alert(`✅ Testing mode ${newValue ? 'enabled' : 'disabled'}.\n\nNew registrations will ${newValue ? 'become testers (10 free uses / 30 days)' : 'be regular users (free tier with 5 AI credits)'}.`);
            
        } catch (dbError) {
            console.error('Failed to save to database:', dbError);
            // Fallback to localStorage
            localStorage.setItem('testing_mode', stringValue);
            setSyncStatus('error');
            setTestingMode(newValue);
            alert(`⚠️ Testing mode ${newValue ? 'enabled' : 'disabled'} (local only). Database sync may be unavailable.`);
        } finally {
            setSaving(false);
            // Refresh stats after toggling
            await loadTesterStats();
        }
    }

    async function syncFromDatabase() {
        setSaving(true);
        await loadSettings();
        await loadTesterStats();
        setSaving(false);
        
        if (syncStatus === 'success') {
            alert('✅ Settings synced from database successfully');
        } else {
            alert('⚠️ Could not sync from database. Using localStorage fallback.');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Loading settings...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-slate-400">Admin access required to view this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <FlaskConical className="w-6 h-6 text-primary-400" />
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Testing Mode Settings</h1>
                    </div>
                    <p className="text-slate-400">Configure tester account creation behavior and monitor tester activity</p>
                </div>
                <button
                    onClick={syncFromDatabase}
                    disabled={saving}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm transition disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                    Sync from Database
                </button>
            </div>

            {/* Sync Status Indicator */}
            {syncStatus === 'error' && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-400 text-sm">
                        Using localStorage fallback. Database connection may be unavailable.
                    </p>
                </div>
            )}

            {/* Tester Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{testerStats.total.toLocaleString()}</div>
                            <div className="text-xs text-slate-400">Total Testers</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{testerStats.active.toLocaleString()}</div>
                            <div className="text-xs text-slate-400">Active Testers</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{testerStats.expiringSoon.toLocaleString()}</div>
                            <div className="text-xs text-slate-400">Expiring Soon</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Award className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{testerStats.avgUses}</div>
                            <div className="text-xs text-slate-400">Avg VA Uses</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Toggle Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                            <FlaskConical className="w-6 h-6 text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Testing Mode</h2>
                            <p className="text-slate-400 text-sm">When enabled, all new registrations become testers automatically</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleTestingMode}
                        disabled={saving}
                        className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                            testingMode 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {testingMode ? 'Disable Testing Mode' : 'Enable Testing Mode'}
                    </button>
                </div>

                {/* Status Card */}
                <div className={`p-4 rounded-xl mt-4 transition-all duration-200 ${
                    testingMode 
                        ? 'bg-emerald-500/10 border border-emerald-500/20' 
                        : 'bg-slate-800/30 border border-slate-700'
                }`}>
                    <div className="flex items-start gap-3">
                        {testingMode ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        ) : (
                            <XCircle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                            <p className="text-white font-medium">
                                Testing mode is currently <span className={testingMode ? 'text-emerald-400' : 'text-slate-400'}>
                                    {testingMode ? 'ENABLED' : 'DISABLED'}
                                </span>
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                {testingMode 
                                    ? '✨ New users will automatically become testers with 10 free VA uses for 30 days.'
                                    : '👤 New users will register as regular users (free tier with 5 AI credits).'}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                                Setting is stored in database and localStorage. Changes persist across page refreshes.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Important Notes */}
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-amber-400 text-sm">
                            <p className="font-medium mb-2">Important Notes:</p>
                            <ul className="space-y-1 list-disc list-inside">
                                <li>Existing tester accounts are not affected by this setting</li>
                                <li>This only applies to new registrations</li>
                                <li>Testers get 10 free VA uses for 30 days</li>
                                <li>Setting is automatically synced between database and localStorage</li>
                                <li>Admin access required to change this setting</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Last Sync Info */}
                {syncStatus === 'success' && (
                    <div className="mt-4 pt-3 border-t border-slate-700">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            Database sync active • Changes persist across sessions
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
