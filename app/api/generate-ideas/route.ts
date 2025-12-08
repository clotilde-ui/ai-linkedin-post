import OpenAI from "openai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MODEL = "gpt-4o-mini";

const formatIdeas = (raw: string) => {
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d\.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 10);
};

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId requis" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    const settings = await prisma.settings.findUnique({ where: { id: "settings" } });
    if (!settings?.openaiApiKey) {
      return NextResponse.json({ error: "Clé OpenAI manquante" }, { status: 400 });
    }

    const [pages, description, posts] = await Promise.all([
      prisma.scrapedPage.findMany({ where: { projectId }, take: 20 }),
      prisma.linkedinDescription.findUnique({ where: { projectId } }),
      prisma.linkedinPost.findMany({ where: { projectId }, take: 10 }),
    ]);

    const pageContext = pages
      .map((page) => `- ${page.url}: ${page.content.slice(0, 220)}...`)
      .join("\n");

    const postContext = posts
      .map((post) => `- ${post.postText ?? "(brouillon vide)"}`)
      .join("\n") || "Aucun post existant";

    const prompt = `Projet: ${project.name}\nDescription LinkedIn: ${
      description?.descriptionText || "Non renseignée"
    }\nPages scrapées:\n${pageContext || "Aucune"}\nPosts existants:\n${postContext}\n\nGénère 10 idées de posts LinkedIn en français, concises (une phrase chacune), orientées valeur et adaptées au ton professionnel.`;

    const client = new OpenAI({ apiKey: settings.openaiApiKey });
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Tu es un copywriter LinkedIn. Retourne uniquement une liste de 10 idées, sans explication supplémentaire.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const ideas = formatIdeas(content);

    if (!ideas.length) {
      return NextResponse.json({ error: "Aucune idée générée" }, { status: 400 });
    }

    await prisma.linkedinPostIdea.createMany({
      data: ideas.map((ideaText) => ({ ideaText, projectId })),
    });

    const savedIdeas = await prisma.linkedinPostIdea.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ideas: savedIdeas });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
