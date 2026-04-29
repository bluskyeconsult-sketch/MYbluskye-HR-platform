-- ============================================
-- PROMPT 1: SUPABASE FOUNDATION
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    country_code TEXT DEFAULT 'GB',
    user_type TEXT DEFAULT 'free' CHECK (user_type IN ('free', 'registered', 'professional', 'employer', 'business', 'admin', 'super_admin', 'tester')),
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'registered', 'professional', 'employer', 'business', 'admin', 'super_admin')),
    ip_address INET,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    terms_accepted_version TEXT DEFAULT '1.0',
    terms_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Create countries table
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    default_currency TEXT DEFAULT 'GBP',
    default_multiplier DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default 7 countries
INSERT INTO public.countries (code, name, default_currency, default_multiplier) VALUES
('GB', 'United Kingdom', 'GBP', 1.00),
('NG', 'Nigeria', 'NGN', 0.40),
('IE', 'Ireland', 'EUR', 0.90),
('CA', 'Canada', 'CAD', 1.00),
('US', 'United States', 'USD', 1.00),
('DE', 'Germany', 'EUR', 0.90),
('AU', 'Australia', 'AUD', 1.00)
ON CONFLICT (code) DO NOTHING;

-- STEP 3: Create tiers table
CREATE TABLE IF NOT EXISTS public.tiers (
    tier_name TEXT PRIMARY KEY,
    name TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    base_price DECIMAL(10,2) DEFAULT 0,
    features JSONB DEFAULT '{}',
    can_post_jobs BOOLEAN DEFAULT FALSE,
    can_contact_candidates BOOLEAN DEFAULT FALSE,
    can_access_hire_va BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    can_override_audit BOOLEAN DEFAULT FALSE,
    job_post_limit INTEGER DEFAULT 0,
    monthly_price_usd DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO public.tiers (tier_name, name, price, can_post_jobs, can_contact_candidates, job_post_limit, monthly_price_usd) VALUES
('free', 'Free', 0, FALSE, FALSE, 0, 0),
('registered', 'Registered', 0, FALSE, FALSE, 0, 0),
('professional', 'Professional', 29.99, FALSE, FALSE, 0, 29.99),
('employer', 'Employer', 99.99, TRUE, TRUE, 10, 99.99),
('business', 'Business', 499.99, TRUE, TRUE, 100, 499.99),
('admin', 'Admin', 0, TRUE, TRUE, 9999, 0),
('super_admin', 'Super Admin', 0, TRUE, TRUE, 9999, 0)
ON CONFLICT (tier_name) DO NOTHING;

-- STEP 4: Create job_board_sources table (for external job fetching)
CREATE TABLE IF NOT EXISTS public.job_board_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT UNIQUE NOT NULL,
    name TEXT,
    country TEXT,
    type TEXT DEFAULT 'api',
    source_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default sources for 7 countries
INSERT INTO public.job_board_sources (source_name, name, country, type) VALUES
('civilservice_uk', 'Civil Service UK', 'GB', 'api'),
('usajobs', 'USAJobs', 'US', 'api'),
('gc_jobs', 'GC Jobs Canada', 'CA', 'api'),
('aps_jobs', 'APS Jobs Australia', 'AU', 'api'),
('bund_karriere', 'Bund.de Karriere', 'DE', 'api'),
('publicjobs_ie', 'Public Jobs Ireland', 'IE', 'api'),
('fedcivilservice_ng', 'Federal Civil Service Nigeria', 'NG', 'api')
ON CONFLICT (source_name) DO NOTHING;

-- STEP 5: Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    action_type TEXT NOT NULL,
    input_payload JSONB,
    output_payload JSONB,
    jurisdiction TEXT,
    tier_at_time TEXT,
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
    was_allowed BOOLEAN NOT NULL,
    deny_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 6: Create odusbaba_decisions table
CREATE TABLE IF NOT EXISTS public.odusbaba_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    intent TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    tier_at_time TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('ALLOWED', 'DENIED')),
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 7: Create auto-profile trigger (creates profile when user signs up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, country_code, user_type, tier)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'country_code', 'GB'),
        COALESCE(NEW.raw_user_meta_data->>'user_type', 'free'),
        COALESCE(NEW.raw_user_meta_data->>'tier', 'free')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 8: Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_board_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odusbaba_decisions ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create RLS policies (safe, no recursion)
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_super_admin" ON public.profiles FOR ALL USING (auth.email() = 'bluskyeconsult@gmail.com');

CREATE POLICY "countries_select_all" ON public.countries FOR SELECT USING (true);
CREATE POLICY "tiers_select_all" ON public.tiers FOR SELECT USING (true);
CREATE POLICY "job_board_sources_select_all" ON public.job_board_sources FOR SELECT USING (true);
CREATE POLICY "audit_logs_super_admin" ON public.audit_logs FOR ALL USING (auth.email() = 'bluskyeconsult@gmail.com');
CREATE POLICY "odusbaba_decisions_select_own" ON public.odusbaba_decisions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "odusbaba_decisions_super_admin" ON public.odusbaba_decisions FOR ALL USING (auth.email() = 'bluskyeconsult@gmail.com');

-- STEP 10: Create health check function
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'status', 'healthy',
        'timestamp', NOW(),
        'version', '1.0.0'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.health_check() TO anon, authenticated, service_role;

-- STEP 11: Create setup_state table
CREATE TABLE IF NOT EXISTS public.setup_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.setup_state (completed) VALUES (FALSE) ON CONFLICT DO NOTHING;
ALTER TABLE public.setup_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setup_state_read_all" ON public.setup_state FOR SELECT USING (true);

-- STEP 12: Verification
SELECT '✅ PROMPT 1 COMPLETE' as status;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';
