import React, { Suspense, lazy as reactLazy } from 'react';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';
import StaticFallback from './StaticFallback';

const CylinderClusterScene = reactLazy(() =>
  lazyWithRetry(() => import('./CylinderClusterScene'))
);

/** Silently falls back to the static placeholder instead of taking over the page —
 * this is a decorative background element, not something worth a full-page error UI. */
class SceneErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.warn('HeroCylinderScene failed to render, showing static fallback:', error);
  }

  render() {
    if (this.state.hasError) return <StaticFallback />;
    return this.props.children;
  }
}

/**
 * Background 3D cylinder cluster for the landing page hero. Lazy-loads the actual
 * Three.js scene so it never blocks initial render/LCP; renders a CSS-only static
 * placeholder for prefers-reduced-motion, while the chunk loads, and on any failure.
 *
 * @param {{ reduceMotion?: boolean, className?: string }} props
 */
export default function HeroCylinderScene({ reduceMotion = false, className = '' }) {
  return (
    // Right-biased and hidden below md: keeps this clear of the centered CTA row on
    // every breakpoint that actually renders it, and doubles as the mobile perf guard
    // (no WebGL context created at all on small/low-end devices).
    <div
      aria-hidden="true"
      className={`hidden md:block absolute top-0 right-0 bottom-0 w-1/2 lg:w-2/5 pointer-events-none overflow-hidden ${className}`}
    >
      {reduceMotion ? (
        <StaticFallback />
      ) : (
        <SceneErrorBoundary>
          <Suspense fallback={<StaticFallback />}>
            <CylinderClusterScene />
          </Suspense>
        </SceneErrorBoundary>
      )}
    </div>
  );
}
