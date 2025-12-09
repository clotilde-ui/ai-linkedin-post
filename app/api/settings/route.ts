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

    // Nous essayons de valider, mais si c'est une clé Service Account restreinte,
    // on accepte quand même si l'erreur est liée aux permissions (403).
    if (openaiApiKey) {
      try {
        const client = new OpenAI({ apiKey: openaiApiKey });
        // On tente une action très légère pour vérifier la clé
        await client.models.list();
      } catch (error: any) {
        console.warn("Avertissement validation OpenAI:", error);
        
        // Si l'erreur est "401" (Unauthorized), la clé est vraiment fausse ou révoquée.
        // On bloque uniquement dans ce cas.
        if (error?.status === 401) {
             return NextResponse.json({ error: "Clé OpenAI invalide (Erreur 401)" }, { status: 400 });
        }
        
        // Pour toutes les autres erreurs (comme 403 Forbidden typique des Service Accounts),
        // on continue car la clé est probablement valide pour générer du texte.
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
