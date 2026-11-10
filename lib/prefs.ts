"use client";

// Visitor preferences shared by every page (theme, home design, audio).
// A tiny external store: survives client-side navigation and is remembered in localStorage.

import { useSyncExternalStore } from "react";
import type { Design } from "./site";

export type Prefs = {
  theme: "dark" | "light";
  design: Design;
  audio: boolean;
};

// first-time visitors get the CRT / glitch portrait
const DEFAULTS: Prefs = { theme: "dark", design: "BURN", audio: true };
// bumped when the default design changes, so everyone sees the new default once
const KEY = "zaids-prefs-v2";

let state: Prefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* private mode / blocked storage — keep defaults */
  }
}

export function getPrefs(): Prefs {
  load();
  return state;
}

export function setPrefs(patch: Partial<Prefs>) {
  load();
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, () => DEFAULTS);
}
