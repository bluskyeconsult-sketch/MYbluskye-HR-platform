// src/components/FraudSafetyBanner.jsx
// COMPLETE PROFESSIONAL FRAUD SAFETY BANNER - Dynamic content, unified API, enhanced security tips

import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, X, Eye, Lock, FileText, Phone, Mail, ExternalLink, Bell, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

// Default safety tips (fallback if API fails)
const DEFAULT_SAFETY_TIPS = [
    {
        id: 1,
        type: 'warning',
        icon: Shield,
        title: 'Verify Employers',
        message: 'Always verify employer details before sharing personal information',
        actionText: 'Learn More',
        actionLink: '/safety-tips'
    },
    {
        id: 2,
        type: 'critical',
        icon: AlertTriangle,
        title: 'Never Pay for Jobs',
        message: 'Never pay money to secure a job or for "training materials"',
        actionText: 'Report Fraud',
        actionLink: '/report-fraud'
    },
    {
        id: 3,
        type: 'info',
        icon: Eye,
        title: 'Report Suspicious Activity',
        message: 'Report suspicious job posts or messages immediately',
        actionText: 'File Report',
        actionLink: '/report-fraud'
    },
    {
        id: 4,
        type: 'warning',
        icon: Lock,
        title: 'Protect Your Credentials',
        message: 'We will NEVER ask for your banking passwords or OTPs',
        actionText: 'Security Tips',
        actionLink: '/safety-tips'
    }
];

const DISMISSAL_DURATION_DAYS = 7; // Banner reappears after 7 days

