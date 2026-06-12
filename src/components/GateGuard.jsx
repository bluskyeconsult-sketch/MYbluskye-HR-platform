// src/components/GateGuard.jsx
// RUTH v4.0 - Unified gating component
// "Nothing executes unless ODUSBABA allows it"

import { useGovernance } from '../contexts/GovernanceContext';
import { Shield, Lock, Crown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GateGuard({ 
    action, 
    children, 
    fallback,
    showUpgrade = true,
    requiredTier = null,
    customMessage = null 
}) {
    const { can, getTier, capabilities } = useGovernance();
    const hasAccess = can(action);
    const userTier = getTier();
    
    // Check tier requirement separately
    const meetsTier = !requiredTier || 
        requiredTier === 'visitor' ||
        userTier === requiredTier ||
        userTier === 'pro' && requiredTier === 'free' ||
        userTier === 'business' ||
        capabilities.isAdmin;
    
    const isBlocked = !hasAccess || !meetsTier;
    
    if (!isBlocked) {
        return <>{children}</>;
    }
    
    // Custom fallback if provided
    if (fallback) {
        return <>{fallback}</>;
    }
    
    // Default gated UI
    return (
        <div className="relative group">
            {/* Blur effect on content */}
            <div className="filter blur-sm pointer-events-none opacity-50">
                {children}
            </div>
            
            {/* Gate overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl">
                <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                        {customMessage || getDefaultMessage(action, requiredTier)}
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                        {getDefaultSubMessage(action, userTier, requiredTier)}
                    </p>
                    {showUpgrade && !capabilities.isAdmin && (
                        <div className="flex gap-3 justify-center">
                            <Link 
                                to="/pricing" 
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                                <Crown className="w-4 h-4 inline mr-1" />
                                Upgrade Now
                            </Link>
                            {action === 'chat' && (
                                <Link 
                                    to="/sign-up" 
                                    className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                                >
                                    Sign Up Free
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function getDefaultMessage(action, requiredTier) {
    const messages = {
        'apply_job': 'Unlock Job Applications',
        'contact_worker': 'Contact Workforce Professionals',
        'hire_va': 'Access Virtual Assistants',
        'hr_tools': 'Full HR Toolkit Access',
        'create_course': 'Course Creation',
        'chat': 'Full AI Chat Access'
    };
    
    if (requiredTier === 'pro') {
        return 'Pro Feature';
    }
    if (requiredTier === 'business') {
        return 'Business Feature';
    }
    
    return messages[action] || 'Feature Locked';
}

function getDefaultSubMessage(action, userTier, requiredTier) {
    if (requiredTier === 'pro') {
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
