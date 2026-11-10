"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { site, type Tier } from "@/lib/site";
import { sound } from "@/lib/audio";

type Props = {
  tier: Tier;
  setTier: (t: Tier) => void;
  audio: boolean;
  setAudio: (on: boolean) => void;
  onDone: () => void;
};

const STEPS = [
  "INITIALIZING_SYSTEM",
  "LOADING_ASSETS",
  "COMPILING_SHADERS",
  "SAMPLING_PORTRAIT",
  "CALIBRATING_MOTION",
  "SYSTEM_READY",
];

// ── background web geometry (built once). Spokes draw first, then each ring as progress grows ──
const MIN_MS = 2400; // shortest the loader runs
const SPOKES = 16;
const RINGS = 10;
const WEB = (() => {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ang = Array.from({ length: SPOKES }, (_, i) => (i / SPOKES) * Math.PI * 2 + (rnd() - 0.5) * 0.18);
  const f = (n: number) => n.toFixed(1);
  const spokes = ang.map((a) => `M0 0 L${f(Math.cos(a) * 560)} ${f(Math.sin(a) * 560)}`);
  const rings = Array.from({ length: RINGS }, (_, k) => {
    const r = 46 + k * 44 * (1 + k * 0.035);
    let d = "";
    for (let i = 0; i <= SPOKES; i++) {
      const a = ang[i % SPOKES] + (i === SPOKES ? Math.PI * 2 : 0);
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) d = `M${f(x)} ${f(y)}`;
      else {
        const pa = ang[(i - 1) % SPOKES];
        const m = (pa + a) / 2;
        d += ` Q${f(Math.cos(m) * r * 0.88)} ${f(Math.sin(m) * r * 0.88)} ${f(x)} ${f(y)}`;
      }
    }
    return d;
  });
  return { spokes, rings };
})();
/** 0..1 progress for one web piece that draws between pct `a` and `b`. */
const seg = (pct: number, a: number, b: number) => Math.min(1, Math.max(0, (pct - a) / (b - a)));

