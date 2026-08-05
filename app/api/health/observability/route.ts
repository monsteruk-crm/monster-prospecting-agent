export const runtime = "nodejs";

export async function GET() {
  const tracingEnabled = process.env.LANGSMITH_TRACING?.toLowerCase() === "true";
  const apiKeyConfigured = Boolean(process.env.LANGSMITH_API_KEY);
  const project = process.env.LANGSMITH_PROJECT ?? "monster-scout-sales-hunter";
  return Response.json({
    langSmith: {
      tracingEnabled,
      credentialsConfigured: apiKeyConfigured,
      project,
      endpoint: process.env.LANGSMITH_ENDPOINT ?? "https://api.smith.langchain.com",
      status: tracingEnabled && apiKeyConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
    },
  }, { status: tracingEnabled && apiKeyConfigured ? 200 : 503, headers: { "cache-control": "no-store" } });
}
