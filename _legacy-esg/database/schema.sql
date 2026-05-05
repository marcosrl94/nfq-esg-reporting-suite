-- NFQ ESG Reporting Suite - Database Schema
-- Compatible with Supabase/PostgreSQL
-- Includes Row Level Security (RLS) policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Sustainability Lead', 'Data Owner', 'Auditor')),
    department VARCHAR(100) NOT NULL CHECK (department IN (
        'Sustainability Office',
        'Environment / Ops',
        'Human Resources',
        'Finance',
        'Legal'
    )),
    avatar VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STANDARDS TABLE
-- ============================================
CREATE TABLE standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., "ESRS E1"
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ESRS', 'GRI', 'ISSB', 'TCFD', 'SASB')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DATAPOINTS TABLE
-- ============================================
CREATE TABLE datapoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL, -- e.g., "E1-1", "E1-6-01"
    name VARCHAR(500) NOT NULL,
    description TEXT,
    standard_id UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
    values JSONB NOT NULL DEFAULT '{}', -- { "2024": 45200, "2023": 48500 }
    unit VARCHAR(50), -- e.g., "tCO2e", "%", "hours"
    type VARCHAR(20) NOT NULL CHECK (type IN ('quantitative', 'qualitative')),
    status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Review', 'Approved', 'Locked')),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    department VARCHAR(100) NOT NULL,
    last_modified TIMESTAMP WITH TIME ZONE,
    mappings JSONB DEFAULT '{}', -- Cross-reference mappings to other standards
    ai_verification JSONB DEFAULT NULL, -- { status, extractedValue, confidence, reasoning, lastChecked }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_datapoint_code_per_standard UNIQUE (code, standard_id)
);

-- Indexes for performance
CREATE INDEX idx_datapoints_standard_id ON datapoints(standard_id);
CREATE INDEX idx_datapoints_owner_id ON datapoints(owner_id);
CREATE INDEX idx_datapoints_status ON datapoints(status);
CREATE INDEX idx_datapoints_department ON datapoints(department);
CREATE INDEX idx_datapoints_values_gin ON datapoints USING GIN (values);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    datapoint_id UUID NOT NULL REFERENCES datapoints(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_datapoint_id ON comments(datapoint_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- ============================================
-- EVIDENCE FILES TABLE
-- ============================================
CREATE TABLE evidence_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    datapoint_id UUID NOT NULL REFERENCES datapoints(id) ON DELETE CASCADE,
    source_id VARCHAR(255), -- Optional: ID of consolidation source this evidence belongs to
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- Path in storage bucket
    file_size BIGINT NOT NULL, -- Size in bytes
    mime_type VARCHAR(100) NOT NULL, -- e.g., "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hierarchy JSONB, -- { level: 'geography'|'business_unit'|'subsidiary'|'facility', value: string }
    extracted_data JSONB, -- ExtractedEvidenceData
    ai_analysis JSONB, -- EvidenceAnalysis
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_evidence_files_datapoint_id ON evidence_files(datapoint_id);
CREATE INDEX idx_evidence_files_source_id ON evidence_files(source_id);
CREATE INDEX idx_evidence_files_uploaded_by ON evidence_files(uploaded_by);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    datapoint_id UUID REFERENCES datapoints(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- e.g., "CREATE", "UPDATE", "STATUS_CHANGE", "DELETE"
    old_value JSONB,
    new_value JSONB,
    metadata JSONB DEFAULT '{}', -- Additional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_datapoint_id ON audit_logs(datapoint_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- MATERIALITY ASSESSMENTS TABLE
-- ============================================
CREATE TABLE materiality_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_level VARCHAR(50) NOT NULL DEFAULT 'Group' CHECK (context_level IN ('Group', 'Subsidiary')),
    sectors JSONB NOT NULL DEFAULT '[]', -- Array of sector strings
    countries JSONB NOT NULL DEFAULT '[]', -- Array of country strings
    user_context TEXT, -- Additional user-provided context
    topics JSONB NOT NULL DEFAULT '[]', -- Array of MaterialityTopic objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_materiality_assessments_user_id ON materiality_assessments(user_id);
CREATE INDEX idx_materiality_assessments_created_at ON materiality_assessments(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standards_updated_at BEFORE UPDATE ON standards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datapoints_updated_at BEFORE UPDATE ON datapoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_files_updated_at BEFORE UPDATE ON evidence_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materiality_assessments_updated_at BEFORE UPDATE ON materiality_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE datapoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiality_assessments ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
-- All authenticated users can view all users (for collaboration)
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Only admins can create/delete users (handled by application logic, not RLS)

-- STANDARDS POLICIES
-- All authenticated users can view standards
CREATE POLICY "Users can view all standards" ON standards
    FOR SELECT USING (true);

-- Only admins can modify standards (handled by application logic)

-- DATAPOINTS POLICIES
-- Users can view datapoints based on their role and department
CREATE POLICY "Users can view datapoints" ON datapoints
    FOR SELECT USING (
        -- Admins can see everything
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Sustainability Lead'
        )
        OR
        -- Data Owners can see their own department's datapoints
        (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id::text = auth.uid()::text 
                AND users.role = 'Data Owner'
                AND users.department = datapoints.department
            )
        )
        OR
        -- Auditors can see approved datapoints
        (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id::text = auth.uid()::text 
                AND users.role = 'Auditor'
            )
            AND datapoints.status IN ('Approved', 'Locked')
        )
    );

-- Users can insert datapoints in their department
CREATE POLICY "Users can insert datapoints in their department" ON datapoints
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND (
                users.role = 'Sustainability Lead'
                OR (users.role = 'Data Owner' AND users.department = datapoints.department)
            )
        )
    );

