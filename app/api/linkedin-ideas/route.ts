import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }
  try {
    const ideas = await prisma.linkedinPostIdea.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ideas });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur de récupération" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { ideaId, status, projectId } = await request.json();
    if (!ideaId || !status || !projectId) {
      return NextResponse.json({ error: "ideaId, projectId et status requis" }, { status: 400 });
    }
    const idea = await prisma.linkedinPostIdea.findUnique({ where: { id: ideaId } });
    if (!idea || idea.projectId !== projectId) {
      return NextResponse.json({ error: "Idée introuvable pour ce projet" }, { status: 404 });
    }
    const allowed = ["NONE", "ARCHIVE", "PUBLIE", "EN_ATTENTE"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    const updated = await prisma.linkedinPostIdea.update({
      where: { id: ideaId },
      data: { status },
    });
    return NextResponse.json({ idea: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { ideaId, projectId } = await request.json();
    if (!ideaId || !projectId) {
      return NextResponse.json({ error: "ideaId et projectId requis" }, { status: 400 });
    }
    const idea = await prisma.linkedinPostIdea.findUnique({ where: { id: ideaId } });
    if (!idea || idea.projectId !== projectId) {
      return NextResponse.json({ error: "Idée introuvable pour ce projet" }, { status: 404 });
    }
    await prisma.linkedinPostIdea.delete({ where: { id: ideaId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
