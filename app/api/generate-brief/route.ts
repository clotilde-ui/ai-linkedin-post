import OpenAI from "openai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MODEL = "gpt-4o-mini";

const buildBriefPrompt = ({
  theme,
  projectName,
  descriptionText,
  pageContext,
  postContext,
  extraInfo,
}: {
  theme: string;
  projectName: string;
  descriptionText: string;
  pageContext: string;
  postContext: string;
  extraInfo: string;
}) => {
  const base = `tu parles à un expert en ghost writing linkedin. je te donne une thématique de post linkedin et tu vas faire un brief pour aider le ghost writer à écrire ce post. Le brief doit comporter 4 parties : accroche, contexte, développement, conclusion. Il doit contenir max 150 mots.
voici un exemple de brief :
Accroche :
On veut bien faire.
Mais on ne sait pas toujours quoi dire.

Contexte :
Quand un collaborateur annonce une maladie, la première réaction peut tout changer.
Et pourtant… beaucoup de managers se sentent démunis.
Ils cherchent les mots parfaits — alors qu’une simple question bienveillante peut suffire.

Développement :
La peur de mal faire, le tabou, la pression du temps…
Tout cela peut mener à l’inaction ou au malaise.
Chez Wecare@work, on forme à ces situations.
Et souvent, ce qu’on retient d’une formation, c’est la puissance d’un :
👉 “De quoi as-tu besoin aujourd’hui ?”
Pas besoin d’être expert. Juste humain.

Conclusion :
Et vous, quelle question poseriez-vous ?
💬 Partagez en commentaire celles qui vous ont aidé ou marqué.`;

  return `${base}

Contexte du projet :
- Nom : ${projectName}
- Description LinkedIn : ${descriptionText || "Non renseignée"}
- Extraits du site (condensés) :
${pageContext || "Aucune donnée scrapée"}
- Posts existants (ton actuel) :
${postContext || "Aucun post existant"}
- Complément d’information libre :
${extraInfo || "Aucun complément saisi"}

La thématique donnée est : "${theme}"
Écris un brief clair et actionnable (sections : Accroche, Contexte, Développement avec 3–5 points, Conclusion). Adapte le ton au projet si possible.`;
};

export async function POST(request: Request) {
  try {
    const { projectId, ideaId } = await request.json();
    if (!projectId || !ideaId) {
      return NextResponse.json({ error: "projectId et ideaId requis" }, { status: 400 });
    }

    const [project, idea, settings] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.linkedinPostIdea.findUnique({ where: { id: ideaId } }),
      prisma.settings.findUnique({ where: { id: "settings" } }),
    ]);

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }
    if (!idea || idea.projectId !== projectId) {
      return NextResponse.json({ error: "Idée introuvable pour ce projet" }, { status: 404 });
    }
    if (!settings?.openaiApiKey) {
      return NextResponse.json({ error: "Clé OpenAI manquante" }, { status: 400 });
    }

    const [pages, description, posts, extraInfo] = await Promise.all([
      prisma.scrapedPage.findMany({ where: { projectId }, take: 10 }),
      prisma.linkedinDescription.findUnique({ where: { projectId } }),
      prisma.linkedinPost.findMany({ where: { projectId }, take: 5 }),
      prisma.projectExtraInfo.findUnique({ where: { projectId } }),
    ]);

    const pageContext =
      pages
        .map((page) => `- ${page.url}: ${page.content.slice(0, 200)}...`)
        .join("\n") || "Aucune donnée scrapée";

    const postContext =
      posts
        .map((post) => `- ${post.postText?.slice(0, 160) || "(brouillon vide)"}`)
        .join("\n") || "Aucun post existant";

    const client = new OpenAI({ apiKey: settings.openaiApiKey });

    const prompt = buildBriefPrompt({
      theme: idea.ideaText,
      projectName: project.name,
      descriptionText: description?.descriptionText || "Non renseignée",
      pageContext,
      postContext,
      extraInfo: extraInfo?.content || "",
    });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Tu es un copywriter LinkedIn d'élite. Rédige un brief en 4 parties (Accroche, Contexte, Développement avec 3–5 points, Conclusion), max 150 mots. Appuie-toi sur le contexte projet (site, description, posts). Format markdown simple.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const brief = completion.choices[0]?.message?.content?.trim();

    if (!brief) {
      return NextResponse.json({ error: "Aucun brief généré" }, { status: 400 });
    }

    return NextResponse.json({ brief });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la génération du brief" }, { status: 500 });
  }
}
