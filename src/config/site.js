/**
 * Single canonical origin for SEO, emails, and deep links.
 * Override in .env with VITE_SITE_URL (e.g. https://staging.example.com) for previews.
 */
function trimOrigin(url) {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\/$/, '');
}

const fromEnv =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
    ? trimOrigin(import.meta.env.VITE_SITE_URL)
    : null;

export const CANONICAL_SITE_ORIGIN = fromEnv || 'https://www.scanified.com';

export function absoluteUrl(pathname = '/') {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${CANONICAL_SITE_ORIGIN}${path}`;
}
