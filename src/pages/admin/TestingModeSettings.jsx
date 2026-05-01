import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FlaskConical, Users, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TestingModeSettings() {
    const [testingMode, setTestingMode] = useState({ enabled: false, default_tester_days: 30, default_tester_uses: 10 });
    const [testers, setTesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [converting, setConverting] = useState(false);

    useEffect(() => {
        loadSettings();
        loadTesters();
    }, []);

    async function loadSettings() {
        const { data } = await supabase
            .from('system_config')
            .select('config_value')
            .eq('config_key', 'testing_mode')
            .single();
        
        if (data?.config_value) {
            setTestingMode(data.config_value);
        }
        setLoading(false);
    }

    async function loadTesters() {
        const { data } = await supabase
            .from('profiles')
            .select('id, email, full_name, created_at, tester_expires_at')
            .eq('user_type', 'tester')
            .order('created_at', { ascending: false });
        
        setTesters(data || []);
    }

    async function saveSettings() {
        setSaving(true);
        await supabase
            .from('system_config')
            .upsert({
                config_key: 'testing_mode',
                config_value: testingMode,
                description: 'Testing mode - all new users become testers'
            });
        alert('Testing mode settings saved!');
        setSaving(false);
    }

    async function convertToRegular(userId) {
        if (confirm('Convert this tester to a regular registered user? All their data will be preserved.')) {
            await supabase.rpc('convert_tester_to_regular', { p_user_id: userId });
            loadTesters();
            alert('User converted to registered user');
        }
    }

    async function convertAllTesters() {
        if (confirm('Convert ALL testers to regular registered users? This action cannot be undone.')) {
            setConverting(true);
            await supabase.rpc('convert_all_testers_to_regular');
            loadTesters();
            alert('All testers converted to registered users');
            setConverting(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Testing Mode Settings</h1>
            
            {/* Testing Mode Toggle */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <FlaskConical className="w-8 h-8 text-purple-400" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Testing Mode</h2>
                            <p className="text-sm text-slate-400">When enabled, all new registrations become testers automatically</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setTestingMode({ ...testingMode, enabled: !testingMode.enabled })}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            testingMode.enabled 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-slate-700 text-slate-300'
                        }`}
                    >
                        {testingMode.enabled ? '✅ Enabled' : '❌ Disabled'}
                    </button>
                </div>
                
                {testingMode.enabled && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-semibold">Testing Mode Active</span>
                        </div>
                        <p className="text-sm text-slate-300">
                            All new user registrations will automatically become testers with:
                        </p>
                        <ul className="list-disc list-inside text-sm text-slate-400 mt-2">
                            <li>{testingMode.default_tester_uses} total uses</li>
                            <li>{testingMode.default_tester_days} days validity</li>
                            <li>Tester dashboard access at /tester/dashboard</li>
                            <li>No payment required during testing</li>
                        </ul>
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Default Tester Uses</label>
                        <input
                            type="number"
                            value={testingMode.default_tester_uses}
                            onChange={(e) => setTestingMode({ ...testingMode, default_tester_uses: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            min="1"
                            max="100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Default Tester Days</label>
                        <input
                            type="number"
                            value={testingMode.default_tester_days}
                            onChange={(e) => setTestingMode({ ...testingMode, default_tester_days: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            min="1"
                            max="90"
                        />
                    </div>
                </div>
                
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="mt-4 w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
            
            {/* Testers List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        Current Testers ({testers.length})
                    </h2>
                    {testers.length > 0 && (
                        <button
                            onClick={convertAllTesters}
                            disabled={converting}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw className="w-4 h-4" /> {converting ? 'Converting...' : 'Convert All to Regular'}
                        </button>
                    )}
                </div>
                
                {testers.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No testers yet. Enable Testing Mode and new users will become testers.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-white">User</th>
                                    <th className="px-4 py-3 text-left text-white">Email</th>
                                    <th className="px-4 py-3 text-left text-white">Registered</th>
                                    <th className="px-4 py-3 text-left text-white">Expires</th>
                                    <th className="px-4 py-3 text-left text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {testers.map(tester => (
                                    <tr key={tester.id} className="border-t border-slate-800">
                                        <td className="px-4 py-3 text-white">{tester.full_name || 'N/A'}</td>
                                        <td className="px-4 py-3 text-slate-300">{tester.email}</td>
                                        <td className="px-4 py-3 text-slate-300">{new Date(tester.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {tester.tester_expires_at ? new Date(tester.tester_expires_at).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => convertToRegular(tester.id)}
                                                className="px-3 py-1 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600"
                                            >
                                                Convert to Regular
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* Info Box */}
            <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                <p className="text-sm text-primary-400">
                    💡 <strong>After testing phase:</strong> Disable Testing Mode and convert all testers to regular users using the "Convert All" button above.
                    User data (applications, skills, profiles) will be preserved.
                </p>
            </div>
        </div>
    );
}
