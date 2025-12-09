import { PrismaClient } from "@prisma/client";

const datasourceUrl = process.env.DATABASE_URL ?? "file:./dev.db";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: datasourceUrl } },
    log: ["error"], // tu peux mettre ["query"] si tu veux tout voir
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
