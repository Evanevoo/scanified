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
