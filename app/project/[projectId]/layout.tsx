import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { prisma } from "@/lib/prisma";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { projectId: string };
}) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
  });

  if (!project) {
    return notFound();
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <ProjectSidebar projectId={project.id} projectName={project.name} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
