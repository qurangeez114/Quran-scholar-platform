// netlify/edge-functions/claude-stream.ts
//
// Streaming replacement for the old netlify/functions/claude-proxy.js.
// Runs on Netlify's Edge runtime (Deno), which can stream a response back to
// the browser as it's generated instead of buffering the whole answer
// server-side first. This removes the old function's 26s hard timeout as
// the main failure point for longer scholarly answers.
//
// Response body: plain text, sent in chunks as Claude generates them.
// (No SSE framing on the way out — just raw text — so the frontend can
// read it with a simple ReadableStream reader, no event parsing needed.)

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  const payload: Record<string, unknown> = {
    model: body.model || "claude-sonnet-4-6",
    max_tokens: Math.min(body.max_tokens || 2000, 4000),
    messages: body.messages,
    stream: true,
  };
  if (body.system) payload.system = body.system;

  let anthropicResp: Response;
  try {
    anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: String(e) } }), {
      status: 502,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  if (!anthropicResp.ok || !anthropicResp.body) {
    const errText = await anthropicResp.text();
    return new Response(errText, {
      status: anthropicResp.status,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  // Transform Anthropic's SSE stream into plain text chunks as they arrive.
  const upstreamReader = anthropicResp.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await upstreamReader.read();
      if (done) {
        controller.close();
        return;
      }
      buf += decoder.decode(value, { stream: true });
      const events = buf.split("\n\n");
      buf = events.pop() || "";
      for (const ev of events) {
        const dataLine = ev.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const jsonStr = dataLine.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        try {
          const data = JSON.parse(jsonStr);
          if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
            controller.enqueue(encoder.encode(data.delta.text || ""));
          }
        } catch {
          // ignore malformed SSE lines
        }
      }
    },
    cancel() {
      try { upstreamReader.cancel(); } catch {}
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders(),
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
};

export const config = { path: "/api/claude-stream" };
