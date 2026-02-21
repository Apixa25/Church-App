-- Add phone contact field to feedback tickets so support can call users back
ALTER TABLE feedback
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

