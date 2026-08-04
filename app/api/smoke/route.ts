import { ConfigurationError } from "@/lib/ai/model-registry";
import { runGatewaySmoke } from "@/lib/ai/gateway-smoke";

export const runtime = "nodejs";

export async function POST() {
  try {
    return Response.json(await runGatewaySmoke());
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: 503 },
      );
    }

    return Response.json(
      {
        error: {
          code: "GATEWAY_SMOKE_FAILED",
          message: "The AI Gateway smoke test failed. Check server logs for the provider error.",
        },
      },
      { status: 502 },
    );
  }
}
