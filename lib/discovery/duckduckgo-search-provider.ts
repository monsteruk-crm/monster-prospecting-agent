import {
  SsrfValidationError,
  validatePublicUrl,
  type PublicAddressLookup,
} from "@/lib/security/ssrf";
import {
  SearchProviderRequestSchema,
  type SearchProvider,
  type SearchProviderRequest,
} from "@/lib/discovery/search-provider";
import {
  SearchResultSchema,
  type SearchResult,
} from "@/lib/sales/mission-schema";

export const DUCKDUCKGO_SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";

const DUCKDUCKGO_HOSTS = new Set([
  "duckduckgo.com",
  "html.duckduckgo.com",
  "www.duckduckgo.com",
]);
const DEFAULT_MAX_BYTES = 750_000;
const DEFAULT_MAX_REDIRECTS = 2;
const DEFAULT_TIMEOUT_MS = 10_000;

export const DUCKDUCKGO_ERROR_CODES = [
  "INVALID_REQUEST",
  "SSRF_VALIDATION_FAILED",
  "REDIRECT_NOT_ALLOWED",
  "REDIRECT_LIMIT_EXCEEDED",
  "MISSING_CONTENT_TYPE",
  "UNSUPPORTED_CONTENT_TYPE",
  "CONTENT_LENGTH_EXCEEDED",
  "BODY_TOO_LARGE",
  "TIMEOUT",
  "REQUEST_FAILED",
] as const;

export type DuckDuckGoErrorCode = (typeof DUCKDUCKGO_ERROR_CODES)[number];

export class DuckDuckGoSearchError extends Error {
  readonly code: DuckDuckGoErrorCode;

