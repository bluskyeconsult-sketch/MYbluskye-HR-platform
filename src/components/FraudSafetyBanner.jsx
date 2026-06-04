// src/components/FraudSafetyBanner.jsx
// PROFESSIONAL SAFETY BANNER - Fraud prevention awareness with persistent dismissal

import { useState, useEffect } from 'react';

export default function FraudSafetyBanner() {
    const [isDismissed, setIsDismissed] = useState(false);
    const [showPermanent, setShowPermanent] = useState(false);
    const [currentTipIndex, setCurrentTipIndex] = useState(0);

    // Banner variants for rotation
    const safetyTips = [
        {
            title: "Stay Safe",
            message: "ODUSBABA verifies all employers. Never share personal financial information.",
            color: "amber",
            link: "/safety-tips",
            linkText: "Safety Tips"
        },
        {
            title: "Watch for Scams",
            message: "Legitimate employers will never ask for payment during the hiring process.",
            color: "red",
            link: "/fraud-prevention",
            linkText: "Fraud Prevention"
        },
        {
            title: "Protect Your Data",
            message: "Keep your login credentials secure. Enable 2FA for extra protection.",
            color: "blue",
            link: "/settings/security",
            linkText: "Security Settings"
        },
        {
            title: "Report Suspicious Activity",
            message: "See something suspicious? Report it immediately to our safety team.",
            color: "purple",
            link: "/report-fraud",
            linkText: "Report Now"
        }
    ];

    useEffect(() => {
        // Load dismissal state
        const permanent = localStorage.getItem('fraud_banner_permanent');
        
        if (permanent === 'true') {
            setShowPermanent(true);
            setIsDismissed(true);
            return;
        }
        
        const dismissed = localStorage.getItem('fraud_banner_dismissed');
        const dismissedTime = localStorage.getItem('fraud_banner_dismissed_time');
        
        // Show banner again after 7 days if dismissed
        if (dismissed === 'true' && dismissedTime) {
            const daysSinceDismiss = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismiss >= 7) {
                setIsDismissed(false);
                localStorage.removeItem('fraud_banner_dismissed');
                localStorage.removeItem('fraud_banner_dismissed_time');
            } else {
                setIsDismissed(true);
            }
        } else if (dismissed === 'true') {
            setIsDismissed(true);
        } else {
            setIsDismissed(false);
        }
    }, []);

    // Rotate tip every 10 seconds
    useEffect(() => {
        if (isDismissed || showPermanent) return;
        
        const interval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % safetyTips.length);
        }, 10000);
        
        return () => clearInterval(interval);
    }, [isDismissed, showPermanent]);

    const handleDismiss = () => {
        const dismissCount = parseInt(localStorage.getItem('fraud_banner_dismiss_count') || '0');
        const newCount = dismissCount + 1;
        
        localStorage.setItem('fraud_banner_dismiss_count', newCount.toString());
        localStorage.setItem('fraud_banner_dismissed_time', Date.now().toString());
        
        // After 3 dismissals, offer permanent hide option
        if (newCount >= 3) {
            const userWantsPermanent = window.confirm(
                "You've dismissed this safety reminder multiple times.\n\n" +
                "Would you like to permanently hide these safety tips?\n" +
                "You can always re-enable them in your account settings."
            );
            
            if (userWantsPermanent) {
                localStorage.setItem('fraud_banner_permanent', 'true');
                setShowPermanent(true);
                setIsDismissed(true);
            } else {
                localStorage.setItem('fraud_banner_dismissed', 'true');
                setIsDismissed(true);
            }
        } else {
            localStorage.setItem('fraud_banner_dismissed', 'true');
            setIsDismissed(true);
        }
    };

    const getColorClasses = (color) => {
        const colors = {
            amber: {
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20',
                text: 'text-amber-400',
                hover: 'hover:bg-amber-500/20',
                icon: 'text-amber-400'
            },
            red: {
                bg: 'bg-red-500/10',
                border: 'border-red-500/20',
                text: 'text-red-400',
                hover: 'hover:bg-red-500/20',
                icon: 'text-red-400'
            },
            blue: {
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/20',
                text: 'text-blue-400',
                hover: 'hover:bg-blue-500/20',
                icon: 'text-blue-400'
            },
            purple: {
                bg: 'bg-purple-500/10',
                border: 'border-purple-500/20',
                text: 'text-purple-400',
                hover: 'hover:bg-purple-500/20',
                icon: 'text-purple-400'
            }
        };
        return colors[color] || colors.amber;
    };

    if (isDismissed || showPermanent) return null;

    const currentTip = safetyTips[currentTipIndex];
    const colorClasses = getColorClasses(currentTip.color);

    return (
        <div className={`${colorClasses.bg} border-b ${colorClasses.border} transition-all duration-300`} data-fraud-banner>
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left Section - Icon + Message */}
                    <div className="flex items-start sm:items-center gap-3">
                        <div className={`flex-shrink-0 p-1 rounded-full ${colorClasses.bg}`}>
                            <svg className={`w-5 h-5 ${colorClasses.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className={`${colorClasses.text} text-sm font-semibold`}>
                                    {currentTip.title}
                                </p>
                                <span className="text-slate-600 text-xs">•</span>
                                <p className="text-slate-300 text-sm">
                                    {currentTip.message}
                                </p>
                            </div>
                            {/* Progress dots */}
                            <div className="flex gap-1 mt-1.5">
                                {safetyTips.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentTipIndex(idx)}
                                        className={`h-1 rounded-full transition-all ${
                                            idx === currentTipIndex 
                                                ? `w-4 ${colorClasses.bg} ${colorClasses.text} bg-opacity-100` 
                                                : 'w-1 bg-slate-600 hover:bg-slate-500'
                                        }`}
                                        aria-label={`View tip ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex items-center gap-3 ml-auto sm:ml-0">
                        <a
                            href={currentTip.link}
                            className={`flex items-center gap-1 ${colorClasses.text} text-sm hover:underline transition`}
                        >
                            {currentTip.linkText}
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                        <button
                            onClick={handleDismiss}
                            className={`p-1 rounded-lg ${colorClasses.hover} transition-colors`}
                            aria-label="Dismiss banner"
                            title="Dismiss"
                        >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
