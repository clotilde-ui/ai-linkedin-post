import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, message: "DB accessible", databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db" });
  } catch (error) {
    console.error("Health DB check failed", error);
    return NextResponse.json(
      { ok: false, error: "DB inaccessible", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
