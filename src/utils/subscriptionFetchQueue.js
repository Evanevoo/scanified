/**
 * Merge queued SubscriptionContext fetch options so explicit Update (reconcile)
 * wins over silent realtime/tab refreshes queued mid-flight.
 */
export function mergeQueuedFetchOptions(prev, incoming) {
  const silent = incoming.silent === true;
  const reconcile =
    incoming.reconcile === true || (incoming.reconcile !== false && !silent);
  if (!prev) return { silent, reconcile };
  const prevSilent = prev.silent === true;
  const prevReconcile =
    prev.reconcile === true || (prev.reconcile !== false && !prevSilent);
  return {
    silent: prevSilent && silent,
    reconcile: prevReconcile || reconcile,
  };
}
