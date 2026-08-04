# Landing Page Gravity Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the marketing hero's animated canvas background and headline with a lighter, Framer-Motion-driven "floating spheres" background and a punchy two-line headline with an italic accent word, per the approved design spec.

**Architecture:** One new presentational component (`GravityHeroBackground`) renders ~10 absolutely-positioned gradient circles that idle-drift via CSS keyframes and get pushed away from the cursor via Framer Motion springs, gated by `IntersectionObserver` + `prefers-reduced-motion`. `ModernLandingPage.jsx` swaps its current `ParticleTextEffect` canvas background for this component and restyles the `<h1>`.

**Tech Stack:** React (JSX/TSX), Framer Motion (`useMotionValue`, `useTransform`, `useSpring`, `useReducedMotion` — all already in use elsewhere in this codebase), Tailwind CSS.

## Global Constraints

- Zero new npm dependencies — Framer Motion is already installed and used in `ModernLandingPage.jsx`.
- No `<canvas>`, no per-frame manual redraw loop, no `window.resize` handler — shape positions are relative (%), not pixel-computed.
- `mousemove` listener attached only while the hero section intersects the viewport (`IntersectionObserver`).
- `useReducedMotion()` → shapes render static at their home position, no listeners attached at all.
- Brand colors stay teal `#40B5AD` / purple `#8B7BA8` (`src/config/marketingTokens.js`) — no palette shift.
- Headline copy: **"Less guesswork. More *visibility*."** — "visibility" in italic Playfair Display, rest bold Inter.
- Hero only — no other landing page section changes. `particle-text-effect.tsx` itself is not deleted, only its usage in the hero.

---

### Task 1: Load Playfair Display's italic weight

**Files:**
- Modify: `src/tailwind.css:1`

