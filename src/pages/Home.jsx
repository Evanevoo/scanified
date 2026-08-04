import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import { useSubscriptions } from '../context/SubscriptionContext';
import { supabase } from '../supabase/client';
import { PageHeader, Section } from '../components/ui/page-header';
import { QueueItem } from '../components/ui/queue-item';
import { fetchOperationsQueue } from '../services/operationsQueue';
import {
  countCustomersWithOpenRentals,
  rentalCoveragePercent,
} from '../utils/rentalCoverageStats';
import logger from '../utils/logger';

/**
 * Operations command center.
 *
 * Rebuilt from a launcher-and-KPI-wall into a work queue. The previous version
 * answered "how big is the business"; the questions that actually run a cylinder
 * operation are "what needs a decision" and "what is quietly costing money" --
 * unapproved orders (bottles at a customer, billing nothing) and the not-scanned
 * exception backlog (DNS/RNB/RNS) that otherwise only accumulates.
 *
 * Queue first, numbers second, shortcuts last.
 */

/** Compact KPI. A number you look at -- distinct from QueueItem, which is work you do. */
function StatTile({ label, value, hint, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'rounded-[10px] border border-[#e2e4e9] bg-white px-4 py-3.5 text-left dark:border-white/10 dark:bg-transparent',
        onClick
          ? 'cursor-pointer transition-colors hover:bg-[#f5f6f8] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:hover:bg-white/5'
          : '',
      ].join(' ')}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</div> : null}
    </Wrapper>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const { isAdmin, isManager } = usePermissions();
  const subCtx = useSubscriptions();

  const [stats, setStats] = useState({ customers: 0, activeRentals: 0, totalUsers: 0 });
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadedForOrgRef = useRef(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!organization?.id) {
        setLoading(false);
        return;
      }
      if (silent) setRefreshing(true);
      else if (loadedForOrgRef.current !== organization.id) setLoading(true);

      try {
        const [customersRes, openRentalsRes, usersRes, queueRes] = await Promise.allSettled([
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organization.id),
          supabase
            .from('rentals')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .is('rental_end_date', null),
          isAdmin()
            ? supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', organization.id)
            : Promise.resolve({ count: 0 }),
          fetchOperationsQueue(organization.id),
        ]);

        const openFromDb =
          openRentalsRes.status === 'fulfilled' ? openRentalsRes.value.count ?? 0 : 0;

        setStats({
          customers: customersRes.status === 'fulfilled' ? customersRes.value.count || 0 : 0,
          // Context is the fallback when the count query is unavailable, matching prior behaviour.
          activeRentals: openFromDb > 0 ? openFromDb : (subCtx.rentals || []).length,
          totalUsers: usersRes.status === 'fulfilled' ? usersRes.value.count || 0 : 0,
        });
        setQueue(queueRes.status === 'fulfilled' ? queueRes.value : null);
        loadedForOrgRef.current = organization.id;
      } catch (error) {
        logger.error('Home: failed to load dashboard', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [organization?.id, isAdmin, subCtx.rentals]
  );

  useEffect(() => {
    load();
  }, [organization?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const coveragePct = useMemo(() => {
    const withBalance = countCustomersWithOpenRentals(subCtx.rentals);
    return rentalCoveragePercent(withBalance, stats.customers);
  }, [subCtx.rentals, stats.customers]);

  const quickActions = useMemo(() => {
    if (isAdmin()) {
      return [
        { label: 'Order verification', path: '/import-approvals' },
        { label: 'Rentals & invoices', path: '/rentals' },
        { label: 'Customers', path: '/customers' },
        { label: 'Team', path: '/settings?tab=team' },
        { label: 'Organization tools', path: '/organization-tools' },
        { label: 'Settings', path: '/settings' },
      ];
    }
    if (isManager()) {
      return [
        { label: 'Order verification', path: '/import-approvals' },
        { label: 'Rentals & invoices', path: '/rentals' },
        { label: 'Customers', path: '/customers' },
        { label: 'Reports', path: '/custom-reports' },
      ];
    }
    return [
      { label: 'Scanned orders', path: '/scanned-orders' },
      { label: 'Customers', path: '/customers' },
      { label: 'Inventory', path: '/assets' },
      { label: 'Rentals', path: '/rentals' },
    ];
  }, [isAdmin, isManager]);

  const totalOutstanding = queue
    ? queue.unapprovedOrders.count + queue.dns + queue.rnb + queue.rns
    : 0;

  if (loading) {
    return (
      <div className="p-1" role="status" aria-live="polite">
        <div className="h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-white/10">
          <div className="h-full w-1/3 animate-pulse rounded bg-blue-500" />
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading dashboard…</p>
      </div>
    );
  }

  const orgName = organization?.name || 'your organization';

  return (
    <div>
      <PageHeader
        title={`Good to see you, ${(profile?.full_name || 'there').split(' ')[0]}`}
        description={
          totalOutstanding > 0
            ? `${totalOutstanding} item${totalOutstanding === 1 ? '' : 's'} need attention across ${orgName}.`
            : `Nothing outstanding across ${orgName}.`
        }
        actions={
          <button
            type="button"
            onClick={() => load({ silent: true })}
            disabled={refreshing}
            className="rounded-lg border border-[#e2e4e9] px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-[#f5f6f8] disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <Section
        title="Needs attention"
        description="Work that will not resolve itself. Each row links to where you fix it."
      >
        {queue?.error ? (
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Could not load the operations queue. The counts below may be incomplete.
          </div>
        ) : null}

        <div className="space-y-2">
          <QueueItem
            label="Unapproved orders"
            count={queue?.unapprovedOrders.count ?? 0}
            severity="critical"
            detail={
              queue?.unapprovedOrders.oldestAgeDays != null
                ? `oldest ${queue.unapprovedOrders.oldestAgeDays}d`
                : undefined
            }
            meaning="Bottles are at the customer but bill nothing until the order is approved."
            actionLabel="Verify"
            onAction={() => navigate('/import-approvals')}
          />
          <QueueItem
            label="Delivered, not scanned (DNS)"
            count={queue?.dns ?? 0}
            severity="warn"
            meaning="Billed to the customer from a missed scan. Only a physical audit clears these."
            onAction={() => navigate('/rentals')}
          />
          <QueueItem
            label="Return not on balance (RNB)"
            count={queue?.rnb ?? 0}
            severity="warn"
            meaning="A bottle came back that this customer was never shown as holding."
            onAction={() => navigate('/rentals')}
          />
          <QueueItem
            label="Return not scanned (RNS)"
            count={queue?.rns ?? 0}
            severity="warn"
            meaning="A return was recorded by quantity because the barcode could not be read."
            onAction={() => navigate('/rentals')}
          />
          <QueueItem
            label="Lost bottles"
            count={queue?.lost ?? 0}
            severity="info"
            meaning="Marked lost and excluded from billing until found."
            actionLabel="View"
            onAction={() => navigate('/assets')}
          />
        </div>
      </Section>

      <Section title="At a glance">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Customers"
            value={stats.customers.toLocaleString()}
            onClick={() => navigate('/customers')}
          />
          <StatTile
            label="Open rental rows"
            value={stats.activeRentals.toLocaleString()}
            onClick={() => navigate('/rentals')}
          />
          <StatTile
            label="Rental coverage"
            value={`${coveragePct}%`}
            hint="customers holding at least one bottle"
          />
          {isAdmin() ? (
            <StatTile
              label="Team members"
              value={stats.totalUsers.toLocaleString()}
              onClick={() => navigate('/settings?tab=team')}
            />
          ) : null}
        </div>
      </Section>

      <Section title="Jump to">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              className="rounded-lg border border-[#e2e4e9] bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-[#f5f6f8] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
            >
              {action.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
