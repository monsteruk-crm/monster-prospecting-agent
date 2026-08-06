import { createHash } from "node:crypto";

import { load } from "cheerio";
import { tool } from "@langchain/core/tools";
import { getDomain } from "tldts";
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
const MAX_LINKS = 100;
const MAX_CONTACT_HINTS = 20;
const MAX_HINT_TEXT_LENGTH = 300;

const ALLOWED_MIME_TYPES = new Set([
  "application/xhtml+xml",
  "text/html",
  "text/plain",
]);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const SafeFetchInputSchema = z.object({
  url: z.string().trim().url().max(MAX_URL_LENGTH),
});

export const PublicPageLinkSchema = z.object({
  url: z.string().url().max(MAX_URL_LENGTH),
  anchorText: z.string().max(MAX_HINT_TEXT_LENGTH),
  relationship: z.string().max(MAX_HINT_TEXT_LENGTH).optional(),
  sameSite: z.boolean(),
});

export const PublicEmailHintSchema = z.object({
  email: z.string().email(),
  sourceKind: z.enum(["VISIBLE_TEXT", "MAILTO", "JSON_LD", "STRUCTURED_EXTRACTION"]),
  surroundingText: z.string().max(MAX_HINT_TEXT_LENGTH).optional(),
});

export const PublicPhoneHintSchema = z.object({
  phone: z.string().trim().min(7).max(80),
  sourceKind: z.enum(["VISIBLE_TEXT", "TEL", "JSON_LD"]),
  surroundingText: z.string().max(MAX_HINT_TEXT_LENGTH).optional(),
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
  canonicalUrl: z.string().url().optional(),
  links: z.array(PublicPageLinkSchema).max(MAX_LINKS).default(() => []),
  publicEmailHints: z.array(PublicEmailHintSchema).max(MAX_CONTACT_HINTS).default(() => []),
  publicPhoneHints: z.array(PublicPhoneHintSchema).max(MAX_CONTACT_HINTS).default(() => []),
});

export type SafeFetchInput = z.infer<typeof SafeFetchInputSchema>;
export type SafeFetchResult = z.input<typeof SafeFetchResultSchema>;

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

function boundedText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_HINT_TEXT_LENGTH);
}

function normaliseEmail(value: string): string | undefined {
  const email = value.trim().toLowerCase().replace(/[),.;:]+$/, "");
  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0) return undefined;
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const recognisedSuffixes = [
    ".co.uk", ".org.uk", ".ac.uk", ".com.au", ".co.nz", ".co.za", ".com", ".org", ".net", ".io", ".ai", ".uk", ".de", ".fr", ".es", ".it", ".nl", ".be", ".ie", ".eu",
  ];
  const suffix = recognisedSuffixes
    .filter((candidate) => domain.includes(candidate))
    .sort((left, right) => right.length - left.length)[0];
  const suffixEnd = suffix ? domain.indexOf(suffix) + suffix.length : domain.length;
  const candidate = `${local}@${domain.slice(0, suffixEnd)}`;
  return z.string().email().safeParse(candidate).success ? candidate : undefined;
}

