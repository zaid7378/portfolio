import type { Metadata } from "next";
import ContactPage from "@/components/contact/ContactPage";

export const metadata: Metadata = {
  title: "Contact — ZAID'S DEV",
  description: "Tell me about your project — I usually reply within 24 hours.",
};

export default function Page() {
  return <ContactPage />;
}
