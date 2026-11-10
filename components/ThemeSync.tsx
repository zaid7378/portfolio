"use client";

import { useEffect } from "react";
import { usePrefs } from "@/lib/prefs";

/** Mirrors the stored theme onto <html data-theme>, on every page. */
export default function ThemeSync() {
  const { theme } = usePrefs();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}
