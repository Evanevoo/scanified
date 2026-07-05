import { mergeQueuedFetchOptions } from '../../utils/subscriptionFetchQueue';

describe('mergeQueuedFetchOptions', () => {
  it('uses incoming options when queue is empty', () => {
    expect(mergeQueuedFetchOptions(null, { silent: true })).toEqual({
      silent: true,
      reconcile: false,
    });
    expect(mergeQueuedFetchOptions(null, { silent: false, reconcile: true })).toEqual({
      silent: false,
      reconcile: true,
    });
  });

  it('preserves reconcile when silent refresh is queued after explicit refresh', () => {
    const merged = mergeQueuedFetchOptions(
      { silent: false, reconcile: true },
      { silent: true },
    );
    expect(merged).toEqual({ silent: false, reconcile: true });
  });

  it('merges explicit refresh after silent refresh in queue', () => {
    const merged = mergeQueuedFetchOptions(
      { silent: true, reconcile: false },
      { silent: false, reconcile: true },
    );
    expect(merged).toEqual({ silent: false, reconcile: true });
  });

  it('stays silent when both queued fetches are silent', () => {
    const merged = mergeQueuedFetchOptions(
      { silent: true, reconcile: false },
      { silent: true },
    );
    expect(merged).toEqual({ silent: true, reconcile: false });
  });
});
