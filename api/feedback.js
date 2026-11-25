// POST /api/feedback — private customer feedback from the star-rating card. (Vercel adapter)
const { guardRequest, looksLikeBot } = require("../lib/shared");
const { processFeedback } = require("../lib/feedback");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const g = guardRequest({ method: req.method, headers: req.headers, rawBody: req.body });
  if (!g.ok) {
    if (g.responseHeaders) for (const [k, v] of Object.entries(g.responseHeaders)) res.setHeader(k, v);
    return res.status(g.status).json({ error: g.error });
  }

  if (looksLikeBot(g.body)) return res.status(200).json({ ok: true });

  const result = await processFeedback(g.body);
  return res.status(result.status).json(result.json);
};
