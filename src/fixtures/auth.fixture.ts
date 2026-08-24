import type { Page } from "@playwright/test";

/**
 * Authentication for the dev environment.
 *
 * The application exposes a credential-free sign-in route that establishes a
 * session and redirects to the clients area. Because the route is named
 * "temp-dev-login" it should be assumed temporary, so every dependency on it is
 * confined to this file: if a real authentication mechanism replaces it, this is
 * the only module that changes.
 *
 * Verified against the dev environment 2026-08-24. See
 * aidlc-docs/automation/REQ-CLIENT-001/framework-reuse-plan.md §2.
 */

export const DEV_LOGIN_PATH = "/temp-dev-login";

/** Where the dev login lands once a session exists. */
export const POST_LOGIN_PATH = "/clients";

/**
 * Saved session, produced by the "setup" project and reused by every test.
 *
 * Signing in per test is not an option here: the dev login exchanges a
 * transferToken, and two concurrent exchanges collide — one worker wins and the
 * other is redirected to /sign-in. Observed 2026-08-24 with two workers.
 * Authenticating once and reusing the state sidesteps the collision and keeps
 * the suite parallel.
 *
 * Git-ignored via /playwright/.auth/ — it holds a live session token.
 */
export const STORAGE_STATE = "playwright/.auth/user.json";

/** localStorage key holding the session. Used to verify sign-in actually took. */
export const SESSION_STORAGE_KEY = "bh_clinical_auth_session";

/**
 * Establishes an authenticated session.
 *
 * Waits on the post-login URL rather than a fixed delay, per
 * aidlc-e2e-rules.md §16.
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto(DEV_LOGIN_PATH);
  await page.waitForURL((url) => url.pathname.startsWith(POST_LOGIN_PATH));

  const hasSession = await page.evaluate(
    (key) => window.localStorage.getItem(key) !== null,
    SESSION_STORAGE_KEY,
  );

  if (!hasSession) {
    throw new Error(
      `Sign-in reached ${POST_LOGIN_PATH} but no session was stored under ` +
        `"${SESSION_STORAGE_KEY}". The dev login route may have changed.`,
    );
  }
}
