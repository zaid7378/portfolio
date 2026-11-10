"use client";

// Small UI pieces shared by every page: local clock, theme toggle, hello/time footer, icons.

import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { sound } from "@/lib/audio";
import { setPrefs, usePrefs } from "@/lib/prefs";

export const hoverTick = () => sound?.tick(2400, 0.03, 0.03);

export function useLocalTime() {
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: site.timeZone,
    });
    const update = () => setTime(fmt.format(new Date()).replace("AM", "a.m.").replace("PM", "p.m."));
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/** "Wanna Say Hello?" + "Local Time" block. */
export function HelloTime({ className = "" }: { className?: string }) {
  const time = useLocalTime();
  return (
    <div className={`hello-time ${className}`}>
      <div>
        <span className="muted">Wanna Say Hello?</span>
        <a href={`mailto:${site.email}`} className="link" onMouseEnter={hoverTick}>
          {site.email}
        </a>
      </div>
      <div className="right">
        <span className="muted">Local Time</span>
        <span>
          {site.city} {time}
        </span>
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const { theme } = usePrefs();
  return (
    <button
      className="theme-toggle"
      aria-label="Toggle light / dark theme"
      onClick={() => {
        setPrefs({ theme: theme === "dark" ? "light" : "dark" });
        sound?.tick(900);
      }}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}

export function WaveIcon({ on }: { on: boolean }) {
  return (
    <svg className={`wave ${on ? "on" : ""}`} viewBox="0 0 40 24" aria-hidden="true">
      <g className="wave-track">
        <path d="M0 12 L5 12 L8 4 L12 20 L16 6 L19 16 L22 9 L25 12 L40 12 M40 12 L45 12 L48 4 L52 20 L56 6 L59 16 L62 9 L65 12 L80 12" />
      </g>
    </svg>
  );
}

export function SocialIcon({ name }: { name: string }) {
  switch (name) {
    case "LINKEDIN":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4v-11Z" />
        </svg>
      );
    case "GITHUB":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
        </svg>
      );
    case "UPWORK":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M3 6v5a3.5 3.5 0 0 0 7 0V6m0 5.5c1 2.5 2.6 4 4.8 4a3.7 3.7 0 0 0 0-7.4c-2.6 0-3.6 2.2-4.8 5.4L8.6 20" />
        </svg>
      );
    case "FACEBOOK":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.55V4.47A20.7 20.7 0 0 0 14.3 4.3c-2.24 0-3.78 1.37-3.78 3.88v2.32H8v3h2.52V21h3Z" />
        </svg>
      );
    case "WHATSAPP":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.1-1.3A9.9 9.9 0 1 0 12 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3 .8.8-2.94-.2-.3A8.2 8.2 0 1 1 12 20.1Zm4.5-6.1c-.25-.12-1.46-.72-1.69-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.34-2.92c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.43l-.75-1.82c-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.17 3.68c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.16-.47-.28Z" />
        </svg>
      );
    case "EMAIL":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M3.5 6h17v12h-17zM3.5 6.5l8.5 7 8.5-7" />
        </svg>
      );
    case "TELEGRAM":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.64 6.8-1.7 8.02c-.12.57-.46.71-.94.44l-2.6-1.92-1.25 1.21c-.14.14-.26.26-.53.26l.19-2.66 4.84-4.37c.21-.19-.05-.29-.32-.11l-5.98 3.77-2.58-.8c-.56-.18-.57-.56.12-.83l10.08-3.89c.47-.17.88.11.67.89Z" />
        </svg>
      );
    default:
      return <span>{name.slice(0, 2)}</span>;
  }
}
