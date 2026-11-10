"use client";

// Web-slinger theme pieces for the home page:
//  <WebCorner/>      a spider web anchored in a corner (SVG, drawn in on load)
//  <HangingSpider/>  a small spider dangling on a thread, swinging
//  <WebShooter/>     click anywhere empty → a web line shoots from the corner to the cursor and splats

import { useEffect, useRef } from "react";
import { sound } from "@/lib/audio";

/** Corner spider web. `corner` decides which screen corner it hangs from. */
export function WebCorner({ corner, size = 340 }: { corner: "tl" | "tr" | "bl" | "br"; size?: number }) {
  const spokes = 9;
  const rings = 7;
  // spokes fan out over 90° from the corner (0,0)
  const ang = Array.from({ length: spokes }, (_, i) => (i / (spokes - 1)) * (Math.PI / 2));
  const r = (k: number) => (size * (k + 1)) / rings;
  const pt = (a: number, rad: number) => [Math.cos(a) * rad, Math.sin(a) * rad];
  const ringPaths = Array.from({ length: rings }, (_, k) => {
    const rad = r(k);
    let d = "";
    ang.forEach((a, i) => {
      const [x, y] = pt(a, rad);
      if (i === 0) d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
      else {
        // threads sag toward the corner between spokes
        const mid = (ang[i - 1] + a) / 2;
        const [cx, cy] = pt(mid, rad * 0.86);
        d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    });
    return d;
  });
  return (
    <svg className={`web-corner wc-${corner}`} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {ang.map((a, i) => {
        const [x, y] = pt(a, size * 1.02);
        return <path key={`s${i}`} className="wc-spoke" d={`M0 0 L${x.toFixed(1)} ${y.toFixed(1)}`} style={{ animationDelay: `${i * 0.05}s` }} />;
      })}
      {ringPaths.map((d, k) => (
        <path key={`r${k}`} className="wc-ring" d={d} style={{ animationDelay: `${0.35 + k * 0.08}s` }} />
      ))}
    </svg>
  );
}

/** Generic little spider (body + 8 legs) dangling on a silk thread. */
export function HangingSpider() {
  return (
    <div className="hang" aria-hidden="true">
      <span className="hang-thread" />
      <svg className="hang-spider" viewBox="-20 -20 40 40" width="34" height="34">
        <g className="legs" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M-3 -3 L-10 -9 L-15 -4" />
          <path d="M-3 -1 L-12 -4 L-17 2" />
          <path d="M-3 1 L-12 4 L-16 11" />
          <path d="M-3 3 L-9 9 L-12 16" />
          <path d="M3 -3 L10 -9 L15 -4" />
          <path d="M3 -1 L12 -4 L17 2" />
          <path d="M3 1 L12 4 L16 11" />
          <path d="M3 3 L9 9 L12 16" />
        </g>
        <ellipse cx="0" cy="-5" rx="3.2" ry="3" fill="currentColor" />
        <ellipse cx="0" cy="3" rx="5" ry="6.5" fill="currentColor" />
        <circle cx="-1.2" cy="-5.6" r=".8" fill="var(--web-accent)" />
        <circle cx="1.2" cy="-5.6" r=".8" fill="var(--web-accent)" />
      </svg>
    </div>
  );
}

/** Click empty space → web line shoots from the nearest top corner to the click, then a splat web. */
export function WebShooter() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      c.width = W * dpr;
      c.height = H * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    type Shot = { x0: number; y0: number; x: number; y: number; t: number; seed: number };
    const shots: Shot[] = [];
    let raf = 0;

    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest("a, button, input, textarea, .navbox, .panel, .hud")) return;
      const fromLeft = e.clientX > W / 2;
      shots.push({ x0: fromLeft ? 0 : W, y0: 0, x: e.clientX, y: e.clientY, t: performance.now(), seed: Math.random() * 10 });
      if (shots.length > 6) shots.shift();
      sound?.whoosh();
      if (!raf) raf = requestAnimationFrame(draw);
    };
    window.addEventListener("pointerdown", onDown);

    function draw(now: number) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const col = getComputedStyle(document.documentElement).getPropertyValue("--web-silk").trim() || "#fff";
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        const age = (now - s.t) / 1000;
        if (age > 1.8) {
          shots.splice(i, 1);
          continue;
        }
        const shoot = Math.min(1, age / 0.18); // line travels in 0.18 s
        const fade = 1 - Math.max(0, (age - 0.9) / 0.9);
        ctx.globalAlpha = fade;
        ctx.strokeStyle = col;
        ctx.lineCap = "round";
        // main strand (slight sag, two twisted fibres)
        const ex = s.x0 + (s.x - s.x0) * shoot, ey = s.y0 + (s.y - s.y0) * shoot;
        for (let f = 0; f < 2; f++) {
          ctx.lineWidth = f ? 0.8 : 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x0, s.y0);
          const mx = (s.x0 + ex) / 2 + (f ? 3 : -2), my = (s.y0 + ey) / 2 + 18 * shoot;
          ctx.quadraticCurveTo(mx, my, ex, ey);
          ctx.stroke();
        }
        // splat: little web at the impact point
        if (shoot >= 1) {
          const grow = Math.min(1, (age - 0.18) / 0.22);
          const R = 26 * grow;
          ctx.lineWidth = 1;
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + s.seed;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x + Math.cos(a) * R * (0.8 + ((k * 37) % 5) * 0.08), s.y + Math.sin(a) * R);
            ctx.stroke();
          }
          for (let ring = 1; ring <= 3; ring++) {
            ctx.beginPath();
            for (let k = 0; k <= 8; k++) {
              const a = (k / 8) * Math.PI * 2 + s.seed;
              const rr = R * ring * 0.3;
              const px = s.x + Math.cos(a) * rr, py = s.y + Math.sin(a) * rr;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      raf = shots.length ? requestAnimationFrame(draw) : 0;
      if (!shots.length) ctx.clearRect(0, 0, W, H);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={ref} className="web-shots" aria-hidden="true" />;
}
