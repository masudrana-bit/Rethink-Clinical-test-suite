import { APIRequestContext, Browser, BrowserContext } from '@playwright/test';
import { config } from './config';
import { ClinicalApi } from '../api/clinicalApi';
import { getRuntimeConfig } from './runtimeConfig';

/** The four fields the auth service issues, per the crawl and localStorage. */
export interface SessionTokens {
  accessToken: string;
  accessTokenExpiration: string;
  refreshToken: string;
  refreshTokenExpiration: string;
}

interface StoredSession {
  schemaVersion: number;
  lastActivityAt: number;
  session: SessionTokens;
}

export interface HarvestedAuth {
  /** Verbatim localStorage value, replayed into each fresh context. */
  raw: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiration: Date;
}

let cached: HarvestedAuth | undefined;

/**
 * FND-1 / D1. Drives /temp-dev-login once per run and lifts the session the app
 * stores for itself. Runs in a throwaway context so nothing it accumulates
 * (demo sessions, saved reports) reaches the scenarios.
 */
export async function acquireAuth(browser: Browser, fresh = false): Promise<HarvestedAuth> {
  if (!fresh && cached && cached.accessTokenExpiration.getTime() > Date.now() + 60_000) {
    return cached;
  }

  const context = await browser.newContext({ baseURL: config.baseUrl });
  try {
    const page = await context.newPage();
    await page.goto('/temp-dev-login');
    await page.getByTestId('clients-list-page').waitFor({ state: 'visible' });

    const raw = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      config.authStorageKey,
    );
    if (!raw) {
      throw new Error(
        `Signed in at /temp-dev-login but localStorage["${config.authStorageKey}"] was empty. ` +
          'The app may have changed how it stores its session.',
      );
    }

    const parsed = JSON.parse(raw) as StoredSession;
    const accessToken = parsed?.session?.accessToken;
    if (!accessToken) {
      throw new Error(
        `localStorage["${config.authStorageKey}"] has no session.accessToken. ` +
          `Keys present: ${Object.keys(parsed?.session ?? {}).join(', ') || 'none'}.`,
      );
    }

    const harvested: HarvestedAuth = {
      raw,
      accessToken,
      refreshToken: parsed.session.refreshToken,
      accessTokenExpiration: new Date(parsed.session.accessTokenExpiration),
    };
    // A `fresh` session belongs to its caller; caching it would hand the same
    // single-use refresh token back to everyone else.
    if (!fresh) cached = harvested;
    return harvested;
  } finally {
    await context.close();
  }
}

/**
 * Exchanges a refresh token for a fresh session. AUTH-2 asserts on this, and it
 * is also the escape hatch for runs long enough to outlive the access token,
 * which currently lives about 50 minutes.
 */
export async function refreshSession(
  apiContext: APIRequestContext,
  refreshToken: string,
): Promise<SessionTokens> {
  const { authApplicationKey } = await getRuntimeConfig(apiContext);
  const res = await new ClinicalApi(apiContext, undefined, authApplicationKey).refreshToken(
    refreshToken,
  );
  if (res.status() !== 200) {
    throw new Error(
      `Refreshing the session failed with ${res.status()}. ` +
        'The auth endpoints require the x-application-key header.',
    );
  }
  return (await res.json()) as SessionTokens;
}

/**
 * FND-5. Seeds only the auth key. A fresh context plus this is an authenticated
 * session with none of the demo-session or saved-report state that a full
 * storageState replay would drag along.
 */
export async function seedAuth(context: BrowserContext, auth: HarvestedAuth): Promise<void> {
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key as string, value as string);
      } catch {
        // about:blank and other opaque origins have no usable localStorage.
      }
    },
    [config.authStorageKey, auth.raw],
  );
}

export function resetAuthCache(): void {
  cached = undefined;
}
