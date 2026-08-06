import { getDomain } from "tldts";

import { ContactRouteSchema, type ContactRoute, type ContactRouteInput } from "@/lib/sales/contact-schema";
import type { DiscoveredAccount, FetchedSourceReference, SalesMissionBrief } from "@/lib/sales/mission-schema";

const PUBLIC_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const EMAIL_ONLY_INSTRUCTION_PATTERN = /(?:\bonly\b[\s\S]{0,80}\b(?:e-?mail)\b|\b(?:e-?mail)\b[\s\S]{0,80}\bonly\b|\b(?:must|required|require)\b[\s\S]{0,80}\b(?:e-?mail)\b)/i;
const CONTACT_PATH_PATTERN = /\/(?:contact(?:-us)?|partnerships?|commercial|business(?:-development)?|events?|venue[-_ ]?hire|programming|licen[sc]ing|sponsorship|corporate|bookings?|team|leadership|management|about|press|media)(?:\/|$)/i;
const PROFESSIONAL_PROFILE_PATTERN = /(?:^|\.)linkedin\.com$|(?:^|\.)x\.com$|(?:^|\.)twitter\.com$/i;
const UNSUITABLE_MAILBOXES = new Set([
  "privacy", "dpo", "abuse", "legal", "security", "careers", "jobs", "accounts-payable", "accountspayable", "noreply", "no-reply",
]);
const HIGH_VALUE_MAILBOX_TERMS = ["partnership", "commercial", "businessdevelopment", "business-development", "events", "bookings", "licensing", "sponsorship", "corporate", "sales"];
const MEDIUM_VALUE_MAILBOX_TERMS = ["enquiries", "inquiries", "hello", "info", "contact"];
const EMAIL_ONLY_ROLE_PATTERN = /\b(?:any\s+)?e-?mail\s+(?:available|required|only)\b|\b(?:email|e-?mail)\s+available\b/i;

export function isEmailOnlyRolePhrase(value: string): boolean {
  return EMAIL_ONLY_ROLE_PATTERN.test(value.trim());
}

export function effectiveBuyerRoles(brief: Pick<SalesMissionBrief, "buyerRoles">): string[] {
  const roles = brief.buyerRoles.filter((role) => !isEmailOnlyRolePhrase(role));
  return roles.length > 0 ? roles : ["Commercial Director"];
}

export function requiresPublicEmail(
  brief: Pick<SalesMissionBrief, "contactRequirement" | "instructions"> & { buyerRoles?: readonly string[] },
): boolean {
  return brief.contactRequirement === "PUBLIC_EMAIL"
    || EMAIL_ONLY_INSTRUCTION_PATTERN.test(brief.instructions)
    || (brief.buyerRoles ?? []).some(isEmailOnlyRolePhrase);
}

function normaliseEmail(raw: string): string | undefined {
  const email = raw.trim().toLowerCase().replace(/[),.;:]+$/, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  const local = email.split("@", 1)[0] ?? "";
  if (local === "test" || local === "name" || local === "yourname" || local === "noreply" || local === "no-reply") return undefined;
  if (email.includes("example.com") || email.includes("example.org") || email.includes("example.net")) return undefined;
  return email;
}

export function extractPublicEmails(sourceText: string): string[] {
  const emails = new Set<string>();
  for (const match of sourceText.match(PUBLIC_EMAIL_PATTERN) ?? []) {
    const email = normaliseEmail(match);
    if (email) emails.add(email);
  }
  return [...emails];
}

export function extractPublicEmail(sourceExcerpt: string): string | undefined {
  return rankPublicEmails(extractPublicEmails(sourceExcerpt))[0];
}

export function isLikelyPublicPhone(value: string): boolean {
  const phone = value.trim();
  const groups = phone.split(/[^\d]+/).filter(Boolean);
  // Do not rely on word boundaries: scraped fragments can concatenate a year
  // immediately before an ISO date (for example `20252023-09-01`).
  if (!phone || /(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}/.test(phone) || /\b\d{4}\s*[-/]\s*\d{4}\b/.test(phone)) return false;
  if ((phone.match(/\(/g)?.length ?? 0) !== (phone.match(/\)/g)?.length ?? 0)) return false;
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15 && /[+()\s-]/.test(phone) && !(groups.length > 1 && groups.every((group) => group.length <= 2) && !phone.startsWith("+"));
}

export function sanitizeContactRoutes(rawRoutes: unknown): ContactRoute[] {
  return ContactRouteSchema.array().parse(rawRoutes)
    .filter((route) => !route.phone || isLikelyPublicPhone(route.phone))
    .map((route) => isEmailOnlyRolePhrase(route.targetRole)
      ? { ...route, targetRole: "Commercial Director", ...(route.intendedBuyerRole && isEmailOnlyRolePhrase(route.intendedBuyerRole) ? { intendedBuyerRole: "Commercial Director" } : {}) }
      : route);
}

