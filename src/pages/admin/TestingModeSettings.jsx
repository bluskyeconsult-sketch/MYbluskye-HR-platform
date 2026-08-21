// src/pages/admin/TestingModeSettings.jsx
// ODUSBABA TESTING MODE SETTINGS v3.1 - PRODUCTION READY
// ✅ Complete tester mode management with database sync
// ✅ Tester statistics dashboard
// ✅ Admin-only access with proper authentication
// ✅ Persists across page refreshes
//
// FIXED (2026-08-07):
// 1. Removed a hardcoded admin-email backdoor (6th confirmed instance
//    across the codebase) — the user_type check alone was already correct;
//    the email OR-clause was a redundant bypass.
// 2. loadTesterStats()'s average-VA-uses calculation passed a Supabase
//    query builder object directly into .in(), which requires an actual
//    array — this isn't valid and throws. Since this sat inside the same
//    try/catch as the rest of the function, that failure meant
//    setTesterStats() never ran at all, silently leaving ALL FOUR stat
//    cards (including the two that had already loaded correctly) stuck at
//    0. Fixed by resolving tester profile ids into a real array first, then
//    using a count-based query instead of fetching full rows.
//
// FIXED (2026-08-21): loadTesterStats() filtered profiles by
// user_type = 'tester' — but per the SignUpPage.jsx rebuild, testers now
// keep their REAL selected tier's user_type (job_seeker/employer/
// business_owner), never the literal string 'tester', so a tester can
// actually test the employer/business experience rather than being forced
// onto a generic account. Without this fix, every stat card on this page
// would have silently dropped to zero the moment that rebuild shipped,
// since no profile row will ever match user_type = 'tester' again. Now
// filters by the real is_tester boolean flag instead.
//
// FIXED (2026-08-21): every "10 free uses for 30 days" / "5 AI credits"
// figure on this page was a hardcoded string, not connected to the real,
// admin-configurable system_config values (tester_ai_call_cap,
// tester_access_days) introduced alongside the rebuild above — meaning an
// admin who changed the real cap would see this page keep claiming the old
// numbers regardless. Now fetches and displays the real configured values.

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
    // NEW (2026-08-21): the real, configurable tester limits — previously
    // this page just hardcoded "10 uses / 30 days" in several places with
    // no connection to the actual values enforced server-side.
    const [testerConfig, setTesterConfig] = useState({ aiCallCap: 15, accessDays: 30 });

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
            
            // FIXED: real database check only, no hardcoded email bypass.
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type, email')
                .eq('id', user.id)
                .single();
            
            const isAdminUser = profile?.user_type === 'admin' || 
                               profile?.user_type === 'super_admin';
            
            if (!isAdminUser) {
                window.location.href = '/admin-login';
                return;
            }
            
            setIsAdmin(true);
            setUser(user);
            await Promise.all([
                loadSettings(),
                loadTesterStats(),
                loadTesterConfig()
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

    // NEW (2026-08-21): loads the real configured tester cap/expiry —
    // same keys SignUpPage.jsx reads when creating a tester account, so
    // this page always describes what will actually happen, not a
    // hardcoded guess.
    async function loadTesterConfig() {
        try {
            const [{ data: capData }, { data: daysData }] = await Promise.all([
                supabase.from('system_config').select('config_value').eq('config_key', 'tester_ai_call_cap').maybeSingle(),
                supabase.from('system_config').select('config_value').eq('config_key', 'tester_access_days').maybeSingle()
            ]);

            setTesterConfig({
                aiCallCap: capData?.config_value ? parseInt(capData.config_value, 10) : 15,
                accessDays: daysData?.config_value ? parseInt(daysData.config_value, 10) : 30
            });
        } catch (error) {
            console.warn('Error loading tester config (using defaults):', error);
        }
    }

    async function loadTesterStats() {
        try {
            // FIXED (2026-08-21): was .eq('user_type', 'tester') — testers
            // now keep their real tier's user_type, so this must filter on
            // the is_tester flag instead, or it will always return zero.
            const { count: total } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('is_tester', true);
            
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            
            const { count: expiringSoon } = await supabase
                .from('tester_allocations')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'active')
                .lt('expires_at', thirtyDaysFromNow.toISOString());
            
            const { count: converted } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('is_tester', true)
                .eq('converted_to_paid', true);
            
            // FIXED: .in() requires a resolved array, not a query builder.
            // Resolve tester profile ids first, then use a count-based query.
            let avgUses = 0;
            const { data: testerProfiles } = await supabase
                .from('profiles')
                .select('id')
                .eq('is_tester', true);
            
            const testerIds = (testerProfiles || []).map(p => p.id);
            
            if (testerIds.length > 0) {
                const { count: vaTaskCount } = await supabase
                    .from('va_tasks')
                    .select('id', { count: 'exact', head: true })
                    .in('user_id', testerIds);
                avgUses = Math.round((vaTaskCount || 0) / testerIds.length);
            }
            
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
            
            // FIXED (2026-08-21): was a hardcoded "10 free uses / 30 days" —
            // now reflects the real configured cap.
            alert(`✅ Testing mode ${newValue ? 'enabled' : 'disabled'}.\n\nNew registrations will ${newValue ? `be able to test any plan, capped at ${testerConfig.aiCallCap} AI-assisted requests for ${testerConfig.accessDays} days` : 'be regular users (free tier with 5 AI credits)'}.`);
            
        } catch (dbError) {
            console.error('Failed to save to database:', dbError);
            localStorage.setItem('testing_mode', stringValue);
            setSyncStatus('error');
            setTestingMode(newValue);
            alert(`⚠️ Testing mode ${newValue ? 'enabled' : 'disabled'} (local only). Database sync may be unavailable.`);
        } finally {
            setSaving(false);
            await loadTesterStats();
        }
    }

    async function syncFromDatabase() {
        setSaving(true);
        await loadSettings();
        await loadTesterStats();
        await loadTesterConfig();
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
                            <p className="text-slate-400 text-sm">When enabled, new registrations require an invite code (configurable in Tester Visibility Settings) and can test any plan at no cost</p>
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
                                    ? `✨ New testers pick any plan and get its real capabilities, capped at ${testerConfig.aiCallCap} AI-assisted requests for ${testerConfig.accessDays} days regardless of tier.`
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
                                <li>Testers keep their selected tier's real capabilities — the AI-request cap applies regardless of which tier they picked</li>
                                <li>Cap is currently {testerConfig.aiCallCap} requests / {testerConfig.accessDays} days — adjustable via system_config (tester_ai_call_cap, tester_access_days)</li>
                                <li>Whether an invite code is required is a separate toggle — see Tester Visibility Settings</li>
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
