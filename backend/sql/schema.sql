-- SOC 360: Digital Risk Protection Platform
-- PostgreSQL Database Schema (Supabase Compatible)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    website VARCHAR(1024),
    logo_url VARCHAR(2048),
    official_social_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    official_apps JSONB NOT NULL DEFAULT '[]'::jsonb,
    official_developers JSONB NOT NULL DEFAULT '[]'::jsonb,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('social', 'app')),
    candidate_name VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    source_url VARCHAR(2048),
    developer_name VARCHAR(255),
    description TEXT,
    image_url VARCHAR(2048),
    package_identifier VARCHAR(255),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Scans Table
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('social', 'app')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    completed_at TIMESTAMPTZ,
    candidates_checked INTEGER NOT NULL DEFAULT 0 CHECK (candidates_checked >= 0),
    findings_created INTEGER NOT NULL DEFAULT 0 CHECK (findings_created >= 0),
    error_message TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE
);

-- 4. Findings Table
CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('social', 'app')),
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    explanation TEXT,
    review_status VARCHAR(30) NOT NULL DEFAULT 'New' CHECK (review_status IN ('New', 'Under Review', 'Confirmed Suspicious', 'False Positive', 'Resolved')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_brand_id ON candidates(brand_id);
CREATE INDEX IF NOT EXISTS idx_candidates_source_type ON candidates(source_type);

CREATE INDEX IF NOT EXISTS idx_scans_brand_id ON scans(brand_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_started_at ON scans(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_findings_brand_id ON findings(brand_id);
CREATE INDEX IF NOT EXISTS idx_findings_candidate_id ON findings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_source_type ON findings(source_type);
CREATE INDEX IF NOT EXISTS idx_findings_risk_level ON findings(risk_level);
CREATE INDEX IF NOT EXISTS idx_findings_review_status ON findings(review_status);
CREATE INDEX IF NOT EXISTS idx_findings_risk_score ON findings(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_findings_created_at ON findings(created_at DESC);

-- Updated_at Trigger Helper Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_brands_updated_at ON brands;
CREATE TRIGGER trg_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_findings_updated_at ON findings;
CREATE TRIGGER trg_findings_updated_at
    BEFORE UPDATE ON findings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
