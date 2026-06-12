// src/contexts/GovernanceContext.jsx
// RUTH v4.0 - Complete governance system
// "Nothing executes unless ODUSBABA allows it"

import { createContext, useContext, useState, useEffect } from 'react';
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
    const [capabilities, setCapabilities] = useState({
        canChat: false,
        canApplyJobs: false,
        canContactWorkforce: false,
        canHireVA: false,
        canAccessHRTools: false,
        canCreateCourses: false,
        isAdmin: false,
        tier: 'visitor',
        remainingCredits: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGovernance();
    }, []);

    async function loadGovernance() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            
            if (!user) {
                setCapabilities({
                    canChat: true, // Visitors can preview chat
                    canApplyJobs: false,
                    canContactWorkforce: false,
                    canHireVA: false,
                    canAccessHRTools: false,
                    canCreateCourses: false,
                    isAdmin: false,
                    tier: 'visitor',
                    remainingCredits: 5
                });
                setLoading(false);
                return;
            }
            
            // Get profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            setProfile(profile);
            
            const tier = profile?.tier || 'free';
            const isAdmin = profile?.user_type === 'admin' || 
                           profile?.user_type === 'super_admin' ||
                           user.email === 'bluskyeconsult@gmail.com';
            
            // Get credits
            let credits = 5;
            if (tier !== 'visitor') {
                const { data: vaCredits } = await supabase
                    .from('va_credits')
                    .select('balance')
                    .eq('user_id', user.id)
                    .single();
                credits = vaCredits?.balance || 5;
            }
            
            // Set capabilities based on tier
            setCapabilities({
                canChat: true,
                canApplyJobs: tier !== 'visitor',
                canContactWorkforce: tier === 'pro' || tier === 'business' || isAdmin,
                canHireVA: tier === 'pro' || tier === 'business' || isAdmin,
                canAccessHRTools: tier !== 'visitor',
                canCreateCourses: isAdmin,
                isAdmin: isAdmin,
                tier: tier,
                remainingCredits: credits,
                isUnlimited: tier === 'business' || isAdmin
            });
            
        } catch (error) {
            console.error('Governance load error:', error);
        } finally {
            setLoading(false);
        }
    }
    
    const can = (action) => {
        const actions = {
            'chat': capabilities.canChat,
            'apply_job': capabilities.canApplyJobs,
            'contact_worker': capabilities.canContactWorkforce,
            'hire_va': capabilities.canHireVA,
            'hr_tools': capabilities.canAccessHRTools,
            'create_course': capabilities.canCreateCourses,
            'admin': capabilities.isAdmin
        };
        return actions[action] || false;
    };
    
    const getTier = () => capabilities.tier;
    const isAdmin = () => capabilities.isAdmin;
    const getCredits = () => capabilities.remainingCredits;
    
    return (
        <GovernanceContext.Provider value={{
            user,
            profile,
            capabilities,
            loading,
            can,
            getTier,
            isAdmin,
            getCredits,
            refresh: loadGovernance
        }}>
            {children}
        </GovernanceContext.Provider>
    );
}
