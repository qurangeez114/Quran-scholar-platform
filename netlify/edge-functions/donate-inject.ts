// Inject shared site-wide scripts into every HTML page: the donation
// button, and the mobile bottom-floating-UI positioning contract.
// Each is checked and injected independently, so a page that already
// hardcodes one of these tags doesn't cause the other to be skipped.
// Non-HTML responses pass through unchanged.
export default async (_request: Request, context: any) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();
  let changed = false;

  if (!html.includes('src="/donate-global.js"') && !html.includes("src='/donate-global.js'")) {
    html = html.includes("</body>")
      ? html.replace("</body>", '<script src="/donate-global.js" defer></script>\n</body>')
      : html + '<script src="/donate-global.js" defer></script>';
    changed = true;
  }

  if (!html.includes('src="/mobile-floating-layout.js"') && !html.includes("src='/mobile-floating-layout.js'")) {
    html = html.includes("</body>")
      ? html.replace("</body>", '<script src="/mobile-floating-layout.js" defer></script>\n</body>')
      : html + '<script src="/mobile-floating-layout.js" defer></script>';
    changed = true;
  }

  if (!changed) return new Response(html, response);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
