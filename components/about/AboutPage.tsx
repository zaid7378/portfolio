"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { site } from "@/lib/site";
import { sound } from "@/lib/audio";
import NavMenu from "../NavMenu";
import { HelloTime, ThemeToggle, hoverTick } from "../chrome";
import { scramble, scrambleHeading } from "../Scramble";
import Starfield from "./Starfield";
import CrossCursor from "./CrossCursor";
import dynamic from "next/dynamic";
// three.js lives in its own chunk, fetched only in the browser
const SignalPortrait = dynamic(() => import("./SignalPortrait"), { ssr: false });

const A = site.about;

/** "01  INTRODUCTION" label with the rule underneath. */
function SectionLabel({ n, children }: { n: string; children: string }) {
  return (
    <div className="ab-label reveal">
      <b>{n}</b>
      <span data-scramble={children}>{children}</span>
    </div>
  );
}

/** Two-line display heading, each line masked & slid up when revealed. Scrambles on hover. */
/** `instant`: above-the-fold titles are visible from the first paint (faster LCP). */
function BigTitle({ lines, instant = false }: { lines: string[]; instant?: boolean }) {
  return (
    <h2
      className={`ab-title ${instant ? "in" : "reveal"}`}
      onMouseEnter={(e) => {
        scrambleHeading(e);
        hoverTick();
      }}
    >
      {lines.map((l) => (
        <span className="ab-line" key={l}>
          <span data-text={l}>{l}</span>
        </span>
      ))}
    </h2>
  );
}

/** Paragraph whose words light up as it scrolls through the viewport. */
function ReadText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`ab-read ${className}`} data-read>
      {text.split(" ").map((w, i) => (
        <span key={i}>{w} </span>
      ))}
    </p>
  );
}

