// src/contexts/GovernanceContext.jsx
// ODUSBABA GOVERNANCE SYSTEM v6.1 - Production Ready
// "Nothing executes unless ODUSBABA allows it"
// Complete governance with capability matrix, audit logging, enforcement modes, and async checks
// FIXED: removed hardcoded admin-email bypass — admin status is now determined solely by
// profiles.user_type, stored in the database, not by a specific email address in source code.

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
        loadGovernanceState();
    }, []);

    async function loadGovernanceState() {
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
                    maxJobViews: 20,
                    remainingCredits: 5,
                    isUnlimited: false
                });
                setRemainingCredits(5);
                setIsUnlimited(false);
            }
            
            // Load system enforcement mode
            const { data: config } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'enforcement_mode')
                .maybeSingle();
            
            if (config?.config_value) {
                setEnforcementMode(config.config_value);
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
            // FIXED (2026-08-30): confirmed real inconsistency - treated
            // business tier as unlimited, contradicting an explicit
            // decision already made and applied elsewhere this
            // engagement (checkAndDeductCredit, va-credits,
            // HireVirtualAssistant.jsx's fallback) that business tier
            // gets a real 200/month credit cap, not unlimited. This file
            // was never updated to match, meaning a business-tier user's
            // credit display here could have shown 999999 while the
            // backend correctly enforced a real 200 cap - a real,
            // confusing mismatch between what this context reported and
            // what the backend actually allowed.
            const isUnlimitedUser = profileData?.user_type === 'super_admin' || 
                                   profileData?.user_type === 'admin';
            
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
        // FIXED: admin status now comes only from profiles.user_type in the database.
        // Previously this also granted admin to a specific hardcoded email address,
        // regardless of that account's actual user_type — a security bypass. To grant
        // someone admin access now, set their user_type to 'admin' or 'super_admin'
        // in the profiles table.
        const isAdminUser = userType === 'admin' || userType === 'super_admin';
        
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
        await audit('capabilities_loaded', { tier: effectiveTier, caps });
    }

    async function detectCountry() {
        try {
            const data = await api.getIp();
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

    // Async capability check (can be used with await)
    async function can(action, context = {}) {
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
            await audit('unknown_action', { action, context });
            return false;
        }
        
        const allowed = capabilities[requiredCapability] === true;
        
        // FIXED (2026-08-08): this previously computed `allowed` the same
        // way regardless of enforcementMode, then had a branch that only
        // ever returned the same value `allowed` already held — meaning
        // 'observe' and 'block' modes were functionally identical. The
        // whole point of an observe mode is to let admins see what
        // enforcement WOULD do (via the audit log below) without actually
        // disrupting real users while a new capability matrix is being
        // rolled out or tested. Now: block mode enforces normally; observe
        // mode always allows the action through, but still logs whether it
        // would have been denied, so the audit trail is genuinely useful
        // for reviewing before flipping to block.
        const wouldBlock = !allowed;
        
        // Log capability check
        await audit('capability_check', {
            action,
            requiredCapability,
            allowed,
            wouldBlock,
            enforcementMode,
            context,
            userTier: capabilities.tier
        });
        
        if (enforcementMode === 'observe') {
            return true;
        }
        
        // block mode: enforce for real
        return allowed;
    }

    // Sync capability check (immediate, no await needed)
    const canSync = (action) => {
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

    // Assert capability (throws error if not allowed)
    async function assert(action, context = {}) {
        const allowed = await can(action, context);
        
        if (!allowed) {
            const error = new Error(`Action "${action}" not permitted`);
            error.code = 'GOVERNANCE_DENIED';
            error.details = { action, context, userTier: capabilities.tier };
            throw error;
        }
        
        return true;
    }

    // Audit logging
    async function audit(eventType, data = {}) {
        const logEntry = {
            event_type: eventType,
            user_id: user?.id,
            user_email: user?.email,
            user_tier: capabilities?.tier,
            country: countryContext,
            enforcement_mode: enforcementMode,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        setAuditLog(prev => [logEntry, ...prev].slice(0, 100));
        
        // Async save to database (non-blocking)
        supabase.from('governance_audit_logs').insert(logEntry).catch(console.error);
        
        return logEntry;
    }

    async function setEnforcement(action) {
        if (!capabilities.canGovern) {
            throw new Error('Insufficient permissions to change enforcement mode');
        }
        
        setEnforcementMode(action);
        await audit('enforcement_changed', { newMode: action });
        
        // Update system config
        await supabase
            .from('system_config')
            .upsert({ config_key: 'enforcement_mode', config_value: action })
            .catch(console.error);
    }

    // Helper methods
    const getTier = () => capabilities.tier || 'visitor';
    const isAdmin = () => capabilities.isAdmin || false;
    const getCredits = () => remainingCredits;
    const getIsUnlimited = () => isUnlimited;
    const hasCapability = (capability) => capabilities[capability] === true;

    const value = {
        // State
        user,
        profile,
        capabilities,
        loading,
        enforcementMode,
        countryContext,
        auditLog,
        remainingCredits,
        isUnlimited,
        
        // Async methods
        can,
        assert,
        audit,
        setEnforcement,
        refresh: loadGovernanceState,
        
        // Sync methods (backward compatible)
        canSync,
        getTier,
        isAdmin,
        getCredits,
        getIsUnlimited,
        hasCapability
    };

    return (
        <GovernanceContext.Provider value={value}>
            {children}
        </GovernanceContext.Provider>
    );
}
