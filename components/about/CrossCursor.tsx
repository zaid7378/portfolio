"use client";

import { useEffect, useRef } from "react";

/** Ring cursor with full-screen crosshair hairlines. Mouse/pen only — touch keeps the native behaviour. */
export default function CrossCursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const h = useRef<HTMLDivElement>(null);
  const v = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.documentElement.classList.add("has-cross-cursor");
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let hot = false;
    let shown = false;

    let raf = 0;
    const move = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
      if (!shown) {
        pos.x = target.x;
        pos.y = target.y;
        shown = true;
        document.documentElement.classList.add("cursor-on");
      }
      const t = e.target instanceof Element ? e.target : null;
      hot = !!t?.closest("a, button, [data-cursor='hot']");
    };
    const leave = () => {
      shown = false;
      document.documentElement.classList.remove("cursor-on");
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);

    // runs only while the ring is catching up with the pointer, then sleeps until the next move
    function loop() {
      pos.x += (target.x - pos.x) * 0.2;
      pos.y += (target.y - pos.y) * 0.2;
      const settled = Math.abs(target.x - pos.x) < 0.1 && Math.abs(target.y - pos.y) < 0.1;
      if (settled) {
        pos.x = target.x;
        pos.y = target.y;
      }
      raf = settled ? 0 : requestAnimationFrame(loop);
      if (ring.current) {
        ring.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${hot ? 1.8 : 1})`;
      }
      if (dot.current) dot.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      if (h.current) h.current.style.transform = `translate3d(0, ${pos.y}px, 0)`;
      if (v.current) v.current.style.transform = `translate3d(${pos.x}px, 0, 0)`;
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-cross-cursor", "cursor-on");
    };
  }, []);

  return (
    <div className="cross-cursor" aria-hidden="true">
      <div ref={h} className="cc-h" />
      <div ref={v} className="cc-v" />
      <div ref={ring} className="cc-ring" />
      <div ref={dot} className="cc-dot" />
    </div>
  );
}
