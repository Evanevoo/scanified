import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubscriptions } from '../context/SubscriptionContext';

/**
 * SubscriptionProvider sits outside <Router>, so route changes do not remount it.
 * Silent-refetch shared org data when the user navigates so list pages (Rentals, etc.)
 * match DB without F5. Initial load is handled by SubscriptionProvider's mount effect.
 */
export default function SubscriptionRefreshOnNavigate() {
  const { pathname } = useLocation();
  const { refreshSilent } = useSubscriptions();
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const t = setTimeout(() => {
      refreshSilent();
    }, 50);
    return () => clearTimeout(t);
  }, [pathname, refreshSilent]);

  return null;
}
