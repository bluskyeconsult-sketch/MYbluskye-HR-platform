// src/components/CookieConsent.jsx
// PROFESSIONAL COOKIE CONSENT - GDPR compliant with granular settings (No external dependencies)

import { useState, useEffect } from 'react';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState({
        necessary: true,  // Always true - can't be disabled
        functional: false,
        analytics: false,
        marketing: false
    });

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        const savedPreferences = localStorage.getItem('cookie_preferences');
        
        if (!consent) {
            setIsVisible(true);
        } else if (savedPreferences) {
            try {
                const parsed = JSON.parse(savedPreferences);
                setPreferences(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Error parsing cookie preferences:', e);
            }
        }
    }, []);

    const saveConsent = (accepted, customPreferences = null) => {
        const consentData = {
            accepted: accepted,
            timestamp: new Date().toISOString(),
            preferences: customPreferences || preferences
        };
        
        localStorage.setItem('cookie_consent', JSON.stringify(consentData));
        
        if (customPreferences) {
            localStorage.setItem('cookie_preferences', JSON.stringify(customPreferences));
        }
        
        // Apply cookie preferences (disable/enable analytics, etc.)
        applyCookiePreferences(customPreferences || preferences);
        
        setIsVisible(false);
        setShowSettings(false);
    };

    const applyCookiePreferences = (prefs) => {
        // Google Analytics (if enabled)
        if (prefs.analytics && typeof gtag !== 'undefined') {
            window['ga-disable-REPLACE_WITH_GA_ID'] = false;
        } else if (typeof gtag !== 'undefined') {
            window['ga-disable-REPLACE_WITH_GA_ID'] = true;
        }
        
        // Facebook Pixel (if enabled)
        if (prefs.marketing && typeof fbq !== 'undefined') {
            // Enable marketing cookies
        }
        
        // Dispatch event for other scripts to react
        window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: prefs }));
    };

    const acceptAll = () => {
        const allAccepted = {
            necessary: true,
            functional: true,
            analytics: true,
            marketing: true
        };
        setPreferences(allAccepted);
        saveConsent(true, allAccepted);
    };

    const acceptEssential = () => {
        const essentialOnly = {
            necessary: true,
            functional: false,
            analytics: false,
            marketing: false
        };
        setPreferences(essentialOnly);
        saveConsent(true, essentialOnly);
    };

    const savePreferences = () => {
        saveConsent(true, preferences);
    };

    const declineAll = () => {
        saveConsent(false, {
            necessary: true,
            functional: false,
            analytics: false,
            marketing: false
        });
    };

    const openSettings = () => {
        setShowSettings(true);
    };

    const closeSettings = () => {
        setShowSettings(false);
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Main Cookie Banner */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 shadow-2xl" data-cookie-consent>
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        {/* Left Section - Icon & Message */}
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 p-2 bg-primary-500/10 rounded-full">
                                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-sm sm:text-base">
                                    🍪 We Value Your Privacy
                                </h3>
                                <p className="text-slate-400 text-xs sm:text-sm mt-0.5 max-w-2xl">
                                    We use cookies to enhance your browsing experience, serve personalized content, 
                                    and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                    <a 
                                        href="/legal/privacy" 
                                        className="text-xs text-slate-500 hover:text-primary-400 transition flex items-center gap-1"
                                    >
                                        Privacy Policy
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                    <a 
                                        href="/legal/cookies" 
                                        className="text-xs text-slate-500 hover:text-primary-400 transition flex items-center gap-1"
                                    >
                                        Cookie Policy
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Right Section - Buttons */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <button
                                onClick={openSettings}
                                className="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Customize
                            </button>
                            <button
                                onClick={acceptEssential}
                                className="px-4 py-1.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 text-sm transition"
                            >
                                Essential Only
                            </button>
                            <button
                                onClick={declineAll}
                                className="px-4 py-1.5 text-slate-400 hover:text-white text-sm transition"
                            >
                                Decline
                            </button>
                            <button
                                onClick={acceptAll}
                                className="px-5 py-1.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 shadow-lg shadow-primary-500/20 text-sm font-medium"
                            >
                                Accept All
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cookie Preferences Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-500/10 rounded-full">
                                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Cookie Preferences</h2>
                                    <p className="text-xs text-slate-400">Manage your privacy settings</p>
                                </div>
                            </div>
                            <button
                                onClick={closeSettings}
                                className="p-1 text-slate-400 hover:text-white transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body - Cookie Categories */}
                        <div className="p-5 space-y-4">
                            {/* Necessary Cookies (Always On) */}
                            <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-medium">Strictly Necessary</h3>
                                            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">Always On</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Essential for the website to function properly. Cannot be disabled.
                                        </p>
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Functional Cookies */}
                            <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-white font-medium">Functional</h3>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Remember your preferences and personalize your experience.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.functional}
                                            onChange={(e) => setPreferences({...preferences, functional: e.target.checked})}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Analytics Cookies */}
                            <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-white font-medium">Analytics</h3>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Help us understand how visitors interact with our website.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.analytics}
                                            onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Marketing Cookies */}
                            <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-white font-medium">Marketing</h3>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Used to deliver relevant advertisements and track campaign performance.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.marketing}
                                            onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex gap-3 p-5 border-t border-slate-800">
                            <button
                                onClick={declineAll}
                                className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                            >
                                Decline All
                            </button>
                            <button
                                onClick={savePreferences}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                                Save Preferences
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