export function rankPublicEmails(emails: readonly string[]): string[] {
  return [...emails].sort((left, right) => emailUsefulness(right) - emailUsefulness(left) || left.localeCompare(right));
}

function emailUsefulness(email: string): number {
  const local = email.split("@", 1)[0]?.toLowerCase() ?? "";
  if (UNSUITABLE_MAILBOXES.has(local)) return -100;
  if (HIGH_VALUE_MAILBOX_TERMS.some((term) => local.includes(term))) return 100;
  if (MEDIUM_VALUE_MAILBOX_TERMS.some((term) => local.includes(term))) return 70;
  if (["support", "tickets", "boxoffice", "customer-service", "press", "media"].some((term) => local.includes(term))) return 20;
  return 45;
}

function sourceEvidenceId(source: FetchedSourceReference): string {
  return `source:${source.contentHash}`;
}

function registrableDomain(rawUrl: string): string | undefined {
  try { return getDomain(rawUrl.includes("://") ? new URL(rawUrl).hostname : rawUrl) ?? undefined; } catch { return undefined; }
}

function domainRelationship(account: DiscoveredAccount, sourceUrl: string): "OFFICIAL_DOMAIN" | "OFFICIAL_SUBDOMAIN" | "EXTERNAL_OFFICIAL_LINK" | undefined {
  const accountDomain = registrableDomain(account.officialDomain ?? account.website ?? "");
  const sourceDomain = registrableDomain(sourceUrl);
  if (!accountDomain || !sourceDomain || accountDomain !== sourceDomain) return undefined;
  try {
    const accountHost = new URL(account.officialDomain ?? account.website ?? "").hostname.replace(/^www\./, "");
    const sourceHost = new URL(sourceUrl).hostname.replace(/^www\./, "");
    return accountHost === sourceHost ? "OFFICIAL_DOMAIN" : "OFFICIAL_SUBDOMAIN";
  } catch { return "OFFICIAL_DOMAIN"; }
}

function evidenceExcerpt(source: FetchedSourceReference, value: string): string {
  const text = source.readableExcerpt;
  const index = text.toLowerCase().indexOf(value.toLowerCase());
  return (index >= 0 ? text.slice(Math.max(0, index - 100), index + value.length + 180) : value).trim().slice(0, 500);
}

function isUnsuitableEmail(email: string): string | undefined {
  const local = email.split("@", 1)[0]?.toLowerCase() ?? "";
  return UNSUITABLE_MAILBOXES.has(local) ? "Mailbox is not suitable for sales outreach." : undefined;
}

function routeScore(route: Pick<ContactRoute, "routeType" | "email" | "phone" | "contactName" | "confirmedRole" | "domainRelationship"> & { isUsableForSales?: boolean }): number {
  if (route.isUsableForSales === false) return 0;
  if (route.routeType === "PUBLIC_EMAIL" && route.email) {
    const score = emailUsefulness(route.email);
    return score >= 100 ? 100 : score >= 70 ? 88 : 72;
  }
  if (route.contactName && route.confirmedRole && route.email) return 100;
  if (route.routeType === "CONTACT_FORM" || route.routeType === "CONTACT_PAGE") return 65;
  if (route.routeType === "PROFESSIONAL_PROFILE") return 45;
  if (route.routeType === "PUBLIC_PHONE") return 40;
  if (route.routeType === "ROLE_ONLY") return 3;
  return 20;
}

function sourceIsRelevant(account: DiscoveredAccount, source: FetchedSourceReference): boolean {
  return Boolean(domainRelationship(account, source.finalUrl));
}

