-- Run this in Supabase SQL Editor
-- Creates all necessary tables for external job management

-- ============================================
-- EXTERNAL JOBS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS external_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    description TEXT,
    salary_range TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    country_code VARCHAR(2),
    job_type VARCHAR(50) DEFAULT 'full_time',
    source_type VARCHAR(50) DEFAULT 'authoritative',
    source_name VARCHAR(100) NOT NULL,
    source_country VARCHAR(2),
    external_apply_url TEXT,
    sponsorship_eligible BOOLEAN DEFAULT false,
    sponsorship_keyword TEXT,
    status VARCHAR(50) DEFAULT 'pending_approval',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_job_id UUID,
    rejection_reason TEXT,
    
    CONSTRAINT valid_status CHECK (status IN ('pending_approval', 'approved', 'rejected'))
);

-- ============================================
-- FETCH LOG TABLE (for monitoring)
-- ============================================

CREATE TABLE IF NOT EXISTS external_job_fetch_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(100),
    fetch_status VARCHAR(50),
    jobs_fetched INTEGER DEFAULT 0,
    jobs_new INTEGER DEFAULT 0,
    details JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_external_jobs_status ON external_jobs(status);
CREATE INDEX IF NOT EXISTS idx_external_jobs_source ON external_jobs(source_name);
CREATE INDEX IF NOT EXISTS idx_external_jobs_created ON external_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_jobs_country ON external_jobs(source_country);
CREATE INDEX IF NOT EXISTS idx_external_jobs_sponsorship ON external_jobs(sponsorship_eligible);
CREATE INDEX IF NOT EXISTS idx_external_log_created ON external_job_fetch_log(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE external_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_job_fetch_log ENABLE ROW LEVEL SECURITY;

-- External jobs policies
CREATE POLICY "Admins can view external_jobs" ON external_jobs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage external_jobs" ON external_jobs
    FOR ALL USING (true);

-- Fetch log policies
CREATE POLICY "Admins can view fetch logs" ON external_job_fetch_log
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert fetch logs" ON external_job_fetch_log
    FOR INSERT WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_name IN ('external_jobs', 'external_job_fetch_log');
    
    RAISE NOTICE '✅ Created % tables', table_count;
END $$;
