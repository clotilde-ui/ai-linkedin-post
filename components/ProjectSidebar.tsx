"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  { slug: "scrape", title: "Scraper le site", description: "Crawler et stocker les pages clés." },
  { slug: "linkedin-description", title: "Description LinkedIn", description: "Définir le pitch et la cible." },
  { slug: "extra-info", title: "Complément d’information", description: "Ajouter du contexte libre." },
  { slug: "linkedin-posts", title: "Posts existants", description: "Consulter ou importer l’historique." },
  { slug: "linkedin-ideas", title: "Idées générées", description: "Produire des idées à partir des données." },
];

export function ProjectSidebar({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-xl border bg-white p-4 shadow-sm lg:w-64">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide text-gray-500">Workspace</div>
        <div className="text-lg font-semibold text-black">{projectName}</div>
      </div>
      <nav className="space-y-2">
        {steps.map((step, index) => {
          const href = `/project/${projectId}/${step.slug}`;
          const isActive = pathname === href;
          return (
            <Link
              key={step.slug}
              href={href}
              className={`block rounded-lg border px-3 py-2 transition ${
                isActive
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-gray-50 text-black hover:border-black hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-sm font-medium">
                <span>
                  {index + 1}. {step.title}
                </span>
              </div>
              <p className={`text-xs ${isActive ? "text-white/80" : "text-gray-600"}`}>
                {step.description}
              </p>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
