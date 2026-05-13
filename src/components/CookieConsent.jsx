// src/components/CookieConsent.jsx
// GDPR-compliant cookie consent banner

import { useState, useEffect } from 'react';
import { Cookie, Settings, X } from 'lucide-react';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState({
        necessary: true,
        functional: true,
        analytics: false,
        marketing: false
    });

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            setIsVisible(true);
        } else {
            const parsed = JSON.parse(consent);
            setPreferences(parsed);
            applyPreferences(parsed);
        }
    }, []);

    function applyPreferences(prefs) {
        // Apply analytics consent
        if (prefs.analytics) {
            // Initialize analytics
            console.log('Analytics enabled');
        }
        
        // Apply marketing consent
        if (prefs.marketing) {
            // Initialize marketing cookies
            console.log('Marketing enabled');
        }
    }

    function acceptAll() {
        const allTrue = { necessary: true, functional: true, analytics: true, marketing: true };
        localStorage.setItem('cookie-consent', JSON.stringify(allTrue));
        setPreferences(allTrue);
        applyPreferences(allTrue);
        setIsVisible(false);
    }

    function acceptEssential() {
        const essential = { necessary: true, functional: true, analytics: false, marketing: false };
        localStorage.setItem('cookie-consent', JSON.stringify(essential));
        setPreferences(essential);
        applyPreferences(essential);
        setIsVisible(false);
    }

    function savePreferences() {
        localStorage.setItem('cookie-consent', JSON.stringify(preferences));
        applyPreferences(preferences);
        setIsVisible(false);
        setShowSettings(false);
    }

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800">
            <div className="max-w-7xl mx-auto">
                {!showSettings ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Cookie className="w-6 h-6 text-primary-400" />
                            <p className="text-sm text-slate-300">
                                We use cookies to enhance your experience. By continuing to visit this site, you agree to our use of cookies.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSettings(true)}
                                className="px-4 py-2 text-sm border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800"
                            >
                                <Settings className="w-4 h-4 inline mr-1" /> Settings
                            </button>
                            <button
                                onClick={acceptEssential}
                                className="px-4 py-2 text-sm border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800"
                            >
                                Essential Only
                            </button>
                            <button
                                onClick={acceptAll}
                                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                Accept All
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-semibold">Cookie Preferences</h3>
                            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-white font-medium">Necessary Cookies</p>
                                    <p className="text-xs text-slate-400">Required for the website to function</p>
                                </div>
                                <span className="text-slate-500">Always Active</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-white font-medium">Functional Cookies</p>
                                    <p className="text-xs text-slate-400">Remember your preferences</p>
                                </div>
                                <span className="text-slate-500">Always Active</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-white font-medium">Analytics Cookies</p>
                                    <p className="text-xs text-slate-400">Help us improve our website</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.analytics}
                                        onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-white font-medium">Marketing Cookies</p>
                                    <p className="text-xs text-slate-400">Personalize ads and content</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.marketing}
                                        onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                        </div>
                        <button
                            onClick={savePreferences}
                            className="mt-4 w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            Save Preferences
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
