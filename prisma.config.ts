import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js loads .env.local automatically; Prisma CLI does not. Load it first
// so local credentials work with `npx prisma ...` as well.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const directUrl =
  process.env.DIRECT_URL ??
  process.env.PRISMA_DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!directUrl) {
  throw new Error(
    "Prisma database URL is missing. Set DIRECT_URL, PRISMA_DATABASE_URL, POSTGRES_URL, or DATABASE_URL.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: normalisePrismaPostgresUrl(directUrl),
  },
});

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
