-- Migration: Create content_reports table for storing user reports
-- This table stores reports submitted by users about content that violates community guidelines

CREATE TABLE content_reports (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL, -- POST, COMMENT, PRAYER, ANNOUNCEMENT, MESSAGE, USER
    content_id UUID NOT NULL,
    
    -- Reporter information
    reporter_id UUID NOT NULL,
    
    -- Report details
    reason VARCHAR(100) NOT NULL, -- SPAM, HARASSMENT, HATE_SPEECH, INAPPROPRIATE, COPYRIGHT, OTHER
    description TEXT,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, REVIEWING, RESOLVED, DISMISSED
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    
    -- Moderation details (filled when resolved)
    moderation_action VARCHAR(50), -- APPROVED, REMOVED, HIDDEN, WARNED
    moderation_reason TEXT,
    moderated_by UUID,
    moderated_at TIMESTAMP,
    
    -- Metadata
    is_auto_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    auto_flag_reason TEXT,
    report_count INTEGER NOT NULL DEFAULT 1, -- Count of reports for this content
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_content_reports_content_type_id ON content_reports(content_type, content_id);
CREATE INDEX idx_content_reports_reporter_id ON content_reports(reporter_id);
CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_priority ON content_reports(priority);
CREATE INDEX idx_content_reports_created_at ON content_reports(created_at);
CREATE INDEX idx_content_reports_pending ON content_reports(status, priority, created_at) WHERE status = 'PENDING';

-- Unique constraint to prevent duplicate reports from same user for same content
CREATE UNIQUE INDEX idx_content_reports_unique_report ON content_reports(content_type, content_id, reporter_id) 
WHERE status IN ('PENDING', 'REVIEWING');

-- Add comment for documentation
COMMENT ON TABLE content_reports IS 'Stores reports submitted by users about content that may violate community guidelines. Supports moderation workflow with status tracking and priority levels.';

