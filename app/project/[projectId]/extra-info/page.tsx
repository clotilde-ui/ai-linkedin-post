"use client";

import { FormEvent, useEffect, useState } from "react";
import { useProjectId } from "@/lib/useProjectId";

export default function ExtraInfoPage() {
  const projectId = useProjectId();
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (targetProjectId: string) => {
    try {
      const res = await fetch(`/api/extra-info?projectId=${targetProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.extra?.content ?? "");
      }
    } catch (error) {
      console.error("Erreur de récupération du complément", error);
    }
  };

  useEffect(() => {
    if (projectId) {
      load(projectId);
    }
  }, [projectId]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setStatus("Projet introuvable.");
      return;
    }
    setLoading(true);
    setStatus("Sauvegarde...");
    try {
      const res = await fetch("/api/extra-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Echec de sauvegarde");
      setStatus("Complément sauvegardé.");
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-black">Complément d’information</h1>
      <p className="text-sm text-black">
        Ajoutez ici tout contexte libre (notes, contraintes, persona, offres...). Les idées,
        briefs et rédactions s’appuieront aussi sur ce contenu.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <textarea
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Notes libres, objections, exemples, USP, etc."
          className="w-full rounded-lg border px-3 py-2 text-black"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </form>
      {status && <p className="mt-2 text-sm text-black">{status}</p>}
    </div>
  );
}
