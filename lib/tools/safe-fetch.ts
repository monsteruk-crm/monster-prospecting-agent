import { createHash } from "node:crypto";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import {
  SsrfValidationError,
  validatePublicUrl,
  type PublicAddressLookup,
} from "@/lib/security/ssrf";

const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_URL_LENGTH = 2_048;
const MAX_TITLE_LENGTH = 300;
const MAX_REDIRECT_LOCATION_LENGTH = 2_048;

const ALLOWED_MIME_TYPES = new Set([
  "application/xhtml+xml",
  "text/html",
  "text/plain",
]);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const SafeFetchInputSchema = z.object({
  url: z.string().trim().url().max(MAX_URL_LENGTH),
});

export const SafeFetchResultSchema = z.object({
  requestedUrl: z.string().url(),
  finalUrl: z.string().url(),
  status: z.number().int().min(200).max(599),
  mimeType: z.string().min(1),
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  readableText: z.string(),
  byteCount: z.number().int().nonnegative(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  retrievedAt: z.string().datetime(),
  redirectCount: z.number().int().nonnegative().max(DEFAULT_MAX_REDIRECTS),
});

export type SafeFetchInput = z.infer<typeof SafeFetchInputSchema>;
export type SafeFetchResult = z.infer<typeof SafeFetchResultSchema>;

export const SAFE_FETCH_ERROR_CODES = [
  "INVALID_URL",
  "UNSUPPORTED_PROTOCOL",
  "CREDENTIALS_NOT_ALLOWED",
  "PORT_NOT_ALLOWED",
  "LOCAL_HOSTNAME_BLOCKED",
  "PRIVATE_ADDRESS_BLOCKED",
  "DNS_LOOKUP_FAILED",
  "NO_PUBLIC_ADDRESS",
  "REDIRECT_LIMIT_EXCEEDED",
  "REDIRECT_LOCATION_MISSING",
  "HTTPS_DOWNGRADE",
  "FETCH_FAILED",
  "TIMEOUT",
  "HTTP_ERROR",
  "MISSING_CONTENT_TYPE",
  "UNSUPPORTED_MIME_TYPE",
  "CONTENT_LENGTH_EXCEEDED",
  "BODY_TOO_LARGE",
  "EMPTY_RESPONSE_BODY",
] as const;

export type SafeFetchErrorCode = (typeof SAFE_FETCH_ERROR_CODES)[number];

export class SafeFetchError extends Error {
  readonly code: SafeFetchErrorCode;
  readonly url?: string;

  constructor(code: SafeFetchErrorCode, message: string, url?: string) {
    super(message);
    this.name = "SafeFetchError";
    this.code = code;
    this.url = url;
  }
}

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface SafeFetchDependencies {
  fetchImplementation?: FetchImplementation;
  resolveAddresses?: PublicAddressLookup;
  now?: () => Date;
  maxBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
}

function normaliseMimeType(contentType: string | null): string {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
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

function readableHtml(html: string): { title?: string; readableText: string } {
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  const title = titleMatch
    ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH)
    : undefined;

  const withoutNonContent = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const readableText = decodeHtmlEntities(withoutNonContent).replace(/\s+/g, " ").trim();

  return { title: title || undefined, readableText };
}

function extractReadableText(mimeType: string, bytes: Uint8Array): { title?: string; readableText: string } {
  const text = new TextDecoder("utf-8").decode(bytes);
  return mimeType === "text/html" || mimeType === "application/xhtml+xml"
    ? readableHtml(text)
    : { readableText: text.replace(/\s+/g, " ").trim() };
}

async function readBody(response: Response, maxBytes: number, url: string): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declaredLength = Number(contentLength);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new SafeFetchError("CONTENT_LENGTH_EXCEEDED", `The source exceeds the ${maxBytes}-byte limit.`, url);
    }
  }

  if (!response.body) {
    throw new SafeFetchError("EMPTY_RESPONSE_BODY", "The source response did not contain a readable body.", url);
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
        throw new SafeFetchError("BODY_TOO_LARGE", `The source exceeds the ${maxBytes}-byte limit.`, url);
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
  return bytes;
}

