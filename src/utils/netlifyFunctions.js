/**
 * Base URL for Netlify functions when the SPA is not served from Netlify (e.g. Vercel static).
 * Set VITE_NETLIFY_FUNCTIONS_BASE_URL=https://your-site.netlify.app in .env (no trailing slash).
 * Leave unset to use relative /.netlify/functions/... (Netlify host or local netlify dev proxy).
 */
export function netlifyFunctionUrl(functionName) {
  const base = (import.meta.env.VITE_NETLIFY_FUNCTIONS_BASE_URL || '').replace(/\/$/, '');
  const path = `/.netlify/functions/${functionName}`;
  if (!base) return path;
  return `${base}${path}`;
}
