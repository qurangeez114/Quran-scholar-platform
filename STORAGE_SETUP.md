# Supabase Storage Setup for File Uploads

## Overview
The QuranHikma LMS now supports file uploads for assignment submissions. This document explains how to set up the required Supabase Storage bucket.

## Storage Bucket Setup

### Create the Storage Bucket

**Option 1: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Set the following:
   - **Name**: `assignment-submissions`
   - **Privacy**: Public (allows students to download their uploaded files)
   - Click **Create bucket**

**Option 2: Via SQL (Alternative)**

Run this SQL command in the Supabase SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-submissions', 'assignment-submissions', true);
```

### Set Upload Limits (Optional but Recommended)

In the Supabase Dashboard, navigate to **Storage** → **assignment-submissions** → **Settings**:
- Set **Max file size**: 10 MB (or your preferred limit)
- Leave other settings as default

## How File Uploads Work

### Student Workflow
1. Student opens an assignment lesson
2. They can optionally upload a file (PDF, DOC, DOCX, TXT, JPG, PNG, XLS, XLSX)
3. The file is uploaded to: `assignment-submissions/{courseId}/{userId}/{timestamp}-{filename}`
4. The submission is recorded with the file URL and filename

### Instructor Workflow
1. Instructor views the grading dashboard
2. When viewing an assignment submission, they see:
   - Text content (if provided)
   - File link with download button (if file was uploaded)
3. Instructor can click to view or download the uploaded file
4. Instructor grades the assignment as normal

## Database Changes

The following columns were added to `qh_assignment_submissions`:
- `file_url` (TEXT): Public URL to the uploaded file in Supabase Storage
- `file_name` (TEXT): Original filename for display purposes

## File Upload Configuration

- **Max file size**: 10 MB
- **Accepted formats**: PDF, DOC, DOCX, TXT, JPG, PNG, XLS, XLSX
- **Storage path structure**: `assignments/{courseId}/{userId}/{timestamp}-{filename}`
- **Access level**: Public (students can access their own files, instructors can access all)

## Troubleshooting

### "Storage bucket not found" error
- Ensure the `assignment-submissions` bucket has been created
- Check that the bucket privacy setting is set to Public

### File upload fails silently
- Check browser console for specific error messages
- Verify file size is under 10 MB
- Ensure file format is accepted
- Check that the Supabase project has storage enabled

### Files not displaying in grading dashboard
- Verify the file_url and file_name columns exist in qh_assignment_submissions
- Check that the Supabase Storage bucket is set to Public
- Ensure the file URL is accessible (check in browser address bar)

## Future Enhancements

- [ ] Implement storage quotas per user/course
- [ ] Add file preview for images and PDFs
- [ ] Implement virus scanning for uploaded files
- [ ] Add storage usage analytics
- [ ] Support for additional file formats (video, audio)
- [ ] Automatic file cleanup/archival after course completion

## Security Notes

- Files are stored with user ID in the path for isolation
- RLS policies ensure only the uploader and course instructor can access files
- Consider adding rate limiting to prevent abuse
- Monitor storage usage regularly
