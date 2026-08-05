import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/prisma/generated/client";

export class DatabaseConfigurationError extends Error {
  readonly code = "DATABASE_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getDatabaseConnectionString(): string {
  const connectionString = (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.PRISMA_DATABASE_URL ??
    process.env.DIRECT_URL
  )?.trim();

  if (!connectionString) {
    throw new DatabaseConfigurationError(
      "No database URL is configured. Set DATABASE_URL, POSTGRES_URL, PRISMA_DATABASE_URL, or DIRECT_URL before using the database.",
    );
  }

  return normalisePrismaPostgresUrl(normaliseSslMode(connectionString));
}

function normalisePrismaPostgresUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.hostname === "db.prisma.io" && url.pathname === "/postgres") {
      url.pathname = "/";
    }
    if (url.hostname === "db.prisma.io" && !url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

function normaliseSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Preserve the original value so Prisma can report its normal connection error.
  }
  return connectionString;
}

export function getPrismaClient(): PrismaClient {
  const connectionString = getDatabaseConnectionString();

  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({ connectionString });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
