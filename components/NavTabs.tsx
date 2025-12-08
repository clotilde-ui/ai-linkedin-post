"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SelectedProject } from "@/lib/useSelectedProject";

const tabs = [
  { href: "/projects", label: "Projects" },
  { href: "/scrape", label: "Scrap Website" },
  { href: "/linkedin-description", label: "LinkedIn Description" },
  { href: "/linkedin-posts", label: "LinkedIn Posts" },
  { href: "/linkedin-ideas", label: "LinkedIn Ideas" },
  { href: "/settings", label: "Settings" },
];

export function NavTabs() {
  const pathname = usePathname();
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);

  useEffect(() => {
    const readProject = () => {
      try {
        const stored = window.localStorage.getItem("selectedProject");
        if (stored) {
          setSelectedProject(JSON.parse(stored) as SelectedProject);
        } else {
          setSelectedProject(null);
        }
      } catch (error) {
        console.error("Impossible de lire le projet sélectionné", error);
      }
    };

    readProject();
    window.addEventListener("storage", readProject);
    return () => window.removeEventListener("storage", readProject);
  }, []);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-black">AI LinkedIn Toolkit</span>
          {selectedProject ? (
            <span className="text-sm text-black">
              Projet sélectionné : <strong>{selectedProject.name}</strong>
            </span>
          ) : (
            <span className="text-sm text-black">Aucun projet sélectionné</span>
          )}
        </div>
        <nav className="flex flex-wrap gap-2 text-sm font-medium">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-full px-4 py-2 transition ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-gray-100 text-black hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
