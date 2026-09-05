# Translation Accuracy Evaluation System

## Overview

The Quran Hikma platform now has a **database-backed evaluation system** that stores translation accuracy assessments for tafsir entries. All evaluations are pre-computed and stored in the database—**never generated on-demand via Claude API**.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Batch Evaluation Generation (one-time)     │
│  ├─ CLI: generate-tafsir-evaluations.mjs    │
│  ├─ Fetches Arabic/English tafsir pairs     │
│  ├─ Calls Claude API to analyze             │
│  └─ Stores results in DB                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  tafsir_accuracy_analysis table             │
│  (PostgreSQL / Supabase)                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Web Frontend Display                       │
│  ├─ Reads from DB (no API calls)            │
│  ├─ Shows cached evaluation immediately     │
│  ├─ Shows "Not evaluated" if missing        │
│  └─ Displays differences & analysis         │
└─────────────────────────────────────────────┘
```

## Database Schema

### `tafsir_accuracy_analysis` Table

```sql
Column Name           | Type          | Purpose
──────────────────────┼───────────────┼──────────────────────────
id                    | BIGSERIAL     | Primary key
sura                  | SMALLINT      | Surah number (1-114)
aya                   | SMALLINT      | Verse number
scholar_key           | VARCHAR(50)   | Scholar (ibn_kathir, qurtubi, etc.)
accuracy_score        | NUMERIC(3,1)  | 0-10 scale (9.5 = 95%)
accurate_portions     | TEXT          | What translates correctly
omitted_content       | TEXT          | Missing phrases/concepts
mistranslated_sections| TEXT          | Incorrect translations
theological_concerns  | TEXT          | Conceptual misalignments
verdict               | TEXT          | 1-2 sentence summary
arabic_excerpt        | TEXT          | Full Arabic passage
english_excerpt       | TEXT          | Full English translation
reviewed_by           | VARCHAR(100)  | Who did the review
review_date           | TIMESTAMP     | When reviewed
confidence_level      | VARCHAR(20)   | 'high', 'medium', 'low'
is_active             | BOOLEAN       | Soft delete flag
created_at            | TIMESTAMP     | Record creation
updated_at            | TIMESTAMP     | Last update
```

### Indexes
- `idx_tafsir_accuracy_verse` — Fast lookup by sura/aya
- `idx_tafsir_accuracy_scholar` — Fast lookup by scholar
- `idx_tafsir_accuracy_score` — Fast lookup by quality

## Setup

### 1. Create the Database Table

Using Supabase MCP:

```javascript
await Supabase.apply_migration(
  project_id="ylosytbxpzxzwfzjpaej",
  sql=`(content of migrations/001_create_tafsir_accuracy_analysis.sql)`
);
```

Or via Supabase dashboard: Run the SQL in `migrations/001_create_tafsir_accuracy_analysis.sql`

### 2. Install Dependencies

```bash
npm install @anthropic-ai/sdk
```

## Usage

### Generate Evaluations (Batch Mode)

**For a single verse:**
```bash
ANTHROPIC_API_KEY=sk_... \
SUPABASE_SERVICE_KEY=... \
node tools/generate-tafsir-evaluations.mjs \
  --sura=2 --aya=255 --scholar=ibn_kathir
```

**For all verses in a sura:**
```bash
ANTHROPIC_API_KEY=sk_... \
SUPABASE_SERVICE_KEY=... \
node tools/generate-tafsir-evaluations.mjs \
  --sura=2 --scholar=ibn_kathir
