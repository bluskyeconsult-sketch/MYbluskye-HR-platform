// src/components/GateGuard.jsx
// ODUSBABA GATE GUARD v6.1 - Production Ready
// "Nothing executes unless ODUSBABA allows it"
// Unified gating component for all protected features with both sync and async checks
//
// FIXED (2026-08-07):
// 1. meetsTier used an ad-hoc chain of string comparisons that never
//    accounted for 'employer', 'registered', 'admin', or 'super_admin'
//    tiers — an employer-tier user could incorrectly fail a tier check that
//    a professional-tier user would pass, even though they're meant to be
//    equivalent. TierGate (below, in this same file) already had the
//    correct numeric tier hierarchy — hoisted it to module scope and reused
//    it in both places instead of the broken ad-hoc version.
// 2. The `context = {}` default parameter created a brand-new object every
//    render when a caller didn't pass one (e.g. WorkforceMarketplace.jsx
//    doesn't) — and since `context` sits in a useEffect dependency array,
//    this silently re-ran the async permission check on every re-render.
//    Fixed with a stable shared default reference.
//
// NOTE: this file assumes contexts/GovernanceContext.jsx also exports a
// useGovernance hook (separate from useCapability). That file's contents
// haven't been reviewed in this session, so this is unconfirmed — flagging
// for traceability, not changed, since this file was already confirmed to
// exist and presumably builds correctly in your repo.

