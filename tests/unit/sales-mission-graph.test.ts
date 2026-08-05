import { describe, expect, test } from "vitest";

import {
  prepareSalesMission,
  SALES_MISSION_GRAPH_VERSION,
} from "@/lib/graph/sales-mission-preparation";

describe("sales mission preparation graph", () => {
  test("prepares a bounded target profile and search strategy without live research", async () => {
    const state = await prepareSalesMission(
      {
        name: "DACH promoter hunt",
        geographies: ["Germany", "Austria"],
        accountCategories: ["TICKETED_EVENT_PROMOTER", "FESTIVAL_PRODUCER"],
        requiredSignals: ["new event programme"],
        buyerRoles: ["Managing Director", "Head of Programming"],
      },
      { missionId: "mission-test", missionRunId: "run-test" },
    );

    expect(state.missionId).toBe("mission-test");
    expect(state.missionRunId).toBe("run-test");
    expect(state.graphVersion).toBe(SALES_MISSION_GRAPH_VERSION);
    expect(state.status).toBe("READY_FOR_DISCOVERY");
    expect(state.targetProfile?.maximumProspects).toBe(5);
    expect(state.searchStrategy?.queryFamilies.length).toBeGreaterThan(0);
    expect(state.searchStrategy?.totalMaxQueries).toBeLessThanOrEqual(12);
    expect(state.discoveredAccounts).toEqual([]);
    expect(state.budget.searchesUsed).toBe(0);
  });

  test("preserves a warning when mission instructions need review", async () => {
    const state = await prepareSalesMission({
      name: "Instruction review hunt",
      geographies: ["Belgium"],
      accountCategories: ["VISITOR_ATTRACTION"],
      buyerRoles: ["Partnerships Director"],
      instructions: "Prefer organisations with a public winter programme.",
    });

    expect(state.warnings).toEqual([
      {
        code: "INSTRUCTIONS_REQUIRE_REVIEW",
        message: "Mission instructions are preserved for the discovery step and should be reviewed before live search.",
      },
    ]);
  });
});
