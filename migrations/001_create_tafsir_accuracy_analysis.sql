-- Migration: Create tafsir_accuracy_analysis table
-- Purpose: Store pre-computed translation accuracy evaluations
-- These are stored in the database, never generated on-demand

CREATE TABLE IF NOT EXISTS tafsir_accuracy_analysis (
  id BIGSERIAL PRIMARY KEY,
  sura SMALLINT NOT NULL,
  aya SMALLINT NOT NULL,
  scholar_key VARCHAR(50) NOT NULL,  -- e.g., 'ibn_kathir', 'qurtubi', 'saadi'
  
  -- Accuracy assessment (0-10 scale)
  accuracy_score NUMERIC(3,1),  -- 9.5 = 95%, 8.0 = 80%, etc.
  
  -- Evaluation components
  accurate_portions TEXT,          -- What translates accurately
  omitted_content TEXT,           -- Phrases/concepts in Arabic but missing in English
  mistranslated_sections TEXT,    -- Parts incorrectly translated
  theological_concerns TEXT,      -- Theological/conceptual misalignments
  
  -- Summary verdict
  verdict TEXT,                   -- Overall assessment (1-2 sentences)
  
  -- Comparison data (for displaying side-by-side)
  arabic_excerpt TEXT,            -- Full or representative Arabic passage
  english_excerpt TEXT,           -- Full or representative English translation
  
  -- Quality tracking
  reviewed_by VARCHAR(100),       -- Who performed the evaluation
  review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confidence_level VARCHAR(20),   -- 'high', 'medium', 'low'
  notes TEXT,                     -- Internal notes/methodology
  
  -- Soft delete
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_tafsir_accuracy_verse 
  ON tafsir_accuracy_analysis(sura, aya);

CREATE INDEX IF NOT EXISTS idx_tafsir_accuracy_scholar 
  ON tafsir_accuracy_analysis(sura, aya, scholar_key);

CREATE INDEX IF NOT EXISTS idx_tafsir_accuracy_score 
  ON tafsir_accuracy_analysis(accuracy_score);

-- RLS Policy: Allow anonymous users to read
ALTER TABLE tafsir_accuracy_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON tafsir_accuracy_analysis
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Allow authenticated write access"
  ON tafsir_accuracy_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON tafsir_accuracy_analysis TO anon;
GRANT SELECT, INSERT, UPDATE ON tafsir_accuracy_analysis TO authenticated;