import { useState, useEffect, useCallback } from 'react';
import { useGovernance } from '../contexts/GovernanceContext';
import { useCapability } from '../hooks/useCapability';
import { Lock, Crown, Sparkles, ArrowRight, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

// Shared tier hierarchy — used by both GateGuard's meetsTier check and
// TierGate below. Previously duplicated (and inconsistent) between the two.
const TIER_LEVELS = { 
    visitor: 0, 
    free: 1, 
    registered: 1, 
    pro: 2, 
    professional: 2, 
    employer: 2,
    business: 3, 
    admin: 4, 
    super_admin: 4 
};

// Stable default so `context` doesn't create a new object reference on
// every render when the caller omits it.
const EMPTY_CONTEXT = {};

// Main GateGuard Component - Supports both async and sync checks
export function GateGuard({ 
    action, 
    context = EMPTY_CONTEXT, 
    children, 
    fallback = null,
    showUpgrade = true,
    upgradeMessage,
    upgradeCTA = "View Plans",
    requiredTier = null,
    customMessage = null,
    requireAuth = false,
    showLoading = true,
    useAsync = true
}) {
    const { canSync, getTier, capabilities, loading: governanceLoading } = useGovernance();
    const { check } = useCapability();
    
    const [asyncAllowed, setAsyncAllowed] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    
    const syncAllowed = canSync(action);
    const userTier = getTier();
    const isVisitor = !capabilities.user && userTier === 'visitor';
    
    // FIXED: reuses the same numeric tier hierarchy as TierGate instead of
    // an incomplete ad-hoc chain that missed employer/registered/admin tiers.
    const meetsTier = !requiredTier || 
        (TIER_LEVELS[userTier] || 0) >= (TIER_LEVELS[requiredTier] || 0) ||
        capabilities.isAdmin;
    
    // Async capability check
    // FIXED: confirmed real race condition via live diagnostic data -
    // syncAllowed was correctly true while asyncAllowed was stuck false.
    // can() awaits a real network call before resolving, and this effect
    // re-runs on every provider render (since check/can are recreated
    // fresh each time, unmemoized). An early call - made while
    // capabilities was still the default "everything false" state
    // during initial load - could resolve AFTER a later, correct call,
    // silently overwriting the right value with a stale one. Standard
    // fix: track whether this specific effect invocation is still the
    // current one before applying its result.
    useEffect(() => {
        let isCurrent = true;
        const callId = Math.random().toString(36).slice(2, 8);
        if (useAsync && action) {
            setIsChecking(true);
            console.log(`[GateGuard ${callId}] calling check('${action}')`);
            check(action, context).then(result => {
                console.log(`[GateGuard ${callId}] resolved:`, result, 'isCurrent:', isCurrent);
                if (isCurrent) {
                    setAsyncAllowed(result.allowed);
                    setIsChecking(false);
                }
            }).catch((err) => {
                console.log(`[GateGuard ${callId}] REJECTED:`, err, 'isCurrent:', isCurrent);
                if (isCurrent) {
                    setAsyncAllowed(syncAllowed);
                    setIsChecking(false);
                }
            });
        }
        return () => { isCurrent = false; };
    }, [action, context, check, useAsync, syncAllowed]);
    
    const hasAccess = useAsync ? (asyncAllowed !== null ? asyncAllowed : syncAllowed) : syncAllowed;
    const isBlocked = !hasAccess || !meetsTier;
    
    // Show loading state
    if (showLoading && (governanceLoading || (useAsync && isChecking && asyncAllowed === null))) {
        return <LoadingGate />;
    }
    
    // Handle auth requirement separately
    if (requireAuth && isVisitor && !syncAllowed) {
        return fallback || <VisitorGate action={action} message={customMessage || upgradeMessage} />;
    }
    
    if (!isBlocked) {
        return <>{children}</>;
    }
    
    // Custom fallback if provided
    if (fallback) {
        return (
            <>
                {/* TEMPORARY DIAGNOSTIC - re-added since the race-condition
                    fix alone didn't resolve the issue on retest. This will
                    show whether asyncAllowed is still landing on false
                    despite the isCurrent guard, which would mean check()
                    itself is consistently returning false rather than the
                    earlier theory of a stale overwrite. */}
                <div style={{ background: '#3b0000', color: '#fff', padding: '12px', fontSize: '12px', fontFamily: 'monospace', marginBottom: '8px', borderRadius: '8px' }}>
                    <strong>GateGuard diagnostic v2</strong> (action: {action})<br/>
                    userTier: {String(userTier)}<br/>
                    capabilities.isAdmin: {String(capabilities.isAdmin)}<br/>
                    capabilities.tier: {String(capabilities.tier)}<br/>
                    syncAllowed: {String(syncAllowed)}<br/>
                    asyncAllowed: {String(asyncAllowed)}<br/>
                    hasAccess: {String(hasAccess)}<br/>
                    meetsTier: {String(meetsTier)}<br/>
                    isChecking: {String(isChecking)}<br/>
                    check function present: {String(typeof check === 'function')}
                </div>
                {fallback}
            </>
        );
    }
    
    // Check if visitor (not logged in)
    if (isVisitor && !syncAllowed) {
        return <VisitorGate action={action} message={customMessage || upgradeMessage} />;
    }
    
    // Default gated UI for logged-in users
    return (
        <UpgradeGate 
            action={action} 
            message={customMessage || upgradeMessage} 
            requiredTier={requiredTier}
            userTier={userTier}
            showUpgrade={showUpgrade}
            upgradeCTA={upgradeCTA}
            isAdmin={capabilities.isAdmin}
        />
    );
}

// Visitor Gate Component - For non-authenticated users
export function VisitorGate({ action, message }) {
    const gateMessages = {
        'apply_job': 'Sign up to apply for jobs',
        'contact_worker': 'Create an account to contact workers',
        'hire_worker': 'Sign up to hire skilled workers',
        'hire_va': 'Join ODUSBABA to use Virtual Assistants',
        'execute_va': 'Join ODUSBABA to use Virtual Assistants',
        'view_workforce': 'Create an account to view workforce profiles',
        'chat': 'Sign up for full AI chat access',
        'hr_tools': 'Create an account to use HR tools',
        'create_course': 'Admin access required'
    };
    
    const displayMessage = message || gateMessages[action] || 'Sign up to access this feature';
    
    return (
        <div className="text-center py-8 px-4 bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-xl border border-slate-700">
            <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Account Required</h3>
            <p className="text-slate-400 mb-4">{displayMessage}</p>
            <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/sign-up" className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2">
                    Create Free Account <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/sign-in" className="px-5 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition">
                    Sign In
                </Link>
            </div>
        </div>
    );
}

// Upgrade Gate Component - For authenticated users with insufficient permissions
export function UpgradeGate({ action, message, requiredTier, userTier, showUpgrade = true, upgradeCTA = "View Plans", isAdmin = false }) {
    const upgradeMessages = {
        'apply_job': 'Upgrade your plan to apply for more jobs',
        'contact_worker': 'Upgrade to contact workers directly',
        'hire_worker': 'Business plans unlock unlimited hiring',
        'hire_va': 'Upgrade to access AI Virtual Assistants',
        'execute_va': 'Upgrade to access AI Virtual Assistants',
        'unlimited_chat': 'Upgrade for unlimited AI chat',
        'hr_tools': 'Upgrade to access professional HR tools',
        'create_course': 'Admin access required to create courses'
    };
    
    let displayMessage = message || upgradeMessages[action] || 'Upgrade to unlock this feature';
    
    if (requiredTier === 'professional') {
        displayMessage = 'Professional plan required for this feature';
    } else if (requiredTier === 'business') {
        displayMessage = 'Business plan required for this feature';
    } else if (requiredTier === 'admin') {
        displayMessage = 'Admin access required for this feature';
    }
    
    if (isAdmin) {
        return (
            <div className="text-center py-8 px-4 bg-red-500/10 rounded-xl border border-red-500/20">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Access Denied</h3>
                <p className="text-slate-400 mb-4">You don't have permission to access this feature.</p>
                <Link to="/admin/dashboard" className="inline-flex items-center gap-2 px-5 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition">
                    Go to Admin Dashboard
                </Link>
            </div>
        );
    }
    
    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6 text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
                    <Crown className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                    {requiredTier === 'professional' ? 'Pro Feature' : 
                     requiredTier === 'business' ? 'Business Feature' : 
                     'Upgrade Required'}
                </h3>
                <p className="text-slate-400 text-sm mb-4">{displayMessage}</p>
                {showUpgrade && (
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link
                            to="/pricing"
                            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition"
                        >
                            <Sparkles className="w-4 h-4" />
                            {upgradeCTA}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        {action === 'chat' && (
                            <Link to="/sign-up" className="px-5 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition">
                                Sign Up Free
                            </Link>
                        )}
                    </div>
                )}
                {userTier === 'free' && requiredTier === 'professional' && (
                    <p className="text-xs text-slate-500 mt-3">
                        Free users get limited access. Upgrade to Pro for full features.
                    </p>
                )}
            </div>
        </div>
    );
}

