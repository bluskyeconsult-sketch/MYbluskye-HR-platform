// src/hooks/useCapability.js - COMPLETE
// RUTH v4.0 - Hook for checking user capabilities throughout the app

import { useGovernance } from '../contexts/GovernanceContext';

export function useCapability() {
    const { checkCapability, capabilities, user, profile, loading } = useGovernance();

    const can = async (action, context = {}) => {
        const result = await checkCapability(action, context);
        return result.allowed;
    };

    const canSync = (action) => {
        const actionMap = {
            'view_job': capabilities.canView,
            'search_jobs': capabilities.canSearch,
            'apply_job': capabilities.canApply,
            'contact_worker': capabilities.canContact,
            'hire_worker': capabilities.canHire,
            'execute_va': capabilities.canUseVA,
            'moderate': capabilities.canModerate,
            'admin': capabilities.canAdmin,
            'govern': capabilities.canGovern
        };
        return actionMap[action] === true;
    };

    const getReason = async (action) => {
        const result = await checkCapability(action);
        return result.reason;
    };

    const getMaxChatMessages = () => {
        return capabilities.maxChatMessages;
    };

    const getRemainingChatMessages = (usedCount) => {
        const max = capabilities.maxChatMessages;
        if (max === 'unlimited') return 'unlimited';
        return Math.max(0, max - usedCount);
    };

    const isVisitor = !user;
    const isFree = profile?.tier === 'free';
    const isRegistered = profile?.tier === 'registered';
    const isProfessional = profile?.tier === 'professional';
    const isBusiness = profile?.tier === 'business';
    const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
    const isSuperAdmin = profile?.user_type === 'super_admin';

    return {
        can,
        canSync,
        getReason,
        getMaxChatMessages,
        getRemainingChatMessages,
        isVisitor,
        isFree,
        isRegistered,
        isProfessional,
        isBusiness,
        isAdmin,
        isSuperAdmin,
        capabilities,
        loading
    };
}
