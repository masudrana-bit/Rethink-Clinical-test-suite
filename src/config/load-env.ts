import { existsSync } from "node:fs";

/**
 * Loads .env, as a side effect, before anything reads process.env.
 *
 * This is a separate module for an ordering reason rather than a stylistic one.
 * ES module imports are evaluated before any statement in the importing module,
 * so calling process.loadEnvFile() at the top of playwright.config.ts would run
 * *after* every module it imports had already been evaluated. Any module that
 * reads process.env at import time — environments.ts does — would see only the
 * shell, and .env would appear to work for some settings and not others.
 *
 * Importing this module first from those readers makes the ordering explicit
 * instead of accidental.
 *
 * Node's loader throws when the file is absent, which is the normal case in CI,
 * hence the guard. Variables already set in the environment are not overwritten,
 * so CI can override without editing anything.
 */
if (existsSync(".env")) process.loadEnvFile(".env");
