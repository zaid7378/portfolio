"use client";

import { useEffect, useRef } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_#<>*+";

/** Decodes text letter-by-letter like a terminal readout. Re-runs on hover. */
export function scramble(el: HTMLElement, text: string, duration = 700, lockWidth = false) {
  if (el.dataset.scrambling) return () => {};
  el.dataset.scrambling = "1";
  // big display fonts change width per glyph — lock it so the layout doesn't jump
  if (lockWidth) {
    el.style.display = "inline-block";
    el.style.minWidth = el.getBoundingClientRect().width + "px";
  }
  const start = performance.now();
  const len = text.length;
  let raf = 0;
  const frame = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const revealed = Math.floor(p * len);
    let out = "";
    for (let i = 0; i < len; i++) {
      const ch = text[i];
      if (i < revealed || !/[A-Za-z0-9]/.test(ch)) out += ch;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) raf = requestAnimationFrame(frame);
    else {
      delete el.dataset.scrambling;
      if (lockWidth) el.style.minWidth = "";
    }
  };
  raf = requestAnimationFrame(frame);
  const finish = () => {
    cancelAnimationFrame(raf);
    delete el.dataset.scrambling;
    if (lockWidth) el.style.minWidth = "";
    el.textContent = text;
  };
  // safety net: always land on the real text, even if frames were throttled
  const safety = setTimeout(finish, duration + 250);
  return () => {
    clearTimeout(safety);
    finish();
  };
}

export default function Scramble({
  text,
  play,
  delay = 0,
  className,
  hover = true,
}: {
  text: string;
  play: boolean;
  delay?: number;
  className?: string;
  hover?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!play || !ref.current) return;
    let cancel = () => {};
    const t = setTimeout(() => (cancel = scramble(ref.current!, text)), delay * 1000);
    return () => {
      clearTimeout(t);
      cancel();
    };
  }, [play, text, delay]);
  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={hover ? (e) => scramble(e.currentTarget, text, 400) : undefined}
    >
      {text}
    </span>
  );
}

/** onMouseEnter handler for headings: decodes every [data-text] child, line by line. */
export function scrambleHeading(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.querySelectorAll<HTMLElement>("[data-text]").forEach((el, i) => {
    scramble(el, el.dataset.text!, 550 + i * 150, true);
  });
}
