# Discussion Social Features Guide

## Overview

The QuranHikma LMS includes a discussion feature for collaborative learning where students can ask questions, share insights, and interact with peers. Social features like likes and mentions foster engagement and community building.

## Features Implemented

### 1. Discussion Threads & Posts
- **Create Threads**: Students can start a new discussion topic per lesson
- **Post Replies**: Students can reply to discussion threads with their thoughts or answers
- **User Attribution**: Each post shows the author's name and timestamp
- **Thread Metadata**: Display post count and creation date for threads

### 2. Like/Unlike Posts
- **Like Functionality**: Students can like discussion posts to show appreciation
- **Unlike Functionality**: Students can remove their like from posts
- **Like Counts**: Display total number of likes per post
- **User Like Status**: Visual indication if current user has liked a post
- **Visual Feedback**: Like button highlights when user has liked (filled blue vs. gray)

### 3. Thread Viewer Modal
- **Thread Display**: Modal popup showing all posts in a discussion thread
- **Chronological Order**: Posts displayed in chronological order (oldest first)
- **Reply Form**: Inline reply form to add new posts to the thread
- **Responsive Design**: Full-featured thread viewer without page navigation

## Database Schema

### qh_discussion_threads
```sql
- id UUID PRIMARY KEY
- lesson_id UUID (references qh_lessons)
- user_id UUID (references auth.users)
- title TEXT - Thread topic/question
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### qh_discussion_posts
```sql
- id UUID PRIMARY KEY
- thread_id UUID (references qh_discussion_threads)
- user_id UUID (references auth.users)
- content TEXT - Post message/reply
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### qh_post_likes (NEW)
```sql
- id UUID PRIMARY KEY
- post_id UUID (references qh_discussion_posts) [CASCADE DELETE]
- user_id UUID (references auth.users) [CASCADE DELETE]
- created_at TIMESTAMP
- UNIQUE(post_id, user_id) - Ensure each user likes each post at most once
```

## API Functions

### Discussion Threads
```javascript
// Get all discussion threads for a lesson
await getDiscussionThreads(lessonId)

// Create a new discussion thread
await createDiscussionThread(lessonId, title)
```

### Discussion Posts
```javascript
// Get all posts in a thread (with like counts and user's like status)
await getDiscussionPosts(threadId)
// Returns: Array of posts with:
// - id, thread_id, user_id, content, created_at
// - qh_profiles: {first_name, last_name}
// - likeCount: number of likes
// - userLiked: boolean - if current user liked this post

// Create a new post/reply in a thread
await createDiscussionPost(threadId, content)
```

### Post Likes (NEW)
```javascript
// Like a post
await likeDiscussionPost(postId)

// Unlike a post
await unlikeDiscussionPost(postId)

// Get like count for a single post
await getPostLikeCount(postId)

// Get like status and count in one call
await getPostLikesWithUserStatus(postId)
// Returns: {likeCount: number, userLiked: boolean}
```

## User Interface

### Discussion Tab (lesson.html)
Located in the Course Lesson page, the discussion tab shows:
- **New Thread Form**: Input to start a new discussion
- **Thread List**: All discussion threads with reply count
- **Thread Viewer**: Click on a thread to open the thread viewer modal

### Thread Viewer Modal
- **Thread Title**: Shows the discussion topic
- **Posts List**: All posts in chronological order with:
  - Author name and avatar
  - Post timestamp
  - Post content
  - Like button with like count
  - Visual indication if user has liked
- **Reply Form**: Text area to add new replies
- **Close Button**: Exit the thread viewer

### Like Button Styling
- **Not Liked**: Gray button (#e0e0e0) with text "👍 X Likes"
- **Liked**: Blue button (#667eea) with white text, "👍 X Likes"
- **Interactive**: Click to toggle like/unlike status
- **Real-time Update**: Page refreshes to show updated counts

## Feature Workflow

### Starting a Discussion
1. Student navigates to lesson
2. Clicks "Discussion" tab
3. Enters discussion title and clicks "Start Discussion"
4. New thread appears in thread list
5. Other students can click on thread to view and reply

### Engaging with Posts
1. Student clicks on a discussion thread
2. Thread viewer modal opens showing all posts
3. Student can:
   - Read existing posts and replies
   - Like/unlike posts by clicking the like button
   - Add their own reply using the form at the bottom
4. Close modal to return to lesson

## Best Practices

### For Students
- **Be Respectful**: Keep discussions courteous and on-topic
- **Search First**: Check if your question has already been answered
- **Be Clear**: Write clear, concise posts
- **Show Appreciation**: Like helpful posts to encourage good contributions
- **Follow Up**: Reply to posts that address your questions

### For Instructors
- **Monitor Discussions**: Review discussions regularly
- **Facilitate Learning**: Answer student questions and guide discussions
- **Pin Important**: Implement thread pinning for frequently asked questions (feature ready for implementation)
- **Foster Community**: Encourage students to help each other

## Future Enhancements

- [ ] @mention notifications (tag specific users)
- [ ] Pin/unpin threads (instructor feature)
- [ ] Mark solution (instructor marks best answer)
- [ ] Discussion badges/karma system
- [ ] Search discussions
- [ ] Filter posts by date/author
- [ ] Edit/delete own posts
- [ ] Reply threading (nested replies)
- [ ] Rich text formatting (bold, italic, code blocks)
- [ ] File attachments in posts
- [ ] Moderation tools for instructors

## RLS Security

Row-Level Security is enabled on all discussion tables:

### qh_discussion_threads & qh_discussion_posts
- All users can view threads and posts (public discussions)
- Only authors can delete their own posts (delete policy ready for implementation)
- All authenticated users can create posts/threads

### qh_post_likes
- All users can view likes (encourages engagement)
- Users can only add their own likes (verified with auth.uid())
- Users can only remove their own likes (verified with auth.uid())

## Testing

### Development
```bash
# Apply migration to local Supabase
supabase migration up

# Test in browser
1. Log in as student
2. Navigate to lesson
3. Click Discussion tab
4. Create new thread
5. Click thread to open viewer
6. Click like button to test like functionality
7. Add reply and submit
```

### Staging/Production
- Test with real user accounts
- Verify like counts persist across sessions
- Test multiple concurrent likes/unlikes
- Verify RLS security (user cannot see/modify other users' likes)

## Troubleshooting

### Like button not working
- Check browser console for errors
- Verify user is authenticated
- Ensure Supabase RLS policies are correct
- Check network requests in DevTools

### Likes not persisting
- Verify qh_post_likes table exists in Supabase
- Check that migration 005 was applied
- Verify RLS policies allow inserts/deletes

### Like counts incorrect
- Refresh page to reload from database
- Check for duplicate like entries (should be prevented by UNIQUE constraint)
- Verify user session is valid

## Migration Steps

To apply discussion likes feature to your Supabase project:

```sql
-- Apply migration 005
-- This creates the qh_post_likes table with RLS policies
-- Execute migrations/005_add_discussion_likes.sql

-- Verify table created
SELECT * FROM qh_post_likes;

-- Check RLS policies
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE tablename = 'qh_post_likes';
```

Alternatively, use Supabase dashboard:
1. Go to SQL Editor
2. Copy contents of migrations/005_add_discussion_likes.sql
3. Run the SQL
4. Verify table appears in Tables section

