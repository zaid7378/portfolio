"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { site } from "@/lib/site";
import { sound } from "@/lib/audio";
import NavMenu from "../NavMenu";
import { HelloTime, ThemeToggle, hoverTick } from "../chrome";
import { scramble, scrambleHeading } from "../Scramble";
import Starfield from "../about/Starfield";
import CrossCursor from "../about/CrossCursor";

const C = site.contact;
type Status = "READY" | "SENDING" | "SENT" | "ERROR";

/** Single-choice row of pill buttons (radio group semantics). */
function Choice({
  label,
  n,
  options,
  value,
  onChange,
  hex = false,
}: {
  label: string;
  n: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  hex?: boolean;
}) {
  return (
    <fieldset className="ct-field ct-reveal">
      <legend className="ct-label">
        <b>{n}</b> {label}
      </legend>
      <div className="ct-chips" role="radiogroup" aria-label={label}>
        {options.map((o, i) => (
          <button
            type="button"
            key={o}
            role="radio"
            aria-checked={value === o}
            className={`ct-chip ${value === o ? "on" : ""}`}
            onMouseEnter={hoverTick}
            onClick={() => {
              onChange(value === o ? "" : o);
              sound?.tick(1600);
            }}
          >
            {hex && <small>0x0{i}</small>}
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function ContactPage() {
  const root = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("READY");
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ab-hero-word span", { yPercent: 60, opacity: 0.2, duration: 0.7, ease: "expo.out" });
      gsap.from(".ct-reveal", { y: 24, opacity: 0, duration: 0.9, stagger: 0.07, delay: 0.15, ease: "power3.out" });
      gsap.from(".ab-fixed-foot > *, .topbar > *", { opacity: 0, y: 20, duration: 0.9, stagger: 0.08, delay: 0.3, ease: "power3.out" });
    }, root);
    return () => ctx.revert();
  }, []);

  const setStatusAnimated = (s: Status) => {
    setStatus(s);
    requestAnimationFrame(() => statusRef.current && scramble(statusRef.current, `STATUS: ${s}`, 450));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email and message.");
      setStatusAnimated("ERROR");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email address doesn't look right.");
      setStatusAnimated("ERROR");
      return;
    }
    sound?.whoosh();
    setStatusAnimated("SENDING");

    const lines = [
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      type && `Project type: ${type}`,
      budget && `Budget: ${budget}`,
      "",
      message.trim(),
    ].filter((l): l is string => typeof l === "string");

    // 1) a form service, if one is configured
    if (C.endpoint) {
      try {
        const res = await fetch(C.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name, email, type, budget, message }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatusAnimated("SENT");
        setName("");
        setEmail("");
        setType("");
        setBudget("");
        setMessage("");
        return;
      } catch {
        setError(`Sending failed — please email ${site.email} directly.`);
        setStatusAnimated("ERROR");
        return;
      }
    }

    // 2) otherwise: open the visitor's email app with everything filled in
    const subject = `New project enquiry${type ? ` — ${type}` : ""} from ${name.trim()}`;
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    setTimeout(() => setStatusAnimated("SENT"), 600);
  };

  return (
    <div ref={root} className="about-page contact-page">
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
          <b>CONTACT</b>
        </nav>
        <h1 className="ab-hero-word">
          <span>CONTACT</span>
        </h1>
      </div>
      <HelloTime className="ab-fixed-foot" />
      <ThemeToggle />
      <NavMenu index={5} label="CONTACT" placement="bottom" />

      <main className="ct-main">
        <p className="ct-kicker ct-reveal">{C.kicker}</p>
        <h2
          className="ct-title ct-reveal"
          onMouseEnter={(e) => {
            scrambleHeading(e);
            hoverTick();
          }}
        >
          <span data-text={C.title}>{C.title}</span>
        </h2>
        <p className="ct-intro ct-reveal">{C.intro}</p>

        <form className="ct-form" onSubmit={submit} noValidate>
          <div className="ct-row">
            <label className="ct-field ct-reveal">
              <span className="ct-label">
                <b>01</b> YOUR NAME
              </span>
              <input
                className="ct-input"
                name="name"
                autoComplete="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="ct-field ct-reveal">
              <span className="ct-label">
                <b>02</b> EMAIL ADDRESS
              </span>
              <input
                className="ct-input"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          </div>

          <Choice n="03" label="PROJECT TYPE" options={C.types} value={type} onChange={setType} hex />
          <Choice n="04" label="BUDGET" options={C.budgets} value={budget} onChange={setBudget} />

          <label className="ct-field ct-reveal">
            <span className="ct-label">
              <b>05</b> MESSAGE
            </span>
            <textarea
              className="ct-input ct-textarea"
              name="message"
              placeholder="Tell me about your project…"
              maxLength={C.maxLength}
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <span className="ct-count" aria-live="polite">
              {message.length} / {C.maxLength}
            </span>
          </label>

          <div className="ct-actions ct-reveal">
            <button type="submit" className="ct-submit" disabled={status === "SENDING"} onMouseEnter={hoverTick}>
              <span>TRANSMIT</span>
              <i aria-hidden="true">↗</i>
            </button>
            <span className={`ct-status s-${status.toLowerCase()}`} role="status">
              <i />
              <span ref={statusRef}>STATUS: {status}</span>
            </span>
          </div>
          {error && (
            <p className="ct-error" role="alert">
              {error}
            </p>
          )}
          {status === "SENT" && !C.endpoint && (
            <p className="ct-note">
              Your email app should have opened with the message ready to send. If it didn&apos;t, write to{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
