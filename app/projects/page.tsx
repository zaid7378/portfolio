import type { Metadata } from "next";
import ProjectsPage from "@/components/projects/ProjectsPage";

export const metadata: Metadata = {
  title: "Projects — ZAID'S DEV",
  description: "Selected work: websites, web apps, e-commerce and WebGL.",
};

export default function Page() {
  return <ProjectsPage />;
}