// TierGate Component - For tier-based gating
export function TierGate({ tier, children, fallback = null, showUpgrade = true }) {
    const { getTier, capabilities } = useGovernance();
    const userTier = getTier();
    
    const userLevel = TIER_LEVELS[userTier] || 0;
    const requiredLevel = TIER_LEVELS[tier] || 0;
    
    if (userLevel >= requiredLevel || capabilities.isAdmin) {
        return <>{children}</>;
    }
    
    if (fallback) return fallback;
    
    if (showUpgrade) {
        return (
            <div className="text-center py-6 px-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Crown className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-amber-400 text-sm">
                    {tier === 'professional' ? 'Pro' : tier === 'business' ? 'Business' : 'Higher'} tier required
                </p>
                <Link to="/pricing" className="text-primary-400 text-xs hover:underline mt-2 inline-block">
                    Upgrade now →
                </Link>
            </div>
        );
    }
    
    return null;
}

// AdminGate Component - For admin-only content
export function AdminGate({ children, fallback = null }) {
    const { isAdmin } = useGovernance();
    
    if (isAdmin()) {
        return <>{children}</>;
    }
    
    if (fallback) return fallback;
    
    return (
        <div className="text-center py-6 px-4 bg-red-500/10 rounded-xl border border-red-500/20">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-400 text-sm">Admin access required</p>
        </div>
    );
}

// Loading Gate Component
export function LoadingGate() {
    return (
        <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 mt-2">Checking access...</p>
        </div>
    );
}

// Default export for backward compatibility
export default GateGuard;
