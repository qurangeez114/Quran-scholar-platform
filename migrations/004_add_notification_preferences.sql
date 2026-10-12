-- Migration: Add notification preferences table
-- Date: 2026-10-09

-- Notification preferences table - user email notification settings
CREATE TABLE IF NOT EXISTS qh_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  receive_enrollment_emails BOOLEAN DEFAULT TRUE,
  receive_progress_emails BOOLEAN DEFAULT TRUE,
  receive_completion_emails BOOLEAN DEFAULT TRUE,
  receive_grading_emails BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE qh_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own preferences
CREATE POLICY qh_notification_preferences_select ON qh_notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY qh_notification_preferences_insert ON qh_notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY qh_notification_preferences_update ON qh_notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS qh_notification_preferences_user_idx
  ON qh_notification_preferences(user_id);
