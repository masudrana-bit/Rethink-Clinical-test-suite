import { APIResponse } from '@playwright/test';
import { CustomWorld } from './world';

const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api.?key/i;
const MAX_PREVIEW_LENGTH = 4_000;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(inner),
      ]),
    );
  }
  return value;
}

function responseHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : value,
    ]),
  );
}

export function recordResponseMetadata(
  world: CustomWorld,
  response: APIResponse,
  method = 'GET',
): void {
  world.data.lastRequestMethod = method;
  world.data.lastResponseUrl = response.url();
  world.data.lastResponseStatus = response.status();
  world.data.lastResponseHeaders = response.headers();
}

export function apiDiagnostic(world: CustomWorld): Record<string, unknown> {
  const body = redact(world.data.lastResponseBody);
  const serialized = JSON.stringify(body, null, 2) ?? String(body);
  const bodyPreview =
    serialized.length > MAX_PREVIEW_LENGTH
      ? `${serialized.slice(0, MAX_PREVIEW_LENGTH)}\n… truncated ${serialized.length - MAX_PREVIEW_LENGTH} characters`
      : serialized;

  const originalBody = world.data.lastResponseBody;
  return {
    request: {
      method: world.data.lastRequestMethod ?? 'unknown',
      url: world.data.lastResponseUrl ?? 'not recorded',
    },
    response: {
      status: world.data.lastResponseStatus ?? 'not recorded',
      contentType: world.data.lastResponseHeaders?.['content-type'] ?? 'not provided',
      headers: responseHeaders(world.data.lastResponseHeaders),
      bodyType: Array.isArray(originalBody) ? 'array' : typeof originalBody,
      itemCount: Array.isArray(originalBody?.items)
        ? originalBody.items.length
        : Array.isArray(originalBody)
          ? originalBody.length
          : undefined,
      bodyPreview,
    },
  };
}

export function apiAssertionMessage(world: CustomWorld, expectation: string): string {
  const diagnostic = apiDiagnostic(world);
  const request = diagnostic.request as Record<string, unknown>;
  const response = diagnostic.response as Record<string, unknown>;

  return [
    expectation,
    `Request: ${request.method} ${request.url}`,
    `Response: HTTP ${response.status} · ${response.contentType}`,
    `Body: ${response.bodyPreview}`,
  ].join('\n');
}