export default function FraudSafetyBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [safetyTips, setSafetyTips] = useState(DEFAULT_SAFETY_TIPS);
    const [showDetailed, setShowDetailed] = useState(false);
    const [lastChecked, setLastChecked] = useState(null);

    useEffect(() => {
        loadBannerStatus();
        fetchSafetyTips();
    }, []);

    async function loadBannerStatus() {
        try {
            // Check if banner was dismissed
            const dismissedData = localStorage.getItem('fraud-banner-dismissed');
            
            if (dismissedData) {
                const { dismissedAt, expiresAt } = JSON.parse(dismissedData);
                
                // Check if dismissal has expired
                if (expiresAt && new Date(expiresAt) > new Date()) {
                    setIsVisible(false);
                    setLoading(false);
                    return;
                } else if (expiresAt && new Date(expiresAt) <= new Date()) {
                    // Dismissal expired, remove from storage
                    localStorage.removeItem('fraud-banner-dismissed');
                }
            }
            
            // Check if user has acknowledged safety tips recently
            const acknowledged = localStorage.getItem('safety-tips-acknowledged');
            if (acknowledged) {
                const ackData = JSON.parse(acknowledged);
                if (new Date(ackData.acknowledgedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
                    setLastChecked(ackData.acknowledgedAt);
                }
            }
            
            setIsVisible(true);
        } catch (error) {
            console.warn('Error loading banner status:', error);
            setIsVisible(true);
        } finally {
            setLoading(false);
        }
    }

    async function fetchSafetyTips() {
        try {
            const response = await fetch('/api/index?action=safety-tips', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    setSafetyTips(result.data);
                }
            }
        } catch (error) {
            console.warn('Failed to fetch safety tips, using defaults:', error);
        }
    }

    const handleDismiss = useCallback(async () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + DISMISSAL_DURATION_DAYS);
        
        const dismissalData = {
            dismissedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            reason: 'user_dismissed'
        };
        
        localStorage.setItem('fraud-banner-dismissed', JSON.stringify(dismissalData));
        setIsVisible(false);
        
        // Report dismissal to API
        try {
            await fetch('/api/index?action=track-banner-dismissal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    banner_type: 'fraud_safety',
                    dismissed_at: new Date().toISOString()
                })
            });
        } catch (error) {
            console.warn('Failed to report dismissal:', error);
        }
    }, []);

    const handleAcknowledge = useCallback(async () => {
        const ackData = {
            acknowledgedAt: new Date().toISOString(),
            acknowledgedTips: safetyTips.map(t => t.id)
        };
        
        localStorage.setItem('safety-tips-acknowledged', JSON.stringify(ackData));
        setLastChecked(ackData.acknowledgedAt);
        setShowDetailed(false);
        
        // Report acknowledgment to API
        try {
            await fetch('/api/index?action=acknowledge-safety-tips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ackData)
            });
        } catch (error) {
            console.warn('Failed to report acknowledgment:', error);
        }
    }, [safetyTips]);

    const getTypeStyles = (type) => {
        switch (type) {
            case 'critical':
                return {
                    bg: 'from-red-900/30 to-red-800/20',
                    border: 'border-red-500/30',
                    iconBg: 'bg-red-500/20',
                    iconColor: 'text-red-400',
                    badge: 'bg-red-500/20 text-red-400',
                    badgeText: 'Critical'
                };
            case 'warning':
                return {
                    bg: 'from-amber-900/30 to-amber-800/20',
                    border: 'border-amber-500/30',
                    iconBg: 'bg-amber-500/20',
                    iconColor: 'text-amber-400',
                    badge: 'bg-amber-500/20 text-amber-400',
                    badgeText: 'Warning'
                };
            default:
                return {
                    bg: 'from-blue-900/30 to-blue-800/20',
                    border: 'border-blue-500/30',
                    iconBg: 'bg-blue-500/20',
                    iconColor: 'text-blue-400',
                    badge: 'bg-blue-500/20 text-blue-400',
                    badgeText: 'Info'
                };
        }
    };

    if (!isVisible || loading) return null;

    const styles = getTypeStyles('warning'); // Default style for main banner

    return (
        <div className={`bg-gradient-to-r ${styles.bg} border ${styles.border} rounded-xl p-4 mb-6 relative overflow-hidden group transition-all duration-300 hover:shadow-lg`}>
            {/* Animated background effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${styles.iconBg} flex-shrink-0`}>
                                <Shield className={`w-5 h-5 ${styles.iconColor}`} />
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        Stay Safe on ODUSBABA
                                    </h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                                        {styles.badgeText}
                                    </span>
                                    {lastChecked && (
                                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Acknowledged recently
                                        </span>
                                    )}
                                </div>
                                
                                <div className="space-y-2">
                                    {/* Primary safety tips - always visible */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {safetyTips.slice(0, 2).map((tip) => {
                                            const TipIcon = tip.icon;
                                            return (
                                                <div key={tip.id} className="flex items-start gap-2 text-sm">
                                                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                    <span className="text-slate-300">{tip.message}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Detailed tips - toggleable */}
                                    {showDetailed && (
                                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {safetyTips.slice(2).map((tip) => {
                                                    const TipIcon = tip.icon;
                                                    return (
                                                        <div key={tip.id} className="flex items-start gap-2 text-sm">
                                                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                            <span className="text-slate-300">{tip.message}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                                                <p className="text-xs text-amber-400 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    ⚠️ BluSkye Consult is not responsible for transactions made outside our platform
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-3 mt-4">
                                    <button
                                        onClick={() => setShowDetailed(!showDetailed)}
                                        className="text-xs text-primary-400 hover:text-primary-300 transition flex items-center gap-1"
                                    >
                                        {showDetailed ? 'Show Less' : 'View All Safety Tips'}
                                    </button>
                                    
                                    <Link
                                        to="/safety-tips"
                                        className="text-xs text-primary-400 hover:text-primary-300 transition flex items-center gap-1"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Full Safety Guide
                                    </Link>
                                    
                                    <Link
                                        to="/report-fraud"
                                        className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1"
                                    >
                                        <AlertTriangle className="w-3 h-3" />
                                        Report Suspicious Activity
                                    </Link>
                                    
                                    {!lastChecked && !showDetailed && (
                                        <button
                                            onClick={handleAcknowledge}
                                            className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
                                        >
                                            <CheckCircle className="w-3 h-3" />
                                            I Understand
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Dismiss Button */}
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0"
                        aria-label="Dismiss banner"
                        title={`Dismiss for ${DISMISSAL_DURATION_DAYS} days`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Timestamp of last update */}
                <div className="mt-3 pt-2 border-t border-slate-700/30 flex justify-between items-center">
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Safety information updated regularly
                    </p>
                    {lastChecked && (
                        <p className="text-[10px] text-emerald-500/70">
                            Last acknowledged: {new Date(lastChecked).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
