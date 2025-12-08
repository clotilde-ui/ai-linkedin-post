"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSelectedProject } from "@/lib/useSelectedProject";

type ScrapedPage = {
  id: string;
  url: string;
  content: string;
};

export default function ScrapePage() {
  const { selectedProject } = useSelectedProject();
  const [url, setUrl] = useState("");
  const [pages, setPages] = useState<ScrapedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const loadPages = async (projectId: string) => {
    try {
      const res = await fetch(`/api/scrape?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages ?? []);
      }
    } catch (error) {
      console.error("Erreur de récupération des pages", error);
    }
  };

  useEffect(() => {
    if (selectedProject?.id) {
      loadPages(selectedProject.id);
    } else {
      setPages([]);
    }
  }, [selectedProject?.id]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProject?.id) {
      setStatus("Sélectionnez d’abord un projet dans l’onglet Projects.");
      return;
    }
    if (!url.trim()) return;
    setLoading(true);
    setStatus("Scraping en cours...");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), projectId: selectedProject.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Echec du scraping");
      setStatus(`Scraping terminé : ${data.createdCount} pages ajoutées (max 50).`);
      await loadPages(selectedProject.id);
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
          explorées et stockées pour le projet sélectionné.
        </p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border px-3 py-2"
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
        {!selectedProject && (
          <p className="mt-2 text-sm text-red-600">
            Aucun projet sélectionné. Rendez-vous dans l’onglet Projects.
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Pages scrapées</h2>
        {pages.length === 0 ? (
          <p className="mt-2 text-sm text-black">Aucune page pour ce projet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pages.map((page) => (
              <li key={page.id} className="rounded-lg border px-3 py-2">
                <div className="font-medium text-blue-700 underline">{page.url}</div>
                <p className="text-sm text-black max-h-24 overflow-hidden">{page.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
