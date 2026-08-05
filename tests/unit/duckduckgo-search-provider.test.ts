import { describe, expect, test, vi } from "vitest";

import {
  DuckDuckGoSearchProvider,
} from "@/lib/discovery/duckduckgo-search-provider";

const publicAddresses = async () => ["40.1.1.1"];

const request = {
  query: "ticketed event promoters Germany",
  countryOrLocale: "Germany",
  freshnessWindowDays: 365,
  resultLimit: 2,
  missionRunId: "run-ddg-test",
};

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=UTF-8" },
  });
}

describe("DuckDuckGoSearchProvider", () => {
  test("parses HTML results and unwraps DuckDuckGo redirect URLs", async () => {
    const fetchImplementation = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/html/");
      expect(init?.method).toBe("POST");
      const body = new URLSearchParams(String(init?.body));
      expect(body.get("q")).toBe(request.query);
      expect(body.get("kl")).toBe("wt-wt");
      expect(body.get("kp")).toBe("1");
      return htmlResponse(`
        <div class="result results_links">
          <h2 class="result__title">
            <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Facme.org%2Fprogramme&amp;rut=ignored">Acme &amp; Events</a>
          </h2>
          <a class="result__snippet">New <b>festival</b> programme.</a>
        </div>
        <div class="result results_links">
          <h2 class="result__title"><a class="result__a" href="https://example.org/events">Example Events</a></h2>
          <a class="result__snippet">A second result.</a>
        </div>
      `);
    });

    const provider = new DuckDuckGoSearchProvider({
      fetchImplementation,
      resolveAddresses: publicAddresses,
      now: () => new Date("2026-08-04T12:00:00.000Z"),
    });

    const results = await provider.search(request);

    expect(results).toEqual([
      {
        title: "Acme & Events",
        url: "https://acme.org/programme",
        snippet: "New festival programme.",
        providerRank: 1,
        query: request.query,
        discoveryTime: "2026-08-04T12:00:00.000Z",
      },
      {
        title: "Example Events",
        url: "https://example.org/events",
        snippet: "A second result.",
        providerRank: 2,
        query: request.query,
        discoveryTime: "2026-08-04T12:00:00.000Z",
      },
    ]);
  });

  test("honours the result limit and does not return DuckDuckGo-owned links", async () => {
    const fetchImplementation = vi.fn(async () =>
      htmlResponse(`
        <a class="result__a" href="https://duckduckgo.com/about">DuckDuckGo</a>
        <a class="result__a" href="https://one.org">One</a>
        <a class="result__a" href="https://two.org">Two</a>
      `),
    );
    const provider = new DuckDuckGoSearchProvider({
      fetchImplementation,
      resolveAddresses: publicAddresses,
    });

    const results = await provider.search({ ...request, resultLimit: 1 });

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://one.org/");
  });

  test("rejects redirects outside DuckDuckGo's approved HTTPS hosts", async () => {
    const fetchImplementation = vi.fn(async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.example/search" },
      }),
    );
    const provider = new DuckDuckGoSearchProvider({
      fetchImplementation,
      resolveAddresses: publicAddresses,
    });

    await expect(provider.search(request)).rejects.toMatchObject({ code: "REDIRECT_NOT_ALLOWED" });
  });

  test("reports a challenge page instead of silently returning zero results", async () => {
    const provider = new DuckDuckGoSearchProvider({
      fetchImplementation: vi.fn(async () => htmlResponse('<form id="challenge-form">Please complete the challenge</form>')),
      resolveAddresses: publicAddresses,
    });

    await expect(provider.search(request)).rejects.toMatchObject({
      code: "NO_USABLE_RESULTS",
      message: expect.stringContaining("challenge"),
    });
  });

  test("does not treat an asynchronous non-200 response as search results", async () => {
    const provider = new DuckDuckGoSearchProvider({
      fetchImplementation: vi.fn(async () => new Response("", { status: 202, headers: { "content-type": "text/html" } })),
      resolveAddresses: publicAddresses,
    });

    await expect(provider.search(request)).rejects.toMatchObject({ code: "REQUEST_FAILED" });
  });
});
