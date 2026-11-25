// Shared server helpers: validation, spam checks, email + optional webhook.
// No dependencies; runs on Vercel's Node.js runtime (Node 18+ has fetch).

const MAX_BODY = 10_000; // bytes
const hits = new Map(); // best-effort per-instance rate limit

function clean(v, max) {
  return String(v == null ? "" : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (Array.isArray(xf) ? xf[0] : (xf || "")).split(",")[0].trim() || "unknown";
}

function rateLimited(req, limit = 5, windowMs = 10 * 60 * 1000) {
  const ip = clientIp(req);
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > limit;
}

/** Common request guard. Returns parsed body, or null after responding. */
function guard(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return null;
  }
  // Same-origin only: reject cross-site posts when Origin is present.
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  let originHost = null;
  try { originHost = origin ? new URL(origin).host : null; } catch { originHost = "invalid"; }
  if (origin && host && originHost !== host) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }
  const ct = String(req.headers["content-type"] || "");
  if (!ct.includes("application/json")) {
    res.status(415).json({ error: "unsupported_media_type" });
    return null;
  }
  let body = req.body;
  if (typeof body === "string") {
    if (body.length > MAX_BODY) { res.status(413).json({ error: "too_large" }); return null; }
    try { body = JSON.parse(body); } catch { res.status(400).json({ error: "bad_json" }); return null; }
  }
  if (!body || typeof body !== "object") { res.status(400).json({ error: "bad_request" }); return null; }
  if (JSON.stringify(body).length > MAX_BODY) { res.status(413).json({ error: "too_large" }); return null; }
  if (rateLimited(req)) { res.status(429).json({ error: "too_many_requests" }); return null; }
  return body;
}

/** Honeypot filled or submitted faster than a human could → treat as bot. */
function looksLikeBot(body) {
  if (clean(body.company, 200)) return true;
  const ms = Number(body.elapsedMs);
  return Number.isFinite(ms) && ms < 2500;
}

function easternTimestamp(d = new Date()) {
  return d.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) + " ET";
}

async function sendEmail({ subject, html, text, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_TO_EMAIL;
  const from = process.env.FROM_EMAIL;
  if (!key || !to || !from) throw new Error("email_not_configured");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!r.ok) throw new Error(`email_failed_${r.status}`);
}

/** Optional: also POST the record to a webhook (Google Sheets Apps Script, Zapier, CRM). */
async function sendWebhook(record) {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return;
  const headers = { "Content-Type": "application/json" };
  if (process.env.LEAD_WEBHOOK_SECRET) headers["X-Webhook-Secret"] = process.env.LEAD_WEBHOOK_SECRET;
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(record) });
  if (!r.ok) throw new Error(`webhook_failed_${r.status}`);
}

function emailTable(rows) {
  const tr = rows
    .map(([k, v]) => `<tr><td style="padding:8px 12px;color:#666D66;font:14px Arial,sans-serif;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:8px 12px;color:#242824;font:600 14px Arial,sans-serif">${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");
  return `<table style="border-collapse:collapse;background:#F8F7F3;border-radius:8px">${tr}</table>`;
}

module.exports = { clean, escapeHtml, guard, looksLikeBot, easternTimestamp, sendEmail, sendWebhook, emailTable };
