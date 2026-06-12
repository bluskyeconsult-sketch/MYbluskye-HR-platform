// src/contexts/GovernanceContext.jsx
// ODUSBABA GOVERNANCE SYSTEM v5.0 - Production Ready
// "Nothing executes unless ODUSBABA allows it"
// Complete governance with capability matrix, audit logging, and enforcement modes

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const GovernanceContext = createContext();

export function useGovernance() {
    const context = useContext(GovernanceContext);
    if (!context) {
        throw new Error('useGovernance must be used within GovernanceProvider');
    }
    return context;
}

export function GovernanceProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [capabilities, setCapabilities] = useState({});
    const [loading, setLoading] = useState(true);
    const [enforcementMode, setEnforcementMode] = useState('observe'); // observe | block
    const [countryContext, setCountryContext] = useState('GB');
    const [auditLog, setAuditLog] = useState([]);
    const [remainingCredits, setRemainingCredits] = useState(0);
    const [isUnlimited, setIsUnlimited] = useState(false);

    // Load user and capabilities on mount
    useEffect(() => {
        loadUserAndCapabilities();
    }, []);

    async function loadUserAndCapabilities() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            
            if (user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(profileData);
                
                // Load VA credits
                if (profileData) {
                    await loadVACredits(user.id, profileData);
                }
                
                // Load user capabilities based on tier
                await loadCapabilities(profileData);
            } else {
                // Visitor capabilities
                setCapabilities({
                    canView: true,
                    canSearch: true,
                    canPreview: true,
                    canChat: true,
                    canExecute: false,
                    canApplyJobs: false,
                    canContactWorkforce: false,
                    canHireVA: false,
                    canAccessHRTools: false,
                    canCreateCourses: false,
                    isAdmin: false,
                    tier: 'visitor',
                    maxChatMessages: 3,
                    maxJobViews: 20
                });
                setRemainingCredits(5);
                setIsUnlimited(false);
            }
            
            // Detect country from IP
            await detectCountry();
            
        } catch (error) {
            console.error('Governance load error:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadVACredits(userId, profileData) {
        try {
            const isUnlimitedUser = profileData?.user_type === 'super_admin' || 
                                   profileData?.user_type === 'admin' || 
                                   profileData?.tier === 'business';
            
            if (isUnlimitedUser) {
                setRemainingCredits(999999);
                setIsUnlimited(true);
                return;
            }
            
            const { data: credits } = await supabase
                .from('va_credits')
                .select('balance')
                .eq('user_id', userId)
                .single();
            
            setRemainingCredits(credits?.balance || 5);
            setIsUnlimited(false);
        } catch (err) {
            setRemainingCredits(5);
            setIsUnlimited(false);
        }
    }

    async function loadCapabilities(profileData) {
        const tier = profileData?.tier || 'visitor';
        const userType = profileData?.user_type || 'visitor';
        const isAdminUser = userType === 'admin' || userType === 'super_admin' || profileData?.email === 'bluskyeconsult@gmail.com';
        
        // Define capability matrix
        const capabilityMatrix = {
            visitor: {
                canView: true,
                canSearch: true,
                canPreview: true,
                canChat: true,
                canExecute: false,
                canApplyJobs: false,
                canContactWorkforce: false,
                canHireVA: false,
                canAccessHRTools: false,
                canCreateCourses: false,
                isAdmin: false,
                tier: 'visitor',
                maxChatMessages: 3,
                maxJobViews: 20
            },
            free: {
                canView: true,
                canSearch: true,
                canPreview: true,
                canChat: true,
                canExecute: false,
                canApplyJobs: true,
                canContactWorkforce: false,
                canHireVA: false,
                canAccessHRTools: true,
                canCreateCourses: false,
                isAdmin: false,
                tier: 'free',
                maxChatMessages: 10,
                maxJobViews: 100
            },
            registered: {
                canView: true,
                canSearch: true,
                canPreview: true,
                canChat: true,
                canExecute: false,
                canApplyJobs: true,
                canContactWorkforce: true,
                canHireVA: false,
                canAccessHRTools: true,
                canCreateCourses: false,
                isAdmin: false,
                tier: 'registered',
                maxChatMessages: 25,
                maxJobViews: 'unlimited'
            },
            professional: {
                canView: true,
                canSearch: true,
                canPreview: true,
                canChat: true,
                canExecute: true,
                canApplyJobs: true,
                canContactWorkforce: true,
                canHireVA: true,
                canAccessHRTools: true,
                canCreateCourses: false,
                isAdmin: false,
                tier: 'professional',
                maxChatMessages: 'unlimited',
                maxJobViews: 'unlimited'
            },
            employer: {
                canView: true,
                canSearch: true,
                canPreview: true,
                canChat: true,
                canExecute: true,
                canApplyJobs: true,
                canContactWorkforce: true,
                canHireVA: true,
                canAccessHRTools: true,
                canCreateCourses: false,
                isAdmin: false,
                tier: 'employer',
                maxChatMessages: 'unlimited',
                maxJobViews: 'unlimited'
            },
            business: {
                canView: true,
                canSearch: true,
                canPreview: true,
                canChat: true,
                canExecute: true,
                canApplyJobs: true,
                canContactWorkforce: true,
                canHireVA: true,
                canAccessHRTools: true,
                canCreateCourses: false,
                isAdmin: false,
                tier: 'business',
                maxChatMessages: 'unlimited',
                maxJobViews: 'unlimited'
            },
            admin: {
                canView: true,
                canSearch: true,
                canPreview: true,
                canChat: true,
                canExecute: true,
                canApplyJobs: true,
                canContactWorkforce: true,
                canHireVA: true,
                canAccessHRTools: true,
                canCreateCourses: true,
                isAdmin: true,
                canModerate: true,
                canAdmin: true,
                tier: 'admin',
                maxChatMessages: 'unlimited',
                maxJobViews: 'unlimited'
            },
            super_admin: {
                canView: true,
                canSearch: true,
                canPreview: true,
                canChat: true,
                canExecute: true,
                canApplyJobs: true,
                canContactWorkforce: true,
                canHireVA: true,
                canAccessHRTools: true,
                canCreateCourses: true,
                isAdmin: true,
                canModerate: true,
                canAdmin: true,
                canGovern: true,
                tier: 'super_admin',
                maxChatMessages: 'unlimited',
                maxJobViews: 'unlimited'
            }
        };
        
        // Determine effective tier
        let effectiveTier = tier;
        if (userType === 'super_admin') effectiveTier = 'super_admin';
        else if (userType === 'admin' || isAdminUser) effectiveTier = 'admin';
        else if (tier === 'business') effectiveTier = 'business';
        else if (tier === 'employer') effectiveTier = 'employer';
        else if (tier === 'professional') effectiveTier = 'professional';
        else if (tier === 'registered') effectiveTier = 'registered';
        else if (tier === 'free') effectiveTier = 'free';
        
        const caps = capabilityMatrix[effectiveTier] || capabilityMatrix.visitor;
        
        // Add remaining credits to capabilities
        caps.remainingCredits = remainingCredits;
        caps.isUnlimited = isUnlimited;
        
        setCapabilities(caps);
        
        // Log capability access
        await logGovernanceEvent('capabilities_loaded', { tier: effectiveTier, caps });
    }

    async function detectCountry() {
        try {
            const data = await api.getIp();
            // Extract country from geolocation if available
            if (data?.geolocation?.country) {
                setCountryContext(data.geolocation.country);
            } else {
                setCountryContext('GB');
            }
        } catch (error) {
            console.error('Country detection error:', error);
            setCountryContext('GB');
        }
    }

    async function checkCapability(action, context = {}) {
        const actionCapabilityMap = {
            'chat': 'canChat',
            'view_job': 'canView',
            'search_jobs': 'canSearch',
            'apply_job': 'canApplyJobs',
            'contact_worker': 'canContactWorkforce',
            'hire_worker': 'canHireVA',
            'hire_va': 'canHireVA',
            'execute_va': 'canExecute',
            'hr_tools': 'canAccessHRTools',
            'create_course': 'canCreateCourses',
            'moderate_content': 'canModerate',
            'admin_access': 'canAdmin',
            'governance_control': 'canGovern'
        };
        
        const requiredCapability = actionCapabilityMap[action];
        
        if (!requiredCapability) {
            await logGovernanceEvent('unknown_action', { action, context });
            return { allowed: false, reason: 'Unknown action' };
        }
        
        const allowed = capabilities[requiredCapability] === true;
        
        // Log every capability check for audit
        await logGovernanceEvent('capability_check', {
            action,
            requiredCapability,
            allowed,
            context,
            userTier: capabilities.tier,
            timestamp: new Date().toISOString()
        });
        
        // If in block mode and action not allowed, deny
        if (enforcementMode === 'block' && !allowed) {
            return { allowed: false, reason: 'Action blocked by enforcement mode' };
        }
        
        return { allowed, reason: allowed ? null : 'Insufficient permissions' };
    }

    async function logGovernanceEvent(eventType, data) {
        const logEntry = {
            event_type: eventType,
            user_id: user?.id,
            user_tier: capabilities?.tier,
            country: countryContext,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        setAuditLog(prev => [logEntry, ...prev].slice(0, 100));
        
        // Async save to database (don't wait)
        supabase.from('governance_audit_logs').insert(logEntry).catch(console.error);
    }

    async function setEnforcement(action) {
        if (!capabilities.canGovern) {
            throw new Error('Insufficient permissions to change enforcement mode');
        }
        
        setEnforcementMode(action);
        await logGovernanceEvent('enforcement_changed', { newMode: action });
    }

    // Simplified can() method for backward compatibility
    const can = (action) => {
        const actionMap = {
            'chat': capabilities.canChat,
            'apply_job': capabilities.canApplyJobs,
            'contact_worker': capabilities.canContactWorkforce,
            'hire_va': capabilities.canHireVA,
            'hr_tools': capabilities.canAccessHRTools,
            'create_course': capabilities.canCreateCourses,
            'admin': capabilities.isAdmin
        };
        return actionMap[action] || false;
    };

    const getTier = () => capabilities.tier || 'visitor';
    const isAdmin = () => capabilities.isAdmin || false;
    const getCredits = () => remainingCredits;
    const getIsUnlimited = () => isUnlimited;

    const value = {
        user,
        profile,
        capabilities,
        loading,
        enforcementMode,
        countryContext,
        auditLog,
        remainingCredits,
        isUnlimited,
        can,
        getTier,
        isAdmin,
        getCredits,
        getIsUnlimited,
        checkCapability,
        setEnforcement,
        logGovernanceEvent,
        refresh: loadUserAndCapabilities
    };

    return (
        <GovernanceContext.Provider value={value}>
            {children}
        </GovernanceContext.Provider>
    );
}
