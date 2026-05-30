// src/components/CookieConsent.jsx
// COMPLETE PROFESSIONAL COOKIE CONSENT - GDPR compliant, unified API, enhanced UX

import { useState, useEffect, useCallback } from 'react';
import { Cookie, Settings, X, Shield, BarChart3, Megaphone, CheckCircle, AlertCircle } from 'lucide-react';

// Cookie categories configuration
const COOKIE_CATEGORIES = [
    {
        id: 'necessary',
        name: 'Necessary Cookies',
        description: 'Required for the website to function properly. Cannot be disabled.',
        icon: Shield,
        alwaysEnabled: true,
        gdprRequired: true
    },
    {
        id: 'functional',
        name: 'Functional Cookies',
        description: 'Remember your preferences and enhance your experience.',
        icon: Settings,
        alwaysEnabled: true,
        gdprRequired: false
    },
    {
        id: 'analytics',
        name: 'Analytics Cookies',
        description: 'Help us understand how visitors interact with our website.',
        icon: BarChart3,
        alwaysEnabled: false,
        gdprRequired: false
    },
    {
        id: 'marketing',
        name: 'Marketing Cookies',
        description: 'Used to deliver personalized advertisements.',
        icon: Megaphone,
        alwaysEnabled: false,
        gdprRequired: false
    }
];

