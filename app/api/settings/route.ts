import OpenAI from "openai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "settings" } });
    return NextResponse.json({ hasKey: Boolean(settings?.openaiApiKey) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur de récupération" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { openaiApiKey } = await request.json();
    if (openaiApiKey && typeof openaiApiKey !== "string") {
      return NextResponse.json({ error: "openaiApiKey invalide" }, { status: 400 });
    }

    if (openaiApiKey) {
      try {
        const client = new OpenAI({ apiKey: openaiApiKey });
        const models = await client.models.list({ limit: 1 });
        // Trigger iteration to validate key quickly
        await models.next();
      } catch (error) {
        console.error("Validation OpenAI échouée", error);
        return NextResponse.json({ error: "Clé OpenAI invalide" }, { status: 400 });
      }
    }

    await prisma.settings.upsert({
      where: { id: "settings" },
      update: { openaiApiKey: openaiApiKey || null },
      create: { id: "settings", openaiApiKey: openaiApiKey || null },
    });

    return NextResponse.json({ hasKey: Boolean(openaiApiKey) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur de sauvegarde" }, { status: 500 });
  }
}