function normalisePhone(value: string): string | undefined {
  const phone = value.replace(/^tel:/i, "").split(/[?#]/, 1)[0]?.trim();
  const groups = phone?.split(/[^\d]+/).filter(Boolean) ?? [];
  if (!phone || /(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}/.test(phone) || /\b\d{4}\s*[-/]\s*\d{4}\b/.test(phone)) return undefined;
  if ((phone.match(/\(/g)?.length ?? 0) !== (phone.match(/\)/g)?.length ?? 0)) return undefined;
  const digits = phone.replace(/\D/g, "").length;
  if (groups.length > 1 && groups.every((group) => group.length <= 2) && !phone.startsWith("+")) return undefined;
  return digits >= 7 && digits <= 15 && /[+()\s-]/.test(phone) ? phone.slice(0, 80) : undefined;
}

function validEmailHints(hints: Array<z.infer<typeof PublicEmailHintSchema>>) {
  return hints.flatMap((hint) => {
    const parsed = PublicEmailHintSchema.safeParse(hint);
    return parsed.success ? [parsed.data] : [];
  });
}

function sameRegistrableDomain(left: URL, right: URL): boolean {
  const leftDomain = getDomain(left.hostname);
  const rightDomain = getDomain(right.hostname);
  return Boolean(leftDomain && rightDomain && leftDomain === rightDomain);
}

function extractJsonLdContacts($: ReturnType<typeof load>) {
  const emails: Array<z.infer<typeof PublicEmailHintSchema>> = [];
  const phones: Array<z.infer<typeof PublicPhoneHintSchema>> = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.slice(0, 10).forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    const email = typeof record.email === "string" ? normaliseEmail(record.email) : undefined;
    if (email && !seenEmails.has(email) && emails.length < MAX_CONTACT_HINTS) {
      seenEmails.add(email);
      emails.push({ email, sourceKind: "JSON_LD", surroundingText: boundedText(typeof record.name === "string" ? record.name : undefined) || undefined });
    }
    const telephone = typeof record.telephone === "string" ? normalisePhone(record.telephone) : undefined;
    if (telephone && !seenPhones.has(telephone) && phones.length < MAX_CONTACT_HINTS) {
      seenPhones.add(telephone);
      phones.push({ phone: telephone, sourceKind: "JSON_LD", surroundingText: boundedText(typeof record.name === "string" ? record.name : undefined) || undefined });
    }
    Object.values(record).slice(0, 20).forEach(visit);
  };

  $("script[type='application/ld+json']").each((_, element) => {
    try {
      const raw = $(element).text().trim();
      if (raw) visit(JSON.parse(raw));
    } catch {
      // Invalid JSON-LD is untrusted page content, not a fetch failure.
    }
  });
  return { emails, phones };
}

function readableHtml(html: string, pageUrl: URL): {
  title?: string;
  readableText: string;
  canonicalUrl?: string;
  links: Array<z.infer<typeof PublicPageLinkSchema>>;
  publicEmailHints: Array<z.infer<typeof PublicEmailHintSchema>>;
  publicPhoneHints: Array<z.infer<typeof PublicPhoneHintSchema>>;
} {
  const $ = load(html);
  const jsonLd = extractJsonLdContacts($);
  $("script, style, template, noscript, svg").remove();
  const title = boundedText($("title").first().text()).slice(0, MAX_TITLE_LENGTH) || undefined;
  const readableText = `${title ?? ""} ${$("body").html() ?? ""}`.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const links: Array<z.infer<typeof PublicPageLinkSchema>> = [];
  const seenLinks = new Set<string>();
  $("a[href]").each((_, element) => {
    if (links.length >= MAX_LINKS) return;
    const rawHref = $(element).attr("href")?.trim();
    if (!rawHref || /^(?:javascript:|data:|#)/i.test(rawHref)) return;
    let url: URL;
    try { url = new URL(rawHref, pageUrl); } catch { return; }
    if (url.protocol !== "http:" && url.protocol !== "https:" && !/^mailto:|^tel:/i.test(rawHref)) return;
    if (/^mailto:|^tel:/i.test(rawHref)) return;
    url.hash = "";
    const normalised = url.toString();
    if (seenLinks.has(normalised)) return;
    seenLinks.add(normalised);
    const rel = $(element).attr("rel")?.trim();
    links.push({ url: normalised, anchorText: boundedText($(element).text()), ...(rel ? { relationship: rel } : {}), sameSite: sameRegistrableDomain(pageUrl, url) });
  });

  const publicEmailHints: Array<z.infer<typeof PublicEmailHintSchema>> = [];
  const publicPhoneHints: Array<z.infer<typeof PublicPhoneHintSchema>> = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const addEmail = (raw: string | undefined, sourceKind: z.infer<typeof PublicEmailHintSchema>["sourceKind"], context?: string) => {
    const email = raw ? normaliseEmail(raw) : undefined;
    if (!email || seenEmails.has(email) || publicEmailHints.length >= MAX_CONTACT_HINTS) return;
    seenEmails.add(email);
    publicEmailHints.push({ email, sourceKind, ...(boundedText(context) ? { surroundingText: boundedText(context) } : {}) });
  };
  const addPhone = (raw: string | undefined, sourceKind: z.infer<typeof PublicPhoneHintSchema>["sourceKind"], context?: string) => {
    const phone = raw ? normalisePhone(raw) : undefined;
    if (!phone || seenPhones.has(phone) || publicPhoneHints.length >= MAX_CONTACT_HINTS) return;
    seenPhones.add(phone);
    publicPhoneHints.push({ phone, sourceKind, ...(boundedText(context) ? { surroundingText: boundedText(context) } : {}) });
  };
  const emailPattern = /\b[^\s<>"']+@[^\s<>"']+\.[A-Za-z]{2,}\b/g;
  const phonePattern = /(?:\+?\d[\d().\-\s]{6,}\d)/g;
  const visibleText = $("body").text();
  for (const match of visibleText.match(emailPattern) ?? []) addEmail(match, "VISIBLE_TEXT", visibleText.slice(Math.max(0, visibleText.indexOf(match) - 80), visibleText.indexOf(match) + match.length + 80));
  for (const match of visibleText.match(phonePattern) ?? []) addPhone(match, "VISIBLE_TEXT", visibleText.slice(Math.max(0, visibleText.indexOf(match) - 80), visibleText.indexOf(match) + match.length + 80));
  $("a[href^='mailto:']").each((_, element) => addEmail($(element).attr("href")?.slice(7), "MAILTO", $(element).text()));
  $("a[href^='tel:']").each((_, element) => addPhone($(element).attr("href"), "TEL", $(element).text()));
  for (const hint of jsonLd.emails) addEmail(hint.email, "JSON_LD", hint.surroundingText);
  for (const hint of jsonLd.phones) addPhone(hint.phone, "JSON_LD", hint.surroundingText);
  const canonicalRaw = $("link[rel='canonical']").attr("href");
  let canonicalUrl: string | undefined;
  if (canonicalRaw) {
    try { const url = new URL(canonicalRaw, pageUrl); if (url.protocol === "http:" || url.protocol === "https:") canonicalUrl = url.toString(); } catch { /* ignore invalid page metadata */ }
  }
  return { title, readableText, canonicalUrl, links, publicEmailHints: validEmailHints(publicEmailHints), publicPhoneHints };
}

function extractReadableText(mimeType: string, bytes: Uint8Array, pageUrl: URL) {
  const text = new TextDecoder("utf-8").decode(bytes);
  return mimeType === "text/html" || mimeType === "application/xhtml+xml"
    ? readableHtml(text, pageUrl)
    : { readableText: text.replace(/\s+/g, " ").trim(), links: [], publicEmailHints: [], publicPhoneHints: [] };
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
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
      const { title, readableText, canonicalUrl, links, publicEmailHints, publicPhoneHints } = extractReadableText(mimeType, bytes, currentUrl);
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
        canonicalUrl,
        links,
        publicEmailHints: validEmailHints(publicEmailHints),
        publicPhoneHints,
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
