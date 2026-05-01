import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Eye, EyeOff, Users, Key, Globe, Save } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TesterVisibilitySettings() {
    const [settings, setSettings] = useState({
        show_login_button: false,
        show_register_button: false,
        show_footer_link: false,
        registration_mode: 'invite_only',
        allow_public_registration: false,
        require_invite_code: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        const { data } = await supabase
            .from('system_config')
            .select('config_value')
            .eq('config_key', 'tester_visibility')
            .single();
        
        if (data?.config_value) {
            setSettings(data.config_value);
        }
        setLoading(false);
    }

    async function saveSettings() {
        setSaving(true);
        const newSettings = {
            show_login_button: settings.show_login_button,
            show_register_button: settings.show_register_button,
            show_footer_link: settings.show_footer_link,
            registration_mode: settings.registration_mode,
            allow_public_registration: settings.registration_mode === 'public',
            require_invite_code: settings.registration_mode !== 'public'
        };
        
        await supabase
            .from('system_config')
            .upsert({
                config_key: 'tester_visibility',
                config_value: newSettings,
                description: 'Tester button visibility settings',
                updated_at: new Date().toISOString()
            });
        
        setSettings(newSettings);
        setSaving(false);
        alert('Settings saved successfully!');
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Loading settings...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Tester Visibility Settings</h1>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                {/* Section 1: Button Visibility */}
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary-400" /> Button Visibility
                    </h2>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg cursor-pointer">
                            <div>
                                <span className="text-white font-medium">Show Tester Login Button</span>
                                <p className="text-xs text-slate-400">Display on homepage navbar</p>
                            </div>
                            <button
                                onClick={() => setSettings({...settings, show_login_button: !settings.show_login_button})}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    settings.show_login_button 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-slate-700 text-slate-300'
                                }`}
                            >
                                {settings.show_login_button ? 'Visible' : 'Hidden'}
                            </button>
                        </label>
                        
                        <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg cursor-pointer">
                            <div>
                                <span className="text-white font-medium">Show Tester Register Button</span>
                                <p className="text-xs text-slate-400">Display "Become a Tester" on homepage</p>
                            </div>
                            <button
                                onClick={() => setSettings({...settings, show_register_button: !settings.show_register_button})}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    settings.show_register_button 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-slate-700 text-slate-300'
                                }`}
                            >
                                {settings.show_register_button ? 'Visible' : 'Hidden'}
                            </button>
                        </label>
                        
                        <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg cursor-pointer">
                            <div>
                                <span className="text-white font-medium">Show Tester Portal Link in Footer</span>
                                <p className="text-xs text-slate-400">Display link in website footer</p>
                            </div>
                            <button
                                onClick={() => setSettings({...settings, show_footer_link: !settings.show_footer_link})}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    settings.show_footer_link 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-slate-700 text-slate-300'
                                }`}
                            >
                                {settings.show_footer_link ? 'Visible' : 'Hidden'}
                            </button>
                        </label>
                    </div>
                </div>
                
                {/* Section 2: Registration Mode */}
                <div className="border-t border-slate-800 pt-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary-400" /> Registration Mode
                    </h2>
                    <div className="space-y-3">
                        <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            settings.registration_mode === 'hidden' 
                                ? 'bg-slate-700 border border-slate-600' 
                                : 'bg-slate-800/50'
                        }`}>
                            <div>
                                <span className="text-white font-medium">🔒 Hidden</span>
                                <p className="text-xs text-slate-400">No tester registration available publicly</p>
                            </div>
                            <input
                                type="radio"
                                name="registration_mode"
                                checked={settings.registration_mode === 'hidden'}
                                onChange={() => setSettings({...settings, registration_mode: 'hidden'})}
                                className="w-4 h-4"
                            />
                        </label>
                        
                        <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            settings.registration_mode === 'invite_only' 
                                ? 'bg-slate-700 border border-slate-600' 
                                : 'bg-slate-800/50'
                        }`}>
                            <div>
                                <span className="text-white font-medium">📧 Invite Only</span>
                                <p className="text-xs text-slate-400">Requires valid invite code to register</p>
                            </div>
                            <input
                                type="radio"
                                name="registration_mode"
                                checked={settings.registration_mode === 'invite_only'}
                                onChange={() => setSettings({...settings, registration_mode: 'invite_only'})}
                                className="w-4 h-4"
                            />
                        </label>
                        
                        <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            settings.registration_mode === 'public' 
                                ? 'bg-slate-700 border border-slate-600' 
                                : 'bg-slate-800/50'
                        }`}>
                            <div>
                                <span className="text-white font-medium">🌍 Public</span>
                                <p className="text-xs text-slate-400">Anyone can register as tester (with invite code)</p>
                            </div>
                            <input
                                type="radio"
                                name="registration_mode"
                                checked={settings.registration_mode === 'public'}
                                onChange={() => setSettings({...settings, registration_mode: 'public'})}
                                className="w-4 h-4"
                            />
                        </label>
                    </div>
                </div>
                
                {/* Section 3: Current Status Preview */}
                <div className="border-t border-slate-800 pt-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary-400" /> Current Status Preview
                    </h2>
                    <div className="bg-slate-800/30 rounded-lg p-4 space-y-2">
                        <p className="text-sm">
                            <span className="text-slate-400">Tester Login Button:</span>{' '}
                            <span className={settings.show_login_button ? 'text-emerald-400' : 'text-red-400'}>
                                {settings.show_login_button ? 'Visible' : 'Hidden'}
                            </span>
                        </p>
                        <p className="text-sm">
                            <span className="text-slate-400">Tester Register Button:</span>{' '}
                            <span className={settings.show_register_button ? 'text-emerald-400' : 'text-red-400'}>
                                {settings.show_register_button ? 'Visible' : 'Hidden'}
                            </span>
                        </p>
                        <p className="text-sm">
                            <span className="text-slate-400">Registration Mode:</span>{' '}
                            <span className="text-primary-400 capitalize">{settings.registration_mode}</span>
                        </p>
                        <p className="text-sm">
                            <span className="text-slate-400">Invite Code Required:</span>{' '}
                            <span className={settings.require_invite_code ? 'text-emerald-400' : 'text-amber-400'}>
                                {settings.require_invite_code ? 'Yes' : 'No'}
                            </span>
                        </p>
                    </div>
                </div>
                
                {/* Save Button */}
                <div className="pt-4">
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="w-full py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
            
            <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                <p className="text-sm text-primary-400">
                    💡 <strong>Note:</strong> When Registration Mode is set to "Invite Only" or "Public", 
                    users can register at <code className="bg-slate-800 px-1 rounded">/tester-register</code>. 
                    Invite codes can be generated in <code className="bg-slate-800 px-1 rounded">/admin/tester-invites</code>.
                </p>
            </div>
        </div>
    );
}
