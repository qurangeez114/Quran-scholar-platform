const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';

exports.handler = async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || SB_ANON_KEY;
  const authMode = (key === SB_ANON_KEY) ? 'anon' : 'service_role';
  const headers = { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' };
  const tables = ['propositions','proposition_voice_chain','evidence_units','transmission_routes','evidence_links','sources','tafsir_entries'];
  const out = { ok: true, auth_mode: authMode, tables: {} };

  for (const table of tables) {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${table}?select=id&limit=1`, { headers });
      const body = await r.text();
      out.tables[table] = {
        status: r.status,
        content_range: r.headers.get('content-range'),
        readable: r.ok,
        error: r.ok ? null : body.slice(0, 500)
      };
    } catch (e) {
      out.tables[table] = { status: 'error', readable: false, error: String(e && e.message || e) };
      out.ok = false;
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(out)
  };
};
