import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const SSRF_REJECTION_CODES = [
  "INVALID_URL",
  "UNSUPPORTED_PROTOCOL",
  "CREDENTIALS_NOT_ALLOWED",
  "PORT_NOT_ALLOWED",
  "LOCAL_HOSTNAME_BLOCKED",
  "PRIVATE_ADDRESS_BLOCKED",
  "DNS_LOOKUP_FAILED",
  "NO_PUBLIC_ADDRESS",
] as const;

export type SsrfRejectionCode = (typeof SSRF_REJECTION_CODES)[number];

export class SsrfValidationError extends Error {
  readonly code: SsrfRejectionCode;

  constructor(code: SsrfRejectionCode, message: string) {
    super(message);
    this.name = "SsrfValidationError";
    this.code = code;
  }
}

export type PublicAddressLookup = (hostname: string) => Promise<readonly string[]>;

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".test",
  ".invalid",
  ".example",
];

function normaliseHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function isBlockedHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  );
}

function ipv4ToNumber(address: string): number | undefined {
  const octets = address.split(".");
  if (octets.length !== 4) {
    return undefined;
  }

  const values = octets.map((octet) => Number(octet));
  if (
    values.some(
      (value, index) =>
        !Number.isInteger(value) || value < 0 || value > 255 || octets[index] !== String(value),
    )
  ) {
    return undefined;
  }

  return ((values[0] << 24) | (values[1] << 16) | (values[2] << 8) | values[3]) >>> 0;
}

function inIpv4Range(address: number, start: string, end: string): boolean {
  const startNumber = ipv4ToNumber(start);
  const endNumber = ipv4ToNumber(end);
  return startNumber !== undefined && endNumber !== undefined && address >= startNumber && address <= endNumber;
}

function isPublicIpv4(address: string): boolean {
  const number = ipv4ToNumber(address);
  if (number === undefined) {
    return false;
  }

  return ![
    ["0.0.0.0", "0.255.255.255"],
    ["10.0.0.0", "10.255.255.255"],
    ["100.64.0.0", "100.127.255.255"],
    ["127.0.0.0", "127.255.255.255"],
    ["169.254.0.0", "169.254.255.255"],
    ["172.16.0.0", "172.31.255.255"],
    ["192.0.0.0", "192.0.0.255"],
    ["192.0.2.0", "192.0.2.255"],
    ["192.168.0.0", "192.168.255.255"],
    ["198.18.0.0", "198.19.255.255"],
    ["198.51.100.0", "198.51.100.255"],
    ["203.0.113.0", "203.0.113.255"],
    ["224.0.0.0", "255.255.255.255"],
  ].some(([start, end]) => inIpv4Range(number, start, end));
}

function ipv6ToBytes(address: string): number[] | undefined {
  let value = address.toLowerCase();
  const zoneIndex = value.indexOf("%");
  if (zoneIndex >= 0) {
    value = value.slice(0, zoneIndex);
  }

  if (value.includes(".")) {
    const separator = value.lastIndexOf(":");
    if (separator < 0) {
      return undefined;
    }
    const ipv4Number = ipv4ToNumber(value.slice(separator + 1));
    if (ipv4Number === undefined) {
      return undefined;
    }
    const high = ((ipv4Number >>> 16) & 0xffff).toString(16);
    const low = (ipv4Number & 0xffff).toString(16);
    value = `${value.slice(0, separator)}:${high}:${low}`;
  }

  const halves = value.split("::");
  if (halves.length > 2) {
    return undefined;
  }

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) {
    return undefined;
  }

  const missing = halves.length === 2 ? 8 - left.length - right.length : 0;
  if (missing < 0 || (halves.length === 1 && left.length !== 8)) {
    return undefined;
  }

  const groups = [...left, ...Array.from({ length: missing }, () => "0"), ...right];
  if (groups.length !== 8) {
    return undefined;
  }

  return groups.flatMap((group) => {
    const number = Number.parseInt(group, 16);
    return [(number >> 8) & 0xff, number & 0xff];
  });
}

function hasIpv6Prefix(bytes: number[], prefix: number[], prefixBits: number): boolean {
  const completeBytes = Math.floor(prefixBits / 8);
  const remainingBits = prefixBits % 8;

  for (let index = 0; index < completeBytes; index += 1) {
    if (bytes[index] !== prefix[index]) {
      return false;
    }
  }

  if (remainingBits === 0) {
    return true;
  }

  const mask = 0xff << (8 - remainingBits);
  return (bytes[completeBytes] & mask) === (prefix[completeBytes] & mask);
}

function isPublicIpv6(address: string): boolean {
  const bytes = ipv6ToBytes(address);
  if (!bytes) {
    return false;
  }

  const ipv4Mapped = bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  if (ipv4Mapped) {
    const mappedIpv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isPublicIpv4(mappedIpv4);
  }

  return ![
    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 128],
    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 128],
    [[0xfc, 0, 0], 7],
    [[0xfe, 0x80], 10],
    [[0xff], 8],
    [[0x20, 0x01, 0x0d, 0xb8], 32],
  ].some(([prefix, prefixBits]) => hasIpv6Prefix(bytes, prefix as number[], prefixBits as number));
}

export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  return version === 4 ? isPublicIpv4(address) : version === 6 ? isPublicIpv6(address) : false;
}

export async function lookupPublicAddresses(hostname: string): Promise<readonly string[]> {
  try {
    const results = await lookup(hostname, { all: true, verbatim: true });
    return results.map((result) => result.address);
  } catch (error) {
    throw new SsrfValidationError(
      "DNS_LOOKUP_FAILED",
      `DNS lookup failed for ${hostname}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

export async function validatePublicUrl(
  rawUrl: string,
  resolveAddresses: PublicAddressLookup = lookupPublicAddresses,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfValidationError("INVALID_URL", "The source URL is invalid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfValidationError("UNSUPPORTED_PROTOCOL", "Only HTTP and HTTPS source URLs are allowed.");
  }

  if (url.username || url.password) {
    throw new SsrfValidationError("CREDENTIALS_NOT_ALLOWED", "Source URLs must not contain credentials.");
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new SsrfValidationError("PORT_NOT_ALLOWED", "Only the standard HTTP and HTTPS ports are allowed.");
  }

  const hostname = normaliseHostname(url.hostname);
  if (!hostname || isBlockedHostname(hostname)) {
    throw new SsrfValidationError("LOCAL_HOSTNAME_BLOCKED", "Local and internal hostnames are not allowed.");
  }

  if (isIP(hostname) > 0) {
    if (!isPublicAddress(hostname)) {
      throw new SsrfValidationError("PRIVATE_ADDRESS_BLOCKED", "Private, link-local or reserved addresses are not allowed.");
    }
    return url;
  }

  const addresses = await resolveAddresses(hostname);
  if (addresses.length === 0) {
    throw new SsrfValidationError("NO_PUBLIC_ADDRESS", "The hostname did not resolve to a public address.");
  }

  if (addresses.some((address) => !isPublicAddress(address))) {
    throw new SsrfValidationError("PRIVATE_ADDRESS_BLOCKED", "The hostname resolved to a private, link-local or reserved address.");
  }

  return url;
}
