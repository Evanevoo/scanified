/** Default when SITE_URL is unset in Netlify environment (must match SPA canonical). */
const DEFAULT_SITE_URL = 'https://www.scanified.com';

function getSiteUrl() {
  const u = process.env.SITE_URL;
  if (u && typeof u === 'string') return u.replace(/\/$/, '');
  return DEFAULT_SITE_URL;
}

module.exports = { DEFAULT_SITE_URL, getSiteUrl };
