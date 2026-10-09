-- Migration: Add file upload support for assignments
-- Date: 2026-10-09

-- Add file_url column to assignment submissions
ALTER TABLE qh_assignment_submissions
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Create a storage bucket for assignment files (via Supabase Console manually or via API)
-- Insert a bucket entry if using direct SQL
-- Note: Storage buckets are typically created via Supabase dashboard or API

-- Update RLS policies for assignment submissions to include file uploads
-- (existing policies already cover this since we're just adding columns to existing table)

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS qh_assignment_submissions_file_url_idx
  ON qh_assignment_submissions(file_url)
  WHERE file_url IS NOT NULL;