  constructor(code: DuckDuckGoErrorCode, message: string) {
    super(message);
    this.name = "DuckDuckGoSearchError";
    this.code = code;
  }
}

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface DuckDuckGoSearchProviderDependencies {
  fetchImplementation?: FetchImplementation;
  resolveAddresses?: PublicAddressLookup;
  now?: () => Date;
  maxBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/gi, (entity, body: string) => {
    const lowerBody = body.toLowerCase();
    if (lowerBody === "amp") return "&";
    if (lowerBody === "apos") return "'";
    if (lowerBody === "gt") return ">";
    if (lowerBody === "lt") return "<";
    if (lowerBody === "nbsp") return " ";
    if (lowerBody === "quot") return '"';

    const codePoint = lowerBody.startsWith("#x")
      ? Number.parseInt(lowerBody.slice(2), 16)
      : Number.parseInt(lowerBody.slice(1), 10);
    return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

function readableText(value: string, maxLength: number): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function resultTarget(rawHref: string): string | undefined {
  let href: URL;
  try {
    href = new URL(decodeHtmlEntities(rawHref), DUCKDUCKGO_SEARCH_ENDPOINT);
  } catch {
    return undefined;
  }

  if (DUCKDUCKGO_HOSTS.has(href.hostname) && href.pathname === "/l/") {
    const redirectedTarget = href.searchParams.get("uddg");
    if (!redirectedTarget) {
      return undefined;
    }
    try {
      href = new URL(redirectedTarget);
    } catch {
      return undefined;
    }
  }

  if ((href.protocol !== "http:" && href.protocol !== "https:") || href.username || href.password || DUCKDUCKGO_HOSTS.has(href.hostname)) {
    return undefined;
  }

  href.hash = "";
  return href.toString();
}

function parseSearchResults(html: string, request: SearchProviderRequest, now: string): SearchResult[] {
  const anchorPattern = /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bresult__a\b[^"']*["'])(?=[^>]*\bhref\s*=\s*["'][^"']+["'])[^>]*>([\s\S]*?)<\/a\s*>/gi;
  const anchors = [...html.matchAll(anchorPattern)];
  const results: SearchResult[] = [];

  for (const [index, anchor] of anchors.entries()) {
    const anchorTag = anchor[0];
    const hrefMatch = /\bhref\s*=\s*["']([^"']+)["']/i.exec(anchorTag);
    const url = hrefMatch ? resultTarget(hrefMatch[1]) : undefined;
    const title = readableText(anchor[1], 300);
    if (!url || !title) {
      continue;
    }

    const start = anchor.index ?? 0;
    const end = anchors[index + 1]?.index ?? html.length;
    const segment = html.slice(start, end);
    const snippetMatch = /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bresult__snippet\b[^"']*["'])[^>]*>([\s\S]*?)<\/a\s*>/i.exec(segment);
    const parsed = SearchResultSchema.safeParse({
      title,
      url,
      snippet: snippetMatch ? readableText(snippetMatch[1], 1000) : "",
      providerRank: results.length + 1,
      query: request.query,
      discoveryTime: now,
    });
    if (parsed.success) {
      results.push(parsed.data);
    }
    if (results.length >= request.resultLimit) {
      break;
    }
  }

  return results;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!contentType) {
    throw new DuckDuckGoSearchError("MISSING_CONTENT_TYPE", "DuckDuckGo did not declare a content type.");
  }
  if (contentType !== "text/html" && contentType !== "application/xhtml+xml") {
    throw new DuckDuckGoSearchError("UNSUPPORTED_CONTENT_TYPE", `DuckDuckGo returned ${contentType}, not HTML.`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > maxBytes) {
    throw new DuckDuckGoSearchError("CONTENT_LENGTH_EXCEEDED", `DuckDuckGo response exceeds the ${maxBytes}-byte limit.`);
  }
  if (!response.body) {
    throw new DuckDuckGoSearchError("BODY_TOO_LARGE", "DuckDuckGo returned no readable response body.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maxBytes) {
        throw new DuckDuckGoSearchError("BODY_TOO_LARGE", `DuckDuckGo response exceeds the ${maxBytes}-byte limit.`);
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  const bytes = new Uint8Array(byteCount);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function searchError(error: unknown, signal: AbortSignal): DuckDuckGoSearchError {
  if (error instanceof DuckDuckGoSearchError) {
    return error;
  }
  if (error instanceof SsrfValidationError) {
    return new DuckDuckGoSearchError("SSRF_VALIDATION_FAILED", error.message);
  }
  if (signal.aborted) {
    return new DuckDuckGoSearchError("TIMEOUT", "DuckDuckGo search exceeded its timeout.");
  }
  return new DuckDuckGoSearchError(
    "REQUEST_FAILED",
    `DuckDuckGo search request failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
}

export class DuckDuckGoSearchProvider implements SearchProvider {
  private readonly dependencies: DuckDuckGoSearchProviderDependencies;

  constructor(dependencies: DuckDuckGoSearchProviderDependencies = {}) {
    this.dependencies = dependencies;
  }

  async search(input: SearchProviderRequest): Promise<readonly SearchResult[]> {
    const request = SearchProviderRequestSchema.parse(input);
    const maxBytes = this.dependencies.maxBytes ?? DEFAULT_MAX_BYTES;
    const maxRedirects = this.dependencies.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    const timeoutMs = this.dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || !Number.isInteger(maxRedirects) || maxRedirects < 0 || !Number.isInteger(timeoutMs) || timeoutMs < 1) {
      throw new DuckDuckGoSearchError("INVALID_REQUEST", "DuckDuckGo search limits must be positive integers.");
    }

    const endpoint = new URL(DUCKDUCKGO_SEARCH_ENDPOINT);
    endpoint.searchParams.set("q", request.query);
    endpoint.searchParams.set("kl", "wt-wt");
    endpoint.searchParams.set("kp", "1");

    let currentUrl = await validatePublicUrl(endpoint.toString(), this.dependencies.resolveAddresses);
    let redirectCount = 0;
    const fetchImplementation = this.dependencies.fetchImplementation ?? globalThis.fetch;

    while (true) {
      if (!DUCKDUCKGO_HOSTS.has(currentUrl.hostname)) {
        throw new DuckDuckGoSearchError("REDIRECT_NOT_ALLOWED", "DuckDuckGo search redirected outside its approved hosts.");
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImplementation(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Accept: "text/html, application/xhtml+xml",
            "User-Agent": "MonsterScoutDuckDuckGoSearch/1.0",
          },
        });

        if (response.status >= 300 && response.status < 400) {
          if (redirectCount >= maxRedirects) {
            throw new DuckDuckGoSearchError("REDIRECT_LIMIT_EXCEEDED", `DuckDuckGo exceeded the ${maxRedirects}-redirect limit.`);
          }
          const location = response.headers.get("location");
          if (!location) {
            throw new DuckDuckGoSearchError("REDIRECT_NOT_ALLOWED", "DuckDuckGo returned a redirect without a location.");
          }
          const nextUrl = new URL(location, currentUrl);
          if (nextUrl.protocol !== "https:" || !DUCKDUCKGO_HOSTS.has(nextUrl.hostname)) {
            throw new DuckDuckGoSearchError("REDIRECT_NOT_ALLOWED", "DuckDuckGo redirected outside the approved HTTPS hosts.");
          }
          currentUrl = await validatePublicUrl(nextUrl.toString(), this.dependencies.resolveAddresses);
          redirectCount += 1;
          continue;
        }

        if (response.status < 200 || response.status >= 300) {
          throw new DuckDuckGoSearchError("REQUEST_FAILED", `DuckDuckGo returned HTTP ${response.status}.`);
        }

        const html = await readBoundedBody(response, maxBytes);
        return parseSearchResults(html, request, (this.dependencies.now ?? (() => new Date()))().toISOString());
      } catch (error) {
        throw searchError(error, controller.signal);
      } finally {
        clearTimeout(timeout);
      }
    }
  }
}

export const duckDuckGoSearchProvider = new DuckDuckGoSearchProvider();
