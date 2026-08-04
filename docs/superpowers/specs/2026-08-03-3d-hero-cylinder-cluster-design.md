# 3D Hero Cylinder Cluster — Design Spec

Date: 2026-08-03
Status: Approved (delegated — user requested "you do it" after reviewing the two candidate approaches below)

## Goal

Add a background 3D visual to the marketing landing page hero (`src/pages/ModernLandingPage.jsx`, `<section id="main-content">`) — a loosely-arranged cluster of gas cylinders that slowly auto-rotates and periodically "scans," lighting up each cylinder with a status color. Must not block initial page render/LCP, must not interfere with the CTA buttons, and must degrade gracefully on reduced-motion and low-end devices.

## Context found in the codebase

- Hero section: `ModernLandingPage.jsx:169-176` — `<section id="main-content" className="relative overflow-hidden ...">`, already has a `ParticleTextEffect` background layer at `z-0`, with text content in a `z-10` div, fully centered (`max-w-4xl mx-auto text-center`), no existing two-column split.
- `reduceMotion` is already computed via `useReducedMotion()` from `framer-motion` (`ModernLandingPage.jsx:2`) and threaded through the whole page — reuse this exact value, don't add a second reduced-motion detection mechanism.
- `src/utils/lazyWithRetry.js` already exists as the app's standard retry-wrapped `React.lazy()` helper — use it for the new scene component.
- No `three`/`@react-three/fiber`/`@react-three/drei` in `package.json` yet — new dependencies.
- Brand teal: `#40B5AD` (`tailwind.config.js`, matches `theme.primary.main`). No "coral" exists in the codebase. Status colors are theme-driven and vary by org preset elsewhere in the app, so for this fixed 3-state visual we hardcode a triad independent of the active theme: full = `#22c55e` (green), empty = `#f59e0b` (amber), in-transit/rented = `#40B5AD` (brand teal).

## Approach comparison (presented to user, approach A selected)

**A — Procedural geometry (selected).** Build each cylinder from primitives (`CylinderGeometry` body, `SphereGeometry` dome cap, thin `CylinderGeometry` valve collar). No asset pipeline, trivial to recolor per-status at runtime via material color (no texture baking), no extra network request for a model file — only the JS chunk. Matches the "clean/modern, not hyper-detailed" brief.

**B — Small GLTF model (rejected for now).** More "designed" look, but requires an authoring/export step outside this codebase, an extra network fetch, and per-status recoloring needs either baked material variants or runtime material swapping. Higher effort for a background element that isn't the visual focal point.

## Component structure

```
src/components/landing/HeroCylinderScene/
  index.jsx                — public export: lazy-loads the scene via lazyWithRetry,
                              wraps in Suspense + a small error boundary, decides
                              (reduceMotion || load-failure || WebGL-unavailable) →
                              render StaticFallback instead of the Canvas.
  CylinderClusterScene.jsx  — the actual R3F <Canvas> + scene graph. This whole file
                              is the code-split chunk (only pulled in when index.jsx's
                              dynamic import resolves).
  Cylinder.jsx              — one procedural cylinder: body + dome + collar meshes,
                              base-ring emissive glow, barcode decal flash. Props:
                              position, rotation, status ('full'|'empty'|'transit'),
                              scanActive (bool, driven by parent).
  ScanBeam.jsx              — the sweeping plane; owns the loop timing (4-6s period,
                              top-to-bottom), exposes current beam Y via a small
                              zustand-free ref/callback (no need for global state —
                              this is a single self-contained scene).
  StaticFallback.jsx        — CSS-only gradient/blur placeholder, used for
                              reduced-motion, load failure, and while the lazy chunk
                              is loading (as the Suspense fallback).
  constants.js              — STATUS_COLORS, CYLINDER_COUNT (5-7), SCAN_PERIOD_MS,
                              ROTATION_PERIOD_MS.
```

## Data flow

- On mount, `CylinderClusterScene` generates N (5-7) cylinder transforms once via `useMemo` (randomized position/tilt within a loose cluster bound, randomized status color from the 3-color set) — not re-randomized on re-render.
- `ScanBeam` advances a Y position each frame (`useFrame`) on a repeating 4-6s cycle.
- Each `Cylinder` compares its own Y bounds against the current beam Y (passed down as a prop from the scene, recomputed each frame) — when the beam is within its bounds, it flips a local "flash" flag for a short window (drives the barcode-decal opacity pulse and turns on the base-ring emissive material at its assigned status color, staying lit briefly after the beam passes rather than instantly snapping off).
- The whole cluster `<group>` rotates slowly on `useFrame` (a fixed small radians/frame increment derived from `ROTATION_PERIOD_MS`), independent of the scan cycle.

## Placement (no CTA interference)

- Rendered as an additional layer inside the existing hero `<section>`, absolutely positioned, `pointer-events-none` (never intercepts clicks — the spec doesn't call for interactivity), biased toward one side (desktop only) so it reads as atmospheric background rather than competing with the centered text/button column. Hidden below `md:` breakpoint — mobile hero has no room for a side visual and this doubles as the mobile perf guard.
- Opacity/blend tuned low enough that the existing `ParticleTextEffect` and text remain the clear focal point; this is a background accent, not a replacement of the current hero content.

## Performance & fallback

- Lazy-loaded via `lazyWithRetry` + `Suspense` — hero text/CTAs render and are interactive immediately regardless of when (or whether) the 3D chunk loads.
- `prefers-reduced-motion`: reuse the page's existing `reduceMotion` value — when true, `HeroCylinderScene/index.jsx` renders `StaticFallback` and never mounts the Canvas (no WebGL context, no animation loop, no wasted chunk work beyond the already-fetched JS).
- `dpr={[1, 1.5]}` cap on the Canvas (avoid full device pixel ratio on high-DPI/mobile screens), low poly counts on the procedural primitives (this is a background element, not the focal point).
- Error boundary + `lazyWithRetry`'s existing retry semantics cover chunk-load failure; a `try/catch` around `Canvas` creation (R3F throws if WebGL is unavailable) falls back to `StaticFallback`.

## Testing

- No existing 3D/canvas test infrastructure in this repo, and WebGL canvas rendering isn't meaningfully unit-testable. Verification plan: `vite build` (confirms the chunk splits and builds cleanly), a manual dev-server check once browser tools are available, and one focused Jest test asserting `HeroCylinderScene` renders `StaticFallback` (not the Canvas) when `prefers-reduced-motion: reduce` is mocked via `matchMedia` — that's a pure React branch, not a WebGL concern, and it's the one behavior regression that would be easy to silently break later.

## Out of scope

- No interactivity (click/hover on individual cylinders) — not requested.
- No live data binding (status colors are cosmetic/random per the spec, not reflecting real inventory).
- Not touching `ParticleTextEffect` or the rest of the hero's existing animation — additive only.
