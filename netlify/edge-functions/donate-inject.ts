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

  // Netlify's approximate edge geography enables location reporting without
  // shipping visitors' IP addresses to an external geolocation service.
  // Encode as JSON and escape '<' to prevent script-injection from metadata.
  const visitorGeo = {
    country: context.geo?.country?.name || null,
    region: context.geo?.subdivision?.name || null,
    city: context.geo?.city || null
  };
  const geoJson = JSON.stringify(visitorGeo).replace(/</g, '\\u003c');
  const geoTag = `<script>window.QHikmaVisitorGeo=${geoJson};</script>`;
  html = html.includes('</body>')
    ? html.replace('</body>', `${geoTag}\n</body>`)
    : html + geoTag;

  injectScript('/donate-global.js');
  injectScript('/mobile-floating-layout.js');
  injectScript('/tafsir-accuracy-static.js');
  injectScript('/account-gate.js');
  injectScript('/behavior-collector.js');
  injectScript('/save-selection.js');

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
