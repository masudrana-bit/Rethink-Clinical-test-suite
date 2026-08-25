import { type APIRequestContext, request as playwrightRequest } from "@playwright/test";
import { type ApiConfig, requireApiConfig } from "./config.js";
import { loginPath } from "./paths.js";

/**
 * A thin authenticated client for the Clinical API.
 *
 * Built on Playwright's APIRequestContext rather than bare fetch so that API
 * calls appear in traces and reports alongside browser activity, which is what
 * clinical-rules.md §36 wants from execution evidence.
 */

export type Clinical = {
  config: ApiConfig;
  context: APIRequestContext;
  /** App key plus bearer. For direct Clinical API routes. */
  headers: Record<string, string>;
  /** Bearer only. Gateway routes reject the app key. */
  bearerHeaders: Record<string, string>;
  dispose: () => Promise<void>;
};

/**
 * The security service returns the token nested under `tokenInfo`, not at the
 * top level. Confirmed against dev2 on 2026-08-25; the response also carries
 * `errorMessage` and `securityLevel`. Reading `token` alone yields undefined
 * and a downstream 401 that looks like bad credentials.
 */
function extractToken(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;

  const info = record["tokenInfo"];
  if (typeof info === "string") return info;

  if (typeof info === "object" && info !== null) {
    const nested = info as Record<string, unknown>;
    for (const key of ["token", "accessToken", "access_token"]) {
      const value = nested[key];
      if (typeof value === "string" && value !== "") return value;
    }
  }

  const flat = record["token"];
  return typeof flat === "string" && flat !== "" ? flat : null;
}

/** Signs in and returns a client. Throws with the service's own message on failure. */
export async function connect(): Promise<Clinical> {
  const config = requireApiConfig();

  const context = await playwrightRequest.newContext({ baseURL: config.baseUrl });

  const response = await context.post(loginPath, {
    headers: { "content-type": "application/json", "x-application-key": config.securityKey },
    data: { username: config.username, password: config.password },
  });

  if (!response.ok()) {
    await context.dispose();
    throw new Error(
      `Security login failed: ${response.status()} ${response.statusText()}. ` +
        `Check SECURITY_KEY, AUTH_USERNAME, and AUTH_PASSWORD.`,
    );
  }

  const token = extractToken(await response.json().catch(() => null));
  if (token === null) {
    await context.dispose();
    throw new Error(
      "Security login returned 200 but no token could be read from the response. " +
        "The response shape has probably changed; see extractToken in src/api/client.ts.",
    );
  }

  return {
    config,
    context,
    headers: { "x-application-key": config.appKey, Authorization: `Bearer ${token}` },
    bearerHeaders: { Authorization: `Bearer ${token}` },
    dispose: () => context.dispose(),
  };
}
