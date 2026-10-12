-- SOC 360: Multi-User Isolation & Row Level Security (RLS) Migration
-- Run this in the Supabase SQL Editor to enforce database-level multi-tenancy.

-- 1. Add user_id to brands, scans, findings (referencing Supabase auth.users)
ALTER TABLE brands 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE scans 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE findings 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add performance indexes on user_id
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_findings_user_id ON findings(user_id);

-- 3. Enable Row Level Security (RLS) on all persistent tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for brands
DROP POLICY IF EXISTS "Users can only access their own brands" ON brands;
CREATE POLICY "Users can only access their own brands"
    ON brands FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. RLS Policies for candidates (linked via brand ownership)
DROP POLICY IF EXISTS "Users can access candidates of their own brands" ON candidates;
CREATE POLICY "Users can access candidates of their own brands"
    ON candidates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = candidates.brand_id 
            AND brands.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = candidates.brand_id 
            AND brands.user_id = auth.uid()
        )
    );

-- 6. RLS Policies for scans
DROP POLICY IF EXISTS "Users can only access their own scans" ON scans;
CREATE POLICY "Users can only access their own scans"
    ON scans FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. RLS Policies for findings
DROP POLICY IF EXISTS "Users can only access their own findings" ON findings;
CREATE POLICY "Users can only access their own findings"
    ON findings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
