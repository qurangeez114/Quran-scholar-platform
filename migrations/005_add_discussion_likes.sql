-- Migration: Add discussion post likes functionality
-- Date: 2026-10-09

-- Post likes table - track which users liked which posts
CREATE TABLE IF NOT EXISTS qh_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES qh_discussion_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Ensure each user can only like a post once
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE qh_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can see all likes
CREATE POLICY qh_post_likes_select ON qh_post_likes
  FOR SELECT USING (true);

-- RLS policy: Users can only like posts
CREATE POLICY qh_post_likes_insert ON qh_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policy: Users can only unlike their own likes
CREATE POLICY qh_post_likes_delete ON qh_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS qh_post_likes_post_idx ON qh_post_likes(post_id);
CREATE INDEX IF NOT EXISTS qh_post_likes_user_idx ON qh_post_likes(user_id);
CREATE INDEX IF NOT EXISTS qh_post_likes_post_user_idx ON qh_post_likes(post_id, user_id);
