import { test as setup } from "@playwright/test";
import { STORAGE_STATE, signIn } from "../src/fixtures/auth.fixture.js";

/**
 * Runs once before the test projects, as a Playwright setup dependency.
 *
 * Every test then starts from the saved session instead of signing in for
 * itself, which is both faster and necessary: concurrent sign-ins through the
 * dev login route collide. See src/fixtures/auth.fixture.ts.
 */
setup("authenticate", async ({ page }) => {
  await signIn(page);
  await page.context().storageState({ path: STORAGE_STATE });
});
