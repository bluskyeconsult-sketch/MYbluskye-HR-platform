// src/components/GateGuard.jsx
// ODUSBABA GATE GUARD v5.0 - Production Ready
// "Nothing executes unless ODUSBABA allows it"
// Unified gating component for all protected features

import { useState, useEffect } from 'react';
import { useGovernance } from '../contexts/GovernanceContext';
import { Lock, Crown, Sparkles, ArrowRight, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GateGuard({ 
    action, 
    children, 
    fallback,
    showUpgrade = true,
    requiredTier = null,
    customMessage = null,
    context = {},
    requireAuth = false,
    showLoading = true
}) {
    const { can, getTier, capabilities, loading: governanceLoading, checkCapability } = useGovernance();
    const [asyncAllowed, setAsyncAllowed] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    
    const syncAllowed = can(action);
    const userTier = getTier();
    const isVisitor = !capabilities.user && userTier === 'visitor';
    
    // Check tier requirement separately
    const meetsTier = !requiredTier || 
        requiredTier === 'visitor' ||
        userTier === requiredTier ||
        (userTier === 'professional' && requiredTier === 'free') ||
        (userTier === 'business' && (requiredTier === 'free' || requiredTier === 'professional')) ||
        capabilities.isAdmin;
    
    // Async capability check for more complex permissions
    useEffect(() => {
        if (action && checkCapability) {
            setIsChecking(true);
            checkCapability(action, context).then(result => {
                setAsyncAllowed(result.allowed);
                setIsChecking(false);
            }).catch(() => {
                setAsyncAllowed(syncAllowed);
                setIsChecking(false);
            });
        }
    }, [action, context, checkCapability]);
    
    const hasAccess = asyncAllowed !== null ? asyncAllowed : syncAllowed;
    const isBlocked = !hasAccess || !meetsTier;
    
    // Show loading state
    if (showLoading && (governanceLoading || (isChecking && asyncAllowed === null))) {
        return <LoadingGate />;
    }
    
    // Handle auth requirement separately
    if (requireAuth && isVisitor && !syncAllowed) {
        return fallback || <VisitorGate action={action} message={customMessage} />;
    }
    
    if (!isBlocked) {
        return <>{children}</>;
    }
    
    // Custom fallback if provided
    if (fallback) {
        return <>{fallback}</>;
    }
    
    // Check if visitor (not logged in)
    if (isVisitor && !syncAllowed) {
        return <VisitorGate action={action} message={customMessage} />;
    }
    
    // Default gated UI for logged-in users
    return (
        <UpgradeGate 
            action={action} 
            message={customMessage} 
            requiredTier={requiredTier}
            userTier={userTier}
            showUpgrade={showUpgrade}
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
export function UpgradeGate({ action, message, requiredTier, userTier, showUpgrade = true, isAdmin = false }) {
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
    
    // Tier-specific messaging
    if (requiredTier === 'professional') {
        displayMessage = 'Professional plan required for this feature';
    } else if (requiredTier === 'business') {
        displayMessage = 'Business plan required for this feature';
    } else if (requiredTier === 'admin') {
        displayMessage = 'Admin access required for this feature';
    }
    
    // Admin override
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
        <div className="text-center py-8 px-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
                {requiredTier === 'professional' ? 'Pro Feature' : 
                 requiredTier === 'business' ? 'Business Feature' : 
                 'Upgrade Required'}
            </h3>
            <p className="text-slate-400 mb-4">{displayMessage}</p>
            {showUpgrade && (
                <div className="flex flex-wrap gap-3 justify-center">
                    <Link to="/pricing" className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-500 hover:to-orange-500 transition">
                        <Sparkles className="w-4 h-4" />
                        View Plans
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

// Helper function to get default message (for backward compatibility)
function getDefaultMessage(action, requiredTier) {
    const messages = {
        'apply_job': 'Unlock Job Applications',
        'contact_worker': 'Contact Workforce Professionals',
        'hire_va': 'Access Virtual Assistants',
        'hr_tools': 'Full HR Toolkit Access',
        'create_course': 'Course Creation',
        'chat': 'Full AI Chat Access'
    };
    
    if (requiredTier === 'professional') {
        return 'Pro Feature';
    }
    if (requiredTier === 'business') {
        return 'Business Feature';
    }
    
    return messages[action] || 'Feature Locked';
}

// Helper function to get default sub-message (for backward compatibility)
function getDefaultSubMessage(action, userTier, requiredTier) {
    if (requiredTier === 'professional') {
        return 'Upgrade to Pro to unlock this feature and get unlimited access.';
    }
    if (requiredTier === 'business') {
        return 'This feature is available for Business plans. Contact us for enterprise access.';
    }
    
    const subMessages = {
        'apply_job': 'Sign up for free to start applying to verified jobs.',
        'contact_worker': 'Upgrade to contact skilled professionals directly.',
        'hire_va': 'Subscribe to access AI-powered virtual assistants.',
        'hr_tools': 'Create an account to use our professional HR tools.',
        'chat': userTier === 'visitor' 
            ? 'Sign up free to continue the conversation.' 
            : 'Upgrade for full AI chat capabilities.',
        'create_course': 'Admin access required to create courses.'
    };
    
    return subMessages[action] || 'Upgrade your plan to access this feature.';
}
