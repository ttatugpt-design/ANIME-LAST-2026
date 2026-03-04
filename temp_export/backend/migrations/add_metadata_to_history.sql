-- Manual Migration Script for History Table
-- Run this if auto-migration doesn't work

-- Check if metadata column exists
PRAGMA table_info(histories);

-- If metadata column doesn't exist, add it
-- ALTER TABLE histories ADD COLUMN metadata TEXT;

-- Verify it was added
-- PRAGMA table_info(histories);
