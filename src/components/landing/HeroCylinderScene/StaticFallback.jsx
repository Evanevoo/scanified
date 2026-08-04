import React from 'react';

/**
 * CSS-only placeholder used for prefers-reduced-motion, WebGL/chunk-load failure, and
 * as the Suspense fallback while the 3D chunk is still loading. No animation, no JS.
 */
export default function StaticFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(45% 55% at 78% 45%, rgba(64,181,173,0.16) 0%, rgba(64,181,173,0.05) 45%, transparent 75%)',
      }}
    />
  );
}
