// src/services/chatIntelligenceService.js
// ODUSBABA CHAT INTELLIGENCE - Intent detection, tier gating, response routing

import { supabase } from '../lib/supabase';

// ============================================
// INTENT DETECTION PATTERNS
// ============================================

const INTENT_PATTERNS = {
    job_search: {
        keywords: ['job', 'position', 'vacancy', 'role', 'career', 'opportunity', 'work', 'employment'],
        sub_intents: {
            visa_sponsorship: ['sponsorship', 'visa', 'tier 2', 'skilled worker', 'work permit'],
            remote: ['remote', 'work from home', 'wfh', 'home office'],
            salary: ['salary', 'pay', 'compensation', 'rate'],
            location: ['location', 'city', 'country', 'relocate']
        },
        tier_access: {
            visitor: { allowed: true, depth: 'preview' },
            free: { allowed: true, depth: 'basic_match' },
            registered: { allowed: true, depth: 'filtered' },
            professional: { allowed: true, depth: 'full_match' }
        }
    },
    
    hr_advice: {
        keywords: ['employer', 'dismiss', 'redundancy', 'rights', 'legal', 'contract', 'tribunal', 'grievance', 'disciplinary'],
        sub_intents: {
            dismissal: ['dismiss', 'fire', 'terminate', 'without notice'],
            redundancy: ['redundancy', 'redundant', 'layoff'],
            grievance: ['grievance', 'complaint', 'issue'],
            discrimination: ['discrimination', 'harassment', 'unfair']
        },
        tier_access: {
            visitor: { allowed: true, depth: 'overview' },
            free: { allowed: true, depth: 'guidance' },
            registered: { allowed: true, depth: 'structured' },
            professional: { allowed: true, depth: 'full_advice' }
        }
    },
    
    cv_optimization: {
        keywords: ['cv', 'resume', 'curriculum vitae', 'cover letter', 'application', 'ats'],
        sub_intents: {
            review: ['review', 'check', 'feedback', 'improve'],
            rewrite: ['rewrite', 'optimize', 'enhance', 'update'],
            format: ['format', 'template', 'layout', 'style']
        },
        tier_access: {
            visitor: { allowed: true, depth: 'preview' },
            free: { allowed: true, depth: 'tips' },
            registered: { allowed: true, depth: 'analysis' },
            professional: { allowed: true, depth: 'execution' }
        }
    },
    
    workforce_listing: {
        keywords: ['skill', 'skills', 'list skill', 'offer service', 'freelance', 'workforce', 'hire me'],
        sub_intents: {
            list: ['list', 'add', 'submit', 'create'],
            verify: ['verify', 'validate', 'prove', 'evidence'],
            find_work: ['find work', 'get hired', 'employers find']
        },
        tier_access: {
            visitor: { allowed: true, depth: 'explain' },
            free: { allowed: true, depth: 'submit' },
            registered: { allowed: true, depth: 'verified' },
            professional: { allowed: true, depth: 'priority' }
        }
    },
    
    hire_workers: {
        keywords: ['hire', 'employer', 'recruit', 'talent', 'worker', 'staff', 'team', 'contractor'],
        sub_intents: {
            browse: ['browse', 'search', 'find', 'look'],
            contact: ['contact', 'message', 'reach', 'connect'],
            hire: ['hire', 'employ', 'engage', 'assign']
        },
        tier_access: {
            visitor: { allowed: true, depth: 'browse_only' },
            free: { allowed: true, depth: 'browse_only' },
            registered: { allowed: true, depth: 'browse_only' },
            professional: { allowed: true, depth: 'limited_contact' },
            business: { allowed: true, depth: 'full_hire' }
        }
    },
    
    learning: {
        keywords: ['learn', 'course', 'training', 'skill up', 'certification', 'education'],
        sub_intents: {
            find: ['find', 'search', 'recommend'],
            enroll: ['enroll', 'take', 'start', 'join']
        },
        tier_access: {
            visitor: { allowed: true, depth: 'browse' },
            free: { allowed: true, depth: 'free_courses' },
            registered: { allowed: true, depth: 'all_courses' }
        }
    },
    
    virtual_assistant: {
        keywords: ['va', 'virtual assistant', 'execute', 'do this for me', 'automate', 'save time'],
        sub_intents: {
            cv_va: ['cv', 'resume', 'cover letter'],
            application_va: ['apply', 'submit application', 'job applications'],
            research_va: ['research', 'find', 'look for']
        },
        tier_access: {
            visitor: { allowed: false, depth: 'explain' },
            free: { allowed: false, depth: 'explain' },
            registered: { allowed: true, depth: 'limited' },
            professional: { allowed: true, depth: 'full' }
        }
    }
};