export default function Preloader({ tier, setTier, audio, setAudio, onDone }: Props) {
  const webRef = useRef<SVGGElement>(null);
  const spiderRef = useRef<HTMLDivElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const progRef = useRef<HTMLDivElement>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const step = STEPS[stepIdx];

  // fake-but-honest progress: it can't pass 90% until the photo + fonts are in.
  // The counter writes straight to the DOM each frame (no React re-render per frame).
  useEffect(() => {
    let assetsReady = false;
    const img = new Image();
    img.src = site.portrait;
    Promise.all([
      new Promise((r) => { img.onload = r; img.onerror = r; }),
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 600)),
    ]).then(() => (assetsReady = true));

    const state = { v: 0, shown: -1, step: 0 };
    const started = performance.now();
    let raf = 0;
    let last = performance.now();
    const run = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // never faster than MIN_MS, so the web gets to spin even when everything is cached
      const timeCap = ((now - started) / MIN_MS) * 100;
      const cap = Math.min(assetsReady ? 100 : 90, timeCap);
      // speed varies a bit so the counter feels "alive"
      // once the photo + fonts are in there's nothing left to wait for → finish briskly
      const speed = 30 + Math.sin(now / 260) * 14 + (assetsReady ? 85 : 0);
      state.v = Math.min(cap, state.v + speed * dt);
      const pct = Math.floor(state.v);
      if (pct !== state.shown) {
        state.shown = pct;
        const txt = String(pct);
        if (baseRef.current) baseRef.current.textContent = txt;
        if (fillRef.current) {
          fillRef.current.textContent = txt;
          fillRef.current.style.clipPath = `inset(${100 - pct}% 0 0 0)`;
        }
        if (barRef.current) barRef.current.style.transform = `scaleX(${pct / 100})`;
        // web spins itself: spokes over 0–22 %, then ring k over its own slice
        const paths = webRef.current?.children;
        if (paths) {
          for (let i = 0; i < paths.length; i++) {
            const p = i < SPOKES ? seg(pct, (i / SPOKES) * 14, (i / SPOKES) * 14 + 8) : seg(pct, 18 + (i - SPOKES) * 7.6, 18 + (i - SPOKES) * 7.6 + 10);
            (paths[i] as SVGPathElement).style.strokeDashoffset = String(1 - p);
          }
        }
        if (spiderRef.current) spiderRef.current.style.setProperty("--p", String(pct / 100));
        if (hexRef.current) hexRef.current.textContent = `0x${(pct * 2731 + 4096).toString(16).toUpperCase().padStart(5, "0")}`;
        progRef.current?.setAttribute("aria-valuenow", txt);
        const s = Math.min(STEPS.length - 1, Math.floor((pct / 100) * (STEPS.length - 1)));
        if (s !== state.step) {
          state.step = s;
          setStepIdx(s);
        }
      }
      if (state.v >= 100) {
        setReady(true);
        return;
      }
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, []);

  // entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".pl-top > *", { y: -14, opacity: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" });
      gsap.from(".pl-rule", { scaleX: 0, transformOrigin: "left", duration: 1.2, ease: "expo.out" });
      gsap.from(".pl-horizon", { scaleX: 0, duration: 1.6, ease: "expo.inOut" });
      gsap.from(".pl-bottom .pl-group", { y: 20, opacity: 0, duration: 0.8, stagger: 0.1, delay: 0.3, ease: "power3.out" });
      gsap.from(".pl-corner", { scale: 0.3, opacity: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" });
      gsap.from(".pl-readout > *", { x: 12, opacity: 0, duration: 0.7, stagger: 0.06, delay: 0.2, ease: "power3.out" });
    }, root);
    return () => ctx.revert();
  }, []);

  // exit
  useEffect(() => {
    if (!ready) return;
    sound?.whoosh();
    const tl = gsap.timeline({ delay: 0.35, onComplete: onDone });
    // transforms only (no top/height) → no layout shift
    // spider zips back up its thread, the web blows away
    tl.to(".pl-spider", { y: "-70vh", duration: 0.55, ease: "power3.in" }, 0)
      .to(".pl-web", { scale: 1.35, opacity: 0, duration: 0.9, ease: "power2.in" }, 0.1)
      .to(".pl-log, .pl-corner, .pl-readout", { opacity: 0, duration: 0.4 }, 0)
      .to(".pl-num", { yPercent: -18, opacity: 0, duration: 0.7, ease: "power3.in" }, 0.05)
      .to(".pl-horizon", { scaleX: 1, scaleY: 1 / 0.38, duration: 0.9, ease: "expo.inOut" }, "<0.1")
      .to(".pl-top, .pl-bottom", { opacity: 0, duration: 0.4 }, "<")
      .to(root.current, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, "-=0.35");
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="preloader" ref={root}>
      <div className="pl-cols" aria-hidden="true" />

      {/* spider web that spins itself as loading progresses */}
      <div className="pl-web" aria-hidden="true">
        <svg viewBox="-500 -500 1000 1000" preserveAspectRatio="xMidYMid slice">
          <g ref={webRef}>
            {[...WEB.spokes, ...WEB.rings].map((d, i) => (
              <path key={i} d={d} pathLength={1} className={i < SPOKES ? "sp" : "rg"} />
            ))}
          </g>
        </svg>
      </div>
      <div className="pl-scan" aria-hidden="true" />

      {/* spider lowering on its thread with the progress */}
      <div className="pl-spider" ref={spiderRef} aria-hidden="true">
        <span className="pl-thread" />
        <svg viewBox="-20 -20 40 40" width="40" height="40">
          <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" className="pl-legs">
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
          <circle cx="-1.2" cy="-5.6" r=".9" fill="#e3262f" />
          <circle cx="1.2" cy="-5.6" r=".9" fill="#e3262f" />
        </svg>
      </div>

      {/* HUD corners */}
      <span className="pl-corner c-tl" aria-hidden="true" />
      <span className="pl-corner c-tr" aria-hidden="true" />
      <span className="pl-corner c-bl" aria-hidden="true" />
      <span className="pl-corner c-br" aria-hidden="true" />

      {/* boot log */}
      <ol className="pl-log" aria-hidden="true">
        {STEPS.slice(0, stepIdx + 1).map((s, i) => (
          <li key={s} className={i < stepIdx || ready ? "done" : "run"}>
            <span>&gt; {s.toLowerCase()}</span>
            <b>{i < stepIdx || ready ? "OK" : "··"}</b>
          </li>
        ))}
      </ol>

      {/* live readout */}
      <div className="pl-readout" aria-hidden="true">
        <span>
          SIGNAL <b ref={hexRef}>0x01000</b>
        </span>
        <span>
          WEB_INTEGRITY <b>{ready ? "100%" : "SPINNING"}</b>
        </span>
        <span>
          MODE <b>{tier}</b>
        </span>
      </div>

      <div className="pl-top">
        <span className="pl-brand">{site.brand.toUpperCase()}</span>
        <span className="pl-status">{ready ? "ONLINE" : "BOOTING"}</span>
      </div>
      <div className="pl-rule" />

      <div className="pl-horizon" aria-hidden="true" />

      <div className="pl-num-wrap" aria-hidden="true">
        <div className="pl-num">
          <span className="pl-num-base" ref={baseRef}>0</span>
          <span className="pl-num-fill" ref={fillRef} style={{ clipPath: "inset(100% 0 0 0)" }}>
            0
          </span>
          <sup>%</sup>
        </div>
      </div>

      <div className="pl-bottom">
        <div className="pl-row">
          <div className="pl-group">
            <span className="pl-label">PERFORMANCE TIER</span>
            <div className="pl-btns">
              {(["HIGH", "MED", "SAVER"] as Tier[]).map((t) => (
                <button
                  key={t}
                  className={t === tier ? "on" : ""}
                  onClick={() => {
                    setTier(t);
                    sound?.tick();
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="pl-group pl-right">
            <span className="pl-label">AUDIO</span>
            <div className="pl-btns">
              <button
                className={audio ? "on" : ""}
                onClick={() => {
                  setAudio(true);
                  sound?.setEnabled(true);
                  sound?.start();
                  sound?.tick();
                }}
              >
                ON
              </button>
              <button
                className={!audio ? "on" : ""}
                onClick={() => {
                  setAudio(false);
                  sound?.setEnabled(false);
                }}
              >
                OFF
              </button>
            </div>
          </div>
        </div>
        <div className="pl-line" />
        <div className="pl-row pl-meta">
          <span className="pl-step">
            <i /> {step}
          </span>
          <span className="pl-loading">{ready ? "COMPLETE" : "LOADING"}</span>
        </div>
        <div className="pl-bar" ref={progRef} role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
          <span ref={barRef} style={{ transform: "scaleX(0)" }} />
        </div>
      </div>
    </div>
  );
}
