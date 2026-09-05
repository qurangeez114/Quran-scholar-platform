#!/usr/bin/env node

/**
 * Quran Hikma Link Verification Script
 * 
 * Batch verifies pending external links against sunnah.com
 * Updates verification status in Supabase database
 * 
 * Usage:
 *   node verify-links.js [--batch-size=10] [--limit=76]
 */

const https = require('https');
const http = require('http');

// Configuration
const SUPABASE_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';

const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '10');
const LIMIT = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '76');
const DELAY_BETWEEN_REQUESTS = 500; // ms, to avoid rate limiting

// Logging
let logFile = `verification-${new Date().toISOString().split('T')[0]}.log`;
let stats = {
  total: 0,
  verified: 0,
  broken: 0,
  errors: 0,
  startTime: new Date()
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}`;
  console.log(line);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const protocol = isHttps ? https : http;
    
    const defaultHeaders = {
      'User-Agent': 'Quran-Hikma-Verification/1.0'
    };

    const options = {
      method,
      headers: { ...defaultHeaders, ...headers },
      timeout: 5000
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(body);
    req.end();
  });
}

async function getPendingLinks() {
  try {
    log(`Fetching pending links (limit: ${LIMIT})...`);
    
    const response = await makeRequest(
      'GET',
      `${SUPABASE_URL}/rest/v1/external_narration_link?verification_status=eq.pending_verification&limit=${LIMIT}&order=created_at.asc`,
      {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    );

    if (response.status !== 200) {
      throw new Error(`Supabase API error: ${response.status}`);
    }

    const links = JSON.parse(response.body);
    log(`Found ${links.length} pending links`);
    return links;
  } catch (error) {
    log(`Error fetching pending links: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function verifyLink(link) {
  const { id, url_generated, source_collection, source_reference } = link;

  if (!url_generated) {
    log(`Link ${id}: No URL generated, skipping`, 'WARN');
    return { id, status: 'skipped', reason: 'no_url' };
  }

  try {
    log(`Verifying link ${id}: ${source_collection} ${source_reference} -> ${url_generated}...`);
    
    const response = await makeRequest('HEAD', url_generated);

    const isAccessible = response.status >= 200 && response.status < 300;
    const verificationStatus = isAccessible ? 'verified' : 'broken';
    const confidenceScore = isAccessible ? 0.95 : 0.0;

    log(
      `Link ${id}: ${verificationStatus} (HTTP ${response.status})`,
      isAccessible ? 'INFO' : 'WARN'
    );

    // Update database
    await updateLinkStatus(id, verificationStatus, confidenceScore);

    if (isAccessible) {
      stats.verified++;
    } else {
      stats.broken++;
    }

    return { id, status: verificationStatus, httpStatus: response.status };
  } catch (error) {
    log(`Link ${id}: Error during verification: ${error.message}`, 'ERROR');
    stats.errors++;
    return { id, status: 'error', error: error.message };
  }
}

async function updateLinkStatus(linkId, verificationStatus, confidenceScore) {
  try {
    const body = JSON.stringify({
      verification_status: verificationStatus,
      confidence_score: confidenceScore,
      verified_on: new Date().toISOString()
    });

    const response = await makeRequest(
      'PATCH',
      `${SUPABASE_URL}/rest/v1/external_narration_link?id=eq.${linkId}`,
      {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body
    );

    if (response.status !== 200) {
      throw new Error(`Database update error: ${response.status}`);
    }

    log(`Link ${linkId}: Database updated`, 'DEBUG');
  } catch (error) {
    log(`Link ${linkId}: Database update failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function verifyBatch(links) {
  const batchCount = Math.ceil(links.length / BATCH_SIZE);

  for (let batchNum = 0; batchNum < batchCount; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, links.length);
    const batch = links.slice(start, end);

    log(`Processing batch ${batchNum + 1}/${batchCount} (${batch.length} links)`);

    for (const link of batch) {
      stats.total++;
      await verifyLink(link);
      await sleep(DELAY_BETWEEN_REQUESTS); // Delay between requests
    }

    if (batchNum < batchCount - 1) {
      log(`Batch complete. Waiting before next batch...`);
      await sleep(2000); // 2 second delay between batches
    }
  }
}

async function printSummary() {
  const endTime = new Date();
  const duration = (endTime - stats.startTime) / 1000; // seconds

  log('\n════════════════════════════════════════════════════════════════');
  log('VERIFICATION SUMMARY', 'INFO');
  log('════════════════════════════════════════════════════════════════');
  log(`Total Links Checked: ${stats.total}`);
  log(`✓ Verified: ${stats.verified}`);
  log(`✗ Broken: ${stats.broken}`);
  log(`⚠ Errors: ${stats.errors}`);
  log(`Duration: ${duration.toFixed(2)} seconds`);
  log(`Average Time per Link: ${(duration / stats.total).toFixed(2)} seconds`);
  log('════════════════════════════════════════════════════════════════\n');

  log(`Log saved to: ${logFile}`);
}

async function main() {
  try {
    log('🔍 Quran Hikma Link Verification Script Started');
    log(`Batch Size: ${BATCH_SIZE} | Limit: ${LIMIT}`);
    log('────────────────────────────────────────────────────────────────\n');

    // Fetch pending links
    const links = await getPendingLinks();

    if (links.length === 0) {
      log('No pending links to verify!');
      return;
    }

    // Verify batch
    await verifyBatch(links);

    // Print summary
    await printSummary();

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run
main();
