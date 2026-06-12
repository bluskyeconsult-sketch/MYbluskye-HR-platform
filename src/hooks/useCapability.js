// src/hooks/useCapability.js
// ODUSBABA CAPABILITY HOOK v5.0 - Production Ready
// React hook for checking user capabilities throughout the app

import { useGovernance } from '../contexts/GovernanceContext';
import { useState, useCallback, useEffect } from 'react';

export function useCapability() {
    const { 
        can, 
        canSync, 
        assert, 
        audit, 
        user, 
        profile, 
        capabilities,
        loading,
        getTier,
        isAdmin: isUserAdmin,
        getCredits,
        getIsUnlimited
    } = useGovernance();
    
    const [checking, setChecking] = useState(false);

    // Async capability check
    const check = useCallback(async (action, context = {}) => {
        setChecking(true);
        try {
            const allowed = await can(action, context);
            return { allowed, reason: null };
        } catch (err) {
            return { allowed: false, reason: err.message || 'Permission denied' };
        } finally {
            setChecking(false);
        }
    }, [can]);

    // Sync capability check (no await needed)
    const checkSync = useCallback((action) => {
        return canSync(action);
    }, [canSync]);

    // Require capability (throws error if not allowed)
    const require = useCallback(async (action, context = {}) => {
        try {
            await assert(action, context);
            return { granted: true };
        } catch (err) {
            return { 
                granted: false, 
                reason: err.details?.reason || err.message, 
                code: err.code 
            };
        }
    }, [assert]);

    // Log action to audit trail
    const logAction = useCallback(async (action, details = {}) => {
        return audit(action, details);
    }, [audit]);

    // Get reason why action is not allowed
    const getReason = useCallback(async (action, context = {}) => {
        const result = await check(action, context);
        return result.reason;
    }, [check]);

    // Get max chat messages based on tier
    const getMaxChatMessages = useCallback(() => {
        return capabilities.maxChatMessages || (getTier() === 'visitor' ? 3 : 10);
    }, [capabilities, getTier]);

    // Get remaining chat messages
    const getRemainingChatMessages = useCallback((usedCount) => {
        const max = getMaxChatMessages();
        if (max === 'unlimited') return 'unlimited';
        return Math.max(0, max - (usedCount || 0));
    }, [getMaxChatMessages]);

    // Get action gate (component and methods)
    const getActionGate = useCallback((action, context = {}) => {
        return {
            action,
            check: () => check(action, context),
            require: () => require(action, context),
            checkSync: () => checkSync(action),
            isEnabled: async () => {
                const result = await check(action, context);
                return result.allowed;
            },
            isEnabledSync: () => checkSync(action),
            GateComponent: ({ children, fallback = null, showLoading = true }) => {
                const [allowed, setAllowed] = useState(null);
                const [isChecking, setIsChecking] = useState(true);
                
                useEffect(() => {
                    setIsChecking(true);
                    check(action, context).then(result => {
                        setAllowed(result.allowed);
                        setIsChecking(false);
                    });
                }, [action, JSON.stringify(context)]);
                
                if (showLoading && isChecking) {
                    return (
                        <div className="animate-pulse">
                            <div className="h-8 bg-slate-700 rounded"></div>
                        </div>
                    );
                }
                
                if (allowed === null) return null;
                return allowed ? children : fallback;
            }
        };
    }, [check, require, checkSync]);

    // Tier check helpers
    const tier = getTier();
    const isVisitor = !user;
    const isFree = tier === 'free';
    const isRegistered = tier === 'registered';
    const isProfessional = tier === 'professional';
    const isEmployer = tier === 'employer';
    const isBusiness = tier === 'business';
    const isAdmin = isUserAdmin || profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
    const isSuperAdmin = profile?.user_type === 'super_admin';

    // Extended capabilities object for easy access
    const extendedCapabilities = {
        // Original capabilities
        ...capabilities,
        
        // Derived capabilities
        canViewJobs: tier !== 'visitor',
        canSearchJobs: capabilities.canSearch !== false,
        canApplyJobs: capabilities.canApplyJobs === true,
        canContactWorkforce: capabilities.canContactWorkforce === true,
        canUseHRTools: capabilities.canAccessHRTools === true,
        canHireVA: capabilities.canHireVA === true,
        canUseVAAssistant: capabilities.canExecute === true,
        canAccessFullChat: tier !== 'visitor',
        canCreateCourses: capabilities.canCreateCourses === true,
        canModerate: capabilities.canModerate === true,
        canAdmin: capabilities.canAdmin === true,
        canGovern: capabilities.canGovern === true,
        
        // Credits
        remainingCredits: getCredits(),
        isUnlimited: getIsUnlimited(),
        
        // Tier
        tier,
        isVisitor,
        isFree,
        isRegistered,
        isProfessional,
        isEmployer,
        isBusiness,
        isAdmin,
        isSuperAdmin
    };

    return {
        // Core async methods
        check,
        checkSync,
        require,
        logAction,
        getReason,
        
        // Action gate
        getActionGate,
        
        // Chat limits
        getMaxChatMessages,
        getRemainingChatMessages,
        
        // State
        checking,
        loading,
        
        // Tier helpers
        isVisitor,
        isFree,
        isRegistered,
        isProfessional,
        isEmployer,
        isBusiness,
        isAdmin,
        isSuperAdmin,
        tier,
        
        // Capabilities object
        capabilities: extendedCapabilities,
        
        // Raw data
        user,
        profile,
        
        // Convenience methods (backward compatible)
        can: checkSync,
        canSync: checkSync,
        isAdmin: () => isAdmin,
        getTier: () => tier,
        getCredits: () => getCredits(),
        isUnlimited: getIsUnlimited()
    };
}
