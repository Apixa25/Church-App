-- Migration: Add feedback and user backup tables
-- This enables user feedback submission and backup management

-- Feedback Table
-- Stores user feedback, support tickets, and feature requests
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    email VARCHAR(255),
    ticket_id VARCHAR(50) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    admin_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- User Backups Table
-- Stores user data backups for GDPR compliance and data recovery
CREATE TABLE user_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    backup_id VARCHAR(50) UNIQUE NOT NULL,
    data_snapshot TEXT,
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    backup_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_user_backup_user_id ON user_backups(user_id);
CREATE INDEX idx_user_backup_created_at ON user_backups(created_at DESC);

-- Account Deletion Requests Table
-- Tracks account deletion requests with grace period
CREATE TABLE account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmation_token VARCHAR(255) UNIQUE,
    confirmed_at TIMESTAMP,
    scheduled_deletion_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED, COMPLETED
    cancelled_at TIMESTAMP
);

CREATE INDEX idx_deletion_request_user_id ON account_deletion_requests(user_id);
CREATE INDEX idx_deletion_request_status ON account_deletion_requests(status);
CREATE INDEX idx_deletion_request_scheduled ON account_deletion_requests(scheduled_deletion_at)
    WHERE status = 'CONFIRMED';

-- Add comments for documentation
COMMENT ON TABLE feedback IS 'Stores user feedback, support tickets, and feature requests.';
COMMENT ON TABLE user_backups IS 'Stores user data backups for GDPR compliance and recovery.';
COMMENT ON TABLE account_deletion_requests IS 'Tracks account deletion requests with confirmation workflow.';

