import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The single page-header pattern for signed-in pages.
 *
 * docs/SIGNED_IN_REDESIGN_PLAN.md calls for "one page header pattern across the
 * product" -- today every page rolls its own, which is a large part of why the app
 * reads as a collection of separate screens rather than one product. Use this for
 * every rebuilt page.
 *
 * @param {string}    title       Page title. Required.
 * @param {string}    [description] One line of context under the title.
 * @param {ReactNode} [actions]   Primary/secondary actions, right-aligned on desktop.
 * @param {ReactNode} [meta]      Optional status strip rendered under the title block
 *                                (e.g. "Updated 2 min ago"), before the divider.
 */
export function PageHeader({ title, description, actions, meta, className, ...props }) {
  return (
    <header
      className={cn('mb-6 border-b border-[#e2e4e9] pb-5 dark:border-white/10', className)}
      {...props}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {meta ? <div className="mt-3">{meta}</div> : null}
    </header>
  );
}

/**
 * Titled content section. Gives every page the same sectioning rhythm instead of
 * each one inventing its own heading sizes and spacing.
 */
export function Section({ title, description, actions, children, className, ...props }) {
  return (
    <section className={cn('mb-8', className)} {...props}>
      {(title || actions) && (
        <div className="mb-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export default PageHeader;
