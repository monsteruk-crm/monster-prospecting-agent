import { describe, expect, test } from "vitest";

import { SmokeResultSchema } from "@/lib/ai/smoke-result";

describe("smoke result schema", () => {
  test("accepts the structured gateway result", () => {
    expect(
      SmokeResultSchema.parse({ missionTitle: "Next Monster deal", status: "ready" }),
    ).toEqual({ missionTitle: "Next Monster deal", status: "ready" });
  });

  test("rejects an unapproved status", () => {
    expect(() => SmokeResultSchema.parse({ missionTitle: "Test", status: "complete" })).toThrow();
  });
});
