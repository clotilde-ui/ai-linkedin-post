import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }
  try {
    const description = await prisma.linkedinDescription.findUnique({
      where: { projectId },
    });
    return NextResponse.json({ description });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur de récupération" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { projectId, descriptionText } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId requis" }, { status: 400 });
    }
    if (typeof descriptionText !== "string") {
      return NextResponse.json({ error: "descriptionText requis" }, { status: 400 });
    }

    const description = await prisma.linkedinDescription.upsert({
      where: { projectId },
      update: { descriptionText },
      create: { projectId, descriptionText },
    });

    return NextResponse.json({ description });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur de sauvegarde" }, { status: 500 });
  }
}
