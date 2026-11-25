// Business logic for POST /api/feedback, shared by the Vercel and Netlify adapters.
const { clean, easternTimestamp, sendEmail, sendWebhook, emailTable } = require("./shared");

/** Validates, emails, and webhooks a private feedback submission. Returns { status, json }. */
async function processFeedback(body) {
  const rating = Number(body.rating);
  const message = clean(body.message, 2000);
  const name = clean(body.name, 100);
  const contact = clean(body.contact, 200);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { status: 422, json: { error: "invalid_rating" } };
  if (!message) return { status: 422, json: { error: "message_required" } };

  const now = new Date();
  const record = {
    type: "private_feedback",
    submittedAt: now.toISOString(),
    submittedAtLocal: easternTimestamp(now),
    leadSource: "HOA Door Hanger",
    rating,
    message,
    name: name || null,
    contact: contact || null,
  };
  const rows = [
    ["Rating", `${rating} / 5`],
    ["Feedback", message],
    ["Name", name || "—"],
    ["Email or phone", contact || "—"],
    ["Submitted", record.submittedAtLocal],
    ["Source", record.leadSource],
  ];
  const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact) ? contact : undefined;

  try {
    await Promise.all([
      sendEmail({
        subject: `${rating <= 3 ? "⚠ " : ""}Private feedback: ${rating}/5${name ? ` from ${name}` : ""}`,
        replyTo,
        text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
        html: `<div style="font-family:Arial,sans-serif"><h2 style="color:#183D2D;margin:0 0 12px">Private feedback from the HOA page</h2>${emailTable(rows)}</div>`,
      }),
      sendWebhook(record),
    ]);
    return { status: 200, json: { ok: true } };
  } catch (err) {
    console.error("feedback_submit_error", err && err.message);
    return { status: 502, json: { error: "delivery_failed" } };
  }
}

module.exports = { processFeedback };
