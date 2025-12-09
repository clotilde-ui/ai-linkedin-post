"use client";

import { FormEvent, useEffect, useState } from "react";
import { useProjectId } from "@/lib/useProjectId";

type ScrapedPage = {
  id: string;
  url: string;
  content: string;
};

export default function ScrapePage() {
  const projectId = useProjectId();
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [pages, setPages] = useState<ScrapedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);

  const parseJsonSafe = async (res: Response) => {
    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch {
        /* ignore parse error */
      }
    }

    return { error: text || "Réponse inattendue du serveur" };
  };

  const loadPages = async (targetProjectId: string) => {
    try {
      const res = await fetch(`/api/scrape?projectId=${targetProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages ?? []);
      }
    } catch (error) {
      console.error("Erreur de récupération des pages", error);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!projectId) {
      setDeleteStatus("Projet introuvable.");
      return;
    }
    setDeletingPageId(pageId);
    setDeleteStatus(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, projectId }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Echec de suppression");
      }
      await loadPages(projectId);
      setDeleteStatus("Page supprimée du contexte.");
    } catch (error) {
      console.error(error);
      setDeleteStatus(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setDeletingPageId(null);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadPages(projectId);
    }
  }, [projectId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) {
      setStatus("Projet introuvable.");
      return;
    }
    if (!url.trim()) return;
    setLoading(true);
    setStatus("Scraping en cours...");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), projectId, maxPages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Echec du scraping");
      setStatus(
        `Scraping terminé : ${data.createdCount} pages ajoutées (limite ${data.limit ?? maxPages}).`
      );
      await loadPages(projectId);
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
        <h1 className="text-2xl font-semibold">Scraper un site</h1>
        <p className="text-sm text-black">
          Indiquez une URL de départ (même domaine). Jusqu’à 50 pages seront
          explorées et stockées pour ce projet.
        </p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border px-3 py-2"
          />
          <input
            type="number"
            min={1}
            max={50}
            value={maxPages}
            onChange={(e) => setMaxPages(Math.min(Math.max(Number(e.target.value) || 1, 1), 50))}
            className="w-full rounded-lg border px-3 py-2 sm:w-32"
            placeholder="Nb pages"
            title="Nombre maximum de pages à explorer (1 à 50)"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Scraping..." : "Scraper"}
          </button>
        </form>
        {status && <p className="mt-2 text-sm text-black">{status}</p>}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Pages scrapées</h2>
        {pages.length === 0 ? (
          <p className="mt-2 text-sm text-black">Aucune page pour ce projet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <li key={page.id} className="rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="font-medium text-blue-700 underline break-all">{page.url}</div>
                  <p className="mt-1 text-xs text-black max-h-12 overflow-hidden break-words">
                    {page.content}
                  </p>
                </div>
                <button
                  onClick={() => deletePage(page.id)}
                  disabled={deletingPageId === page.id}
                  className="mt-3 w-full rounded-lg border border-red-600 px-3 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingPageId === page.id ? "Suppression..." : "Supprimer"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {deleteStatus && <p className="mt-2 text-sm text-black">{deleteStatus}</p>}
      </div>
    </div>
  );
}
