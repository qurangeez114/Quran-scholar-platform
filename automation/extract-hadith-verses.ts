import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Hadith Verse Extraction Edge Function
 * Autonomous pipeline: extract verse references from hadith text → validate → populate hadith_verse_links
 * Can be triggered via:
 * - Scheduled GitHub Actions workflow (2-3 day recurrence)
 * - Manual POST /api/extract-hadith-verses
 * - Netlify scheduled function (requires netlify.toml cron config)
 * 
 * Environment: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ||
  "https://ylosytbxpzxzwfzjpaej.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE0NjUyNywiZXhwIjoyMDkxNzIyNTI3fQ.sI8IBGrXDoIFpAQ4louaUubokkWyfZKRzV13KxqPbOc";

interface ExtractedVerse {
  sura: number;
  aya: number;
}

interface InsertLink {
  hadith_id: number;
  verse_sura: number;
  verse_aya: number;
  extraction_method: string;
  created_at: string;
}

interface ExtractStats {
  hadith_processed: number;
  verses_extracted: number;
  links_inserted: number;
  errors: number;
  duration_ms: number;
}

/**
 * Extract verse references from hadith text
 * Pattern: SURA:AYA (e.g., "19:28", "1:1")
 */
function extractVerses(text: string): ExtractedVerse[] {
  if (!text) return [];

  const versePattern = /(\d{1,3}):(\d{1,3})/g;
  const matches = Array.from(text.matchAll(versePattern));

  const verses: ExtractedVerse[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const sura = parseInt(match[1]);
    const aya = parseInt(match[2]);

    if (sura >= 1 && sura <= 114) {
      const key = `${sura}:${aya}`;
      if (!seen.has(key)) {
        verses.push({ sura, aya });
        seen.add(key);
      }
    }
  }

  return verses;
}

/**
 * Validate verse exists in Quran
 */
function isValidVerse(sura: number, aya: number): boolean {
  if (sura < 1 || sura > 114) return false;
  if (aya < 1 || aya > 286) return false; // Max ayat in Quran
  return true;
}

/**
 * Fetch unprocessed hadith from Supabase
 */
async function fetchUnprocessedHadith(
  limit = 500
): Promise<Array<{ id: number; hadith_text: string }>> {
  console.log(`[FETCH] Loading unprocessed hadith (limit: ${limit})...`);

  try {
    // Fetch all hadith with text
    const hadithRes = await fetch(
      `${SUPABASE_URL}/rest/v1/hadith_corpus_canonical?select=id,hadith_text&limit=${limit}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!hadithRes.ok) {
      throw new Error(`Hadith fetch failed: ${hadithRes.status}`);
    }

    const hadith = (await hadithRes.json()) as Array<{
      id: number;
      hadith_text: string | null;
    }>;

    // Filter to those with text
    const hadithWithText = hadith.filter((h) => h.hadith_text);

    // Check which ones already have links
    const linksRes = await fetch(
      `${SUPABASE_URL}/rest/v1/hadith_verse_links?select=hadith_id`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (linksRes.ok) {
      const linkedData = (await linksRes.json()) as Array<{
        hadith_id: number;
      }>;
      const linkedIds = new Set(linkedData.map((link) => link.hadith_id));

      // Filter to unprocessed
      const unprocessed = hadithWithText.filter((h) => !linkedIds.has(h.id));
      console.log(`[FETCH] Found ${unprocessed.length} unprocessed hadith`);
      return unprocessed as Array<{ id: number; hadith_text: string }>;
    } else {
      console.log(`[WARN] Could not check existing links: ${linksRes.status}`);
      return hadithWithText as Array<{ id: number; hadith_text: string }>;
    }
  } catch (err) {
    console.error("[ERROR] Failed to fetch hadith:", err);
    return [];
  }
}

/**
 * Insert verse links into hadith_verse_links
 */
async function insertVerseLinks(links: InsertLink[]): Promise<number> {
  if (!links.length) {
    console.log("[INSERT] No links to insert");
    return 0;
  }

  console.log(`[INSERT] Inserting ${links.length} verse links...`);

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/hadith_verse_links`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(links),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      if (text.includes("duplicate")) {
        console.log(`[INSERT] Some links already exist (duplicates OK): ${links.length} attempted`);
        return links.length;
      }
      throw new Error(`Insert failed: ${res.status} ${text}`);
    }

    console.log(`[INSERT] Successfully inserted ${links.length} links`);
    return links.length;
  } catch (err) {
    console.error("[ERROR] Insert failed:", err);
    return 0;
  }
}

/**
 * Main extraction pipeline
 */
async function runExtraction(): Promise<ExtractStats> {
  const startTime = Date.now();
  const stats: ExtractStats = {
    hadith_processed: 0,
    verses_extracted: 0,
    links_inserted: 0,
    errors: 0,
    duration_ms: 0,
  };

  try {
    console.log("═".repeat(63));
    console.log("HADITH VERSE EXTRACTION — Autonomous Pipeline");
    console.log(`Started: ${new Date().toISOString()}`);
    console.log("═".repeat(63));

    // Step 1: Fetch unprocessed hadith
    const hadithRecords = await fetchUnprocessedHadith(500);
    if (!hadithRecords.length) {
      console.log("[STATUS] No unprocessed hadith found");
      stats.duration_ms = Date.now() - startTime;
      return stats;
    }

    // Step 2: Extract verses
    console.log(
      `\n[EXTRACT] Processing ${hadithRecords.length} hadith records...\n`
    );

    const linksToInsert: InsertLink[] = [];

    for (const hadith of hadithRecords) {
      const verses = extractVerses(hadith.hadith_text);

      for (const verse of verses) {
        if (isValidVerse(verse.sura, verse.aya)) {
          linksToInsert.push({
            hadith_id: hadith.id,
            verse_sura: verse.sura,
            verse_aya: verse.aya,
            extraction_method: "regex_extraction_v2",
            created_at: new Date().toISOString(),
          });
          stats.verses_extracted++;
        }
      }

      stats.hadith_processed++;

      if (stats.hadith_processed % 100 === 0) {
        console.log(
          `  [${stats.hadith_processed}/${hadithRecords.length}] Processed, extracted ${stats.verses_extracted} verses`
        );
      }
    }

    console.log(
      `\n[EXTRACT] Completed: ${stats.hadith_processed} hadith → ${stats.verses_extracted} verses\n`
    );

    // Step 3: Insert links
    if (linksToInsert.length > 0) {
      stats.links_inserted = await insertVerseLinks(linksToInsert);
    }
  } catch (err) {
    console.error("[FATAL]", err);
    stats.errors++;
  }

  stats.duration_ms = Date.now() - startTime;

  // Step 4: Report
  console.log("\n" + "═".repeat(63));
  console.log("EXTRACTION REPORT");
  console.log("═".repeat(63));
  console.log(`Hadith processed:     ${stats.hadith_processed}`);
  console.log(`Verses extracted:     ${stats.verses_extracted}`);
  console.log(`Links inserted:       ${stats.links_inserted}`);
  console.log(`Errors:               ${stats.errors}`);
  console.log(`Duration:             ${(stats.duration_ms / 1000).toFixed(2)}s`);
  console.log(`Completed:            ${new Date().toISOString()}`);
  console.log("═".repeat(63) + "\n");

  return stats;
}

/**
 * Handler: Can be called via scheduled trigger or manual POST
 */
async function handler(req: Request): Promise<Response> {
  try {
    const stats = await runExtraction();
    return new Response(JSON.stringify(stats), {
      status: stats.errors === 0 ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[HANDLER ERROR]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

serve(handler);
