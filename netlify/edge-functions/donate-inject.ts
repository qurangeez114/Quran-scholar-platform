// Inject shared site-wide scripts into every HTML page.
// Non-HTML responses pass through unchanged.
export default async (_request: Request, context: any) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();

  const injectScript = (src: string) => {
    if (html.includes(`src="${src}"`) || html.includes(`src='${src}'`)) return;
    const tag = `<script src="${src}" defer></script>`;
    html = html.includes("</body>")
      ? html.replace("</body>", `${tag}\n</body>`)
      : html + tag;
  };

  injectScript('/donate-global.js');
  injectScript('/mobile-floating-layout.js');
  injectScript('/tafsir-accuracy-static.js');
  injectScript('/account-gate.js');
  injectScript('/behavior-collector.js');

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
