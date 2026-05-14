// src/lib/totpService.js
// COMPLETE TOTP SERVICE - Supports both Supabase Edge Functions and Vercel Serverless
// Includes: setup, verify, backup codes, disable, admin checks

import { supabase } from './supabase';

// ============================================
// CONFIGURATION - Toggle between deployment types
// ============================================

// Set this based on your deployment environment
// For Vercel: USE_VERCEL_FUNCTIONS = true
// For Supabase Edge Functions: USE_VERCEL_FUNCTIONS = false
const USE_VERCEL_FUNCTIONS = true; // Change this based on your deployment

// API endpoint for Vercel serverless functions
const API_BASE = '/api/2fa';

// ============================================
// CORE 2FA FUNCTIONS
// ============================================

/**
 * Generate TOTP secret and QR code for user
 * @param {string} userId - User ID
 * @param {string} email - User email for QR code label
 * @returns {Promise<{secret: string, qrCodeUrl: string, backupCodes: string[]}>}
 */
export async function setupTwoFactor(userId, email) {
    try {
        if (USE_VERCEL_FUNCTIONS) {
            // Vercel Serverless Function
            const response = await fetch(`${API_BASE}?action=generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email })
            });
            
            if (!response.ok) throw new Error('Failed to generate 2FA secret');
            return await response.json();
        } else {
            // Supabase Edge Function
            const response = await supabase.functions.invoke('generate-2fa-secret', {
                body: { userId, email }
            });
            
            if (response.error) throw new Error(response.error.message);
            return response.data;
        }
    } catch (error) {
        console.error('2FA setup error:', error);
        throw new Error('Failed to setup 2FA: ' + error.message);
    }
}

/**
 * Verify TOTP code and enable 2FA
 * @param {string} userId - User ID
 * @param {string} token - 6-digit code from authenticator app
 * @param {string} secret - TOTP secret
 * @param {string[]} backupCodes - Generated backup codes
 * @returns {Promise<{verified: boolean, message?: string}>}
 */
export async function verifyAndEnableTwoFactor(userId, token, secret, backupCodes) {
    try {
        let verified = false;
        
        if (USE_VERCEL_FUNCTIONS) {
            // Vercel Serverless Function
            const response = await fetch(`${API_BASE}?action=verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, secret })
            });
            
            if (!response.ok) throw new Error('Verification failed');
            const data = await response.json();
            verified = data.verified;
        } else {
            // Supabase Edge Function
            const response = await supabase.functions.invoke('verify-2fa', {
                body: { userId, token, secret, backupCodes, action: 'enable' }
            });
            
            if (response.error) throw new Error(response.error.message);
            verified = response.data.verified;
        }
        
        if (verified) {
            // Save to database
            await supabase
                .from('profiles')
                .update({
                    two_factor_enabled: true,
                    two_factor_secret: secret,
                    two_factor_backup_codes: backupCodes,
                    two_factor_last_verified: new Date().toISOString()
                })
                .eq('id', userId);
            
            // Log enable event
            await log2FAEvent(userId, 'enabled');
        }
        
        return { verified: verified ? true : false, message: verified ? null : 'Invalid verification code' };
    } catch (error) {
        console.error('2FA verification error:', error);
        return { verified: false, message: error.message };
    }
}

/**
 * Verify TOTP code during login
 * @param {string} userId - User ID
 * @param {string} token - 6-digit code from authenticator app
 * @returns {Promise<{verified: boolean, message?: string}>}
 */
