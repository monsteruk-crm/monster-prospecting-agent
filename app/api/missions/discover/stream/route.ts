import { SalesMissionBriefSchema } from "@/lib/sales/mission-schema";
import { executeDiscoveryRun } from "@/lib/graph/discovery-runner";
import { DatabaseConfigurationError } from "@/lib/db/client";

export const runtime = "nodejs";

type StreamMessage = {
  type: "run_started" | "progress" | "search_progress" | "completed" | "error";
  [key: string]: unknown;
};

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, { status: 400 });
  }

  const parsed = SalesMissionBriefSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({
      error: {
        code: "INVALID_SALES_MISSION_BRIEF",
        message: "The mission brief failed validation.",
        issues: parsed.error.issues,
      },
    }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (message: StreamMessage) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));
        } catch {
          closed = true;
        }
      };

      void (async () => {
        try {
          const result = await executeDiscoveryRun(parsed.data, {
            onPrepared: (prepared) => {
              send({
                type: "run_started",
                missionId: prepared.missionId,
                missionRunId: prepared.missionRunId,
                message: "Mission brief persisted; discovery is starting.",
              });
            },
            onProgress: (event) => {
              send({ type: "progress", ...event });
            },
            onSearchProgress: (event) => {
              send({ type: "search_progress", ...event });
            },
          });
          send({
            type: "completed",
            missionId: result.discovered.missionId,
            missionRunId: result.discovered.missionRunId,
            status: result.discovered.status,
            discoveryStage: result.discovered.discoveryStage,
            accountCount: result.discovered.discoveredAccounts.length,
            signalCount: result.discovered.buyingSignals.length,
          });
        } catch (error) {
          send({
            type: "error",
            error: {
              code: error instanceof DatabaseConfigurationError ? "MISSION_PERSISTENCE_FAILED" : "MISSION_DISCOVERY_OR_PERSISTENCE_FAILED",
              message: error instanceof DatabaseConfigurationError
                ? "A database is required to persist the discovery run."
                : error instanceof Error && error.message === "MISSION_PREPARATION_INCOMPLETE"
                  ? "The mission preparation graph did not produce discovery inputs."
                  : "The bounded discovery run could not be completed and persisted.",
            },
          });
        } finally {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }
      })();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-store, no-transform",
      "content-type": "application/x-ndjson; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
}
