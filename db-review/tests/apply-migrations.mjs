import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
export const baselineFiles = [
  "../../drizzle/migrations/0000_migration.sql",
  "../../drizzle/migrations/0001_migration.sql",
  "../../drizzle/migrations/0002_circle_terms_and_ethics.sql",
];
export const reviewFiles = [
  "../migrations/0003_review_security_and_lifecycle.sql",
  "../migrations/0004_rules_and_lifecycle.sql",
];
export async function applyAll(client, { withReview = false } = {}) {
  await client.query(readFileSync(join(here, "supabase-stub.sql"), "utf8"));
  const files = withReview ? [...baselineFiles, ...reviewFiles] : baselineFiles;
  for (const f of files) await client.query(readFileSync(join(here, f), "utf8"));
}
