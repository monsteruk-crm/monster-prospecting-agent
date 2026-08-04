import { DatabaseConfigurationError, getPrismaClient } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "reachable" });
  } catch (error) {
    const isConfigurationError = error instanceof DatabaseConfigurationError;
    const message = isConfigurationError
      ? error.message
      : "The database health check could not connect. Check the configured Postgres URL.";

    return Response.json(
      {
        status: "blocked",
        error: {
          code: isConfigurationError ? error.code : "DATABASE_UNREACHABLE",
          message,
        },
      },
      { status: 503 },
    );
  }
}