export default function AboutPage() {
  const root = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  // entrance
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ab-hero-word span", { yPercent: 60, opacity: 0.2, duration: 0.7, ease: "expo.out" });
      gsap.from(".ab-crumb, .ab-brand", { opacity: 0, y: -10, duration: 0.8, stagger: 0.08, delay: 0.3 });
      gsap.from(".ab-fixed-foot > *, .topbar > *", { opacity: 0, y: 20, duration: 0.9, stagger: 0.08, delay: 0.4, ease: "power3.out" });
      gsap.from(".ab-card", { clipPath: "inset(0 0 100% 0)", duration: 1.4, ease: "expo.inOut", delay: 0.25 });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    // reveal on scroll (+ decode the section labels)
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          e.target.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el) => scramble(el, el.dataset.scramble!, 700));
          io.unobserve(e.target);
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    root.current!.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    // scroll-driven bits: big title drift + word-by-word paragraphs
    const reads = Array.from(root.current!.querySelectorAll<HTMLElement>("[data-read]"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const y = window.scrollY;
      if (titleRef.current) titleRef.current.style.transform = `translate3d(0, ${-Math.min(y * 0.35, 70)}px, 0)`;
      for (const p of reads) {
        const r = p.getBoundingClientRect();
        const prog = Math.min(1, Math.max(0, (vh * 0.92 - r.top) / (r.height + vh * 0.35)));
        const words = p.children;
        const lit = Math.round(prog * words.length * 1.15);
        for (let i = 0; i < words.length; i++) words[i].classList.toggle("lit", i < lit);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={root} className="about-page">
      <Starfield />
      <div className="ab-dots" aria-hidden="true" />
      <div className="ab-band top" aria-hidden="true" />
      <div className="ab-band bottom" aria-hidden="true" />
      <CrossCursor />

      {/* ── fixed chrome ── */}
      <Link href="/" className="ab-brand" onMouseEnter={hoverTick}>
        {site.brand}
      </Link>
      <div className="ab-hero-title" ref={titleRef}>
        <nav className="ab-crumb" aria-label="Breadcrumb">
          <Link href="/">HOME</Link>
          <span>/</span>
          <b>ABOUT</b>
        </nav>
        <h1 className="ab-hero-word">
          <span>ABOUT</span>
        </h1>
      </div>
      <HelloTime className="ab-fixed-foot" />
      <ThemeToggle />
      <NavMenu index={2} label="ABOUT" placement="bottom" />

      <main className="ab-main">
        {/* ── 01 INTRODUCTION ── */}
        <section className="ab-intro">
          <div className="ab-intro-copy">
            <SectionLabel n="01">INTRODUCTION</SectionLabel>
            <p className="ab-kicker">{A.intro.kicker}</p>
            <BigTitle lines={A.intro.title} instant />
            <ReadText text={A.intro.body} />
          </div>

          <figure className="ab-card-wrap">
            <div className="ab-card" data-cursor="hot">
              <span className="ab-corner tl" />
              <span className="ab-corner br" />
              <SignalPortrait src={site.portrait} />
              <span className="ab-card-rule" />
            </div>
            <figcaption>
              <span>{site.brand.toUpperCase()}</span>
              <span>{site.city.toUpperCase()}</span>
            </figcaption>
          </figure>
        </section>

        {/* ── facts strip ── */}
        <section className="ab-facts reveal" aria-label="Quick facts">
          <div className="ab-facts-row">
            {A.facts.map(([k, v]) => (
              <div className="ab-fact" key={k} onMouseEnter={hoverTick}>
                <span>{k}</span>
                <b data-scramble={v}>{v}</b>
              </div>
            ))}
          </div>
        </section>

        {/* ── 02 HOW I WORK ── */}
        <section className="ab-how">
          <SectionLabel n="02">HOW I WORK</SectionLabel>
          <div className="ab-cards">
            {A.principles.map((p, i) => (
              <article
                key={p.title}
                className="ab-principle reveal"
                style={{ transitionDelay: `${i * 0.08}s` }}
                onMouseEnter={(e) => {
                  hoverTick();
                  const h = e.currentTarget.querySelector<HTMLElement>("h3");
                  if (h) scramble(h, p.title.toUpperCase(), 420);
                }}
              >
                <b className="ab-idx">0{i + 1}</b>
                <h3>{p.title.toUpperCase()}</h3>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── 03 TOOLKIT ── */}
        <section className="ab-toolkit">
          <SectionLabel n="03">TOOLKIT</SectionLabel>
          <p className="ab-kicker strong reveal">{A.toolkit.kicker}</p>
          <BigTitle lines={A.toolkit.title} />
          <ReadText text={A.toolkit.lead} className="wide reveal" />

          <div className="ab-sectors">
            {A.toolkit.sectors.map((s, i) => (
              <div className="ab-sector reveal" key={s.name}>
                <div className="ab-sector-name">
                  <small>SECTOR_0{i + 1}</small>
                  <b>{s.name}</b>
                </div>
                <ul className="ab-chips">
                  {s.tools.map((t, k) => (
                    <li key={t} style={{ transitionDelay: `${0.15 + k * 0.05}s` }} onMouseEnter={hoverTick}>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <ReadText text={A.toolkit.outro} className="wide reveal" />
        </section>

        {/* ── 04 NEXT ── */}
        <section className="ab-next">
          <SectionLabel n="04">NEXT</SectionLabel>
          <p className="ab-kicker strong reveal">{A.next.kicker}</p>
          <BigTitle lines={A.next.title} />
          <p className="ab-body reveal">{A.next.body}</p>
          <a
            className="ab-cta reveal"
            href={`mailto:${site.email}`}
            onMouseEnter={hoverTick}
            onClick={() => sound?.tick(1200)}
            onMouseMove={(e) => {
              // subtle magnetic pull
              const r = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - r.left - r.width / 2) * 0.12;
              const y = (e.clientY - r.top - r.height / 2) * 0.2;
              e.currentTarget.style.transform = `translate(${x}px, ${y}px)`;
            }}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
          >
            <span>{A.next.cta}</span>
            <i>↗</i>
          </a>
        </section>
      </main>
    </div>
  );
}
