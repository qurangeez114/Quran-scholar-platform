// Inject the shared Quranhikma donation script into every HTML page.
// Non-HTML responses pass through unchanged.
export default async (_request: Request, context: any) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  if (html.includes('src="/donate-global.js"') || html.includes("src='/donate-global.js'")) {
    return new Response(html, response);
  }

  const tag = '<script src="/donate-global.js" defer></script>';
  const output = html.includes("</body>")
    ? html.replace("</body>", `${tag}\n</body>`)
    : html + tag;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(output, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
