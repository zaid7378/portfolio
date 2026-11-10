"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { site } from "@/lib/site";
import { sound } from "@/lib/audio";
import NavMenu from "../NavMenu";
import { HelloTime, ThemeToggle, hoverTick } from "../chrome";
import { scramble } from "../Scramble";
import Starfield from "../about/Starfield";
import CrossCursor from "../about/CrossCursor";
import Thumb from "./Thumb";

const P = site.projects;
const pad = (n: number) => String(n).padStart(2, "0");

export default function ProjectsPage() {
  const root = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLElement | null)[]>([]);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const counterName = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ab-hero-word span", { yPercent: 60, opacity: 0.2, duration: 0.7, ease: "expo.out" });
      // clearProps: hand opacity back to the CSS (active row bright, others dimmed)
      gsap.from(".pj-row", { y: 40, opacity: 0, duration: 1, stagger: 0.08, delay: 0.1, ease: "power3.out", clearProps: "opacity,transform" });
      gsap.from(".pj-rail, .pj-counter", { opacity: 0, duration: 1, delay: 0.3 });
      gsap.from(".ab-fixed-foot > *, .topbar > *", { opacity: 0, y: 20, duration: 0.9, stagger: 0.08, delay: 0.3, ease: "power3.out" });
    }, root);
    return () => ctx.revert();
  }, []);

  // active project = the row closest to the middle of the screen; rail thumb follows scroll progress
  useEffect(() => {
    let raf = 0;
    let current = -1;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      let best = 0, bestD = Infinity;
      rows.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best !== current) {
        current = best;
        setActive(best);
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const prog = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (thumbRef.current) thumbRef.current.style.transform = `translate3d(0, ${prog * 100}%, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (counterName.current) scramble(counterName.current, P[active].title.toUpperCase(), 450);
  }, [active]);

  const goTo = (i: number) => {
    sound?.tick(1200);
    const el = rows.current[i];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + el.offsetHeight / 2;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div ref={root} className="about-page projects-page">
      <Starfield />
      <div className="ab-dots" aria-hidden="true" />
      <div className="ab-band top" aria-hidden="true" />
      <div className="ab-band bottom" aria-hidden="true" />
      <CrossCursor />

      {/* ── fixed chrome ── */}
      <Link href="/" className="ab-brand" onMouseEnter={hoverTick}>
        {site.brand}
      </Link>
      <div className="ab-hero-title">
        <nav className="ab-crumb" aria-label="Breadcrumb">
          <Link href="/">HOME</Link>
          <span>/</span>
          <b>PROJECTS</b>
        </nav>
        <h1 className="ab-hero-word">
          <span>PROJECTS</span>
        </h1>
      </div>
      <HelloTime className="ab-fixed-foot" />
      <ThemeToggle />
      <NavMenu index={3} label="PROJECTS" placement="bottom" />

      {/* ── left index rail ── */}
      <nav className="pj-rail" aria-label="Project index">
        <span className="pj-rail-label">INDEX</span>
        <div className="pj-rail-body">
          <div className="pj-track" aria-hidden="true">
            <small>00</small>
            <span className="pj-track-line">
              <span className="pj-track-thumb" ref={thumbRef} />
            </span>
            <small>100</small>
          </div>
          <ol>
            {P.map((p, i) => (
              <li key={p.title}>
                <button className={i === active ? "on" : ""} onClick={() => goTo(i)} onMouseEnter={hoverTick}>
                  <b>{pad(i + 1)}</b>
                  <span>{p.title.toUpperCase()}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* ── right counter ── */}
      <aside className="pj-counter" aria-live="polite">
        <div className="pj-count">
          <b key={active}>{pad(active + 1)}</b>
          <small>/{pad(P.length)}</small>
        </div>
        <span className="pj-count-rule" />
        <span className="pj-count-name" ref={counterName}>
          {P[active].title.toUpperCase()}
        </span>
        <span className="pj-count-cat">{P[active].category}</span>
        <span className="pj-scroll">
          <i /> SCROLL
        </span>
      </aside>

      {/* ── project list ── */}
      <main className="pj-main">
        {P.map((p, i) => {
          return (
            <article
              key={p.title}
              ref={(el) => {
                rows.current[i] = el;
              }}
              className={`pj-row ${i === active ? "on" : ""}`}
              onMouseEnter={(e) => {
                hoverTick();
                const h = e.currentTarget.querySelector<HTMLElement>("h2");
                if (h) scramble(h, p.title.toUpperCase(), 420);
              }}
            >
              <div className="pj-thumb">
                <span className="ab-corner tl" />
                <span className="ab-corner br" />
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={`${p.title} preview`} loading={i < 2 ? "eager" : "lazy"} decoding="async" />
                ) : (
                  <Thumb index={i} />
                )}
              </div>
              <div className="pj-info">
                <p className="pj-meta">
                  <b>{pad(i + 1)}</b>
                  <span>
                    {p.category} · {p.service} · {p.year}
                  </span>
                </p>
                <h2>{p.title.toUpperCase()}</h2>
                <p className="pj-desc">{p.desc}</p>
                <div className="pj-foot">
                  <ul className="pj-tags">
                    {p.tags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  {p.href ? (
                    <a className="pj-view" href={p.href} target={p.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                      VIEW CASE <i>→</i>
                    </a>
                  ) : (
                    <span className="pj-view muted-link">
                      CASE SOON <i>→</i>
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}