**Interfaces:**
- Consumes: nothing (standalone CSS import line).
- Produces: `font-style: italic` now renders in the actual Playfair Display italic face (not a browser-synthesized fake italic) for any element using `font-serif italic` (Tailwind's `--font-serif` token, already defined at `src/tailwind.css:33`). Task 3 depends on this.

- [ ] **Step 1: Update the Google Fonts import to request the italic weight**

Current line 1:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap');
```

Replace with:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
```

- [ ] **Step 2: Verify the font loads**

Run: `npm run dev` (if not already running), open `http://localhost:5174` in a browser, open DevTools → Network tab, filter by "fonts.googleapis" or "fonts.gstatic", reload the page.
Expected: a font file request for Playfair Display italic (in addition to the existing regular-weight request) appears in the network log. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/tailwind.css
git commit -m "Load Playfair Display italic weight for hero accent word"
```

---

### Task 2: Build the GravityHeroBackground component

**Files:**
- Create: `src/components/ui/gravity-hero-background.tsx`

**Interfaces:**
- Consumes: nothing (no required props) — matches the existing `ParticleTextEffect` component's `asBackground` usage pattern in `src/pages/ModernLandingPage.jsx:171-176`, but this component takes no props at all.
- Produces: `export default function GravityHeroBackground(): JSX.Element` — a self-contained background layer meant to be rendered as a direct child of a `position: relative` (or `absolute`-establishing) container, typically first inside a `<section>`. Task 3 imports and renders this component.

- [ ] **Step 1: Create the file with shape config, the mouse-tracking effect, and the two sub-components**

Create `src/components/ui/gravity-hero-background.tsx`:

```tsx
import { useEffect, useRef } from "react"
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion"

interface ShapeConfig {
  id: number
  homeXPct: number
  homeYPct: number
  size: number
  gradientFrom: string
  gradientVia: string
  idleDuration: number
  idleDelay: number
}

/** Positions are percentages of the hero container — responsive with no resize handling needed. */
const SHAPES: ShapeConfig[] = [
  { id: 1, homeXPct: 8, homeYPct: 25, size: 90, gradientFrom: "#40B5AD", gradientVia: "#8B7BA8", idleDuration: 7, idleDelay: 0 },
  { id: 2, homeXPct: 18, homeYPct: 72, size: 60, gradientFrom: "#8B7BA8", gradientVia: "#40B5AD", idleDuration: 8, idleDelay: 0.6 },
  { id: 3, homeXPct: 30, homeYPct: 15, size: 130, gradientFrom: "#40B5AD", gradientVia: "#8B7BA8", idleDuration: 6.5, idleDelay: 1.2 },
  { id: 4, homeXPct: 45, homeYPct: 84, size: 75, gradientFrom: "#8B7BA8", gradientVia: "#40B5AD", idleDuration: 9, idleDelay: 0.3 },
  { id: 5, homeXPct: 62, homeYPct: 20, size: 100, gradientFrom: "#40B5AD", gradientVia: "#8B7BA8", idleDuration: 7.5, idleDelay: 1.8 },
  { id: 6, homeXPct: 74, homeYPct: 68, size: 150, gradientFrom: "#8B7BA8", gradientVia: "#40B5AD", idleDuration: 6, idleDelay: 0.9 },
  { id: 7, homeXPct: 87, homeYPct: 30, size: 65, gradientFrom: "#40B5AD", gradientVia: "#8B7BA8", idleDuration: 8.5, idleDelay: 0.2 },
  { id: 8, homeXPct: 93, homeYPct: 80, size: 110, gradientFrom: "#8B7BA8", gradientVia: "#40B5AD", idleDuration: 7, idleDelay: 1.5 },
  { id: 9, homeXPct: 52, homeYPct: 50, size: 55, gradientFrom: "#40B5AD", gradientVia: "#8B7BA8", idleDuration: 9.5, idleDelay: 0.7 },
  { id: 10, homeXPct: 12, homeYPct: 50, size: 80, gradientFrom: "#8B7BA8", gradientVia: "#40B5AD", idleDuration: 6.8, idleDelay: 1.1 },
]

/** Max px a shape is pushed away from the cursor, and the radius (px) within which it reacts at all. */
const MAX_PUSH = 40
const INFLUENCE_RADIUS = 260
/** Sentinel mouse position meaning "cursor not over the hero" — far enough outside INFLUENCE_RADIUS to push nothing. */
const MOUSE_AWAY = -9999
const SPRING_CONFIG = { stiffness: 55, damping: 16, mass: 0.6 }

function computePush(
  mx: number,
  my: number,
  shape: ShapeConfig,
  containerEl: HTMLDivElement | null,
): { x: number; y: number } {
  if (!containerEl || mx <= MOUSE_AWAY / 2) return { x: 0, y: 0 }
  const rect = containerEl.getBoundingClientRect()
  const homeX = (shape.homeXPct / 100) * rect.width
  const homeY = (shape.homeYPct / 100) * rect.height
  const dx = homeX - mx
  const dy = homeY - my
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  if (dist >= INFLUENCE_RADIUS) return { x: 0, y: 0 }
  const push = (1 - dist / INFLUENCE_RADIUS) * MAX_PUSH
  return { x: (dx / dist) * push, y: (dy / dist) * push }
}

interface GravityShapeProps {
  shape: ShapeConfig
  mouseX: ReturnType<typeof useMotionValue<number>>
  mouseY: ReturnType<typeof useMotionValue<number>>
  reduceMotion: boolean
  containerRef: React.RefObject<HTMLDivElement>
}

function GravityShape({ shape, mouseX, mouseY, reduceMotion, containerRef }: GravityShapeProps) {
  const pushX = useTransform([mouseX, mouseY], (latest) => {
    if (reduceMotion) return 0
    const [mx, my] = latest as [number, number]
    return computePush(mx, my, shape, containerRef.current).x
  })
  const pushY = useTransform([mouseX, mouseY], (latest) => {
    if (reduceMotion) return 0
    const [mx, my] = latest as [number, number]
    return computePush(mx, my, shape, containerRef.current).y
  })
  const springX = useSpring(pushX, SPRING_CONFIG)
  const springY = useSpring(pushY, SPRING_CONFIG)

  return (
    <motion.div
      className="absolute"
      style={{ left: `${shape.homeXPct}%`, top: `${shape.homeYPct}%` }}
      animate={reduceMotion ? undefined : { y: [0, -14, 0, 10, 0] }}
      transition={
        reduceMotion
          ? undefined
          : { duration: shape.idleDuration, delay: shape.idleDelay, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <motion.div
        className="rounded-full"
        style={{
          width: shape.size,
          height: shape.size,
          marginLeft: -shape.size / 2,
          marginTop: -shape.size / 2,
          background: `radial-gradient(circle at 32% 28%, ${shape.gradientFrom}dd, ${shape.gradientFrom}55 40%, ${shape.gradientVia}33 75%)`,
          boxShadow: `0 20px 60px ${shape.gradientFrom}22`,
          x: reduceMotion ? 0 : springX,
          y: reduceMotion ? 0 : springY,
        }}
      />
    </motion.div>
  )
}

/**
 * Hero background: soft gradient spheres that idle-drift and get pushed away from the cursor.
 * No canvas, no physics engine, no collision detection — just CSS-transform springs. Render as a
 * direct child of a `position: relative`/`absolute`-establishing container (typically first inside
 * the hero `<section>`); it fills that container via `absolute inset-0`.
 */
export default function GravityHeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const mouseX = useMotionValue(MOUSE_AWAY)
  const mouseY = useMotionValue(MOUSE_AWAY)

  useEffect(() => {
    if (reduceMotion) return undefined
    const heroEl = containerRef.current?.parentElement
    if (!heroEl) return undefined

    let visible = false
    let rafId: number | null = null
    let pendingEvent: MouseEvent | null = null

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    }, { threshold: 0 })
    observer.observe(heroEl)

    const applyMove = () => {
      rafId = null
      if (!pendingEvent || !visible) return
      const rect = heroEl.getBoundingClientRect()
      mouseX.set(pendingEvent.clientX - rect.left)
      mouseY.set(pendingEvent.clientY - rect.top)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!visible) return
      pendingEvent = e
      if (rafId == null) rafId = requestAnimationFrame(applyMove)
    }
    const onMouseLeave = () => {
      mouseX.set(MOUSE_AWAY)
      mouseY.set(MOUSE_AWAY)
    }

    heroEl.addEventListener("mousemove", onMouseMove)
    heroEl.addEventListener("mouseleave", onMouseLeave)

    return () => {
      observer.disconnect()
      heroEl.removeEventListener("mousemove", onMouseMove)
      heroEl.removeEventListener("mouseleave", onMouseLeave)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [reduceMotion, mouseX, mouseY])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {SHAPES.map((shape) => (
        <GravityShape
          key={shape.id}
          shape={shape}
          mouseX={mouseX}
          mouseY={mouseY}
          reduceMotion={!!reduceMotion}
          containerRef={containerRef}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check and lint the new file**

Run: `npx tsc --noEmit -p . 2>&1 | grep gravity-hero-background || echo "no errors for this file"`
Expected: `no errors for this file` (the project's `tsconfig` may not type-check `.tsx` strictly outside build — if `tsc` reports unrelated pre-existing errors in other files, that's fine; only errors mentioning `gravity-hero-background.tsx` matter here).

Run: `npx eslint src/components/ui/gravity-hero-background.tsx`
Expected: no output (no lint errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/gravity-hero-background.tsx
git commit -m "Add GravityHeroBackground: cursor-reactive gradient-sphere hero background"
```

---

### Task 3: Wire GravityHeroBackground into the hero and restyle the headline

**Files:**
- Modify: `src/pages/ModernLandingPage.jsx:20-21` (imports), `:110-117` (remove unused `particleWords`), `:168-176` (background swap), `:189-204` (headline copy + styling)

**Interfaces:**
- Consumes: `GravityHeroBackground` default export from Task 2 (`src/components/ui/gravity-hero-background.tsx`).
- Produces: the rendered hero section on `/` and `/landing` — nothing downstream depends on this beyond the browser.

- [ ] **Step 1: Swap the import**

In `src/pages/ModernLandingPage.jsx`, find (around line 21):
```jsx
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';
```

Replace with:
```jsx
import GravityHeroBackground from '@/components/ui/gravity-hero-background';
```

- [ ] **Step 2: Remove the now-unused `particleWords` array**

Find (around lines 110-117):
```jsx
  // Words for particle effect background
  const particleWords = [
    assetConfig.appName?.toUpperCase() || "SCANIFIED",
    "TRACKING",
    "ASSETS",
    "MANAGEMENT",
    "ANALYTICS"
  ];

  const features = [
```

Replace with:
```jsx
  const features = [
```

- [ ] **Step 3: Swap the background in the hero section**

Find (around lines 168-176):
```jsx
      {/* Hero Section */}
      <section id="main-content" className="relative overflow-hidden py-24 md:py-32 bg-transparent">
        {/* Particle Text Effect Background */}
        <ParticleTextEffect 
          words={particleWords} 
          asBackground={true}
          className="z-0"
          disabled={!!reduceMotion}
        />
        <div className="container mx-auto px-4 relative z-10">
```

Replace with:
```jsx
      {/* Hero Section */}
      <section id="main-content" className="relative overflow-hidden py-24 md:py-32 bg-transparent">
        <GravityHeroBackground />
        <div className="container mx-auto px-4 relative z-10">
```

- [ ] **Step 4: Restyle the headline with the new copy and italic accent word**

Find (around lines 189-204):
```jsx
            <motion.h1 
              className="text-5xl md:text-7xl font-bold text-gray-900 mb-20 md:mb-32 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.2 }}
            >
              Track Every {assetConfig.assetTypeSingular || 'Asset'},
              <motion.span 
                className="block text-gray-900"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.4 }}
              >
                Optimize Every Operation
              </motion.span>
            </motion.h1>
```

Replace with:
```jsx
            <motion.h1 
              className="text-5xl md:text-7xl font-bold text-gray-900 mb-20 md:mb-32 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.2 }}
            >
              Less guesswork.
              <motion.span 
                className="block text-gray-900"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.4 }}
              >
                More{' '}
                <span className="font-serif italic bg-gradient-to-r from-[#40B5AD] to-[#8B7BA8] bg-clip-text text-transparent">
                  visibility
                </span>
                .
              </motion.span>
            </motion.h1>
```

Note: this drops the dynamic `{assetConfig.assetTypeSingular || 'Asset'}` interpolation from the headline (per spec, the new copy is a fixed value tied to the product's location-tracking value prop, not per-org asset naming). The `assetConfig` import and usage elsewhere on the page (features list, benefits list) is untouched.

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: build completes with `✓ built in <N>s`, no errors. (Chunk-size warnings for unrelated large chunks like `main-*.js` are pre-existing and expected — only new errors matter.)

- [ ] **Step 6: Manual visual verification in the browser**

Run: `npm run dev` (if not already running on port 5174).

Using the playwright-skill or the claude-in-chrome browser tools:
1. Navigate to `http://localhost:5174/`.
2. Screenshot the hero. Verify: ~10 soft gradient circles visible behind the headline, headline reads "Less guesswork. More *visibility*." with "visibility" in italic serif with a teal-to-purple gradient fill, badge/CTA buttons/app-store badges all still present and unchanged.
3. Move the mouse across the hero region and screenshot again. Verify: circles nearest the cursor have visibly shifted position compared to the first screenshot; circles far from the cursor are unchanged.
4. Scroll down past the hero, wait ~2 seconds, scroll back up. Verify no console errors appear (use `read_console_messages` with `onlyErrors: true`).
5. Emulate `prefers-reduced-motion: reduce` in DevTools (Rendering tab → "Emulate CSS media feature prefers-reduced-motion"), reload. Verify: circles are visible but static (no idle drift, no cursor reaction).
6. Resize the viewport to a mobile width (e.g. 375px). Verify: circles reposition proportionally (no layout overflow/horizontal scrollbar introduced), headline wraps sensibly, idle drift still plays (no cursor available on touch, so only idle motion should be visible).

Expected: all six checks pass. If any fail, fix the corresponding code in Task 2 or this task before proceeding — do not commit with a known visual or console-error regression.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ModernLandingPage.jsx
git commit -m "Wire GravityHeroBackground into hero, restyle headline with italic accent"
```

---

## Self-Review Notes

- **Spec coverage:** Font import (spec "Typography") → Task 1. Component behavior (background, idle drift, cursor push, reduced-motion, viewport-gating) → Task 2, matches spec's "Technical Architecture" and "Performance & Accessibility Safeguards" sections point-for-point. Integration (background swap, headline copy/typography) → Task 3, matches spec's "Changes to existing files" and "Visual Design" sections. Testing plan (manual visual checks, reduced-motion emulation, mobile viewport, console-error check) → Task 3 Step 6, matches spec's "Testing / Validation Plan" verbatim. Out-of-scope items (other page sections, palette shift, WebGL/physics, deleting `particle-text-effect.tsx`) are not touched by any task — confirmed by Task 3 only removing the hero's *usage* of `ParticleTextEffect`, not the component file itself.
- **Placeholder scan:** No TBD/TODO markers; all code blocks are complete, runnable code, not descriptions.
- **Type consistency:** `GravityHeroBackground` (Task 2's default export, no props) matches Task 3's `<GravityHeroBackground />` usage (no props passed). `ShapeConfig`, `computePush`, `GravityShape` are all defined and used only within Task 2's single file — no cross-task signature drift.
