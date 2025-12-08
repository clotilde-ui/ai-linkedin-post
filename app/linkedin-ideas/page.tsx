"use client";

import { useEffect, useState } from "react";
import { useSelectedProject } from "@/lib/useSelectedProject";

type Idea = {
  id: string;
  ideaText: string;
  createdAt: string;
};

export default function LinkedinIdeasPage() {
  const { selectedProject } = useSelectedProject();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadIdeas = async (projectId: string) => {
    try {
      const res = await fetch(`/api/linkedin-ideas?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas ?? []);
      }
    } catch (error) {
      console.error("Erreur de chargement des idées", error);
    }
  };

  useEffect(() => {
    if (selectedProject?.id) {
      loadIdeas(selectedProject.id);
    } else {
      setIdeas([]);
    }
  }, [selectedProject?.id]);

  const generateIdeas = async () => {
    if (!selectedProject?.id) {
      setStatus("Sélectionnez d’abord un projet.");
      return;
    }
    setLoading(true);
    setStatus("Génération des idées en cours...");
    try {
      const res = await fetch("/api/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Echec de génération");
      setStatus("Idées générées et sauvegardées.");
      await loadIdeas(selectedProject.id);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Idées de posts LinkedIn</h1>
        <p className="text-sm text-black">
          Les idées sont générées avec OpenAI à partir des pages scrapées, de la
          description LinkedIn et des posts existants.
        </p>
        <button
          onClick={generateIdeas}
          disabled={loading}
          className="mt-4 rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Génération..." : "Générer 10 idées"}
        </button>
        {status && <p className="mt-2 text-sm text-black">{status}</p>}
        {!selectedProject && (
          <p className="mt-2 text-sm text-red-600">
            Aucun projet sélectionné. Rendez-vous dans l’onglet Projects.
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Idées enregistrées</h2>
        {ideas.length === 0 ? (
          <p className="mt-2 text-sm text-black">Aucune idée pour ce projet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {ideas.map((idea) => (
              <li key={idea.id} className="rounded-lg border px-3 py-2">
                <div className="text-sm text-black">
                  {new Date(idea.createdAt).toLocaleString()}
                </div>
                <p className="font-medium text-black">{idea.ideaText}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
