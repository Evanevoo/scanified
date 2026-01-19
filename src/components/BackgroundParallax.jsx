import React, { useRef, useEffect } from 'react';

export default function BackgroundParallax({ color1 = '#667EEA', color2 = '#3B82F6' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.clientWidth * devicePixelRatio);
    let height = (canvas.height = canvas.clientHeight * devicePixelRatio);
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const particles = [];
    const count = Math.max(20, Math.floor((canvas.clientWidth * canvas.clientHeight) / 60000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        r: 8 + Math.random() * 24,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        hue: Math.random() * 360,
      });
    }

    let mouseX = canvas.clientWidth / 2;
    let mouseY = canvas.clientHeight / 2;

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      mouseX = clientX - rect.left;
      mouseY = clientY - rect.top;
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });

    let raf = null;
    function draw() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // subtle radial gradient
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, color1 + '33');
      g.addColorStop(1, color2 + '22');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      particles.forEach((p) => {
        // parallax offset based on mouse
        const dx = (mouseX - w / 2) / w;
        const dy = (mouseY - h / 2) / h;

        p.x += p.vx + dx * 0.6;
        p.y += p.vy + dy * 0.6;

        if (p.x < -50) p.x = w + 50;
        if (p.x > w + 50) p.x = -50;
        if (p.y < -50) p.y = h + 50;
        if (p.y > h + 50) p.y = -50;

        const rad = p.r;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 60%, 0.9)`);
        grad.addColorStop(0.5, `hsla(${p.hue}, 80%, 60%, 0.25)`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);

        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }

    draw();

    function handleResize() {
      width = (canvas.width = canvas.clientWidth * devicePixelRatio);
      height = (canvas.height = canvas.clientHeight * devicePixelRatio);
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [color1, color2]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
        opacity: 0.95
      }}
      aria-hidden
    />
  );
}
