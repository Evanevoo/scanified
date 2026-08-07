import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * ScrollScrubVideoHero
 *
 * A full-bleed hero whose video timeline is driven by scroll position rather
 * than by playback. Scrolling down advances the clip, scrolling up rewinds it,
 * one-to-one.
 *
 * ── How the mapping works ──────────────────────────────────────────────────
 * The outer <section> is deliberately much taller than the viewport. Inside it
 * a sticky pane holds the video and stays fixed while that extra height scrolls
 * past. The distance the section has travelled through the viewport is the
 * scrub position:
 *
 *   scrollable = section.height - viewport.height      // the usable travel
 *   progress   = clamp(-section.top / scrollable, 0, 1)
 *   video.currentTime = progress * video.duration
 *
 * `-section.top` is how far the section's top edge has gone above the fold, so
 * progress is 0 the moment the section pins and 1 the moment it unpins. That is
 * what makes it exact in both directions — there is no playback state to get
 * out of sync, only a number derived from where the page is.
 *
 * ── Tuning SCRUB_SCREENS ───────────────────────────────────────────────────
 * SCRUB_SCREENS is how many viewport heights of scrolling the clip is stretched
 * across. Higher means slower, more cinematic, more scrolling before the user
 * reaches real content. Lower means the clip races past. For a ~10s clip, 3–4
 * feels one-to-one with a trackpad; below 2 the video outruns the wheel and
 * above ~6 people think the page is stuck.
 *
 * ── Why currentTime is not set on every scroll event ───────────────────────
 * Scroll fires far faster than a decoder can retire seeks. Assigning
 * currentTime per event queues them up and the picture lags the wheel by
 * hundreds of milliseconds. Instead the scroll handler only records a target;
 * a rAF loop eases the actual playhead toward it and refuses to issue a new
 * seek while one is still in flight.
 *
 * ── iOS / Safari ───────────────────────────────────────────────────────────
 * Safari seeks to the nearest keyframe, so a normally-encoded MP4 (one keyframe
 * every ~250 frames) scrubs in visible steps. The asset is therefore shipped
 * twice: `generate_the_video.scrub.mp4` is re-encoded with a 5-frame GOP so a
 * seek decodes almost nothing, and the original is kept as a fallback source.
 * Safari also refuses to seek at all until it has metadata and will silently
 * ignore currentTime before `loadedmetadata`, which is why scrubbing is gated
 * on `ready`. If a future clip is much longer, the next step is a frame
 * sequence blitted to canvas — no decoder involved — but at ten seconds that
 * is a lot of images for no visible gain.
 */

const SCRUB_SCREENS = 3.5;

export default function ScrollScrubVideoHero({
  src = '/landing/generate_the_video.scrub.mp4',
  fallbackSrc = '/landing/generate_the_video.mp4',
  poster = '/landing/generate_the_video.poster.jpg',
  eyebrow,
  headline,
  sub,
  children,
}) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [scrub, setScrub] = useState(false);
  const [progress, setProgress] = useState(0);

  // Refs, not state: these are written every frame and must not re-render.
  const target = useRef(0);
  const current = useRef(0);
  const seeking = useRef(false);

  const measure = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const p = scrollable > 0
      ? Math.min(1, Math.max(0, -rect.top / scrollable))
      : 0;
    target.current = p;
    setProgress(p);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) {
      // No scrub, no pinning: the poster is a real frame of the clip, so the
      // hero still shows the product rather than an empty box.
      setScrub(false);
      return undefined;
    }
    setScrub(true);

    let raf = 0;
    const video = videoRef.current;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const v = videoRef.current;
      if (!v || !ready || seeking.current) return;
      const duration = v.duration;
      if (!duration || !Number.isFinite(duration)) return;

      // Ease toward the target instead of snapping to it. This is what makes
      // a flung trackpad feel like film rather than like a slideshow.
      current.current += (target.current - current.current) * 0.16;
      const t = Math.min(duration - 0.05, current.current * duration);
      if (Math.abs(v.currentTime - t) > 0.012) {
        seeking.current = true;
        try {
          v.currentTime = t;
        } catch {
          seeking.current = false;
        }
      }
    };

    const onSeeked = () => { seeking.current = false; };
    video?.addEventListener('seeked', onSeeked);
    video?.addEventListener('error', () => setScrub(false));

    measure();
    raf = requestAnimationFrame(tick);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(raf);
      video?.removeEventListener('seeked', onSeeked);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, ready]);

  const onMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    // Park on frame 0 so the first paint is the clip, never a blank plane.
    try { v.currentTime = 0; } catch { /* Safari pre-metadata */ }
    setReady(true);
  };

  return (
    <section
      id="main-content"
      ref={sectionRef}
      className="relative w-full"
      style={scrub ? { height: `${SCRUB_SCREENS * 100}vh` } : undefined}
      aria-label="Scanified in the field"
    >
      <div
        className={
          scrub
            ? 'sticky top-0 h-screen w-full overflow-hidden bg-[#06131A]'
            : 'relative h-[70vh] w-full overflow-hidden bg-[#06131A]'
        }
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          poster={poster}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={onMeta}
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src={src} type="video/mp4" />
          <source src={fallbackSrc} type="video/mp4" />
        </video>

        {/* A pool under the type, not a sheet over the picture. Heavy only at
            the two edges where text sits; the middle of the frame, where the
            product actually is, stays close to untouched. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(62% 34% at 50% 8%, rgba(4,17,23,0.86), transparent 72%),' +
              'linear-gradient(180deg, rgba(4,17,23,0.74) 0%, rgba(4,17,23,0.34) 20%,' +
              'rgba(4,17,23,0.04) 38%, rgba(4,17,23,0.04) 58%, rgba(4,17,23,0.52) 82%,' +
              'rgba(4,17,23,0.94) 100%)',
          }}
        />

        <div className="absolute inset-x-0 top-0 z-10 px-6 pt-[clamp(84px,11vh,132px)] text-center">
          {eyebrow && (
            <span className="mb-4 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5AD3CA]">
              {eyebrow}
            </span>
          )}
          {headline && (
            <h1 className="mx-auto mb-4 max-w-[17ch] text-[clamp(34px,5.4vw,68px)] font-bold leading-[1.03] tracking-[-0.035em] text-white [text-shadow:0_2px_34px_rgba(0,0,0,0.62)]">
              {headline}
            </h1>
          )}
          {sub && (
            <p className="mx-auto max-w-[54ch] text-[clamp(14.5px,1.2vw,17px)] leading-relaxed text-white/85 [text-shadow:0_1px_20px_rgba(0,0,0,0.6)]">
              {sub}
            </p>
          )}
        </div>

        {children && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 px-6 pb-[clamp(30px,5.5vh,62px)]">
            {children}
          </div>
        )}

        {scrub && (
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-20 h-[2px] bg-white/10">
            <span
              className="block h-full w-full origin-left bg-gradient-to-r from-[#40B5AD] to-[#5AD3CA]"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
