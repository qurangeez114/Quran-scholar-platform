export default async (request: Request) => {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const names = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_URL",
  ];
  const present: Record<string, boolean> = {};
  for (const name of names) present[name] = Boolean(Deno.env.get(name));

  return new Response(JSON.stringify({ present }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
