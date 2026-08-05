import { load } from "cheerio";
import { validatePublicUrl, type PublicAddressLookup } from "@/lib/security/ssrf";
import { SearchProviderRequestSchema, type SearchProvider, type SearchProviderRequest } from "@/lib/discovery/search-provider";
import { SearchResultSchema, type SearchResult } from "@/lib/sales/mission-schema";

const BING_ENDPOINT = "https://www.bing.com/search";
const BING_HOSTS = new Set(["www.bing.com", "bing.com"]);
const MAX_BYTES = 750_000;

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface BingSearchProviderDependencies {
  fetchImplementation?: FetchImplementation;
  resolveAddresses?: PublicAddressLookup;
  now?: () => Date;
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

function text(value: string, maxLength: number): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function resultTarget(rawHref: string): string | undefined {
  try {
    const href = new URL(rawHref);
    if (href.hostname !== "www.bing.com" && href.hostname !== "bing.com") return href.toString();
    const encoded = href.searchParams.get("u");
    if (!encoded) return undefined;
    const decoded = Buffer.from(encoded.startsWith("a1") ? encoded.slice(2) : encoded, "base64url").toString("utf8");
    const target = new URL(decoded);
    return target.protocol === "http:" || target.protocol === "https:" ? target.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function readBody(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "text/html" && contentType !== "application/xhtml+xml") {
    throw new Error(`Bing returned ${contentType ?? "no content type"}, not HTML.`);
  }
  if (!response.body) throw new Error("Bing returned no readable response body.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) throw new Error(`Bing response exceeds the ${MAX_BYTES}-byte limit.`);
    chunks.push(value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

function parseResults(html: string, request: SearchProviderRequest, now: string): SearchResult[] {
  const $ = load(html);
  const results: SearchResult[] = [];
  $("li.b_algo").each((index, element) => {
    if (results.length >= request.resultLimit) return;
    const anchor = $(element).find("h2 a").first();
    const href = anchor.attr("href");
    const title = text(anchor.text(), 300);
    const url = href ? resultTarget(href) : undefined;
    if (!url || !title) return;
    const snippet = text($(element).find(".b_caption p").first().text(), 1000);
    const parsed = SearchResultSchema.safeParse({ title, url, snippet, providerRank: index + 1, query: request.query, discoveryTime: now });
    if (parsed.success) results.push(parsed.data);
  });
  if (results.length === 0) throw new Error("Bing returned no parseable search results.");
  return results;
}

export class BingHtmlSearchProvider implements SearchProvider {
  private readonly dependencies: BingSearchProviderDependencies;

  constructor(dependencies: BingSearchProviderDependencies = {}) {
    this.dependencies = dependencies;
  }

  async search(input: SearchProviderRequest): Promise<readonly SearchResult[]> {
    const request = SearchProviderRequestSchema.parse(input);
    const endpoint = new URL(BING_ENDPOINT);
    endpoint.searchParams.set("q", request.query);
    endpoint.searchParams.set("count", String(request.resultLimit));
    const url = await validatePublicUrl(endpoint.toString(), this.dependencies.resolveAddresses);
    if (!BING_HOSTS.has(url.hostname)) throw new Error("Bing redirected outside its approved hosts.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.dependencies.timeoutMs ?? 10_000);
    try {
      const response = await (this.dependencies.fetchImplementation ?? globalThis.fetch)(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "text/html, application/xhtml+xml", "User-Agent": "MonsterScoutSearch/1.0" },
      });
      if (response.status !== 200) throw new Error(`Bing returned HTTP ${response.status}.`);
      const html = await readBody(response);
      return parseResults(html, request, (this.dependencies.now ?? (() => new Date()))().toISOString());
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const bingHtmlSearchProvider = new BingHtmlSearchProvider();
