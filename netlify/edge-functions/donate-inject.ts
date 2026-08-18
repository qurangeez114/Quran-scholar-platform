// Inject shared site-wide scripts into every HTML page: donation,
// mobile floating-UI positioning, and persistent Tafsir fidelity badges.
// Each is checked and injected independently, so a page that already
// hardcodes one tag doesn't cause the others to be skipped.
// Non-HTML responses pass through unchanged.
export default async (_request: Request, context: any) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();
  let changed = false;

  const injectScript = (src: string) => {
    if (html.includes(`src="${src}"`) || html.includes(`src='${src}'`)) return;
    const tag = `<script src="${src}" defer></script>`;
    html = html.includes("</body>")
      ? html.replace("</body>", `${tag}\n</body>`)
      : html + tag;
    changed = true;
  };

  injectScript('/donate-global.js');
  injectScript('/mobile-floating-layout.js');
  injectScript('/tafsir-accuracy-static.js');

  if (!changed) return new Response(html, response);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
