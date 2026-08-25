import type { ApiConfig } from "./config.js";

/**
 * Clinical API route builders.
 *
 * Modelled on the sibling suite's support/api.ts, narrowed to the routes this
 * suite has a reason to call. Routes are added when something needs them, not
 * in anticipation — an unused builder is a claim of coverage that does not
 * exist.
 *
 * The shapes are transcribed from that suite and confirmed against the live
 * dev2 API on 2026-08-25. That makes them observed rather than contractual;
 * Swagger is the authority if the two ever disagree:
 *   https://dev2.internal.rethinkbhtech.com/clinical/swagger/index.html
 */

/** Reference data. No tenant in the path, so unaffected by the Accounts outage. */
export const lookupPath = (name: string): string => `/clinical/api/v1/lookup/${name}`;

/** Everything tenant-scoped hangs off this prefix — and everything under it is 503 today. */
export const tenantPath = (c: ApiConfig): string =>
  `/clinical/api/v1/${c.division}/accounts/${c.accountId}`;

export const scopedPath = (c: ApiConfig, resource: string): string =>
  `${tenantPath(c)}/${resource}`;

export const clientProgramsPath = (c: ApiConfig, clientId: string): string =>
  `${tenantPath(c)}/clients/${clientId}/programs`;

/**
 * The route REQ-CLIENT-002 would exercise if that requirement were unblocked.
 * Present so the readiness probe can watch it; no test calls it, because the
 * requirement has no approved acceptance criterion.
 */
export const targetsPath = (c: ApiConfig, clientId: string, programId: string): string =>
  `${clientProgramsPath(c, clientId)}/${programId}/targets`;

/** Security service: exchanges credentials for a bearer token. */
export const loginPath = "/mobile-security/api/v1/auth/login";

/**
 * Gateway routes take the JWT only and must never carry the application key.
 * The gateway injects division and account from the token, so gateway paths
 * carry no tenant segments.
 */
export const gatewayUsersCurrentPath = "/mobile-gateway-api/gateway/users/current";
