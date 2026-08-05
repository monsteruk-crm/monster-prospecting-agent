import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

function redact(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      ...(value.stack ? { stack: redactString(value.stack) } : {}),
      ...("code" in value && typeof value.code === "string" ? { code: value.code } : {}),
    };
  }
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.slice(0, 20).map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, nested]) => [key, redact(nested)]));
  }
  return value;
}

function redactString(value: string): string {
  return value
    .replace(/(postgres(?:ql)?:\/\/)[^\s"']+/gi, "$1[redacted]")
    .replace(/([?&](?:token|key|secret|password|api_key|apikey|direct_url|database_url)=)[^&\s"']+/gi, "$1[redacted]");
}

function write(level: LogLevel, event: string, fields: Record<string, unknown> = {}) {
  const redactedFields = redact(fields);
  const payload = JSON.stringify({
    service: "monster-scout",
    event,
    level,
    timestamp: new Date().toISOString(),
    ...(redactedFields && typeof redactedFields === "object" && !Array.isArray(redactedFields) ? redactedFields : {}),
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

export function requestLogContext(request: Request, route: string) {
  return {
    route,
    requestId: request.headers.get("x-vercel-id") ?? request.headers.get("x-request-id") ?? randomUUID(),
  };
}

export function logRouteStart(context: Record<string, unknown>) {
  write("info", "api.request.started", context);
}

export function logRouteCompleted(context: Record<string, unknown>, startedAt: number, fields: Record<string, unknown> = {}) {
  write("info", "api.request.completed", { ...context, durationMs: Date.now() - startedAt, ...fields });
}

export function logRouteFailure(context: Record<string, unknown>, startedAt: number, error: unknown, fields: Record<string, unknown> = {}) {
  write("error", "api.request.failed", { ...context, durationMs: Date.now() - startedAt, error, ...fields });
}

export function logRuntimeWarning(event: string, fields: Record<string, unknown> = {}) {
  write("warn", event, fields);
}

export function logRuntimeError(event: string, fields: Record<string, unknown> = {}) {
  write("error", event, fields);
}
