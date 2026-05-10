import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubscriptions } from '../context/SubscriptionContext';

/** Avoid hammering Supabase + React on every sidebar click (11 parallel large selects — costly). */
const MIN_MS_BETWEEN_NAV_REFRESH = 60_000;
/** Let the destination route paint before starting heavy refetches (reduces “navigation lag”). */
const REFRESH_DEFER_MS = 280;

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
    if (now - lastNavRefreshAt.current < MIN_MS_BETWEEN_NAV_REFRESH) {
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
