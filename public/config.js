/*
 * Alejandro's Landscaping — public site settings.
 * Everything here is safe to be public. Secrets (email API key, recipient
 * address) live ONLY in server environment variables — see README.md.
 */
window.SITE_CONFIG = {
  // Paste the Google "Ask for reviews" link from your Google Business Profile.
  // e.g. "https://g.page/r/XXXXXXXXXXXX/review". Leave "" until you have it.
  googleReviewUrl: "",

  // Snow removal price and the line under it (edit if billing differs).
  snowPrice: "$60",
  snowQualifier: "Per home, per service",

  // Hero photo (put the file in /public/img/). Leave "" to hide the photo area.
  heroPhoto: "",
  heroPhotoAlt: "A well-kept home and lawn in your community",

  // Optional analytics. Events are always pushed to window.dataLayer (works
  // with Google Tag Manager). Set gaMeasurementId (e.g. "G-XXXXXXX") to load GA4.
  gaMeasurementId: ""
};
