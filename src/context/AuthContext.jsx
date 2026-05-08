// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('free');
  const [permissions, setPermissions] = useState({});

  // Tier-based permissions mapping
  const tierPermissions = {
    free: {
      canBrowseJobs: true,
      canViewCourses: true,
      canViewBooks: true,
      canTakeAssessments: 1,
      canHireVA: false,
      canPostJobs: false,
      canApplyToJobs: false,
      canUseAIAssist: false,
      canSaveJobs: false,
      maxApplications: 0,
      maxAssessments: 1,
      maxCourses: 0
    },
    registered: {
      canBrowseJobs: true,
      canViewCourses: true,
      canViewBooks: true,
      canTakeAssessments: 3,
      canHireVA: true,
      canPostJobs: false,
      canApplyToJobs: true,
      canUseAIAssist: true,
      canSaveJobs: true,
      maxApplications: 10,
      maxAssessments: 3,
      maxCourses: 5
    },
    professional: {
      canBrowseJobs: true,
      canViewCourses: true,
      canViewBooks: true,
      canTakeAssessments: 'unlimited',
      canHireVA: true,
      canPostJobs: false,
      canApplyToJobs: true,
      canUseAIAssist: true,
      canSaveJobs: true,
      maxApplications: 'unlimited',
      maxAssessments: 'unlimited',
      maxCourses: 'unlimited'
    },
    employer: {
      canBrowseJobs: true,
      canViewCourses: true,
      canViewBooks: true,
      canTakeAssessments: 5,
      canHireVA: false,
      canPostJobs: true,
      canApplyToJobs: false,
      canUseAIAssist: true,
      canSaveJobs: true,
      maxApplications: 0,
      maxAssessments: 5,
      maxJobListings: 10
    },
    business: {
      canBrowseJobs: true,
      canViewCourses: true,
      canViewBooks: true,
      canTakeAssessments: 'unlimited',
      canHireVA: true,
      canPostJobs: true,
      canApplyToJobs: false,
      canUseAIAssist: true,
      canSaveJobs: true,
      maxJobListings: 'unlimited',
      maxAssessments: 'unlimited'
    },
    admin: {
      canBrowseJobs: true,
      canViewCourses: true,
      canViewBooks: true,
      canTakeAssessments: 'unlimited',
      canHireVA: true,
      canPostJobs: true,
      canApplyToJobs: true,
      canUseAIAssist: true,
      canSaveJobs: true,
      canModerate: true,
      isAdmin: true
    },
    super_admin: {
      canBrowseJobs: true,
      canViewCourses: true,
      canViewBooks: true,
      canTakeAssessments: 'unlimited',
      canHireVA: true,
      canPostJobs: true,
      canApplyToJobs: true,
      canUseAIAssist: true,
      canSaveJobs: true,
      canModerate: true,
      canConfigure: true,
      isAdmin: true,
      isSuperAdmin: true
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
        
        const userTier = profileData?.tier || profileData?.user_type || 'free';
        setTier(userTier);
        setPermissions(tierPermissions[userTier] || tierPermissions.free);
      } else {
        setTier('free');
        setPermissions(tierPermissions.free);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setTier('free');
      setPermissions(tierPermissions.free);
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    profile,
    loading,
    tier,
    permissions,
    isAuthenticated: !!user,
    isFree: tier === 'free',
    isRegistered: tier === 'registered',
    isProfessional: tier === 'professional',
    isEmployer: tier === 'employer',
    isBusiness: tier === 'business',
    isAdmin: tier === 'admin' || tier === 'super_admin',
    isSuperAdmin: tier === 'super_admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