const DEFAULT_PREFERENCES = {
    necessary: true,
    functional: true,
    analytics: false,
    marketing: false,
    consented_at: null,
    consent_version: '1.0'
};

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [consentGiven, setConsentGiven] = useState(false);
    const [consentType, setConsentType] = useState(null);

    // Load saved consent on mount
    useEffect(() => {
        loadConsent();
    }, []);

    // Apply consent preferences to external services
    useEffect(() => {
        if (consentGiven) {
            applyConsentPreferences(preferences);
        }
    }, [preferences, consentGiven]);

    async function loadConsent() {
        try {
            // Try to load from unified API first
            const response = await fetch('/api/index?action=get-consent', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setPreferences(result.data);
                    setConsentGiven(true);
                    setIsVisible(false);
                    return;
                }
            }
        } catch (error) {
            console.warn('Failed to fetch consent from API:', error);
        }
        
        // Fallback to localStorage
        const savedConsent = localStorage.getItem('cookie-consent');
        if (savedConsent) {
            try {
                const parsed = JSON.parse(savedConsent);
                setPreferences(parsed);
                setConsentGiven(true);
                setIsVisible(false);
            } catch (e) {
                console.error('Error parsing saved consent:', e);
                setIsVisible(true);
            }
        } else {
            setIsVisible(true);
        }
    }

    async function saveConsentToAPI(preferencesData, type) {
        try {
            const response = await fetch('/api/index?action=save-consent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferences: preferencesData,
                    consent_type: type,
                    consent_version: '1.0'
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save consent');
            }
        } catch (error) {
            console.warn('Failed to save consent to API:', error);
        }
    }

    function applyConsentPreferences(prefs) {
        // Google Analytics
        if (prefs.analytics && typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        } else if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'denied'
            });
        }
        
        // Facebook Pixel / Marketing
        if (prefs.marketing && typeof fbq !== 'undefined') {
            fbq('consent', 'grant');
        } else if (typeof fbq !== 'undefined') {
            fbq('consent', 'revoke');
        }
        
        // Dispatch custom event for other services
        window.dispatchEvent(new CustomEvent('consent-updated', { detail: prefs }));
    }

    function updateGoogleConsentMode(prefs) {
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'ad_storage': prefs.marketing ? 'granted' : 'denied',
                'analytics_storage': prefs.analytics ? 'granted' : 'denied',
                'functionality_storage': prefs.functional ? 'granted' : 'denied',
                'security_storage': 'granted'
            });
        }
    }

    const acceptAll = useCallback(async () => {
        const allTrue = {
            ...DEFAULT_PREFERENCES,
            analytics: true,
            marketing: true,
            consented_at: new Date().toISOString()
        };
        
        setPreferences(allTrue);
        setConsentGiven(true);
        setConsentType('all');
        
        // Save to localStorage
        localStorage.setItem('cookie-consent', JSON.stringify(allTrue));
        
        // Save to API
        await saveConsentToAPI(allTrue, 'all');
        
        // Apply consent
        applyConsentPreferences(allTrue);
        updateGoogleConsentMode(allTrue);
        
        setIsVisible(false);
    }, []);

    const acceptEssential = useCallback(async () => {
        const essential = {
            ...DEFAULT_PREFERENCES,
            analytics: false,
            marketing: false,
            consented_at: new Date().toISOString()
        };
        
        setPreferences(essential);
        setConsentGiven(true);
        setConsentType('essential');
        
        localStorage.setItem('cookie-consent', JSON.stringify(essential));
        await saveConsentToAPI(essential, 'essential');
        
        applyConsentPreferences(essential);
        updateGoogleConsentMode(essential);
        
        setIsVisible(false);
    }, []);

    const savePreferences = useCallback(async () => {
        const updatedPrefs = {
            ...preferences,
            consented_at: new Date().toISOString()
        };
        
        setPreferences(updatedPrefs);
        setConsentGiven(true);
        setConsentType('custom');
        
        localStorage.setItem('cookie-consent', JSON.stringify(updatedPrefs));
        await saveConsentToAPI(updatedPrefs, 'custom');
        
        applyConsentPreferences(updatedPrefs);
        updateGoogleConsentMode(updatedPrefs);
        
        setIsVisible(false);
        setShowSettings(false);
    }, [preferences]);

    const resetConsent = useCallback(() => {
        localStorage.removeItem('cookie-consent');
        setPreferences(DEFAULT_PREFERENCES);
        setConsentGiven(false);
        setIsVisible(true);
        setShowSettings(false);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-slate-900 to-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl animate-slide-up">
            <div className="max-w-7xl mx-auto">
                {!showSettings ? (
                    // Main Banner View
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                                <Cookie className="w-5 h-5 text-primary-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    <span className="font-semibold text-white">🍪 Cookie Notice</span>
                                    <span className="mx-2 text-slate-600">|</span>
                                    We use cookies to enhance your experience, analyze traffic, and personalize content.
                                    <span className="hidden sm:inline"> By continuing to use our site, you consent to our cookie policy.</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-1 sm:hidden">
                                    By continuing to use our site, you consent to our cookie policy.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 flex-shrink-0">
                            <button
                                onClick={() => setShowSettings(true)}
                                className="px-4 py-2 text-sm border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 hover:border-slate-500 transition-all duration-200 flex items-center gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                Customize
                            </button>
                            <button
                                onClick={acceptEssential}
                                className="px-4 py-2 text-sm border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 hover:border-slate-500 transition-all duration-200"
                            >
                                Essential Only
                            </button>
                            <button
                                onClick={acceptAll}
                                className="px-6 py-2 text-sm bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 shadow-lg shadow-primary-500/20 flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Accept All
                            </button>
                        </div>
                    </div>
                ) : (
                    // Settings Panel View
                    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary-400" />
                                <h3 className="text-white font-semibold">Cookie Preferences</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={resetConsent}
                                    className="text-xs text-slate-400 hover:text-primary-400 transition px-2 py-1 rounded hover:bg-slate-700"
                                >
                                    Reset Consent
                                </button>
                                <button 
                                    onClick={() => setShowSettings(false)} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                                    aria-label="Close settings"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-4 space-y-4">
                            <p className="text-xs text-slate-400 mb-2">
                                You can choose which cookies you want to allow. Necessary cookies are required for the website to function properly.
                            </p>
                            
                            {COOKIE_CATEGORIES.map((category) => {
                                const Icon = category.icon;
                                const isEnabled = preferences[category.id];
                                const isAlwaysEnabled = category.alwaysEnabled;
                                
                                return (
                                    <div key={category.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition">
                                        <div className="flex items-start gap-3 mb-3 sm:mb-0">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                <Icon className="w-4 h-4 text-primary-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-sm">
                                                    {category.name}
                                                    {isAlwaysEnabled && (
                                                        <span className="ml-2 text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Required</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5 max-w-md">{category.description}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center">
                                            {isAlwaysEnabled ? (
                                                <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">Always Active</span>
                                            ) : (
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isEnabled}
                                                        onChange={(e) => setPreferences({...preferences, [category.id]: e.target.checked})}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                                    <span className="ml-3 text-xs text-slate-400">
                                                        {isEnabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="p-4 border-t border-slate-700 bg-slate-800/30 flex flex-col sm:flex-row gap-3 sm:justify-between">
                            <div className="text-xs text-slate-500">
                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                Your preferences are saved locally and with our servers.
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="px-4 py-2 text-sm border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={savePreferences}
                                    className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Save Preferences
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
