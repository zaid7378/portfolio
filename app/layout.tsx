import type { Metadata } from "next";
import { Big_Shoulders, Space_Mono, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import "./menu.css";
import "./about.css";
import "./contact.css";
import "./projects.css";
import "./web-theme.css";
import ThemeSync from "@/components/ThemeSync";

// Variable fonts: one file covers every weight (fewer requests than one file per weight).
// display: "swap" keeps text visible while fonts load.
const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const jetMono = JetBrains_Mono({
  variable: "--font-jet",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false, // body copy only, not needed for the first paint
});

export const metadata: Metadata = {
  title: "Muhammad Zaid — Web Developer | ZAID'S DEV",
  description: "Muhammad Zaid — web developer in Lahore building high-performance WordPress, PHP and Next.js websites, e-commerce stores and AI chatbots.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${display.variable} ${spaceMono.variable} ${jetMono.variable} ${inter.variable}`}
    >
      <body>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
