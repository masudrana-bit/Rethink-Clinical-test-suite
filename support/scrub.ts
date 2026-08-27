import { APIRequestContext, BrowserContext } from '@playwright/test';

/**
 * Fields the API returns that must never reach a trace.
 * `staff-role` includes the current user's apiKey and password hash.
 */
export const CREDENTIAL_FIELDS = [
  'apiKey',
  'password',
  'passwordQuestion',
  'passwordAnswer',
] as const;

const SENSITIVE_ROUTES = ['**/members/me/staff-role'];

function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redact) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
        key,
        (CREDENTIAL_FIELDS as readonly string[]).includes(key) ? null : redact(inner),
      ]),
    ) as T;
  }
  return value;
}

/** Every path at which a credential field is still present. */
export function findCredentialFields(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => findCredentialFields(item, `${path}[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => {
      const here = `${path}.${key}`;
      const hit =
        (CREDENTIAL_FIELDS as readonly string[]).includes(key) && inner !== null ? [here] : [];
      return [...hit, ...findCredentialFields(inner, here)];
    });
  }
  return [];
}

/** Hop-by-hop headers that must not be replayed onto an out-of-band request. */
const DROPPED_HEADERS = ['host', 'accept-encoding', 'connection', 'content-length'];

/**
 * D7. Strips credential fields from responses before they reach the page, so a
 * Playwright trace captured on failure cannot contain them.
 *
 * The upstream request deliberately goes through `fetcher`, an APIRequestContext
 * outside the traced browser context. `route.fetch()` would be simpler but is
 * itself recorded in the trace, which defeats the entire purpose — verified by
 * inspecting a real trace zip, which contained the unredacted body.
 *
 * This rewrites what the app receives. That is safe only because the app does not
 * use these fields — a claim the suite checks rather than assumes: the foundations
 * scenario asserts the shell still renders the signed-in user after scrubbing.
 */
export async function installResponseScrubbing(
  context: BrowserContext,
  fetcher: APIRequestContext,
): Promise<void> {
  for (const pattern of SENSITIVE_ROUTES) {
    await context.route(pattern, async (route) => {
      const request = route.request();
      const headers = Object.fromEntries(
        Object.entries(request.headers()).filter(
          ([name]) => !DROPPED_HEADERS.includes(name.toLowerCase()),
        ),
      );

      const upstream = await fetcher.fetch(request.url(), {
        method: request.method(),
        headers,
        data: request.postDataBuffer() ?? undefined,
      });

      const contentType = upstream.headers()['content-type'] ?? '';
      if (!contentType.includes('json')) {
        await route.fulfill({
          status: upstream.status(),
          headers: upstream.headers(),
          body: await upstream.body(),
        });
        return;
      }

      await route.fulfill({
        status: upstream.status(),
        contentType: upstream.headers()['content-type'],
        body: JSON.stringify(redact(await upstream.json())),
      });
    });
  }
}
