import "../config/load-env.js";
import { envLabel } from "../config/environments.js";

/**
 * Clinical API configuration.
 *
 * Every value is read from the environment and none has a default. That is a
 * deliberate departure from the sibling suite's equivalent, which carries
 * application keys and a test-account username and password as literals so it
 * runs out of the box. aidlc-e2e-rules.md §18 and §19 prohibit credentials in
 * this repository, and "it is only a test key" is the reasoning that puts them
 * in every repository.
 *
 * The cost is that API work needs a populated .env. requireApiConfig() makes
 * that a clear message rather than a confusing 401.
 */

/** API hosts are per-environment and separate from the WebApp hosts. */
const API_BASE_URLS: Record<string, string> = {
  dev: "https://dev.internal.rethinkbhtech.com",
  dev2: "https://dev2.internal.rethinkbhtech.com",
};

export type ApiConfig = {
  baseUrl: string;
  appKey: string;
  securityKey: string;
  username: string;
  password: string;
  accountId: string;
  division: string;
  clientId: string | undefined;
};

const REQUIRED = [
  "APP_KEY",
  "SECURITY_KEY",
  "AUTH_USERNAME",
  "AUTH_PASSWORD",
  "ACCOUNT_ID",
] as const;

/** True when the environment carries enough to talk to the API at all. */
export function hasApiCredentials(): boolean {
  return REQUIRED.every((k) => {
    const v = process.env[k];
    return v !== undefined && v.trim() !== "";
  });
}

/**
 * Returns the API configuration, or throws naming exactly what is missing.
 *
 * Callers that should skip rather than fail — a readiness probe, say — check
 * hasApiCredentials() first.
 */
export function requireApiConfig(): ApiConfig {
  const missing = REQUIRED.filter((k) => {
    const v = process.env[k];
    return v === undefined || v.trim() === "";
  });

  if (missing.length > 0) {
    throw new Error(
      `Clinical API configuration incomplete. Missing: ${missing.join(", ")}.\n` +
        `Copy .env.example to .env and fill them in. These are credentials and must ` +
        `not be committed — see aidlc-e2e-rules.md §18 and §19.`,
    );
  }

  const baseUrl = process.env.API_BASE_URL?.trim() || API_BASE_URLS[envLabel];
  if (!baseUrl) {
    throw new Error(
      `No API base URL for environment "${envLabel}". Set API_BASE_URL explicitly, ` +
        `or target one of: ${Object.keys(API_BASE_URLS).join(", ")}.`,
    );
  }

  return {
    baseUrl,
    appKey: String(process.env.APP_KEY).trim(),
    securityKey: String(process.env.SECURITY_KEY).trim(),
    username: String(process.env.AUTH_USERNAME),
    password: String(process.env.AUTH_PASSWORD),
    accountId: String(process.env.ACCOUNT_ID).trim(),
    division: process.env.DIVISION?.trim() || "bh",
    clientId: process.env.CLIENT_ID?.trim() || undefined,
  };
}
