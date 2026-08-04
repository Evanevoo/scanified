import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * One row in the operations queue: a count of things needing a human decision,
 * with a one-line explanation of the consequence and a click-through to resolve it.
 *
 * Deliberately not a generic "stat card". A stat is a number you look at; a queue
 * item is work you act on. Zero is a *success* state here and is styled calmly --
 * only a non-zero count earns colour, so the dashboard stays quiet until something
 * actually needs attention.
 *
 * @param {string}  label      What the exception is (e.g. "Unapproved orders").
 * @param {number}  count      How many. 0 renders the resolved state.
 * @param {string}  meaning    One line: why this matters / what it costs. Required --
 *                             a bare count nobody understands is what the old
 *                             dashboard already did.
 * @param {string}  [detail]   Extra context shown when count > 0 (e.g. "oldest: 12 days").
 * @param {'critical'|'warn'|'info'} [severity='info'] Tone when count > 0.
 * @param {string}  [actionLabel='Review'] Call to action text.
 * @param {Function} [onAction] Click handler. Omit to render non-interactive.
 */
export function QueueItem({
  label,
  count,
  meaning,
  detail,
  severity = 'info',
  actionLabel = 'Review',
  onAction,
  className,
  ...props
}) {
  const isClear = !count || count <= 0;

  const tones = {
    critical: 'text-red-700 dark:text-red-400',
    warn: 'text-amber-700 dark:text-amber-400',
    info: 'text-gray-900 dark:text-gray-100',
  };
  const countTone = isClear ? 'text-gray-400 dark:text-gray-500' : tones[severity] || tones.info;

  const interactive = typeof onAction === 'function' && !isClear;

  const Wrapper = interactive ? 'button' : 'div';

  return (
    <Wrapper
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onAction : undefined}
      aria-label={
        interactive
          ? `${label}: ${count}. ${meaning}. ${actionLabel}`
          : `${label}: ${isClear ? 'none outstanding' : count}`
      }
      className={cn(
        'flex w-full items-center gap-4 rounded-[10px] border border-[#e2e4e9] bg-white px-4 py-3.5 text-left',
        'dark:border-white/10 dark:bg-transparent',
        interactive &&
          'cursor-pointer transition-colors hover:bg-[#f5f6f8] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:hover:bg-white/5',
        className
      )}
      {...props}
    >
      <div className="w-14 flex-shrink-0">
        <span className={cn('text-2xl font-semibold tabular-nums', countTone)}>
          {isClear ? '—' : count}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
          {!isClear && detail ? (
            <span className="rounded border border-[#e2e4e9] px-1.5 py-0.5 text-[11px] font-medium text-gray-600 dark:border-white/10 dark:text-gray-400">
              {detail}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
          {isClear ? 'Nothing outstanding.' : meaning}
        </p>
      </div>

      {interactive ? (
        <span className="flex-shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">
          {actionLabel} →
        </span>
      ) : null}
    </Wrapper>
  );
}

export default QueueItem;
