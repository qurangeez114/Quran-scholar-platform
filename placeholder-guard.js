/* placeholder-guard.js — hide unfilled "$NN" template tokens coming from the database.
 * A few rows hold a bare placeholder instead of text (e.g. ayas.tigrinya2 and
 * verse_translations ti2 for 2:196 = "$25" and 2:282 = "$28", Tigrinya tafsir not yet supplied).
 * For Supabase REST responses only, any string value that is EXACTLY "$" + 1-3 digits
 * (optionally surrounded by whitespace) becomes "" so pages treat it as missing text.
 * Real amounts inside prose ("$500 USD", "$3 trillion") are untouched. */
(function () {
  if (window.__qhPlaceholderGuard) return; window.__qhPlaceholderGuard = true;
  var RE = /^\s*\$\d{1,3}\s*$/;
  function clean(x) {
    if (typeof x === 'string') return RE.test(x) ? '' : x;
    if (Array.isArray(x)) { for (var i = 0; i < x.length; i++) x[i] = clean(x[i]); return x; }
    if (x && typeof x === 'object') { for (var k in x) if (Object.prototype.hasOwnProperty.call(x, k)) x[k] = clean(x[k]); }
    return x;
  }
  var origJson = Response.prototype.json;
  Response.prototype.json = function () {
    var url = this.url || '';
    var p = origJson.apply(this, arguments);
    return /\.supabase\.co\/rest\/v1\//.test(url) ? p.then(clean) : p;
  };
  window.qhStripPlaceholder = function (s) { return (typeof s === 'string' && RE.test(s)) ? '' : s; };
})();
