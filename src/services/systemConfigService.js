// src/services/systemConfigService.js
// Complete service for managing system configuration

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION KEYS
// ============================================

export const CONFIG_KEYS = {
    TESTER_VISIBILITY: 'tester_visibility',
    TESTING_MODE: 'testing_mode',
    MAINTENANCE_MODE: 'maintenance_mode',
    FEATURE_FLAGS: 'feature_flags',
    SITE_SETTINGS: 'site_settings'
};

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_CONFIG = {
    [CONFIG_KEYS.TESTER_VISIBILITY]: {
        show_login_button: false,
        show_register_button: false,
        registration_mode: 'invite_only'
    },
    [CONFIG_KEYS.TESTING_MODE]: 'disabled',
    [CONFIG_KEYS.MAINTENANCE_MODE]: false,
    [CONFIG_KEYS.FEATURE_FLAGS]: {},
    [CONFIG_KEYS.SITE_SETTINGS]: {}
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseConfigValue(value, defaultValue) {
    if (!value) return defaultValue;
    
    try {
        // Try to parse as JSON first
        return JSON.parse(value);
    } catch {
        // If not JSON, return as string
        return value;
    }
}

function stringifyConfigValue(value) {
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

// ============================================
// CORE CRUD OPERATIONS
// ============================================

/**
 * Get a single configuration value by key
 * @param {string} key - Configuration key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>}
 */
export async function getConfig(key, defaultValue = null) {
    try {
        const { data, error } = await supabase
            .from('system_config')
            .select('config_value')
            .eq('config_key', key)
            .single();

        if (error) throw error;
        
        const defaultVal = defaultValue !== null ? defaultValue : DEFAULT_CONFIG[key];
        return parseConfigValue(data?.config_value, defaultVal);
    } catch (error) {
        console.warn(`Failed to get config for key "${key}":`, error.message);
        return defaultValue !== null ? defaultValue : DEFAULT_CONFIG[key];
    }
}

/**
 * Get multiple configuration values at once
 * @param {Array<string>} keys - Array of configuration keys
 * @returns {Promise<Object>}
 */
export async function getMultipleConfigs(keys) {
    try {
        const { data, error } = await supabase
            .from('system_config')
            .select('config_key, config_value')
            .in('config_key', keys);

        if (error) throw error;

        const result = {};
        keys.forEach(key => {
            const found = data?.find(item => item.config_key === key);
            result[key] = parseConfigValue(found?.config_value, DEFAULT_CONFIG[key]);
        });
        
        return result;
    } catch (error) {
        console.warn('Failed to get multiple configs:', error.message);
        const result = {};
        keys.forEach(key => {
            result[key] = DEFAULT_CONFIG[key];
        });
        return result;
    }
}

/**
 * Set a configuration value
 * @param {string} key - Configuration key
 * @param {any} value - Value to set
 * @param {string} description - Optional description
 * @returns {Promise<Object>}
 */
export async function setConfig(key, value, description = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const stringValue = stringifyConfigValue(value);
        
        const { data, error } = await supabase
            .from('system_config')
            .upsert({
                config_key: key,
                config_value: stringValue,
                description: description,
                updated_at: new Date().toISOString(),
                updated_by: user?.id
            }, {
                onConflict: 'config_key'
            })
            .select()
            .single();

        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        console.error(`Failed to set config for key "${key}":`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a configuration
 * @param {string} key - Configuration key
 * @returns {Promise<Object>}
 */
export async function deleteConfig(key) {
    try {
        const { error } = await supabase
            .from('system_config')
            .delete()
            .eq('config_key', key);

        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete config for key "${key}":`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all configuration values
 * @returns {Promise<Object>}
 */
export async function getAllConfigs() {
    try {
        const { data, error } = await supabase
            .from('system_config')
            .select('*')
            .order('config_key');

        if (error) throw error;
        
        const result = {};
        data?.forEach(item => {
            result[item.config_key] = parseConfigValue(item.config_value, null);
        });
        
        return { success: true, data: result };
    } catch (error) {
        console.error('Failed to get all configs:', error);
        return { success: false, error: error.message, data: {} };
    }
}

// ============================================
// SPECIFIC CONFIG GETTERS (Convenience)
// ============================================

/**
 * Get tester visibility configuration
 * @returns {Promise<Object>} { show_login_button, show_register_button, registration_mode }
 */
export async function getTesterVisibility() {
    return getConfig(CONFIG_KEYS.TESTER_VISIBILITY, DEFAULT_CONFIG[CONFIG_KEYS.TESTER_VISIBILITY]);
}

/**
 * Get testing mode status
 * @returns {Promise<string>} 'enabled', 'disabled', or 'maintenance'
 */
export async function getTestingMode() {
    return getConfig(CONFIG_KEYS.TESTING_MODE, DEFAULT_CONFIG[CONFIG_KEYS.TESTING_MODE]);
}

/**
 * Check if testing mode is enabled
 * @returns {Promise<boolean>}
 */
export async function isTestingModeEnabled() {
    const mode = await getTestingMode();
    return mode === 'enabled';
}

/**
 * Get maintenance mode status
 * @returns {Promise<boolean>}
 */
export async function getMaintenanceMode() {
    return getConfig(CONFIG_KEYS.MAINTENANCE_MODE, DEFAULT_CONFIG[CONFIG_KEYS.MAINTENANCE_MODE]);
}

/**
 * Get feature flags
 * @returns {Promise<Object>}
 */
export async function getFeatureFlags() {
    return getConfig(CONFIG_KEYS.FEATURE_FLAGS, DEFAULT_CONFIG[CONFIG_KEYS.FEATURE_FLAGS]);
}

/**
 * Check if a specific feature is enabled
 * @param {string} featureName
 * @returns {Promise<boolean>}
 */
export async function isFeatureEnabled(featureName) {
    const flags = await getFeatureFlags();
    return flags[featureName] === true;
}

// ============================================
// SPECIFIC CONFIG SETTERS (Convenience)
// ============================================

/**
 * Update tester visibility settings
 * @param {Object} settings - { show_login_button, show_register_button, registration_mode }
 */
export async function updateTesterVisibility(settings) {
    const current = await getTesterVisibility();
    const updated = { ...current, ...settings };
    return setConfig(CONFIG_KEYS.TESTER_VISIBILITY, updated, 'Controls visibility of tester buttons in navbar');
}

/**
 * Enable or disable testing mode
 * @param {boolean} enabled 
 */
export async function setTestingMode(enabled) {
    const value = enabled ? 'enabled' : 'disabled';
    return setConfig(CONFIG_KEYS.TESTING_MODE, value, 'Controls testing mode for the platform');
}

/**
 * Enable or disable maintenance mode
 * @param {boolean} enabled 
 * @param {string} message - Optional maintenance message
 */
export async function setMaintenanceMode(enabled, message = null) {
    const value = enabled ? { enabled: true, message } : false;
    return setConfig(CONFIG_KEYS.MAINTENANCE_MODE, value, 'Controls maintenance mode for the platform');
}

/**
 * Update feature flags
 * @param {Object} flags - Feature flag object
 */
export async function updateFeatureFlags(flags) {
    const current = await getFeatureFlags();
    const updated = { ...current, ...flags };
    return setConfig(CONFIG_KEYS.FEATURE_FLAGS, updated, 'Feature flags for controlling feature availability');
}

// ============================================
// CACHE MANAGEMENT
// ============================================

let configCache = {};
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get config with caching (for high-frequency access)
 * @param {string} key 
 * @param {any} defaultValue 
 * @param {boolean} bypassCache 
 */
export async function getCachedConfig(key, defaultValue = null, bypassCache = false) {
    const now = Date.now();
    
    if (!bypassCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION && configCache[key] !== undefined) {
        return configCache[key];
    }
    
    const value = await getConfig(key, defaultValue);
    configCache[key] = value;
    cacheTimestamp = now;
    
    return value;
}

/**
 * Clear the config cache
 */
export function clearConfigCache() {
    configCache = {};
    cacheTimestamp = null;
}

// ============================================
// REACT HOOK
// ============================================

import { useState, useEffect } from 'react';

/**
 * React hook for using config values
 * @param {string} key - Config key
 * @param {any} defaultValue - Default value
 */
export function useConfig(key, defaultValue = null) {
    const [value, setValue] = useState(defaultValue);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadConfig();
    }, [key]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const result = await getConfig(key, defaultValue);
            setValue(result);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = async (newValue, description = null) => {
        const result = await setConfig(key, newValue, description);
        if (result.success) {
            setValue(newValue);
        }
        return result;
    };

    return { value, loading, error, updateConfig, refetch: loadConfig };
}

/**
 * React hook for tester visibility
 */
export function useTesterVisibility() {
    const { value, loading, updateConfig } = useConfig(CONFIG_KEYS.TESTER_VISIBILITY, DEFAULT_CONFIG[CONFIG_KEYS.TESTER_VISIBILITY]);
    
    const updateVisibility = async (settings) => {
        const current = value || {};
        const updated = { ...current, ...settings };
        return updateConfig(updated, 'Controls visibility of tester buttons in navbar');
    };
    
    return {
        visibility: value,
        loading,
        showLoginButton: value?.show_login_button || false,
        showRegisterButton: value?.show_register_button || false,
        registrationMode: value?.registration_mode || 'invite_only',
        updateVisibility
    };
}

// ============================================
// EXPORTS
// ============================================

export default {
    // Core functions
    getConfig,
    getMultipleConfigs,
    setConfig,
    deleteConfig,
    getAllConfigs,
    
    // Convenience getters
    getTesterVisibility,
    getTestingMode,
    isTestingModeEnabled,
    getMaintenanceMode,
    getFeatureFlags,
    isFeatureEnabled,
    
    // Convenience setters
    updateTesterVisibility,
    setTestingMode,
    setMaintenanceMode,
    updateFeatureFlags,
    
    // Cache management
    getCachedConfig,
    clearConfigCache,
    
    // React hooks
    useConfig,
    useTesterVisibility,
    
    // Constants
    CONFIG_KEYS
};
