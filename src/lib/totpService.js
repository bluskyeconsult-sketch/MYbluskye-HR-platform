// ============================================
// TOTP (Time-Based One-Time Password) Service
// Phase 1: Two-Factor Authentication
// ============================================

import { supabase } from './supabase';

/**
 * Generate TOTP secret and QR code for user
 * @param {string} userId - User ID
 * @param {string} email - User email for QR code label
 * @returns {Promise<{secret: string, qrCodeUrl: string, backupCodes: string[]}>}
 */
export async function setupTwoFactor(userId, email) {
    try {
        const response = await supabase.functions.invoke('generate-2fa-secret', {
            body: { userId, email }
        });

        if (response.error) throw new Error(response.error.message);
        
        return response.data;
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
        const response = await supabase.functions.invoke('verify-2fa', {
            body: { userId, token, secret, backupCodes, action: 'enable' }
        });

        if (response.error) throw new Error(response.error.message);
        
        return response.data;
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
        const response = await supabase.functions.invoke('verify-2fa', {
            body: { userId, token, action: 'login' }
        });

        if (response.error) throw new Error(response.error.message);
        
        return response.data;
    } catch (error) {
        console.error('2FA login verification error:', error);
        return { verified: false, message: error.message };
    }
}

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

        const codes = profile.two_factor_backup_codes || [];
        
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
            await supabase.rpc('log_2fa_event', {
                p_user_id: userId,
                p_action: 'backup_used',
                p_metadata: JSON.stringify({ backup_used: true })
            });

            return { verified: true };
        }

        return { verified: false, message: 'Invalid backup code' };
    } catch (error) {
        console.error('Backup code verification error:', error);
        return { verified: false, message: 'Verification failed' };
    }
}

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
        await supabase.rpc('log_2fa_event', {
            p_user_id: userId,
            p_action: 'disabled',
            p_metadata: JSON.stringify({ disabled: true })
        });

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
