"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  createdAt: string;
};

const parseJsonSafe = async (res: Response) => {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      /* ignore parse error, fallback below */
    }
  }

  return { error: text || "Réponse inattendue du serveur" };
};

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        throw new Error(data.error || "Impossible de charger les projets");
      }
      setProjects((data as { projects?: Project[] }).projects ?? []);
    } catch (error) {
      console.error("Erreur de chargement des projets", error);
      setStatus("Impossible de charger les projets. Vérifiez l'API.");
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.error || "Impossible de créer le projet");
      setName("");
      setStatus("Projet créé");
      await loadProjects();
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (project: Project) => {
    router.push(`/project/${project.id}/scrape`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-black">Projets</h1>
        <p className="text-sm text-black">
          Créez un projet, puis entrez dans son workspace pour scraper et générer des idées.
        </p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du projet"
            className="w-full rounded-lg border px-3 py-2 text-black placeholder:text-black"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Création..." : "Créer"}
          </button>
        </form>
        {status && <p className="mt-2 text-sm text-black">{status}</p>}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Projets existants</h2>
        </div>
        <div className="mt-4 space-y-3">
          {projects.length === 0 && <p className="text-black">Aucun projet pour le moment.</p>}
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div>
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-black">
                    Créé le {new Date(project.createdAt).toLocaleString()}
                  </div>
                </div>
              <button
                onClick={() => handleSelect(project)}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white transition hover:bg-gray-800"
              >
                Sélectionner
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