```

**For all scholars across entire Quran** (⚠️ expensive):
```bash
ANTHROPIC_API_KEY=sk_... \
SUPABASE_SERVICE_KEY=... \
node tools/generate-tafsir-evaluations.mjs
```

### Admin Panel

Access the evaluation manager at:
```
http://localhost:5173/admin-evaluation-manager.html
```

Features:
- View statistics (total evaluations, coverage, quality)
- Filter evaluations by verse or scholar
- Trigger batch generation with UI
- Manage stored evaluations

### Frontend Display

**User-facing display** (`index.html`):
1. User clicks "🔍 Accuracy" button on a verse
2. `analyzeTafsirAccuracy(sura, aya)` is called
3. Modal opens, checks `tafsir_accuracy_analysis` table
4. **If found:** Displays rich evaluation with score, analysis, verdict
5. **If not found:** Shows "Not Yet Evaluated" (NO API CALL)

**Static badge** (`tafsir-accuracy-static.js`):
- Automatically enhances buttons with saved scores
- Shows "A 95%" if cached, "Not evaluated" if missing
- All reads from database only

## Evaluation Prompt

Claude analyzes translations using this prompt structure:

```
You are an expert Islamic scholar specializing in Arabic-English translation accuracy.

[Displays Arabic original and English translation]

Provide evaluation in JSON format:
{
  "accuracy_score": <1-10>,
  "accurate_portions": "<key phrases that are correct>",
  "omitted_content": "<missing concepts>",
  "mistranslated_sections": "<incorrect parts>",
  "theological_concerns": "<theological misalignments>",
  "verdict": "<1-2 sentence summary>"
}
```

## Quality Standards

### Accuracy Score (0-10 Scale)
- **9-10 (A)** — Excellent, nearly perfect translation
- **8-9 (B)** — Good translation with minor omissions
- **7-8 (C)** — Acceptable with some theological nuance missed
- **6-7 (D)** — Acceptable but significant concepts omitted
- **0-6 (F)** — Poor translation, major theological issues

### Confidence Levels
- **high** — Multiple scholars confirm assessment
- **medium** — Single scholar evaluation
- **low** — Preliminary or disputed assessment

## Data Privacy & Sovereignty

✅ **All evaluation data stored in database**
- No on-demand API calls to Claude
- All results accessible offline
- Full audit trail (reviewed_by, review_date)
- Soft delete via `is_active` flag

❌ **No credit usage for user interactions**
- Viewing evaluations: free
- Displaying results: no API calls
- Only batch generation uses credits

## Troubleshooting

### "Not Yet Evaluated" appears everywhere
**Cause:** No evaluations stored in database yet
**Fix:** Run batch generation for target verses

### Generation hangs or times out
**Cause:** API rate limiting or network issues
**Fix:** Run single verses first to test, then batch by sura

### Verse has tafsir but evaluation missing
**Cause:** That verse/scholar pair not yet evaluated
**Fix:** Either manually add evaluation or run batch generation for that sura

### High API costs?
**Check:** That batch generation is NOT running on every page view
**Verify:** Frontend only reads from DB (check Network tab in browser)

## Future Enhancements

- [ ] Web form to manually add evaluations
- [ ] AI-assisted evaluation with human review step
- [ ] Bulk import evaluations from CSV
- [ ] Comparison metrics between scholars
- [ ] Trending analysis (which parts most commonly mistranslated)
- [ ] Evaluation history/versioning
- [ ] Multi-language evaluation support

## Technical Notes

### Why No On-Demand Generation?

1. **Cost Control** — User clicks should never trigger API calls
2. **Reliability** — Batch process is more robust than per-request calls
3. **Consistency** — All users see the same stored result
4. **Auditability** — Know exactly what/who evaluated each verse
5. **Performance** — DB reads are instant vs. API round-trip

### Revalidation Strategy

If a translation evaluation changes (e.g., better Arabic data found):
1. User/admin updates `tafsir_entries` table with corrected Arabic/English
2. Admin triggers new evaluation batch for affected verses
3. New evaluation stored with updated `review_date`
4. Soft-delete old evaluation (set `is_active = false`) if desired

## See Also

- `index.html` — Frontend display logic (`analyzeTafsirAccuracy`, `renderTafsirAnalysis`)
- `tafsir-accuracy-static.js` — Automatic badge enhancement
- `admin-evaluation-manager.html` — Admin panel
- `tools/generate-tafsir-evaluations.mjs` — Batch generation CLI
