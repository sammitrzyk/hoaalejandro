// POST /api/lead — residential service inquiry from the HOA door-hanger page. (Netlify adapter)
const { guardRequest, looksLikeBot } = require("../../lib/shared");
const { processLead } = require("../../lib/lead");

const BASE_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Type": "application/json" };

exports.handler = async (event) => {
  const headers = {};
  for (const k in event.headers) headers[k.toLowerCase()] = event.headers[k];

  const g = guardRequest({ method: event.httpMethod, headers, rawBody: event.body });
  if (!g.ok) {
    return { statusCode: g.status, headers: { ...BASE_HEADERS, ...(g.responseHeaders || {}) }, body: JSON.stringify({ error: g.error }) };
  }

  if (looksLikeBot(g.body)) return { statusCode: 200, headers: BASE_HEADERS, body: JSON.stringify({ ok: true }) };

  const result = await processLead(g.body);
  return { statusCode: result.status, headers: BASE_HEADERS, body: JSON.stringify(result.json) };
};
