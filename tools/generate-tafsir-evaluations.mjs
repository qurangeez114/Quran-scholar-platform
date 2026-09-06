#!/usr/bin/env node

/**
 * Tafsir Translation Accuracy Evaluation Generator
 * 
 * Generates translation accuracy evaluations for Ibn Kathir tafsir
 * Uses Claude API to analyze Arabic ↔ English translations
 * STORES all results in tafsir_accuracy_analysis table (DB)
 * 
 * Usage:
 *   node generate-tafsir-evaluations.mjs [--sura=2] [--aya=255] [--scholar=ibn_kathir]
 *   
 * Environment variables:
 *   ANTHROPIC_API_KEY    - Your Claude API key
 *   SUPABASE_URL         - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Service role key (for DB writes)
 */

import Anthropic from "@anthropic-ai/sdk";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ylosytbxpzxzwfzjpaej.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY not set");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY not set");
  process.exit(1);
}

const client = new Anthropic();

// Parse command-line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split("=");
  acc[key.replace("--", "")] = value || true;
  return acc;
}, {});

const FILTER_SURA = args.sura ? parseInt(args.sura) : null;
const FILTER_AYA = args.aya ? parseInt(args.aya) : null;
const FILTER_SCHOLAR = args.scholar || "ibn_kathir";

let stats = {
  fetched: 0,
  evaluated: 0,
  stored: 0,
  errors: 0,
  skipped: 0
};

async function log(msg, level = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${msg}`);
}

/**
 * Fetch Arabic and English tafsir entries for a verse
 */
async function fetchTafsirPair(sura, aya, scholar) {
  const hdrs = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tafsir_entries?` +
    `select=language,content,scholar_key&` +
    `sura=eq.${sura}&aya=eq.${aya}&scholar_key=eq.${scholar}`,
    { headers: hdrs }
  );

  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const rows = await res.json();
  
  const ar = rows.find(r => r.language === "ar");
  const en = rows.find(r => r.language === "en");
  
  return { ar, en };
}

/**
 * Check if evaluation already exists for this verse
 */
async function evaluationExists(sura, aya, scholar) {
  const hdrs = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`
  };

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tafsir_accuracy_analysis?` +
    `select=id&sura=eq.${sura}&aya=eq.${aya}&scholar_key=eq.${scholar}&limit=1`,
    { headers: hdrs }
  );

  if (!res.ok) return false;
  const rows = await res.json();
  return rows.length > 0;
}

/**
 * Generate evaluation using Claude API
 */
async function generateEvaluation(sura, aya, arText, enText) {
  // Truncate to reasonable length for processing
  const arClean = arText.substring(0, 2000).trim();
  const enClean = enText.substring(0, 2000).trim();

  const prompt = `You are an expert Islamic scholar specializing in Arabic-English translation accuracy.

Analyze this Ibn Kathir tafsir translation for verse ${sura}:${aya}.

ARABIC ORIGINAL:
${arClean}

ENGLISH TRANSLATION:
${enClean}

Provide a detailed evaluation in this exact JSON format (no markdown, no preamble):
{
  "accuracy_score": <number 1-10, where 10 is perfect translation>,
  "accurate_portions": "<key phrases/concepts that are translated accurately>",
  "omitted_content": "<phrases or concepts present in Arabic but missing/understated in English>",
  "mistranslated_sections": "<phrases that are incorrectly or misleadingly translated>",
  "theological_concerns": "<any theological or conceptual shifts in meaning>",
  "verdict": "<1-2 sentence overall assessment of translation fidelity>"
}`;

  let fullText = "";
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }]
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      fullText += chunk.delta.text;
    }
  }

  // Parse JSON from response
  const cleaned = fullText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const result = JSON.parse(cleaned);

  return result;
}

/**
 * Store evaluation in database
 */
async function storeEvaluation(sura, aya, scholar, evaluation, arExcerpt, enExcerpt) {
  const hdrs = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };

  const row = {
    sura,
    aya,
    scholar_key: scholar,
    accuracy_score: evaluation.accuracy_score,
    accurate_portions: evaluation.accurate_portions,
    omitted_content: evaluation.omitted_content,
    mistranslated_sections: evaluation.mistranslated_sections,
    theological_concerns: evaluation.theological_concerns,
    verdict: evaluation.verdict,
    arabic_excerpt: arExcerpt,
    english_excerpt: enExcerpt,
    reviewed_by: "claude-api",
    confidence_level: "high"
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/tafsir_accuracy_analysis`, {
    method: "POST",
    headers: { ...hdrs, Prefer: "return=minimal" },
    body: JSON.stringify(row)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Store failed: ${res.status} ${err}`);
  }

  return true;
}

/**
 * Main batch processing loop
 */
async function processVerse(sura, aya) {
  try {
    // Check if already evaluated
    const exists = await evaluationExists(sura, aya, FILTER_SCHOLAR);
    if (exists) {
      log(`Skipping ${sura}:${aya} (already evaluated)`, "SKIP");
      stats.skipped++;
      return;
    }

    // Fetch Arabic and English tafsir
    const pair = await fetchTafsirPair(sura, aya, FILTER_SCHOLAR);
    if (!pair.ar || !pair.en) {
      log(`Skipping ${sura}:${aya} (missing Arabic or English)`, "SKIP");
      stats.skipped++;
      return;
    }

    log(`Evaluating ${sura}:${aya}...`, "INFO");

    // Generate evaluation via Claude
    const evaluation = await generateEvaluation(sura, aya, pair.ar.content, pair.en.content);

    // Store in database
    await storeEvaluation(sura, aya, FILTER_SCHOLAR, evaluation, pair.ar.content, pair.en.content);

    log(`✅ Stored evaluation for ${sura}:${aya}`, "SUCCESS");
    stats.evaluated++;
    stats.stored++;
  } catch (err) {
    log(`❌ Error processing ${sura}:${aya}: ${err.message}`, "ERROR");
    stats.errors++;
  }
}

/**
 * Main entry point
 */
async function main() {
  log(`Starting tafsir evaluation generation...`, "INFO");
  log(`Scholar: ${FILTER_SCHOLAR}`, "INFO");
  if (FILTER_SURA) log(`Filtering to Sura ${FILTER_SURA}${FILTER_AYA ? `:${FILTER_AYA}` : " (all verses)"}`, "INFO");

  try {
    // If specific verse given, process just that one
    if (FILTER_SURA && FILTER_AYA) {
      await processVerse(FILTER_SURA, FILTER_AYA);
    } 
    // If just sura given, process all verses in it
    else if (FILTER_SURA) {
      for (let aya = 1; aya <= 286; aya++) {  // Max 286 verses per Quran
        await processVerse(FILTER_SURA, aya);
        await new Promise(r => setTimeout(r, 1000));  // Rate limit
      }
    }
    // Otherwise process all verses (batch mode - may take a long time)
    else {
      for (let sura = 1; sura <= 114; sura++) {
        for (let aya = 1; aya <= 286; aya++) {
          await processVerse(sura, aya);
          await new Promise(r => setTimeout(r, 500));  // Rate limit
        }
      }
    }
  } catch (err) {
    log(`Fatal error: ${err.message}`, "ERROR");
    process.exit(1);
  }

  // Print summary
  log(`\n📊 Summary:`, "INFO");
  log(`  Evaluated:  ${stats.evaluated}`, "INFO");
  log(`  Stored:     ${stats.stored}`, "INFO");
  log(`  Skipped:    ${stats.skipped}`, "INFO");
  log(`  Errors:     ${stats.errors}`, "INFO");
}

main();