function asFetchError(error: unknown, url: string, signal: AbortSignal): SafeFetchError {
  if (error instanceof SafeFetchError) {
    return error;
  }
  if (error instanceof SsrfValidationError) {
    return new SafeFetchError(error.code, error.message, url);
  }
  if (signal.aborted) {
    return new SafeFetchError("TIMEOUT", "The source request exceeded its timeout.", url);
  }
  return new SafeFetchError(
    "FETCH_FAILED",
    `The source request failed: ${error instanceof Error ? error.message : "unknown error"}`,
    url,
  );
}

export async function safeFetch(
  input: SafeFetchInput,
  dependencies: SafeFetchDependencies = {},
): Promise<SafeFetchResult> {
  const parsedInput = SafeFetchInputSchema.parse(input);
  const maxBytes = dependencies.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = dependencies.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || !Number.isInteger(maxRedirects) || maxRedirects < 0 || !Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new SafeFetchError("FETCH_FAILED", "Safe-fetch limits must be positive integers.");
  }

  const fetchImplementation = dependencies.fetchImplementation ?? globalThis.fetch;
  const resolveAddresses = dependencies.resolveAddresses;
  let requestedUrl: URL;
  try {
    requestedUrl = await validatePublicUrl(parsedInput.url, resolveAddresses);
  } catch (error) {
    if (error instanceof SsrfValidationError) {
      throw new SafeFetchError(error.code, error.message, parsedInput.url);
    }
    throw error;
  }
  let currentUrl = requestedUrl;
  let redirectCount = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImplementation(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html, application/xhtml+xml, text/plain;q=0.9",
          "User-Agent": "MonsterScoutOfficialSourceFetcher/1.0",
        },
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirectCount >= maxRedirects) {
          throw new SafeFetchError("REDIRECT_LIMIT_EXCEEDED", `The source exceeded the ${maxRedirects}-redirect limit.`, currentUrl.toString());
        }

        const location = response.headers.get("location");
        if (!location || location.length > MAX_REDIRECT_LOCATION_LENGTH) {
          throw new SafeFetchError("REDIRECT_LOCATION_MISSING", "The source redirect did not contain a valid location.", currentUrl.toString());
        }

        let nextUrl: URL;
        try {
          nextUrl = new URL(location, currentUrl);
        } catch {
          throw new SafeFetchError("REDIRECT_LOCATION_MISSING", "The source redirect location is invalid.", currentUrl.toString());
        }

        if (currentUrl.protocol === "https:" && nextUrl.protocol === "http:") {
          throw new SafeFetchError("HTTPS_DOWNGRADE", "HTTPS sources may not redirect to HTTP.", nextUrl.toString());
        }

        currentUrl = await validatePublicUrl(nextUrl.toString(), resolveAddresses);
        redirectCount += 1;
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        throw new SafeFetchError("HTTP_ERROR", `The source returned HTTP ${response.status}.`, currentUrl.toString());
      }

      const mimeType = normaliseMimeType(response.headers.get("content-type"));
      if (!mimeType) {
        throw new SafeFetchError("MISSING_CONTENT_TYPE", "The source did not declare a content type.", currentUrl.toString());
      }
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new SafeFetchError("UNSUPPORTED_MIME_TYPE", `The source content type ${mimeType} is not allowed.`, currentUrl.toString());
      }

      const bytes = await readBody(response, maxBytes, currentUrl.toString());
      const { title, readableText } = extractReadableText(mimeType, bytes);
      const retrievedAt = (dependencies.now ?? (() => new Date()))().toISOString();

      return SafeFetchResultSchema.parse({
        requestedUrl: requestedUrl.toString(),
        finalUrl: currentUrl.toString(),
        status: response.status,
        mimeType,
        title,
        readableText,
        byteCount: bytes.byteLength,
        contentHash: createHash("sha256").update(bytes).digest("hex"),
        retrievedAt,
        redirectCount,
      });
    } catch (error) {
      throw asFetchError(error, currentUrl.toString(), controller.signal);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const safeFetchTool = tool(
  async (input) => safeFetch(input),
  {
    name: "safe_fetch",
    description:
      "Fetch one public official-source HTTP(S) page after SSRF validation. It blocks private or internal destinations, revalidates DNS on redirects, caps bytes/redirects/time, and returns untrusted readable text with provenance metadata. Never use it for private pages, authentication bypass, CAPTCHA bypass, or contact enrichment.",
    schema: SafeFetchInputSchema,
  },
);