export async function verifyTwoFactorLogin(userId, token) {
    try {
        // Get user's 2FA secret
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('two_factor_secret')
            .eq('id', userId)
            .single();
        
        if (error || !profile?.two_factor_secret) {
            return { verified: false, message: '2FA not set up' };
        }
        
        let verified = false;
        
        if (USE_VERCEL_FUNCTIONS) {
            // Vercel Serverless Function
            const response = await fetch(`${API_BASE}?action=verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, secret: profile.two_factor_secret })
            });
            
            if (!response.ok) throw new Error('Verification failed');
            const data = await response.json();
            verified = data.verified;
        } else {
            // Supabase Edge Function
            const response = await supabase.functions.invoke('verify-2fa', {
                body: { userId, token, action: 'login' }
            });
            
            if (response.error) throw new Error(response.error.message);
            verified = response.data.verified;
        }
        
        if (verified) {
            // Update last verified timestamp
            await supabase
                .from('profiles')
                .update({ two_factor_last_verified: new Date().toISOString() })
                .eq('id', userId);
        }
        
        return { verified, message: verified ? null : 'Invalid verification code' };
    } catch (error) {
        console.error('2FA login verification error:', error);
        return { verified: false, message: error.message };
    }
}

// ============================================
// BACKUP CODE FUNCTIONS
// ============================================

/**
 * Verify backup code (emergency access)
 * @param {string} userId - User ID
 * @param {string} backupCode - Backup code
 * @returns {Promise<{verified: boolean, message?: string}>}
 */
export async function verifyBackupCode(userId, backupCode) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('two_factor_backup_codes')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const codes = profile?.two_factor_backup_codes || [];
        
        // Check if backup code exists
        const codeIndex = codes.indexOf(backupCode);
        
        if (codeIndex !== -1) {
            // Remove used backup code
            codes.splice(codeIndex, 1);
            
            await supabase
                .from('profiles')
                .update({ two_factor_backup_codes: codes })
                .eq('id', userId);

            // Log backup code usage
            await log2FAEvent(userId, 'backup_used');
            
            return { verified: true };
        }

        return { verified: false, message: 'Invalid backup code' };
    } catch (error) {
        console.error('Backup code verification error:', error);
        return { verified: false, message: 'Verification failed' };
    }
}

/**
 * Generate new backup codes
 * @param {string} userId - User ID
 * @returns {Promise<{backupCodes: string[], success: boolean}>}
 */
export async function regenerateBackupCodes(userId) {
    try {
        // Generate 10 new backup codes
        const newBackupCodes = Array.from({ length: 10 }, () => {
            return Math.random().toString(36).substring(2, 10).toUpperCase();
        });
        
        await supabase
            .from('profiles')
            .update({ two_factor_backup_codes: newBackupCodes })
            .eq('id', userId);
        
        await log2FAEvent(userId, 'backup_regenerated');
        
        return { backupCodes: newBackupCodes, success: true };
    } catch (error) {
        console.error('Regenerate backup codes error:', error);
        return { backupCodes: [], success: false, message: error.message };
    }
}

// ============================================
// 2FA MANAGEMENT FUNCTIONS
// ============================================

/**
 * Disable 2FA for user
 * @param {string} userId - User ID
 * @param {string} token - Current TOTP token for confirmation
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function disableTwoFactor(userId, token) {
    try {
        // Verify token first
        const { verified } = await verifyTwoFactorLogin(userId, token);
        
        if (!verified) {
            return { success: false, message: 'Invalid verification code' };
        }

        // Clear 2FA data
        const { error } = await supabase
            .from('profiles')
            .update({
                two_factor_enabled: false,
                two_factor_secret: null,
                two_factor_backup_codes: [],
                two_factor_last_verified: null
            })
            .eq('id', userId);

        if (error) throw error;

        // Log disable event
        await log2FAEvent(userId, 'disabled');

        return { success: true };
    } catch (error) {
        console.error('2FA disable error:', error);
        return { success: false, message: 'Failed to disable 2FA' };
    }
}

/**
 * Check if user has 2FA enabled
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function isTwoFactorEnabled(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('two_factor_enabled')
            .eq('id', userId)
            .single();

        if (error) throw error;
        
        return profile?.two_factor_enabled || false;
    } catch (error) {
        console.error('Check 2FA status error:', error);
        return false;
    }
}

/**
 * Check if user is admin (requires 2FA)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function isAdminUser(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', userId)
            .single();

        if (error) throw error;
        
        return profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
    } catch (error) {
        console.error('Check admin status error:', error);
        return false;
    }
}

/**
 * Get 2FA status for user
 * @param {string} userId - User ID
 * @returns {Promise<{enabled: boolean, hasBackupCodes: boolean, lastVerified: string|null}>}
 */
export async function getTwoFactorStatus(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('two_factor_enabled, two_factor_backup_codes, two_factor_last_verified')
            .eq('id', userId)
            .single();

        if (error) throw error;
        
        return {
            enabled: profile?.two_factor_enabled || false,
            hasBackupCodes: (profile?.two_factor_backup_codes?.length || 0) > 0,
            lastVerified: profile?.two_factor_last_verified || null
        };
    } catch (error) {
        console.error('Get 2FA status error:', error);
        return { enabled: false, hasBackupCodes: false, lastVerified: null };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Log 2FA events for audit trail
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {object} metadata - Additional metadata
 */
async function log2FAEvent(userId, action, metadata = {}) {
    try {
        // Try to use RPC if available, otherwise just console log
        await supabase.rpc('log_2fa_event', {
            p_user_id: userId,
            p_action: action,
            p_metadata: JSON.stringify(metadata)
        }).catch(() => {
            console.log(`2FA Event: ${action} for user ${userId}`, metadata);
        });
    } catch (error) {
        console.log(`2FA Event log failed: ${action} for user ${userId}`);
    }
}
