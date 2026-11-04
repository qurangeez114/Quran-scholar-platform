/**
 * Migration 0004 adds privileged RPCs and tables that do NOT exist on the
 * currently deployed Lovable Cloud database.
 *
 * Default OFF. Enable ONLY on a verified staging clone with migrations 0003
 * and 0004 installed, correct RLS/grants and regenerated Supabase types.
 * This is a build-time gate, not a security boundary.
 */
export const EQUB_LIFECYCLE_V2_STAGING =
  import.meta.env.VITE_EQUB_LIFECYCLE_V2_STAGING === "true";
