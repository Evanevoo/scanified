# Landing Page Hero Redesign — "Gravity" Direction

**Date:** 2026-08-04
**Status:** Approved, ready for implementation planning

## Context

The current marketing hero (`src/pages/ModernLandingPage.jsx`) uses `ParticleTextEffect`
(`src/components/ui/particle-text-effect.tsx`) as a full-viewport animated canvas background —
a continuous `requestAnimationFrame` loop that redraws every frame and never pauses when
scrolled out of view or when the tab isn't focused. This request originated from wanting a
hero closer to https://www.getlayers.ai/?layer=gravity-webgl ("Gravity" template: a
physics-simulated cluster of glossy spheres reacting to the cursor, bold/italic mixed
typography, light airy layout).

That reference uses real WebGL + a physics engine, which is heavy — confirmed heavy enough
that the mockup/reference page itself timed out a browser screenshot capture during review.
This is a real concern here specifically because the app is already known to feel heavy over
Remote Desktop (no GPU passthrough → software rendering), so a literal WebGL/physics port was
ruled out in favor of a lighter technique that captures the same *feel* without the same cost.

## Decisions (from brainstorming)

- **Scope:** full hero redesign — background, typography, copy — not just a background swap.
- **What to borrow:** all three of the reference's core visual ideas, roughly equally —
  mouse-reactive floating shapes, bold/italic mixed typography, light/airy high-contrast look.
- **Brand colors:** keep current teal (`#40B5AD`) / purple (`#8B7BA8`) tokens
  (`src/config/marketingTokens.js`) — do not shift toward the reference's navy/blue, to stay
  consistent with the rest of the app (nav bar, buttons, dashboard already use these tokens).
- **Headline copy:** rewritten in the reference's punchy two-line style with one italic accent
  word: **"Less guesswork. More *visibility*."** (ties to the product's actual value prop —
  real-time location tracking — rather than reusing "gravity" wordplay that doesn't fit this
  product). Layout otherwise unchanged: badge → headline → CTA buttons → trial disclaimer →
  app store badges.
- **Implementation technique:** CSS/SVG shapes driven by Framer Motion springs — NOT canvas,
  NOT WebGL, NOT a physics engine (matter.js). Zero new npm dependencies (`framer-motion` is
  already installed and already used elsewhere in this file).
- A rough throwaway HTML mockup (vanilla CSS/JS) was reviewed and approved as the visual
  direction; the real implementation uses React + Framer Motion, matching this codebase's
  patterns, not the mockup's vanilla JS.

## Visual Design

- **Background:** ~10 soft gradient circles (60–220px), teal→purple gradient body with an
  offset highlight (radial-gradient with a lighter spot upper-left) to fake a glossy-sphere
  look without any 3D rendering. Scattered behind/around the hero content, positioned in %
  (responsive), not fixed pixels.
- **Typography:** headline accent word ("visibility") renders in `Playfair Display` italic
  (already loaded as `--font-serif` in `src/tailwind.css`, currently only the regular 700
  weight is fetched — the Google Fonts `@import` needs to add the italic variant:
  `family=Playfair+Display:ital,wght@0,700;1,700`). Rest of the headline stays bold Inter,
  matching current styling.
- **Palette/background:** keep the existing light gradient backdrop
  (`from-slate-100/90 via-violet-50/80 to-rose-50/70`) — no new background gradient tokens.

## Technical Architecture

**New component:** `src/components/ui/gravity-hero-background.tsx`
- No required props. Renders the shape layer absolutely positioned behind hero content
  (`z-0`, `pointer-events-none` on the layer itself so it never blocks clicks on CTAs/nav).
- Each shape has a home position defined in percentages of the hero container (responsive,
  no `window.resize` handling needed — unlike the current canvas effect).
- A single `mousemove` listener (attached only while the hero is intersecting the viewport —
  see Performance below) feeds a shared `useMotionValue` pair (`mouseX`, `mouseY`). Each shape
  derives its own displacement via `useTransform`: offset scaled inversely by distance from
  the cursor, capped at ~40px, creating a soft repulsion field. **No collision detection
  between shapes** — that's the expensive part of a real physics engine and isn't needed for
  the visual effect being targeted.
- Idle state (no shapes near the cursor, or cursor not over the hero): each shape drifts via a
  slow independent keyframe loop (Y oscillation, 6–10s cycle per shape, staggered) — cheap,
  GPU-composited transform animation, and it's what keeps the hero feeling alive on touch
  devices where there's no cursor at all.

**Changes to existing files:**
- `src/pages/ModernLandingPage.jsx`: remove the `<ParticleTextEffect asBackground .../>` call
  and the `particleWords` array (no longer used); render `<GravityHeroBackground />` in its
  place inside the hero `<section>`. Restyle the `<h1>` so the accent word renders in a
  `<span className="font-serif italic">` (or equivalent Tailwind classes matching the existing
  `--font-serif` token) instead of plain text.
- `src/tailwind.css`: extend the existing Google Fonts `@import` line to include Playfair
  Display's italic weight (see Visual Design above).
- `src/components/ui/particle-text-effect.tsx`: left in place (not deleted) — it's a generic,
  reusable component with its own props/behavior; only its *usage* in the hero is removed. If
  nothing else in the codebase references it after this change, that's a follow-up cleanup
  question, not part of this phase.

## Performance & Accessibility Safeguards

- `mousemove` listener is attached only while the hero section intersects the viewport, via
  `IntersectionObserver` — same pattern this file already uses (`useInView` from Framer Motion,
  see `FeatureCard`/`BenefitItem` in `ModernLandingPage.jsx`). This is a deliberate improvement
  over the current `ParticleTextEffect`, which keeps its animation loop running even after the
  user has scrolled well past the hero.
- `useReducedMotion()` (already imported and used in `ModernLandingPage.jsx`) — when true,
  shapes render at their home position with zero motion and no listeners are attached at all
  (no spring computation, no mousemove handler).
- No `<canvas>`, no per-frame manual redraw loop, no `window.resize` handler — positions are
  relative (%), not pixel-computed against viewport size. This is the main reason the new
  approach is cheaper than what's currently there, not just cheaper than the WebGL reference.
- Shape count fixed at ~10 — cheap regardless of viewport size or device.
- Zero new npm dependencies.

## Testing / Validation Plan

This is a presentational component with no business logic — no unit tests apply. Validation is:
- Manual visual check in the dev browser (already-open `localhost:5174`) after implementation:
  hero renders correctly, shapes visible and positioned sensibly at desktop + mobile widths,
  cursor interaction feels right, headline accent renders in italic serif.
- Verify `prefers-reduced-motion` produces the static fallback (no motion, no listeners) —
  check via browser devtools' "Emulate CSS media feature prefers-reduced-motion".
- Verify touch/mobile viewport shows idle-only drift animation without errors (no mousemove
  available).
- Verify scrolling the hero out of view stops the mousemove listener (can be confirmed via a
  temporary console log during development, removed before commit — or via React DevTools
  Profiler showing no re-renders from mouse movement once scrolled past).
- No automated visual regression harness exists in this repo; this phase does not add one.

## Out of Scope

- Any other landing page section (Features, pricing, footer, etc.) — hero only.
- Shifting brand colors toward the reference's palette.
- Real WebGL or physics-engine-based collision effects.
- Deleting or refactoring `particle-text-effect.tsx` itself.
- The separate, previously-raised "why is the app heavy on Remote Desktop" investigation
  (likely GPU-dependent CSS effects elsewhere — `backdrop-filter`/blur/shadows) — unrelated to
  this hero redesign and not addressed here.
