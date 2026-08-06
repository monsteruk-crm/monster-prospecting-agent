import { describe, expect, test, vi } from "vitest";

import { BraveSearchProvider } from "@/lib/discovery/brave-search-provider";

const request = {
  query: "family attractions United Kingdom",
  countryOrLocale: "United Kingdom",
  freshnessWindowDays: 365,
  resultLimit: 30,
  missionRunId: "run-brave-test",
};

describe("BraveSearchProvider", () => {
  test("calls the Brave web API and maps web results", async () => {
    const fetchImplementation = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString());
      expect(url.hostname).toBe("api.search.brave.com");
      expect(url.pathname).toBe("/res/v1/web/search");
      expect(url.searchParams.get("country")).toBe("gb");
      expect(url.searchParams.get("count")).toBe("20");
      expect(new Headers(init?.headers).get("X-Subscription-Token")).toBe("secret");
      return new Response(JSON.stringify({ web: { results: [{ title: "Acme Events", url: "https://acme.org", description: "Official events." }] } }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const provider = new BraveSearchProvider({ apiKey: "secret", fetchImplementation, now: () => new Date("2026-08-06T12:00:00.000Z") });
    await expect(provider.search(request)).resolves.toMatchObject([{ title: "Acme Events", url: "https://acme.org", providerRank: 1, query: request.query }]);
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  test("fails explicitly when the key is missing", async () => {
    await expect(new BraveSearchProvider({ apiKey: "" }).search(request)).rejects.toMatchObject({ code: "MISSING_API_KEY" });
  });
});
