// tests/integration.test.js
// Integration test suite for ODUSBABA platform

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../src/lib/supabase';

describe('ODUSBABA Integration Tests', () => {
    
    describe('Authentication Flow', () => {
        it('should allow user signup', async () => {
            const testEmail = `test${Date.now()}@example.com`;
            const { data, error } = await supabase.auth.signUp({
                email: testEmail,
                password: 'Test123!@#'
            });
            expect(error).toBeNull();
            expect(data.user).toBeDefined();
        });
    });

    describe('Job Board Integration', () => {
        it('should fetch active jobs', async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('is_active', true)
                .limit(5);
            expect(error).toBeNull();
            expect(Array.isArray(data)).toBe(true);
        });
    });

    describe('Course System Integration', () => {
        it('should fetch published courses', async () => {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('is_published', true)
                .limit(5);
            expect(error).toBeNull();
            expect(Array.isArray(data)).toBe(true);
        });
    });

    describe('Workforce Marketplace Integration', () => {
        it('should fetch workforce profiles', async () => {
            const { data, error } = await supabase
                .from('workforce_profiles')
                .select('*')
                .limit(5);
            expect(error).toBeNull();
        });
    });
});
