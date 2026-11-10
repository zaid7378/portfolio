"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { site, type Tier } from "@/lib/site";
import { sound } from "@/lib/audio";
import { setPrefs, usePrefs } from "@/lib/prefs";
import Preloader from "./Preloader";
import dynamic from "next/dynamic";
// three.js is split into its own chunk and only fetched in the browser
const ParticlePortrait = dynamic(() => import("./ParticlePortrait"), { ssr: false });
const BurnPortrait = dynamic(() => import("./BurnPortrait"), { ssr: false });
import Scramble, { scrambleHeading } from "./Scramble";
import NavMenu from "./NavMenu";
import { HangingSpider, WebCorner, WebShooter } from "./WebFx";
import { HelloTime, ThemeToggle, hoverTick } from "./chrome";

const noopSubscribe = () => () => {};

// The preloader runs once per visit — coming back to Home from another page skips it.
let booted = false;

export default function Portfolio() {
  const [loaded, setLoaded] = useState(() => booted);
  const [userTier, setTier] = useState<Tier | null>(null);
  // sensible default for weak / small devices until the visitor picks one
  const autoTier = useSyncExternalStore(
    noopSubscribe,
    () => (window.innerWidth < 760 || (navigator.hardwareConcurrency || 4) <= 4 ? "MED" : "HIGH") as Tier,
    () => "HIGH" as Tier
  );
  const tier = userTier ?? autoTier;
  const { audio, theme, design } = usePrefs();
  const root = useRef<HTMLDivElement>(null);

  // browsers only allow audio after a gesture — start on the first click/tap
  useEffect(() => {
    const first = () => {
      if (audio) sound?.start();
      window.removeEventListener("pointerdown", first);
    };
    window.addEventListener("pointerdown", first);
    return () => window.removeEventListener("pointerdown", first);
  }, [audio]);

  useEffect(() => {
    document.documentElement.classList.toggle("locked", !loaded);
    return () => document.documentElement.classList.remove("locked");
  }, [loaded]);

  // hero intro once the preloader leaves
  useLayoutEffect(() => {
    if (!loaded) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".panel", { clipPath: "inset(0 100% 0 0)", duration: 1.4, ease: "expo.inOut" })
        .from(".panel-head > *", { y: 20, opacity: 0, duration: 0.8 }, "-=0.5")
        .from(".panel-rule", { scaleX: 0, transformOrigin: "left", duration: 1.2 }, "<")
        .from(".hero-title .line > span", { yPercent: 110, duration: 1.3, stagger: 0.12 }, "-=0.9")
        .from(".tagline .rule", { scaleX: 0, duration: 1, stagger: 0.1 }, "-=0.8")
        .from(".tagline .tags", { opacity: 0, letterSpacing: "1em", duration: 1.2 }, "<")
        .from(".hero-intro", { opacity: 0, x: -20, duration: 1 }, "-=0.9")
        .from(".hero-intro-bar", { scaleY: 0, transformOrigin: "top", duration: 1 }, "<")
        .from(".ticker", { yPercent: 100, opacity: 0, duration: 1 }, "-=0.8")
        .from(".topbar > *", { y: -24, opacity: 0, duration: 1, stagger: 0.1 }, 0.6)
        .from(".hud", { opacity: 0, duration: 0.6 }, 1.0)
        .from(".hud-corner", { scale: 0.4, opacity: 0, duration: 0.8, stagger: 0.05 }, 1.0)
        .from(".hud-row", { opacity: 0, x: 16, duration: 0.6, stagger: 0.06 }, 1.3)
        .from(".hud-bar i", { scaleX: 0, duration: 1.6, stagger: 0.15, ease: "expo.inOut" }, 1.2)
        .from(".hero-foot > *", { y: 20, opacity: 0, duration: 0.9, stagger: 0.1 }, 1.2)
        .from(".theme-toggle", { x: 30, duration: 0.8 }, 1.4);

      document.querySelectorAll<HTMLElement>(".hud-num b").forEach((el, i) => {
        const target = Number(el.dataset.value);
        const o = { v: 0 };
        gsap.to(o, {
          v: target,
          duration: 2,
          delay: 1.2 + i * 0.15,
          ease: "power3.out",
          onUpdate: () => {
            el.textContent = String(Math.round(o.v));
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [loaded]);

  const headingHover = (e: React.MouseEvent<HTMLElement>) => {
    scrambleHeading(e);
    hoverTick();
  };
  const tickerItems = [...site.ticker, ...site.ticker];

  return (
    <div ref={root} className={`site ${loaded ? "ready" : ""} design-${design.toLowerCase()} ${site.webTheme ? "web-theme" : ""}`}>
      {!loaded && (
        <Preloader
          tier={tier}
          setTier={setTier}
          audio={audio}
          setAudio={(on) => setPrefs({ audio: on })}
          onDone={() => {
            booted = true;
            setLoaded(true);
          }}
        />
      )}

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="hero" id="home">
        <div className="dots" aria-hidden="true" />
        {site.webTheme && loaded && (
          <>
            <WebCorner corner="tr" size={360} />
            <WebCorner corner="bl" size={260} />
            <HangingSpider />
            <WebShooter />
          </>
        )}
        {design === "BURN" ? (
          <BurnPortrait src={site.portrait} cover={site.burnCover} play={loaded} />
        ) : (
          <ParticlePortrait src={site.portrait} tier={tier} theme={theme} design={design} play={loaded} />
        )}

        <aside className="panel">
          <div className="panel-head">
            <span className="brand">{site.brand}</span>
          </div>
          <div className="panel-rule" />

          <div className="panel-body">
            <h1 className="hero-title" onMouseEnter={headingHover}>
              <span className="line"><span className="outline" data-text={site.hero.outline}>{site.hero.outline}</span></span>
              <span className="line"><span data-text={site.hero.solid}>{site.hero.solid}</span></span>
            </h1>

            <div className="tagline">
              <span className="rule" />
              <span className="tags">[ {site.hero.tags.join(" · ")} ]</span>
              <span className="rule" />
            </div>

            <div className="hero-intro-wrap">
              <span className="hero-intro-bar" />
              <p className="hero-intro">{site.hero.intro}</p>
            </div>
          </div>

          <div className="ticker" aria-label="Status">
            <span className="sheen" aria-hidden="true" />
            <div className="ticker-track">
              {tickerItems.map(([k, v], i) => (
                <span className="ticker-item" key={i}>
                  <em>{k}</em>
                  <strong>{v}</strong>
                  <i>•</i>
                </span>
              ))}
            </div>
          </div>
        </aside>

        <div className="hud">
          <span className="hud-corner tl" />
          <span className="hud-corner br" />
          <div className="hud-head">
            <Scramble text="DEVELOPER STATS" play={loaded} delay={1.1} />
            <span className="hud-dots" />
            <span className="hud-live"><i />ACTIVE</span>
          </div>
          <div className="hud-stats">
            {site.stats.map((s, i) => (
              <div className="hud-stat" key={s.label}>
                <span className="hud-idx">0{i + 1}</span>
                <div className="hud-num">
                  <b data-value={s.value}>{s.value}</b>
                  {s.suffix}
                </div>
                <span className="hud-label">{s.label}</span>
                <span className="hud-bar"><i style={{ width: `${s.fill * 100}%` }} /></span>
              </div>
            ))}
          </div>
          <div className="hud-rows">
            {site.specs.map(([k, v], i) => (
              <div className="hud-row" key={k} onMouseEnter={hoverTick}>
                <span>{k}</span>
                <span className="hud-leader" />
                <Scramble text={v} play={loaded} delay={1.4 + i * 0.08} className="hud-val" />
              </div>
            ))}
          </div>
        </div>

        <HelloTime className="hero-foot" />
        <ThemeToggle />
      </section>

      <NavMenu index={1} label="HOME" />
    </div>
  );
}
