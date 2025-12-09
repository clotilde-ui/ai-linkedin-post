"use client";

import { FormEvent, useEffect, useState } from "react";
import { useProjectId } from "@/lib/useProjectId";

export default function LinkedinDescriptionPage() {
  const projectId = useProjectId();
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchDescription = async (targetProjectId: string) => {
      try {
        const res = await fetch(`/api/linkedin-description?projectId=${targetProjectId}`);
        if (res.ok) {
          const data = await res.json();
          setDescription(data.description?.descriptionText ?? "");
        } else {
          setDescription("");
        }
      } catch (error) {
        console.error("Erreur de chargement de la description", error);
      }
    };

    if (projectId) {
      fetchDescription(projectId);
    }
  }, [projectId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) {
      setStatus("Projet introuvable.");
      return;
    }
    setStatus("Sauvegarde...");
    try {
      const res = await fetch("/api/linkedin-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          descriptionText: description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Echec de sauvegarde");
      setStatus("Description sauvegardée");
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Erreur inconnue");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Description LinkedIn</h1>
        <p className="text-sm text-black">
          Saisissez ou mettez à jour la description LinkedIn du projet. Elle sera
          utilisée pour contextualiser la génération d’idées.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez l’activité, le ton et la cible..."
            className="w-full rounded-lg border px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800"
          >
            Sauvegarder
          </button>
        </form>
        {status && <p className="mt-2 text-sm text-black">{status}</p>}
      </div>
    </div>
  );
}