-- Users can update datapoints they own or in their department
CREATE POLICY "Users can update datapoints" ON datapoints
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND (
                users.role = 'Sustainability Lead'
                OR (
                    users.role = 'Data Owner' 
                    AND (
                        users.department = datapoints.department
                        OR users.id = datapoints.owner_id
                    )
                )
            )
        )
    );

-- COMMENTS POLICIES
-- Users can view comments on datapoints they can access
CREATE POLICY "Users can view comments" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM datapoints d
            JOIN users u ON u.id::text = auth.uid()::text
            WHERE d.id = comments.datapoint_id
            AND (
                u.role = 'Sustainability Lead'
                OR (u.role = 'Data Owner' AND u.department = d.department)
                OR (u.role = 'Auditor' AND d.status IN ('Approved', 'Locked'))
            )
        )
    );

-- Users can insert comments on datapoints they can access
CREATE POLICY "Users can insert comments" ON comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM datapoints d
            JOIN users u ON u.id::text = auth.uid()::text
            WHERE d.id = comments.datapoint_id
            AND (
                u.role = 'Sustainability Lead'
                OR (u.role = 'Data Owner' AND u.department = d.department)
            )
        )
        AND user_id::text = auth.uid()::text
    );

-- EVIDENCE FILES POLICIES
-- Users can view evidence files for datapoints they can access
CREATE POLICY "Users can view evidence files" ON evidence_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM datapoints d
            JOIN users u ON u.id::text = auth.uid()::text
            WHERE d.id = evidence_files.datapoint_id
            AND (
                u.role = 'Sustainability Lead'
                OR (u.role = 'Data Owner' AND u.department = d.department)
                OR (u.role = 'Auditor' AND d.status IN ('Approved', 'Locked'))
            )
        )
    );

-- Users can upload evidence files for datapoints they can edit
CREATE POLICY "Users can upload evidence files" ON evidence_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM datapoints d
            JOIN users u ON u.id::text = auth.uid()::text
            WHERE d.id = evidence_files.datapoint_id
            AND (
                u.role = 'Sustainability Lead'
                OR (u.role = 'Data Owner' AND u.department = d.department)
            )
        )
        AND uploaded_by::text = auth.uid()::text
    );

-- AUDIT LOGS POLICIES
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Sustainability Lead'
        )
    );

-- System can insert audit logs (handled by application logic)

-- MATERIALITY ASSESSMENTS POLICIES
-- Users can view their own assessments
CREATE POLICY "Users can view own assessments" ON materiality_assessments
    FOR SELECT USING (
        user_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Sustainability Lead'
        )
    );

-- Users can create assessments
CREATE POLICY "Users can create assessments" ON materiality_assessments
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Users can update their own assessments
CREATE POLICY "Users can update own assessments" ON materiality_assessments
    FOR UPDATE USING (user_id::text = auth.uid()::text);

-- ============================================
-- INITIAL DATA (Optional Seed Data)
-- ============================================

-- Insert default standards (ESRS E1, ESRS S1, etc.)
-- Note: In production, this would be managed through migrations or admin UI
INSERT INTO standards (code, title, type) VALUES
    ('ESRS E1', 'Climate Change', 'ESRS'),
    ('ESRS S1', 'Own Workforce', 'ESRS')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- NOTES FOR SUPABASE SETUP
-- ============================================
-- 1. Run this script in the Supabase SQL Editor
-- 2. Ensure Supabase Auth is configured
-- 3. Create a storage bucket named 'evidence-files' for file uploads
-- 4. Configure storage policies separately for the bucket
-- 5. The auth.uid() function references Supabase Auth user IDs
-- 6. Adjust RLS policies based on your specific security requirements
-- 7. Consider adding indexes for full-text search if needed
-- 8. Set up database backups and point-in-time recovery
