import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseJsonSafe = async (res: Request) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }
  try {
    const extra = await prisma.projectExtraInfo.findUnique({ where: { projectId } });
    return NextResponse.json({ extra });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur de récupération" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { projectId, content } = await parseJsonSafe(request);
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }
  if (typeof content !== "string") {
    return NextResponse.json({ error: "content doit être une chaîne" }, { status: 400 });
  }
  try {
    const extra = await prisma.projectExtraInfo.upsert({
      where: { projectId },
      update: { content },
      create: { projectId, content },
    });
    return NextResponse.json({ extra });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur de sauvegarde" }, { status: 500 });
  }
}
