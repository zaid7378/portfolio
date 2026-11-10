"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { site, type Design } from "@/lib/site";
import { sound } from "@/lib/audio";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { scramble } from "./Scramble";
import { SocialIcon, WaveIcon, hoverTick } from "./chrome";

type Props = {
  /** number shown in the pill, e.g. 1 for HOME, 2 for ABOUT */
  index: number;
  label: string;
  /** "top": pinned top-right, opens downward (home). "bottom": pinned bottom-right, opens upward. */
  placement?: "top" | "bottom";
};

/** Audio toggle + glass pill that expands into the menu (links, design switcher, socials). */
export default function NavMenu({ index, label, placement = "top" }: Props) {
  const [menu, setMenu] = useState(false);
  const { design, audio } = usePrefs();
  const root = useRef<HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // grow the panel and stagger its items in
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (menu) {
        gsap.to(".navbox-body", { height: "auto", duration: 0.75, ease: "expo.out" });
        gsap.fromTo(
          ".navbox-body .nb-anim",
          { y: placement === "top" ? 14 : -14, opacity: 0, filter: "blur(6px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.6, stagger: 0.04, delay: 0.08, ease: "power3.out" }
        );
      } else {
        gsap.to(".navbox-body", { height: 0, duration: 0.55, ease: "expo.inOut" });
      }
    }, root);
    return () => ctx.kill();
  }, [menu, placement]);

  // close on Escape / outside click
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(".navbox")) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [menu]);

  const closeMenu = useCallback(() => {
    sound?.tick(1200);
    setMenu(false);
  }, []);

  const pickDesign = (d: Design) => {
    setPrefs({ design: d });
    sound?.whoosh();
    if (pathname !== "/") {
      setMenu(false);
      router.push("/");
    }
  };

  const toggleAudio = () => {
    const next = !audio;
    setPrefs({ audio: next });
    sound?.setEnabled(next);
    if (next) sound?.start();
  };

  return (
    <header ref={root} className={`topbar ${placement === "bottom" ? "at-bottom" : ""}`}>
      <button className="audio-btn" onClick={toggleAudio} aria-label={audio ? "Mute" : "Unmute"} onMouseEnter={hoverTick}>
        <WaveIcon on={audio} />
      </button>

      <div className={`navbox ${menu ? "open" : ""} ${placement === "bottom" ? "up" : ""}`}>
        <div className="navbox-head">
          <span className="pill-label">
            <span className="pill-idx">[{index}]</span>
            <span className="pill-name">{label}</span>
          </span>
          <button
            className={`menu-btn ${menu ? "x" : ""}`}
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => {
              setMenu(!menu);
              sound?.tick(menu ? 900 : 1500);
            }}
          >
            <i />
            <i />
            <i />
            <i />
            <i />
          </button>
        </div>

        <div className="navbox-body" aria-hidden={!menu}>
          <div className="nb-inner">
            <div className="nb-title nb-anim">
              <strong>Menu</strong>
              <span>NAVIGATION</span>
            </div>

            <ul className="nb-links">
              {site.menu.map(({ label: n, href }, k) => {
                const i = site.menu.length - k + 1;
                const internal = href.startsWith("/");
                const props = {
                  className: `nb-link ${internal && pathname === href ? "active" : ""}`,
                  onClick: closeMenu,
                  onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => {
                    hoverTick();
                    const el = e.currentTarget.querySelector<HTMLElement>("[data-text]");
                    if (el) scramble(el, n, 380);
                  },
                  tabIndex: menu ? 0 : -1,
                };
                const inner = (
                  <>
                    <small>[{i}]</small>
                    <span data-text={n}>{n}</span>
                    <i />
                  </>
                );
                return (
                  <li key={n} className="nb-anim">
                    {internal ? (
                      <Link href={href} {...props}>
                        {inner}
                      </Link>
                    ) : (
                      <a href={href} {...props}>
                        {inner}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="nb-label nb-anim">
              <span>DESIGNS</span>
              <span>{String(site.designs.length).padStart(2, "0")}</span>
            </div>
            <div className="nb-designs">
              {site.designs.map((d, i) => (
                <button
                  key={d.id}
                  className={`nb-design nb-anim ${design === d.id ? "active" : ""}`}
                  onClick={() => pickDesign(d.id)}
                  onMouseEnter={hoverTick}
                  tabIndex={menu ? 0 : -1}
                >
                  <small>0{i + 1}</small>
                  <span>{d.label}</span>
                  <i />
                </button>
              ))}
            </div>

            <div className="nb-socials">
              {site.socials.map(([n, u]) => (
                <a key={n} href={u} target="_blank" rel="noreferrer" aria-label={n} className="nb-anim" onMouseEnter={hoverTick} tabIndex={menu ? 0 : -1}>
                  <SocialIcon name={n} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
