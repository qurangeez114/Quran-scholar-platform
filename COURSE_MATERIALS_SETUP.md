# Course Materials Setup Guide

## Overview

Course materials are supplementary files (PDFs, slides, documents, etc.) that instructors can upload for their courses. Students can download these materials to help with their learning.

## Setup Instructions

### Option 1: Supabase Dashboard (Recommended for Beginners)

1. **Create Storage Bucket**
   - Log into your Supabase dashboard
   - Navigate to Storage → Buckets
   - Click "New bucket"
   - Name: `course-materials`
   - Make it public (check "Public bucket")
   - Click "Create bucket"

2. **Configure Policies**
   - Click on the `course-materials` bucket
   - Go to Policies tab
   - Add the following policies:

   **Allow authenticated users to read all files:**
   ```sql
   -- Policy: Allow authenticated users to read
   CREATE POLICY "Allow authenticated users to read" ON storage.objects
     FOR SELECT
     USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated');
   ```

   **Allow instructors to upload files:**
   ```sql
   -- Policy: Allow instructors to upload
   CREATE POLICY "Allow authenticated users to create" ON storage.objects
     FOR INSERT
     WITH CHECK (bucket_id = 'course-materials' AND auth.role() = 'authenticated');
   ```

   **Allow instructors to delete their own files:**
   ```sql
   -- Policy: Allow delete of own files
   CREATE POLICY "Allow delete of own files" ON storage.objects
     FOR DELETE
     USING (bucket_id = 'course-materials' AND auth.uid() = owner);
   ```

### Option 2: SQL (For Advanced Users)

Run this SQL in your Supabase SQL Editor:

```sql
-- Create course-materials bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT DO NOTHING;

-- Add storage policies
CREATE POLICY "Allow authenticated users to read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'course-materials' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to delete own files" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'course-materials' AND auth.uid() = owner);
```

## File Upload API

### Upload Course Material

```javascript
import { uploadCourseMaterial } from './courses-api.js';

// Upload a file
const material = await uploadCourseMaterial(courseId, 'Lecture Slides', fileObject);
// Returns: {id, course_id, title, file_url, created_at}
```

**Parameters:**
- `courseId` (string, UUID): The ID of the course
- `title` (string): Display name for the material (e.g., "Week 1 Slides")
- `file` (File): The file object from an input element

**Returns:**
- Material object with file URL and metadata

**Example:**
```javascript
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];

try {
  const material = await uploadCourseMaterial(courseId, 'Course Overview', file);
  console.log('Uploaded:', material.file_url);
} catch (error) {
  console.error('Upload failed:', error);
}
```

### Get Course Materials

```javascript
import { getCourseMaterials } from './courses-api.js';

const materials = await getCourseMaterials(courseId);
// Returns: Array of material objects
```

**Returns Array of:**
```javascript
{
  id: "uuid",
  course_id: "uuid",
  title: "Lecture Slides",
  file_url: "https://...",
  created_at: "2024-10-09T..."
}
```

### Delete Course Material

```javascript
import { deleteCourseMaterial } from './courses-api.js';

await deleteCourseMaterial(materialId, fileUrl);
```

**Parameters:**
- `materialId` (string, UUID): The material record ID
- `fileUrl` (string): The public file URL (used to delete from storage)

## Supported File Types

The system supports any file type, but common educational materials include:

| Type | Extensions | Use Case |
|------|-----------|----------|
| Documents | .pdf, .doc, .docx, .txt | Lecture notes, guides, readings |
| Spreadsheets | .xls, .xlsx | Data sets, exercise sheets |
| Presentations | .ppt, .pptx | Lecture slides |
| Archives | .zip, .rar | Multiple files bundled |
| Video | .mp4, .mov, .webm | Recorded lectures |
| Images | .jpg, .png, .gif | Diagrams, illustrations |

## File Size Limits

- **Maximum file size**: 50 MB per file (default Supabase limit)
- **Total storage**: Depends on your Supabase plan
- **Bucket quota**: No enforced limit in code, but configure in Supabase settings

## Database Schema

### qh_course_materials Table

```sql
CREATE TABLE qh_course_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES qh_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX qh_course_materials_course_idx ON qh_course_materials(course_id);
```

**Columns:**
- `id`: Unique material ID
- `course_id`: Which course this material belongs to
- `title`: Human-readable name for the material
- `file_url`: Public URL to download the file
- `created_at`: When the material was uploaded

