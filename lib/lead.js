// Business logic for POST /api/lead, shared by the Vercel and Netlify adapters.
const { clean, easternTimestamp, emailConfigured, sendEmail, sendWebhook, emailTable } = require("./shared");

const SERVICE_LABELS = {
  snow_removal: "Residential Snow Removal ($60 per service)",
};

function validate(b) {
  const d = {
    name: clean(b.name, 100),
    address: clean(b.address, 200),
    email: clean(b.email, 200).toLowerCase(),
    phone: clean(b.phone, 20),
    services: Array.isArray(b.services) && b.services.length ? [...new Set(b.services.map((s) => clean(s, 30)))] : ["snow_removal"],
  };
  const errors = {};
  if (d.name.length < 2) errors.name = "Please enter your full name.";
  if (d.address.length < 5) errors.address = "Please enter your property address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.email = "Please enter a valid email address.";
  const digits = d.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) errors.phone = "Please enter a 10-digit phone number.";
  else d.phone = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  d.services = d.services.filter((s) => SERVICE_LABELS[s]);
  if (!d.services.length) errors.services = "Invalid service.";
  return { d, errors };
}

/** Validates, emails, and webhooks a lead submission. Returns { status, json }. */
async function processLead(body) {
  const { d, errors } = validate(body);
  if (Object.keys(errors).length) return { status: 422, json: { error: "validation", errors } };

  const now = new Date();
  const record = {
    type: "service_inquiry",
    submittedAt: now.toISOString(),
    submittedAtLocal: easternTimestamp(now),
    leadSource: "HOA Door Hanger",
    name: d.name,
    address: d.address,
    email: d.email,
    phone: d.phone,
    services: d.services.map((s) => SERVICE_LABELS[s]),
  };

  const rows = [
    ["Name", record.name],
    ["Property address", record.address],
    ["Phone", record.phone],
    ["Email", record.email],
    ["Services", record.services.join("\n")],
    ["Submitted", record.submittedAtLocal],
    ["Lead source", record.leadSource],
  ];

  const tasks = [sendWebhook(record)];
  if (emailConfigured()) {
    tasks.push(sendEmail({
      subject: `New snow removal lead: ${record.name} — ${record.address}`,
      replyTo: record.email,
      text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      html: `<div style="font-family:Arial,sans-serif"><h2 style="color:#183D2D;margin:0 0 12px">New residential service request</h2>${emailTable(rows)}<p style="color:#666D66;font-size:13px;margin-top:16px">Reply to this email to reach the homeowner directly.</p></div>`,
    }));
  } else {
    console.warn("lead_email_not_configured — set RESEND_API_KEY, LEAD_TO_EMAIL, FROM_EMAIL to get notified. Lead:", JSON.stringify(record));
  }

  try {
    await Promise.all(tasks);
    return { status: 200, json: { ok: true } };
  } catch (err) {
    console.error("lead_submit_error", err && err.message);
    return { status: 502, json: { error: "delivery_failed" } };
  }
}

module.exports = { processLead };
