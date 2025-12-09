"use client";

import { useEffect, useState } from "react";
import { useProjectId } from "@/lib/useProjectId";

type Idea = {
  id: string;
  ideaText: string;
  createdAt: string;
  status: "NONE" | "ARCHIVE" | "PUBLIE" | "EN_ATTENTE";
};

export default function LinkedinIdeasPage() {
  const projectId = useProjectId();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefIdeaId, setBriefIdeaId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  const loadIdeas = async (targetProjectId: string) => {
    try {
      const res = await fetch(`/api/linkedin-ideas?projectId=${targetProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas ?? []);
      }
    } catch (error) {
      console.error("Erreur de chargement des idées", error);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadIdeas(projectId);
    }
  }, [projectId]);

  const generateIdeas = async () => {
    if (!projectId) {
      setStatus("Projet introuvable.");
      return;
    }
    setLoading(true);
    setStatus("Génération des idées en cours...");
    try {
      const res = await fetch("/api/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Echec de génération");
      setStatus("Idées générées et sauvegardées.");
      await loadIdeas(projectId);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const generateBrief = async (idea: Idea) => {
    if (!projectId) {
      setStatus("Projet introuvable.");
      return;
    }
    setStatus(null);
    setBrief(null);
    setBriefIdeaId(null);
    setBriefLoading(true);
    try {
      const res = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ideaId: idea.id }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Echec de génération du brief");
      }
      setBriefIdeaId(idea.id);
      setBrief((data as { brief: string }).brief);
      setStatus("Brief généré.");
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setBriefLoading(false);
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
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Idées enregistrées</h2>
        {ideas.length === 0 ? (
          <p className="mt-2 text-sm text-black">Aucune idée pour ce projet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {ideas.map((idea) => (
              <li key={idea.id} className="rounded-lg border px-3 py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div>
                    <div className="text-sm text-black">
                      {new Date(idea.createdAt).toLocaleString()}
                    </div>
                    <p className="font-medium text-black">{idea.ideaText}</p>
                    <span className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-black">
                      {idea.status === "NONE"
                        ? "Aucun statut"
                        : idea.status === "ARCHIVE"
                          ? "Archivé"
                          : idea.status === "PUBLIE"
                            ? "Publié"
                            : "En attente"}
                    </span>
                  </div>
                  <button
                    onClick={() => generateBrief(idea)}
                    className="whitespace-nowrap rounded-lg border border-black px-3 py-1 text-sm font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={briefLoading && briefIdeaId !== idea.id}
                  >
                    {briefLoading && briefIdeaId === idea.id ? "Génération..." : "Générer un brief"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["NONE", "EN_ATTENTE", "PUBLIE", "ARCHIVE"].map((statusValue) => (
                    <button
                      key={statusValue}
                      onClick={async () => {
                        if (!projectId) return;
                        setActionLoadingId(idea.id);
                        setStatus(null);
                        try {
                          const res = await fetch("/api/linkedin-ideas", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              ideaId: idea.id,
                              projectId,
                              status: statusValue,
                            }),
                          });
                          const data = await parseJsonSafe(res);
                          if (!res.ok) {
                            throw new Error((data as { error?: string }).error || "Echec de mise à jour");
                          }
                          await loadIdeas(projectId);
                        } catch (error) {
                          console.error(error);
                          setStatus(error instanceof Error ? error.message : "Erreur inconnue");
                        } finally {
                          setActionLoadingId(null);
                        }
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        idea.status === statusValue
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-black hover:border-black"
                      } ${actionLoadingId === idea.id ? "opacity-60 cursor-wait" : ""}`}
                    >
                      {statusValue === "NONE"
                        ? "Aucun statut"
                        : statusValue === "EN_ATTENTE"
                          ? "En attente"
                          : statusValue === "PUBLIE"
                            ? "Publié"
                            : "Archivé"}
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                      if (!projectId) return;
                      setActionLoadingId(idea.id);
                      setStatus(null);
                      try {
                        const res = await fetch("/api/linkedin-ideas", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ideaId: idea.id, projectId }),
                        });
                        const data = await parseJsonSafe(res);
                        if (!res.ok) {
                          throw new Error((data as { error?: string }).error || "Echec de suppression");
                        }
                        await loadIdeas(projectId);
                      } catch (error) {
                        console.error(error);
                        setStatus(error instanceof Error ? error.message : "Erreur inconnue");
                      } finally {
                        setActionLoadingId(null);
                      }
                    }}
                    className="rounded-full border border-red-600 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
                {briefIdeaId === idea.id && (
                  <details open className="mt-3 overflow-hidden rounded-lg border bg-gray-50">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black">
                      Brief généré
                    </summary>
                    <div className="border-t px-3 py-2">
                      {briefLoading ? (
                        <p className="text-sm text-black">Génération du brief...</p>
                      ) : brief ? (
                        <pre className="whitespace-pre-wrap text-sm text-black">{brief}</pre>
                      ) : (
                        <p className="text-sm text-black">Aucun brief disponible.</p>
                      )}
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
        {status && <p className="mt-2 text-sm text-black">{status}</p>}
      </div>
    </div>
  );
}
