"use client";

import { useParams } from "next/navigation";

export function useProjectId() {
  const params = useParams<{ projectId?: string | string[] }>();
  const id = params?.projectId;
  if (!id) return null;
  return Array.isArray(id) ? id[0] : id;
}
