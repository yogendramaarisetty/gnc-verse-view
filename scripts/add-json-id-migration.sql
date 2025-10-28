-- Migration to add json_id field to songs table
-- Run this if you already have a songs table without the json_id field

-- Add json_id column to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS json_id INTEGER;

-- Create index for better performance when looking up by json_id
CREATE INDEX IF NOT EXISTS idx_songs_json_id ON songs(json_id);

-- Add comment to document the field
COMMENT ON COLUMN songs.json_id IS 'Original JSON ID for tracking and reconciliation';

