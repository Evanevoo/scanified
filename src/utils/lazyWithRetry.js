const CHUNK_RELOAD_KEY = 'scanified_chunk_reload';

/** True when a dynamic import failed because the deployed asset hash changed (post-release). */
export function isChunkLoadError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('importing a module script failed') ||
    msg.includes('dynamically imported module')
  );
}

/**
 * Wrap React.lazy import factories: retry briefly, then one hard reload per session on stale chunks.
 */
export async function lazyWithRetry(importFactory, { retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const mod = await importFactory();
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return mod;
    } catch (error) {
      lastError = error;
      if (!isChunkLoadError(error) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  if (isChunkLoadError(lastError) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
    return new Promise(() => {});
  }

  throw lastError;
}