## File Organization in Storage

Files are organized by course in the bucket:

```
course-materials/
├── {courseId}/
│   ├── 1728429045123-lecture-1.pdf
│   ├── 1728429156789-syllabus.docx
│   └── 1728429267890-solutions.xlsx
└── {anotherCourseId}/
    └── ...
```

**Path Format:** `course-materials/{courseId}/{timestamp}-{filename}`

The timestamp prefix ensures unique filenames and helps with sorting/versioning.

## Usage Example: Instructor Upload UI

```html
<!-- File upload form -->
<form id="materialForm">
  <input type="text" id="materialTitle" placeholder="Material Title" required>
  <input type="file" id="materialFile" required>
  <button type="submit">Upload Material</button>
</form>

<script type="module">
  import { uploadCourseMaterial } from './courses-api.js';

  document.getElementById('materialForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('materialTitle').value;
    const file = document.getElementById('materialFile').files[0];
    
    try {
      await uploadCourseMaterial(courseId, title, file);
      alert('Material uploaded successfully!');
      // Reload materials list
      await loadMaterials();
    } catch (error) {
      alert('Upload failed: ' + error.message);
    }
  });
</script>
```

## Security Considerations

### Access Control
- **Read Access**: All authenticated users can download any course material
- **Upload Access**: Any authenticated user can upload (should be restricted to instructors in production)
- **Delete Access**: Only material owner can delete

### Recommendations for Production

1. **Restrict uploads to instructors only:**
   ```javascript
   // In uploadCourseMaterial function
   const user = (await supabase.auth.getUser()).data.user;
   const { data: profile } = await supabase
     .from('qh_profiles')
     .select('role')
     .eq('user_id', user.id)
     .single();
   
   if (profile.role !== 'instructor' && profile.role !== 'admin') {
     throw new Error('Only instructors can upload materials');
   }
   ```

2. **Virus scanning for production:**
   - Consider integrating ClamAV or similar service
   - Scan files before making them available to students

3. **Rate limiting:**
   - Limit uploads per user/hour to prevent abuse
   - Limit file sizes and storage quotas per course

## Troubleshooting

### Files won't upload
- Check bucket exists in Supabase Storage
- Verify storage policies are configured
- Check file size (must be under 50 MB)
- Ensure user is authenticated

### Download links don't work
- Verify bucket is public
- Check file_url is stored correctly in database
- Test URL directly in browser

### File appears but can't download
- Check browser console for CORS errors
- Verify storage policies allow read access
- Test with a simple file type (PDF) first

### Storage quota exceeded
- Check Supabase plan limits
- Delete old materials no longer needed
- Consider archiving old courses

## Best Practices

1. **Clear Naming**: Use descriptive titles
   - ✓ "Week 3 - Lecture Notes (PDF)"
   - ✗ "file1.pdf"

2. **Organize by Topic**: Group related materials together
   - Readings for lesson 1
   - Solutions for assignment 2

3. **Version Control**: Keep old versions if students may reference them
   - Add date to title: "2024-10 Syllabus" vs "2024-09 Syllabus"

4. **Format Diversity**: Provide materials in multiple formats when possible
   - PDF for printing/portability
   - DOCX for editing
   - HTML for web viewing

5. **File Descriptions**: Add context in the title
   - ✓ "Supplementary Reading - Chapter 5 Summary"
   - ✗ "Reading"

## Limits and Quotas

| Item | Default | Configurable |
|------|---------|--------------|
| Max file size | 50 MB | Yes (Supabase settings) |
| Max files per bucket | Unlimited | No |
| Total bucket size | Plan dependent | Yes |
| Download bandwidth | Plan dependent | Yes |
| File retention | Permanent | Yes (delete endpoint) |

## Testing

### In Development

```javascript
// Test upload
const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
const material = await uploadCourseMaterial(courseId, 'Test Material', testFile);
console.log('Upload successful:', material.file_url);

// Test retrieval
const materials = await getCourseMaterials(courseId);
console.log('Materials:', materials);

// Test deletion
await deleteCourseMaterial(material.id, material.file_url);
```

### In Production

1. Test with various file types and sizes
2. Verify download speed and reliability
3. Test concurrent downloads
4. Check storage usage reporting

