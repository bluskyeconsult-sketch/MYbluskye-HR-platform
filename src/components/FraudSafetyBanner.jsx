// src/components/FraudSafetyBanner.jsx
// PROFESSIONAL SAFETY BANNER - Fraud prevention awareness with persistent dismissal

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, X, ExternalLink, Bell, Lock, CheckCircle } from 'lucide-react';

export default function FraudSafetyBanner() {
    const [isVisible, setIsVisible] = useState(true);
    const [isDismissed, setIsDismissed] = useState(false);
    const [showPermanent, setShowPermanent] = useState(false);
    const [dismissCount, setDismissCount] = useState(0);

    // Banner variants for rotation
    const safetyTips = [
        {
            icon: Shield,
            title: "Stay Safe",
            message: "ODUSBABA verifies all employers. Never share personal financial information.",
            color: "amber",
            link: "/safety-tips",
            linkText: "Safety Tips"
        },
        {
            icon: AlertTriangle,
            title: "Watch for Scams",
            message: "Legitimate employers will never ask for payment during the hiring process.",
            color: "red",
            link: "/fraud-prevention",
            linkText: "Fraud Prevention"
        },
        {
            icon: Lock,
            title: "Protect Your Data",
            message: "Keep your login credentials secure. Enable 2FA for extra protection.",
            color: "blue",
            link: "/settings/security",
            linkText: "Security Settings"
        },
        {
            icon: Bell,
            title: "Report Suspicious Activity",
            message: "See something suspicious? Report it immediately to our safety team.",
            color: "purple",
            link: "/report-fraud",
            linkText: "Report Now"
        }
    ];

    useEffect(() => {
        // Load dismissal state
        const dismissed = localStorage.getItem('fraud_banner_dismissed');
        const permanent = localStorage.getItem('fraud_banner_permanent');
        const count = parseInt(localStorage.getItem('fraud_banner_dismiss_count') || '0');
        
        setDismissCount(count);
        
        if (permanent === 'true') {
            setShowPermanent(true);
            setIsDismissed(true);
        } else if (dismissed === 'true') {
            setIsDismissed(true);
        }
        
        // Show banner again after 7 days if dismissed (but not permanently)
        if (dismissed === 'true' && !permanent) {
            const dismissedTime = localStorage.getItem('fraud_banner_dismissed_time');
            if (dismissedTime) {
                const daysSinceDismiss = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
                if (daysSinceDismiss >= 7) {
                    setIsDismissed(false);
                    localStorage.removeItem('fraud_banner_dismissed');
                }
            }
        }
        
        // Rotate tip every 10 seconds
        const interval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % safetyTips.length);
        }, 10000);
        
        return () => clearInterval(interval);
    }, []);

    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const currentTip = safetyTips[currentTipIndex];
    const Icon = currentTip.icon;

    const handleDismiss = () => {
        const newCount = dismissCount + 1;
        setDismissCount(newCount);
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

    const handleReopen = () => {
        setIsDismissed(false);
        localStorage.removeItem('fraud_banner_dismissed');
        localStorage.removeItem('fraud_banner_dismissed_time');
        // Reset count but don't remove permanent preference
        localStorage.setItem('fraud_banner_dismiss_count', '0');
        setDismissCount(0);
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

    const colorClasses = getColorClasses(currentTip.color);

    if (!isVisible || isDismissed || showPermanent) return null;

    return (
        <div className={`${colorClasses.bg} border-b ${colorClasses.border} transition-all duration-300 animate-slide-down`} data-fraud-banner>
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left Section - Icon + Message */}
                    <div className="flex items-start sm:items-center gap-3">
                        <div className={`flex-shrink-0 p-1 rounded-full ${colorClasses.bg}`}>
                            <Icon className={`w-5 h-5 ${colorClasses.icon}`} />
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
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                            onClick={handleDismiss}
                            className={`p-1 rounded-lg ${colorClasses.hover} transition-colors`}
                            aria-label="Dismiss banner"
                            title="Dismiss"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
