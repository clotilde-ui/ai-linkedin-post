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

const buildFallbackIdeas = ({
  projectName,
  pageContext,
  postContext,
}: {
  projectName: string;
  pageContext: string;
  postContext: string;
}) => {
  const seeds = [
    `Pourquoi ${projectName} fait différemment (et ce que ça change)`,
    `3 idées actionnables issues du site : ${pageContext.slice(0, 80) || "pas de contenu scrapé"}`,
    `Leçon tirée d’un post existant : ${postContext.slice(0, 80) || "pas de post historique"}`,
    `Ce que personne ne dit sur notre marché (vue ${projectName})`,
    `Checklist express pour passer à l’action dès aujourd’hui`,
    `Erreur courante à éviter quand on démarre`,
    `Observation terrain : ce que nos clients demandent vraiment`,
    `Mini-how-to : comment appliquer ${projectName} en 3 étapes`,
    `Contrarian take : et si on faisait l’inverse de la norme ?`,
    `Story courte : un avant/après chez ${projectName}`,
  ];
  return seeds.slice(0, 10);
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

    const [pages, description, posts, extraInfo] = await Promise.all([
      prisma.scrapedPage.findMany({ where: { projectId }, take: 20 }),
      prisma.linkedinDescription.findUnique({ where: { projectId } }),
      prisma.linkedinPost.findMany({ where: { projectId }, take: 10 }),
      prisma.projectExtraInfo.findUnique({ where: { projectId } }),
    ]);

    const pageContext = pages
      .map((page) => `- ${page.url}: ${page.content.slice(0, 220)}...`)
      .join("\n");

    const postContext = posts
      .map((post) => `- ${post.postText ?? "(brouillon vide)"}`)
      .join("\n") || "Aucun post existant";

    const prompt = `
ROLE : Tu es un stratège LinkedIn expert et un copywriter d'élite. Tu ne génères pas de simples phrases, mais des angles d'attaque percutants pour des posts qui engagent et apportent de la valeur.

CONTEXTE :
- Nom du projet : ${project.name}
- Identité & Cible : ${description?.descriptionText || "Non renseignée"}
- Contenu source (issu du site) :
${pageContext || "Aucune donnée scrapée"}
- Historique (ton actuel) :
${postContext || "Aucun post existant"}
- Complément d’information libre :
${extraInfo?.content || "Aucun complément saisi"}

TA MISSION :
Génère 10 idées de posts LinkedIn uniques, en français, basées sur le contenu source ci-dessus.
Chaque idée doit être une phrase concise (le "Hook" ou l'idée centrale) qui donne envie d'écrire le post.

RÈGLES D'OR :
1. Zéro platitude ("Nous sommes ravis de..."). Sois clivant, éducatif ou inspirant.
2. Varie les formats :
   - Contrarian : aller à contre-courant d'une idée reçue du secteur.
   - How-to / Actionnable : une solution concrète issue du contenu scrapé.
   - Storytelling : une leçon tirée de l'expérience du projet.
   - Observation de marché : une tendance repérée.
3. Adapte le ton au "ton actuel" mais en le rendant plus professionnel et impactant si nécessaire.
4. Concentre-toi sur la douleur (pain point) de la cible ou le bénéfice immédiat.

FORMAT DE SORTIE ATTENDU :
Une simple liste de 10 bullet points. Rien d'autre.
`;

    let ideas: string[] = [];

    try {
      const client = new OpenAI({ apiKey: settings.openaiApiKey });
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Tu es un copywriter LinkedIn d'élite. Retourne uniquement une liste de 10 idées, sans explication supplémentaire, dans le même ordre que demandé.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const content = completion.choices[0]?.message?.content ?? "";
      ideas = formatIdeas(content);
    } catch (error: any) {
      console.error("Erreur OpenAI, tentative de fallback local", error);
      ideas = buildFallbackIdeas({
        projectName: project.name,
        pageContext: pageContext || "",
        postContext: postContext || "",
      });
      if (!ideas.length) {
        return NextResponse.json(
          { error: "OpenAI indisponible et aucun fallback possible. Vérifiez la clé et le réseau." },
          { status: 502 },
        );
      }
    }

    if (!ideas.length) {
      return NextResponse.json({ error: "Aucune idée générée" }, { status: 400 });
    }

    await prisma.linkedinPostIdea.createMany({
      data: ideas.map((ideaText) => ({ ideaText, projectId, status: "NONE" })),
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
