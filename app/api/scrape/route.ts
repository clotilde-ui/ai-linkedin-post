import axios from "axios";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_PAGES = 50;

const normalizeUrl = (href: string, base: URL) => {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
};

const extractLinks = ($: cheerio.CheerioAPI, base: URL) => {
  const links = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("#") || href.startsWith("mailto:")) return;
    const absolute = normalizeUrl(href, base);
    if (!absolute) return;
    const urlObj = new URL(absolute);
    if (urlObj.hostname !== base.hostname) return;
    links.add(urlObj.href.split("#")[0]);
  });
  return [...links];
};

const cleanText = ($: cheerio.CheerioAPI) =>
  $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }
  try {
    const pages = await prisma.scrapedPage.findMany({
      where: { projectId },
      orderBy: { id: "desc" },
    });
    return NextResponse.json({ pages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur de récupération" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { url, projectId } = await request.json();
    if (!url || !projectId) {
      return NextResponse.json({ error: "url et projectId requis" }, { status: 400 });
    }

    const start = new URL(url);
    const queue: string[] = [start.href];
    const visited = new Set<string>();
    let createdCount = 0;

    while (queue.length && visited.size < MAX_PAGES) {
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const response = await axios.get(currentUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AI-Scraper/1.0)" },
          timeout: 15000,
        });
        const $ = cheerio.load(response.data);
        const content = cleanText($);

        if (content) {
          await prisma.scrapedPage.upsert({
            where: { url_projectId: { url: currentUrl, projectId } },
            update: { content },
            create: { url: currentUrl, content, projectId },
          });
          createdCount += 1;
        }

        const links = extractLinks($, new URL(currentUrl));
        for (const link of links) {
          if (visited.size + queue.length >= MAX_PAGES) break;
          if (!visited.has(link)) queue.push(link);
        }
      } catch (error) {
        console.warn(`Échec du scraping de ${currentUrl}`, error);
        continue;
      }
    }

    return NextResponse.json({ createdCount, visited: visited.size });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors du scraping" }, { status: 500 });
  }
}
