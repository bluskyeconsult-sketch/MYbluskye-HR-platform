// src/pages/admin/TesterVisibilitySettings.jsx
// Controls how the tester programme shows up on the public site.
//
// REVIEWED + FIXED (2026-10-13):
// - The old header and the save alert said these settings are "not read
//   anywhere". That is no longer true. The saved row (system_config key
//   'tester_visibility') is read by:
//     * Navbar.jsx and the header/footer in App.jsx - the Tester Login,
//       Become a Tester and footer-link switches
//     * TesterRegisterPage.jsx - 'hidden' shows a plain "Not Currently
//       Available" message instead of the form
//     * SignUpPage.jsx - require_invite_code decides whether an invite
//       code is demanded at sign-up while Testing Mode is on
//   Both stale texts have been removed.
// - The "Public" label wrongly said "(with invite code)". Public turns the
//   invite-code requirement OFF, so the label now says so.
// - Save now uses onConflict: 'config_key' like the other system_config
//   pages, checks the result, and shows an inline success/error banner
//   instead of an alert that reported success whatever happened.
// - A failed load is shown instead of silently falling back to defaults,
//   and saved values are merged over the defaults so an older saved row
//   missing a key cannot leave a switch undefined.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, Key, Globe, Save } from 'lucide-react';

const DEFAULTS = {
    show_login_button: false,
    show_register_button: false,
    show_footer_link: false,
    registration_mode: 'invite_only',
    allow_public_registration: false,
    require_invite_code: true
};

const TOGGLES = [
    { key: 'show_login_button', title: 'Show Tester Login Button', hint: 'Shown in the site header (desktop and mobile menu)' },
    { key: 'show_register_button', title: 'Show Tester Register Button', hint: 'Shows "Become a Tester" in the site header' },
    { key: 'show_footer_link', title: 'Show Tester Portal Link in Footer', hint: 'Shown in the website footer' }
];

const MODES = [
    { value: 'hidden', title: '🔒 Hidden', hint: 'The /tester-register page shows "Not Currently Available". An invite code is still required at sign-up while Testing Mode is on.' },
    { value: 'invite_only', title: '📧 Invite Only', hint: 'Anyone can request access, but a valid invite code is required to sign up.' },
    { value: 'public', title: '🌍 Public', hint: 'Anyone can sign up as a tester without an invite code (while Testing Mode is on).' }
];

export default function TesterVisibilitySettings() {
    const [settings, setSettings] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'tester_visibility')
                .maybeSingle();
            if (error) throw error;
            if (data?.config_value && typeof data.config_value === 'object') {
                setSettings({ ...DEFAULTS, ...data.config_value });
            }
            setLoadError('');
        } catch (err) {
            console.error('Error loading tester visibility:', err);
            setLoadError(err.message || 'Could not load the saved settings.');
        } finally {
            setLoading(false);
        }
    }

    async function saveSettings() {
        setSaving(true);
        setNotice(null);
        const newSettings = {
            show_login_button: !!settings.show_login_button,
            show_register_button: !!settings.show_register_button,
            show_footer_link: !!settings.show_footer_link,
            registration_mode: settings.registration_mode,
            allow_public_registration: settings.registration_mode === 'public',
            require_invite_code: settings.registration_mode !== 'public'
        };

        const { error } = await supabase
            .from('system_config')
            .upsert({
                config_key: 'tester_visibility',
                config_value: newSettings,
                description: 'Tester button visibility settings',
                updated_at: new Date().toISOString()
            }, { onConflict: 'config_key' });

        setSaving(false);
        if (error) {
            setNotice({ type: 'error', text: `Could not save: ${error.message}` });
            return;
        }
        setSettings(newSettings);
        setNotice({ type: 'ok', text: 'Saved. The site picks this up the next time a page is loaded.' });
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Loading settings...</div>;

    const flag = (on) => (on ? 'text-emerald-400' : 'text-red-400');

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Tester Visibility Settings</h1>

            {loadError && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                    Could not load the saved settings, so the defaults are shown: {loadError}. Saving now will overwrite whatever is stored.
                </div>
            )}
            {notice && (
                <div className={`mb-4 p-3 rounded-lg text-sm border ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                    {notice.text}
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary-400" /> Button Visibility
                    </h2>
                    <div className="space-y-3">
                        {TOGGLES.map(t => (
                            <div key={t.key} className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-lg">
                                <div>
                                    <span className="text-white font-medium">{t.title}</span>
                                    <p className="text-xs text-slate-400">{t.hint}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSettings(s => ({ ...s, [t.key]: !s[t.key] }))}
                                    className={`px-4 py-2 rounded-lg transition-colors flex-shrink-0 ${settings[t.key] ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                >
                                    {settings[t.key] ? 'Visible' : 'Hidden'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary-400" /> Registration Mode
                    </h2>
                    <div className="space-y-3">
                        {MODES.map(m => (
                            <label
                                key={m.value}
                                className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-colors ${settings.registration_mode === m.value ? 'bg-slate-700 border border-slate-600' : 'bg-slate-800/50'}`}
                            >
                                <div>
                                    <span className="text-white font-medium">{m.title}</span>
                                    <p className="text-xs text-slate-400">{m.hint}</p>
                                </div>
                                <input
                                    type="radio"
                                    name="registration_mode"
                                    checked={settings.registration_mode === m.value}
                                    onChange={() => setSettings(s => ({ ...s, registration_mode: m.value }))}
                                    className="w-4 h-4 flex-shrink-0"
                                />
                            </label>
                        ))}
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary-400" /> Preview (applies after you save)
                    </h2>
                    <div className="bg-slate-800/30 rounded-lg p-4 space-y-2">
                        <p className="text-sm">
                            <span className="text-slate-400">Tester Login Button:</span>{' '}
                            <span className={flag(settings.show_login_button)}>{settings.show_login_button ? 'Visible' : 'Hidden'}</span>
                        </p>
                        <p className="text-sm">
                            <span className="text-slate-400">Tester Register Button:</span>{' '}
                            <span className={flag(settings.show_register_button)}>{settings.show_register_button ? 'Visible' : 'Hidden'}</span>
                        </p>
                        <p className="text-sm">
                            <span className="text-slate-400">Footer Link:</span>{' '}
                            <span className={flag(settings.show_footer_link)}>{settings.show_footer_link ? 'Visible' : 'Hidden'}</span>
                        </p>
                        <p className="text-sm">
                            <span className="text-slate-400">Registration Mode:</span>{' '}
                            <span className="text-primary-400 capitalize">{String(settings.registration_mode).replace('_', ' ')}</span>
                        </p>
                        <p className="text-sm">
                            <span className="text-slate-400">Invite Code Required:</span>{' '}
                            <span className={settings.registration_mode !== 'public' ? 'text-emerald-400' : 'text-amber-400'}>
                                {settings.registration_mode !== 'public' ? 'Yes' : 'No'}
                            </span>
                        </p>
                    </div>
                </div>

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

            <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg space-y-2">
                <p className="text-sm text-primary-400">
                    💡 <strong>Note:</strong> Invite codes are created at <code className="bg-slate-800 px-1 rounded">/admin/tester-invites</code>.
                    People request access at <code className="bg-slate-800 px-1 rounded">/tester-register</code>.
                </p>
                <p className="text-sm text-primary-400">
                    The invite-code rule only applies at sign-up while <strong>Testing Mode</strong> is switched on (Admin &gt; Testing Mode). With Testing Mode off, sign-up never asks for a code whatever you choose here.
                </p>
            </div>
        </div>
    );
}
