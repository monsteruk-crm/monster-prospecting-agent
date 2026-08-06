import { validatePublicUrl, type PublicAddressLookup } from "@/lib/security/ssrf";
import { SearchProviderRequestSchema, type SearchProvider, type SearchProviderRequest } from "@/lib/discovery/search-provider";
import { SearchResultSchema, type SearchResult } from "@/lib/sales/mission-schema";

export const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const BRAVE_HOSTS = new Set(["api.search.brave.com"]);
const MAX_RESULTS_PER_REQUEST = 20;
const MAX_BYTES = 750_000;

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface BraveSearchProviderDependencies {
  apiKey?: string;
  fetchImplementation?: FetchImplementation;
  resolveAddresses?: PublicAddressLookup;
  now?: () => Date;
  timeoutMs?: number;
}

export class BraveSearchError extends Error {
  readonly code: "MISSING_API_KEY" | "HTTP_ERROR" | "INVALID_RESPONSE" | "TIMEOUT" | "REQUEST_FAILED";

  constructor(code: BraveSearchError["code"], message: string) {
    super(message);
    this.name = "BraveSearchError";
    this.code = code;
  }
}

function countryCode(value: string): string | undefined {
  const upper = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  const names: Record<string, string> = {
    "UNITED KINGDOM": "GB",
    "GERMANY": "DE",
    "FRANCE": "FR",
    "IRELAND": "IE",
    "NETHERLANDS": "NL",
    "SPAIN": "ES",
    "ITALY": "IT",
    "UNITED STATES": "US",
    "USA": "US",
  };
  return names[upper];
}

function readableText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

async function readBody(response: Response): Promise<string> {
  if (!response.body) throw new BraveSearchError("INVALID_RESPONSE", "Brave returned no readable response body.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) throw new BraveSearchError("INVALID_RESPONSE", `Brave response exceeds the ${MAX_BYTES}-byte limit.`);
    chunks.push(value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

function parseResults(raw: string, request: SearchProviderRequest, now: string): SearchResult[] {
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { throw new BraveSearchError("INVALID_RESPONSE", "Brave returned invalid JSON."); }
  const results = payload && typeof payload === "object" && "web" in payload && payload.web && typeof payload.web === "object" && "results" in payload.web && Array.isArray(payload.web.results)
    ? payload.web.results
    : [];
  const parsed = results.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { title?: unknown; url?: unknown; description?: unknown };
    const result = SearchResultSchema.safeParse({
      title: readableText(candidate.title, 300),
      url: typeof candidate.url === "string" ? candidate.url : "",
      snippet: readableText(candidate.description, 1000),
      providerRank: index + 1,
      query: request.query,
      discoveryTime: now,
    });
    return result.success ? [result.data] : [];
  }).slice(0, Math.min(request.resultLimit, MAX_RESULTS_PER_REQUEST));
  if (parsed.length === 0) throw new BraveSearchError("INVALID_RESPONSE", "Brave returned no parseable web results.");
  return parsed;
}

export class BraveSearchProvider implements SearchProvider {
  private readonly dependencies: BraveSearchProviderDependencies;

  constructor(dependencies: BraveSearchProviderDependencies = {}) {
    this.dependencies = dependencies;
  }

  async search(input: SearchProviderRequest): Promise<readonly SearchResult[]> {
    const request = SearchProviderRequestSchema.parse(input);
    const apiKey = this.dependencies.apiKey?.trim();
    if (!apiKey) throw new BraveSearchError("MISSING_API_KEY", "BRAVE_API is not configured.");
    const endpoint = new URL(BRAVE_SEARCH_ENDPOINT);
    endpoint.searchParams.set("q", request.query.slice(0, 400));
    endpoint.searchParams.set("count", String(Math.min(request.resultLimit, MAX_RESULTS_PER_REQUEST)));
    endpoint.searchParams.set("search_lang", "en");
    const country = countryCode(request.countryOrLocale.split(/[,;]/, 1)[0] ?? "");
    if (country) endpoint.searchParams.set("country", country.toLowerCase());
    const url = await validatePublicUrl(endpoint.toString(), this.dependencies.resolveAddresses);
    if (!BRAVE_HOSTS.has(url.hostname)) throw new BraveSearchError("REQUEST_FAILED", "Brave redirected outside its approved API host.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.dependencies.timeoutMs ?? 10_000);
    try {
      const response = await (this.dependencies.fetchImplementation ?? globalThis.fetch)(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      });
      if (response.status !== 200) throw new BraveSearchError("HTTP_ERROR", `Brave returned HTTP ${response.status}.`);
      return parseResults(await readBody(response), request, (this.dependencies.now ?? (() => new Date()))().toISOString());
    } catch (error) {
      if (error instanceof BraveSearchError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new BraveSearchError("TIMEOUT", "Brave search exceeded its timeout.");
      throw new BraveSearchError("REQUEST_FAILED", `Brave search request failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const braveSearchProvider = new BraveSearchProvider({ apiKey: process.env.BRAVE_API ?? process.env.BRAVE_API_KEY });