export function deriveContactRoutes(
  account: DiscoveredAccount,
  sources: FetchedSourceReference[],
  fallbackRoles: string[] = [],
  options: { requirePublicEmail?: boolean } = {},
): ContactRoute[] {
  const targetRole = account.possibleBuyerRoles.find((role) => !isEmailOnlyRolePhrase(role))
    ?? fallbackRoles.find((role) => !isEmailOnlyRolePhrase(role))
    ?? "Commercial Director";
  const routes: ContactRoute[] = [];
  const seen = new Set<string>();
  const relevantSources = sources.filter((source) => sourceIsRelevant(account, source));
  const add = (route: ContactRouteInput) => {
    const key = `${route.routeType}:${(route.email ?? route.phone ?? route.contactPageUrl ?? route.professionalProfileUrl ?? route.targetRole).toLowerCase()}`;
    if (seen.has(key) || routes.length >= 10) return;
    seen.add(key);
    routes.push(ContactRouteSchema.parse({ ...route, routeScore: routeScore(route) }));
  };

  for (const source of relevantSources) {
    const evidenceId = sourceEvidenceId(source);
    const relationship = domainRelationship(account, source.finalUrl) ?? "EXTERNAL_OFFICIAL_LINK";
    const sourcePath = (() => { try { return new URL(source.finalUrl).pathname; } catch { return ""; } })();
    const sourceLooksLikeContact = CONTACT_PATH_PATTERN.test(sourcePath);
    const emailHints = (source.publicEmailHints?.length ?? 0) > 0 ? source.publicEmailHints!.map((hint) => ({ email: hint.email, kind: hint.sourceKind, excerpt: hint.surroundingText })) : extractPublicEmails(source.readableExcerpt).map((email) => ({ email, kind: "VISIBLE_TEXT" as const, excerpt: evidenceExcerpt(source, email) }));
    for (const hint of emailHints) {
      const email = normaliseEmail(hint.email);
      if (!email) continue;
      const unsuitableReason = isUnsuitableEmail(email);
      const mismatch = registrableDomain(email.split("@")[1] ?? "") !== registrableDomain(account.officialDomain ?? account.website ?? "");
      add({
        targetRole,
        intendedBuyerRole: targetRole,
        email,
        ...(sourceLooksLikeContact ? { contactPageUrl: source.finalUrl } : {}),
        sourceEvidenceIds: [evidenceId],
        routeType: "PUBLIC_EMAIL",
        roleConfidence: "LOW",
        dataFreshness: "CURRENT",
        evidenceKind: hint.kind,
        evidenceExcerpt: hint.excerpt ?? evidenceExcerpt(source, email),
        domainRelationship: mismatch ? "EXTERNAL_OFFICIAL_LINK" : relationship,
        isUsableForSales: !unsuitableReason,
        ...(unsuitableReason ? { unsuitableReason } : {}),
        ...(mismatch ? { routeReasons: ["Email domain differs from the verified official site."] } : {}),
      });
    }
    for (const hint of source.publicPhoneHints ?? []) {
      add({ targetRole, intendedBuyerRole: targetRole, phone: hint.phone, ...(sourceLooksLikeContact ? { contactPageUrl: source.finalUrl } : {}), sourceEvidenceIds: [evidenceId], routeType: "PUBLIC_PHONE", roleConfidence: "LOW", dataFreshness: "CURRENT", evidenceKind: hint.sourceKind, evidenceExcerpt: hint.surroundingText ?? hint.phone, domainRelationship: relationship });
    }
    if (sourceLooksLikeContact) {
      add({ targetRole, intendedBuyerRole: targetRole, contactPageUrl: source.finalUrl, sourceEvidenceIds: [evidenceId], routeType: "CONTACT_PAGE", roleConfidence: "LOW", dataFreshness: "CURRENT", evidenceKind: "ANCHOR_LINK", evidenceExcerpt: source.title ?? source.finalUrl, domainRelationship: relationship });
    }
    for (const link of source.links ?? []) {
      const linkRelationship = link.sameSite ? relationship : "EXTERNAL_OFFICIAL_LINK";
      let pathname = "";
      try { pathname = new URL(link.url).pathname; } catch { continue; }
      if (link.sameSite && CONTACT_PATH_PATTERN.test(pathname)) {
        add({ targetRole, intendedBuyerRole: targetRole, contactPageUrl: link.url, sourceEvidenceIds: [evidenceId], routeType: "CONTACT_PAGE", roleConfidence: "LOW", dataFreshness: "CURRENT", evidenceKind: "ANCHOR_LINK", evidenceExcerpt: link.anchorText || link.url, domainRelationship: linkRelationship });
      } else if (PROFESSIONAL_PROFILE_PATTERN.test(new URL(link.url).hostname)) {
        add({ targetRole, intendedBuyerRole: targetRole, professionalProfileUrl: link.url, sourceEvidenceIds: [evidenceId], routeType: "PROFESSIONAL_PROFILE", roleConfidence: "LOW", dataFreshness: "CURRENT", evidenceKind: "ANCHOR_LINK", evidenceExcerpt: link.anchorText || link.url, domainRelationship: "EXTERNAL_OFFICIAL_LINK" });
      }
    }
  }

  const sorted = routes.sort((left, right) => right.routeScore - left.routeScore);
  if (options.requirePublicEmail) return sorted.filter((route) => route.routeType === "PUBLIC_EMAIL" && route.isUsableForSales);
  if (sorted.length === 0) {
    add({ targetRole, intendedBuyerRole: targetRole, sourceEvidenceIds: relevantSources.map(sourceEvidenceId).slice(0, 10), routeType: "ROLE_ONLY", roleConfidence: "MEDIUM", dataFreshness: "UNKNOWN", evidenceExcerpt: "No verified public contact route was found." });
  }
  return routes.sort((left, right) => right.routeScore - left.routeScore);
}
