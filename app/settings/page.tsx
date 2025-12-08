"use client";

import { FormEvent, useEffect, useState } from "react";

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

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await parseJsonSafe(res);
        if (res.ok) {
          setHasKey(Boolean((data as { hasKey?: boolean }).hasKey));
        } else {
          setStatus(data.error || "Impossible de récupérer les paramètres.");
        }
      } catch (error) {
        console.error("Erreur de récupération des paramètres", error);
        setStatus("Impossible de récupérer les paramètres.");
      }
    };
    fetchSettings();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus("Vérification de la clé OpenAI...");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: apiKey.trim() || null }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.error || "Echec de sauvegarde");
      setStatus("Clé OpenAI sauvegardée et validée.");
      setHasKey(Boolean((data as { hasKey?: boolean }).hasKey));
      setApiKey("");
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Paramètres</h1>
      <p className="text-sm text-black">
        Stockez votre clé OpenAI (testée via <code>models.list()</code>) pour la
        génération d’idées.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full rounded-lg border px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Validation..." : "Sauvegarder"}
        </button>
      </form>
      {status && <p className="mt-2 text-sm text-black">{status}</p>}
      {hasKey && !status && (
        <p className="mt-2 text-sm text-green-700">Clé OpenAI déjà enregistrée.</p>
      )}
    </div>
  );
}
