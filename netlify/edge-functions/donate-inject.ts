// Inject shared Quranhikma client scripts into every HTML page.
// Non-HTML responses pass through unchanged.
export default async (_request: Request, context: any) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const tags: string[] = [];

  if (!html.includes('src="/donate-global.js"') && !html.includes("src='/donate-global.js'")) {
    tags.push('<script src="/donate-global.js" defer></script>');
  }
  if (!html.includes('src="/tiktok-integration.js"') && !html.includes("src='/tiktok-integration.js'")) {
    tags.push('<script src="/tiktok-integration.js" defer></script>');
  }

  if (!tags.length) return new Response(html, response);

  const injection = tags.join("\n");
  const output = html.includes("</body>")
    ? html.replace("</body>", `${injection}\n</body>`)
    : html + injection;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(output, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
