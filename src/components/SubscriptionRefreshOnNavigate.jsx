import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubscriptions } from '../context/SubscriptionContext';

/** Default: avoid hammering Supabase on every sidebar click (11 parallel large selects). */
const MIN_MS_BETWEEN_NAV_REFRESH_DEFAULT = 60_000;
/** Rentals workspace: silent refresh is read-only (no backfill); keep visits fresher than other routes. */
const MIN_MS_BETWEEN_NAV_REFRESH_WORKSPACE = 15_000;

function minMsBetweenRefreshForPath(pathname) {
  if (!pathname) return MIN_MS_BETWEEN_NAV_REFRESH_DEFAULT;
  if (pathname === '/rentals' || pathname.startsWith('/rentals/')) {
    return MIN_MS_BETWEEN_NAV_REFRESH_WORKSPACE;
  }
  if (pathname.startsWith('/customer/')) return MIN_MS_BETWEEN_NAV_REFRESH_WORKSPACE;
  if (pathname.startsWith('/pricing/customers')) return MIN_MS_BETWEEN_NAV_REFRESH_WORKSPACE;
  if (pathname.startsWith('/lease-agreements')) return MIN_MS_BETWEEN_NAV_REFRESH_WORKSPACE;
  return MIN_MS_BETWEEN_NAV_REFRESH_DEFAULT;
}

/** Let the destination route paint before starting background refetches. */
const REFRESH_DEFER_MS = 400;

/**
 * SubscriptionProvider sits outside <Router>, so route changes do not remount it.
 * Silent-refetch shared org data when the user navigates so list pages (Rentals, etc.)
 * match DB without F5. Initial load is handled by SubscriptionProvider's mount effect.
 *
 * Throttled: each navigation used to trigger a full workspace refetch (bottles, rentals,
 * customers, …), which made page switches feel slow. Realtime + Rentals “Update” still
 * cover freshness between intervals.
 */
export default function SubscriptionRefreshOnNavigate() {
  const { pathname } = useLocation();
  const { refreshSilent } = useSubscriptions();
  const skipFirst = useRef(true);
  const lastNavRefreshAt = useRef(0);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const now = Date.now();
    const minGap = minMsBetweenRefreshForPath(pathname);
    if (now - lastNavRefreshAt.current < minGap) {
      return;
    }
    lastNavRefreshAt.current = now;

    const t = setTimeout(() => {
      refreshSilent();
    }, REFRESH_DEFER_MS);
    return () => clearTimeout(t);
  }, [pathname, refreshSilent]);

  return null;
}
