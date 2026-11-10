import type { Metadata } from "next";
import AboutPage from "@/components/about/AboutPage";

export const metadata: Metadata = {
  title: "About — ZAID'S DEV",
  description: "Frontend & creative engineer: how I work and the toolkit I use.",
};

export default function Page() {
  return <AboutPage />;
}
