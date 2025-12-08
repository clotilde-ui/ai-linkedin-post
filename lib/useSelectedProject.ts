"use client";

import { useEffect, useState } from "react";

export type SelectedProject = {
  id: string;
  name: string;
};

const STORAGE_KEY = "selectedProject";

const readFromStorage = (): SelectedProject | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as SelectedProject) : null;
  } catch (error) {
    console.error("Impossible de récupérer le projet sélectionné", error);
    return null;
  }
};

export function useSelectedProject() {
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(() =>
    readFromStorage(),
  );

  useEffect(() => {
    const syncFromStorage = () => setSelectedProject(readFromStorage());
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  const selectProject = (project: SelectedProject | null) => {
    setSelectedProject(project);
    try {
      if (project) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("Impossible de stocker le projet sélectionné", error);
    }
  };

  return { selectedProject, selectProject };
}