// ============================================
// COUNTRY DETECTION
// ============================================

const COUNTRY_PATTERNS = {
    'UK': {
        keywords: ['uk', 'united kingdom', 'britain', 'british', 'london', 'england', 'scotland', 'wales'],
        laws: 'UK Employment Law',
        resources: ['ACAS', 'Citizens Advice', 'Employment Tribunal']
    },
    'US': {
        keywords: ['us', 'usa', 'united states', 'america', 'american', 'new york', 'california', 'texas'],
        laws: 'US Employment Law / State-specific',
        resources: ['EEOC', 'DOL', 'State Labor Board']
    },
    'Nigeria': {
        keywords: ['nigeria', 'lagos', 'abuja', 'nigerian'],
        laws: 'Nigeria Labour Act',
        resources: ['National Industrial Court', 'NLC', 'Trade Union']
    },
    'Canada': {
        keywords: ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa'],
        laws: 'Canadian Employment Law',
        resources: ['Human Rights Tribunal', 'Ministry of Labour']
    },
    'Australia': {
        keywords: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth'],
        laws: 'Fair Work Act',
        resources: ['Fair Work Commission', 'Fair Work Ombudsman']
    },
    'Germany': {
        keywords: ['germany', 'berlin', 'munich', 'frankfurt', 'hamburg'],
        laws: 'German Labour Law (ArbZG)',
        resources: ['Works Council', 'Labour Court']
    }
};

// ============================================
// TIER DEFINITIONS
// ============================================

const TIER_CONFIG = {
    visitor: {
        name: 'Visitor',
        level: 0,
        badge: '🌐',
        prefix: 'visitor'
    },
    free: {
        name: 'Free Member',
        level: 1,
        badge: '👤',
        prefix: 'free'
    },
    registered: {
        name: 'Registered Member',
        level: 2,
        badge: '✓',
        prefix: 'registered'
    },
    professional: {
        name: 'Professional Member',
        level: 3,
        badge: '⭐',
        prefix: 'professional'
    },
    business: {
        name: 'Business Account',
        level: 4,
        badge: '🏢',
        prefix: 'business'
    },
    admin: {
        name: 'Administrator',
        level: 5,
        badge: '🛡️',
        prefix: 'admin'
    },
    super_admin: {
        name: 'Super Administrator',
        level: 6,
        badge: '👑',
        prefix: 'super_admin'
    }
};

// ============================================
// INTENT DETECTION ENGINE
// ============================================

export function detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
        // Check primary keywords
        const hasPrimaryIntent = config.keywords.some(keyword => 
            lowerMessage.includes(keyword.toLowerCase())
        );
        
        if (!hasPrimaryIntent) continue;
        
        // Check sub-intents
        let detectedSubIntent = null;
        let subIntentData = null;
        
        for (const [subIntent, keywords] of Object.entries(config.sub_intents || {})) {
            if (keywords.some(k => lowerMessage.includes(k.toLowerCase()))) {
                detectedSubIntent = subIntent;
                subIntentData = keywords;
                break;
            }
        }
        
        return {
            intent,
            subIntent: detectedSubIntent,
            confidence: hasPrimaryIntent ? (detectedSubIntent ? 0.95 : 0.85) : 0,
            tierAccess: config.tier_access
        };
    }
    
    return {
        intent: 'general',
        subIntent: null,
        confidence: 0.5,
        tierAccess: null
    };
}

export function detectCountry(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [country, config] of Object.entries(COUNTRY_PATTERNS)) {
        if (config.keywords.some(k => lowerMessage.includes(k.toLowerCase()))) {
            return { country, ...config };
        }
    }
    
    return { country: 'UK', laws: 'UK Employment Law', resources: ['ACAS', 'Citizens Advice'] };
}

export function getUserTierLevel(tier) {
    return TIER_CONFIG[tier]?.level || 0;
}

export function isActionAllowed(intentConfig, userTier) {
    if (!intentConfig) return { allowed: false, depth: null, reason: 'Unknown intent' };
    
    const tierLevel = getUserTierLevel(userTier);
    const access = intentConfig.tier_access?.[userTier] || intentConfig.tier_access?.free;
    
    if (!access) {
        return { allowed: false, depth: null, reason: 'Upgrade required' };
    }
    
    // Check if user tier meets requirement
    const requiredLevel = getUserTierLevel(userTier);
    if (requiredLevel < (TIER_CONFIG[userTier]?.level || 0)) {
        return { allowed: false, depth: access.depth, reason: 'Higher tier required' };
    }
    
    return { allowed: true, depth: access.depth, reason: null };
}
