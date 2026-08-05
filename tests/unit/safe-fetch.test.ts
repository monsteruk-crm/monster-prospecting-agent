import { afterEach, describe, expect, test, vi } from "vitest";

import {
  SafeFetchError,
  safeFetch,
} from "@/lib/tools/safe-fetch";
import { validatePublicUrl } from "@/lib/security/ssrf";

const publicAddresses = async () => ["93.184.216.34"];

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SSRF-safe public URL validation", () => {
  test.each([
    "http://127.0.0.1/health",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/health",
    "http://[::ffff:127.0.0.1]/health",
  ])("rejects reserved address %s", async (url) => {
    await expect(validatePublicUrl(url)).rejects.toMatchObject({
      code: "PRIVATE_ADDRESS_BLOCKED",
    });
  });

  test("rejects a public hostname whose DNS answers include a private address", async () => {
    await expect(
      validatePublicUrl("https://mixed.example.org", async () => ["93.184.216.34", "10.0.0.8"]),
    ).rejects.toMatchObject({ code: "PRIVATE_ADDRESS_BLOCKED" });
  });

  test("rejects credentials and non-standard ports", async () => {
    await expect(validatePublicUrl("https://user:password@example.org")).rejects.toMatchObject({
      code: "CREDENTIALS_NOT_ALLOWED",
    });
    await expect(validatePublicUrl("https://example.org:8080")).rejects.toMatchObject({
      code: "PORT_NOT_ALLOWED",
    });
  });
});

describe("safeFetch", () => {
  test("returns bounded readable text and provenance for an HTML source", async () => {
    const fetchImplementation = vi.fn(async () =>
      htmlResponse("<html><head><title>Acme Events</title><script>ignore()</script></head><body><h1>Acme Events</h1><p>New festival programme.</p></body></html>"),
    );

    const result = await safeFetch(
      { url: "https://acme.org/news" },
      {
        fetchImplementation,
        resolveAddresses: publicAddresses,
        now: () => new Date("2026-08-04T12:00:00.000Z"),
      },
    );

    expect(result).toMatchObject({
      requestedUrl: "https://acme.org/news",
      finalUrl: "https://acme.org/news",
      status: 200,
      mimeType: "text/html",
      title: "Acme Events",
      readableText: "Acme Events Acme Events New festival programme.",
      retrievedAt: "2026-08-04T12:00:00.000Z",
      redirectCount: 0,
    });
    expect(result.byteCount).toBeGreaterThan(0);
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL("https://acme.org/news"),
      expect.objectContaining({ redirect: "manual", method: "GET" }),
    );
  });

  test("preserves bounded contact navigation, mailto, tel and JSON-LD metadata", async () => {
    const result = await safeFetch(
      { url: "https://acme.org/" },
      {
        fetchImplementation: vi.fn(async () => htmlResponse(`
          <html><head><link rel="canonical" href="https://www.acme.org/"><script type="application/ld+json">{"@type":"Organization","email":"hello@acme.org","contactPoint":{"telephone":"+44 20 1234 5678"}}</script></head>
          <body><a href="/partnerships">Partnerships</a><a href="mailto:partnerships@acme.org">Email us</a><a href="tel:+442012345678">Call</a><a href="https://linkedin.com/company/acme">Team</a></body></html>
        `)),
        resolveAddresses: publicAddresses,
      },
    );

    expect(result.canonicalUrl).toBe("https://www.acme.org/");
    expect(result.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: "https://acme.org/partnerships", sameSite: true }),
      expect.objectContaining({ url: "https://linkedin.com/company/acme", sameSite: false }),
    ]));
    expect(result.publicEmailHints).toEqual(expect.arrayContaining([
      expect.objectContaining({ email: "partnerships@acme.org", sourceKind: "MAILTO" }),
      expect.objectContaining({ email: "hello@acme.org", sourceKind: "JSON_LD" }),
    ]));
    expect(result.publicPhoneHints).toEqual(expect.arrayContaining([
      expect.objectContaining({ phone: "+442012345678", sourceKind: "TEL" }),
    ]));
  });

  test("revalidates every redirect and blocks a private destination", async () => {
    const fetchImplementation = vi.fn(async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://127.0.0.1/admin" },
      }),
    );

    await expect(
      safeFetch(
        { url: "https://acme.org/news" },
        { fetchImplementation, resolveAddresses: publicAddresses },
      ),
    ).rejects.toMatchObject({ code: "PRIVATE_ADDRESS_BLOCKED" });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  test("follows bounded public redirects and records the final URL", async () => {
    const fetchImplementation = vi
      .fn<(_: RequestInfo | URL, __?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: "https://www.acme.org/news" },
        }),
      )
      .mockResolvedValueOnce(htmlResponse("<title>Acme</title>Current programme"));
    const resolveAddresses = vi.fn(publicAddresses);

    const result = await safeFetch(
      { url: "https://acme.org/news" },
      { fetchImplementation, resolveAddresses },
    );

    expect(result.finalUrl).toBe("https://www.acme.org/news");
    expect(result.redirectCount).toBe(1);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(resolveAddresses).toHaveBeenNthCalledWith(1, "acme.org");
    expect(resolveAddresses).toHaveBeenNthCalledWith(2, "www.acme.org");
  });

  test("rejects unsupported MIME types and oversized bodies", async () => {
    const pdfFetch = vi.fn(async () =>
      new Response("%PDF-1.7", { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    await expect(
      safeFetch({ url: "https://acme.org/report" }, { fetchImplementation: pdfFetch, resolveAddresses: publicAddresses }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MIME_TYPE" });

    const oversizedFetch = vi.fn(async () => htmlResponse("12345678901"));
    await expect(
      safeFetch(
        { url: "https://acme.org/report" },
        { fetchImplementation: oversizedFetch, resolveAddresses: publicAddresses, maxBytes: 10 },
      ),
    ).rejects.toBeInstanceOf(SafeFetchError);
    await expect(
      safeFetch(
        { url: "https://acme.org/report" },
        { fetchImplementation: oversizedFetch, resolveAddresses: publicAddresses, maxBytes: 10 },
      ),
    ).rejects.toMatchObject({ code: "BODY_TOO_LARGE" });
  });

  test("does not downgrade an HTTPS source to HTTP", async () => {
    const fetchImplementation = vi.fn(async () =>
      new Response(null, {
        status: 302,
        headers: { location: "http://acme.org/news" },
      }),
    );

    await expect(
      safeFetch({ url: "https://acme.org/news" }, { fetchImplementation, resolveAddresses: publicAddresses }),
    ).rejects.toMatchObject({ code: "HTTPS_DOWNGRADE" });
  });
});
