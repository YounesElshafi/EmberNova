import { useEffect, useRef } from "react";

/**
 * Conceptual illustration of how gravity shapes a small diffusion flame. With buoyancy, hot gas
 * rises and draws fresh air in from below, giving a tall, sooty, yellow flame. Without buoyancy,
 * oxygen reaches the fuel only by diffusion, and the flame becomes a dimmer, near-spherical,
 * blue envelope. This is a particle drawing, not a combustion simulation and not NASA data.
 */
export function FlameCanvas({
  gravity,
  className = "",
  label = "Conceptual illustration of a flame changing shape as gravity is reduced",
}: {
  gravity: number | (() => number);
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gRef = useRef(gravity);
  gRef.current = gravity;
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number };
    const ps: P[] = [];
    let raf = 0, w = 0, h = 0, visible = true;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Time step in 60 fps frames, so the drawing looks the same on slow and fast devices.
      const f = Math.min(3, Math.max(0.2, (now - last) / 16.7));
      last = now;
      if (!visible) return;
      const gv = gRef.current;
      const g = Math.min(1, Math.max(0, typeof gv === "function" ? gv() : gv));
      const cx = w / 2, cy = h * 0.6, s = Math.min(w, h) / 320;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < (reduce ? 0 : Math.round(12 * f)); i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 0.35 + Math.random() * 0.5;
        ps.push({ x: cx + Math.cos(a) * 5 * s, y: cy + Math.sin(a) * 4 * s, vx: Math.cos(a) * sp * (1 - g * 0.75) * s, vy: Math.sin(a) * sp * (1 - g * 0.85) * s, life: 0, max: 50 + Math.random() * 45 });
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += f;
        p.vy = Math.max(p.vy - g * 0.09 * s * f, -1.9 * s); // buoyant lift, with a terminal speed
        p.vx *= Math.pow(0.985 - g * 0.02, f); // entrainment pulls the plume inward
        p.x += (p.vx + (g > 0.3 ? (cx - p.x) * 0.0035 * g : 0)) * f;
        p.y += p.vy * f;
        const k = p.life / p.max;
        if (k >= 1) { ps.splice(i, 1); continue; }
        // Colour: yellow-orange soot glow with gravity, blue chemiluminescence without.
        const warm = g;
        const r = Math.round(lerp(90, 255, warm) * (1 - k * 0.4));
        const gg = Math.round(lerp(140, 150 + 60 * (1 - k), warm) * (1 - k * 0.5));
        const b = Math.round(lerp(255, 40, warm) * (1 - k * 0.3));
        const alpha = (1 - k) * lerp(0.13, 0.12, warm);
        const rad = (lerp(9, 10, warm) + k * lerp(14, 7, warm)) * s;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        grd.addColorStop(0, `rgba(${r},${gg},${b},${alpha})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      if (reduce) {
        // Static rendering: draw the envelope shape once per frame without particles.
        ctx.globalCompositeOperation = "lighter";
        const grd = ctx.createRadialGradient(cx, cy - g * 30 * s, 2, cx, cy - g * 30 * s, (40 + g * 20) * s);
        grd.addColorStop(0, g > 0.5 ? "rgba(255,200,90,0.5)" : "rgba(110,160,255,0.45)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(cx, cy - g * 30 * s, 40 * s, (40 + g * 45) * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Fuel droplet / wick
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#1a1310";
      ctx.beginPath();
      ctx.arc(cx, cy, 3.4 * s, 0, Math.PI * 2);
      ctx.fill();
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);
  return <canvas ref={ref} className={`flame-canvas ${className}`} role="img" aria-label={label} />;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
