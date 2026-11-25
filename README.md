# Alejandro’s Landscaping — HOA Residential Services Page

One-page site for the HOA door-hanger QR code. Static HTML + two tiny serverless
functions. No build step, no npm dependencies.

```
public/
  index.html      the page (HTML, CSS and ~6 KB of JS inline)
  config.js       PUBLIC settings: Google review link, price text, photo, analytics
  img/            logo files + icons (add your hero photo here)
api/
  lead.js         POST /api/lead      → service inquiry
  feedback.js     POST /api/feedback  → private feedback
lib/shared.js     validation, spam checks, email + webhook delivery
vercel.json       security headers + caching
.env.example      the server secrets you need to set
```

## Before it goes live — fill these in

| What | Where | Notes |
|---|---|---|
| Google review link | `public/config.js` → `googleReviewUrl` | Google Business Profile → “Ask for reviews” → copy link. The review button stays hidden until this is set. |
| Lead recipient email | Vercel env `LEAD_TO_EMAIL` | Where requests and feedback go. |
| Email sending | Vercel env `RESEND_API_KEY`, `FROM_EMAIL` | Free Resend account; verify the sending domain. |
| Hero photo | `public/img/` + `config.js` → `heroPhoto` | e.g. `"/img/hoa-home.jpg"`, ~1600px wide JPG/WebP under 250 KB. |
| Price wording | `config.js` → `snowPrice`, `snowQualifier` | Defaults: `$60` / “Per home, per service”. Also update the meta description in `index.html` if the price changes. |
| Analytics (optional) | `config.js` → `gaMeasurementId` | Events always go to `window.dataLayer` (GTM-ready). |

## Deploy (Vercel, ~10 minutes)

1. Push this folder to a GitHub repo (or run `npx vercel` from it).
2. Import the repo in Vercel. Framework preset: **Other**. No build command.
3. Add the env vars from `.env.example` (Production + Preview).
4. Deploy, then add your domain (e.g. `hoa.yourdomain.com`).
5. Point the door-hanger QR code at that URL. Tip: add `?src=doorhanger` if you
   want to tell QR traffic apart in analytics.
6. Submit a test request and a test 2-star rating; confirm both emails arrive.

## What each submission captures

**Service inquiry** — full name, property address, email, phone, selected
service (snow removal), date/time (UTC + Eastern), lead source `HOA Door Hanger`. Emailed
with Reply-To set to the homeowner, and optionally posted to `LEAD_WEBHOOK_URL`.

**Private feedback** — star rating, message, optional name and contact.

Nothing is stored on the website itself. Email (plus the optional webhook, e.g.
a private Google Sheet) is the record, so no database holds homeowners’ details.

## Protection built in

- Client + server validation (server is the source of truth).
- Hidden honeypot field and a minimum-time check; bots get a silent “success”.
- Per-IP rate limit (5 posts / 10 min per server instance), JSON-only, same-origin
  only, 10 KB body cap, control-character stripping, HTML-escaped emails.
- API keys exist only in server env vars; nothing secret ships to the browser.
- Double-submit prevention (button locks while sending).

For heavier spam later, add Cloudflare Turnstile to both forms and verify its
token in `lib/shared.js#guard`.

## Google review compliance

The “Leave a Google Review” button is the same for every visitor and does not
depend on the star rating. Private feedback is offered at every rating. Nobody is
auto-redirected to Google. This avoids “review gating,” which Google’s policies
prohibit.

## Analytics events

`page_view_landing`, `service_form_submit`, `star_rating_select`, `private_feedback_submit`,
`google_review_click` — pushed to `window.dataLayer`, and sent to GA4 when
`gaMeasurementId` is set.
