#!/usr/bin/env node
/**
 * Reports whether the Clinical API can support test data setup yet.
 *
 * Why this exists rather than an API test suite. On 2026-08-25 the entire
 * tenant-scoped surface — every route under /accounts/{id}/ — returned
 * 503 Unavailable/AccountsService, caused by a removed Accounts-service trust
 * key. Verified here with a valid bearer token, so it is not an auth problem.
 * That surface is exactly what seeding, cleanup, and verification would need,
 * so F-05's test data lifecycle cannot be built against it today.
 *
 * What can be built is this: a probe that says, in one line, whether that is
 * still true. It turns "wait and periodically re-check by hand" into a signal,
 * and the day it reports READY is the day the API layer becomes worth writing.
 *
 * Reads credentials from the environment only — nothing is committed. Run:
 *   npm run api:readiness
 *
 * Exit codes:
 *   0  probe completed (whether or not the API is ready)
 *   2  no credentials configured, so nothing could be probed
 */

import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const REQUIRED = ["APP_KEY", "SECURITY_KEY", "AUTH_USERNAME", "AUTH_PASSWORD", "ACCOUNT_ID"];
const missing = REQUIRED.filter((k) => !process.env[k]?.trim());

if (missing.length > 0) {
  console.error(`Cannot probe — missing: ${missing.join(", ")}`);
  console.error("Copy .env.example to .env and fill them in. Do not commit them.");
  process.exit(2);
}

const env = process.env.ENV?.trim() || "dev2";
const base =
  process.env.API_BASE_URL?.trim() ||
  `https://${env === "dev" ? "dev" : "dev2"}.internal.rethinkbhtech.com`;
const division = process.env.DIVISION?.trim() || "bh";
const account = process.env.ACCOUNT_ID.trim();
const clientId = process.env.CLIENT_ID?.trim();

async function call(path, headers) {
  try {
    const res = await fetch(`${base}${path}`, { headers });
    return { status: res.status, body: await res.text() };
  } catch (e) {
    return { status: 0, body: e.cause?.code ?? e.message };
  }
}

console.log(`\nClinical API readiness — ${base}\n`);

// Reference data carries no tenant, so it stays up during an Accounts outage.
// It is the control: if this fails, the problem is bigger than Accounts.
const lookup = await call("/clinical/api/v1/lookup/lesson-statuses", {
  "x-application-key": process.env.APP_KEY.trim(),
});
console.log(`  reference data        ${lookup.status === 200 ? "OK" : `FAIL (${lookup.status})`}`);

const login = await fetch(`${base}/mobile-security/api/v1/auth/login`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-application-key": process.env.SECURITY_KEY.trim(),
  },
  body: JSON.stringify({
    username: process.env.AUTH_USERNAME,
    password: process.env.AUTH_PASSWORD,
  }),
}).catch(() => null);

const loginBody = login?.ok ? await login.json().catch(() => null) : null;
const info = loginBody?.tokenInfo;
const token =
  (typeof info === "string" ? info : (info?.token ?? info?.accessToken ?? info?.access_token)) ??
  loginBody?.token ??
  null;

console.log(`  security login        ${token ? "OK" : `FAIL (${login?.status ?? "unreachable"})`}`);

if (!token) {
  console.log("\nNOT READY — cannot authenticate, so the tenant surface was not probed.\n");
  process.exit(0);
}

const authed = {
  "x-application-key": process.env.APP_KEY.trim(),
  Authorization: `Bearer ${token}`,
};

const tenant = `/clinical/api/v1/${division}/accounts/${account}`;
const checks = [["tenant-scoped read", `${tenant}/target-groups`]];
if (clientId) checks.push(["client programs", `${tenant}/clients/${clientId}/programs`]);

let ready = true;
for (const [label, path] of checks) {
  const res = await call(path, authed);
  const accountsOutage = res.status === 503 && res.body.includes("AccountsService");
  if (res.status !== 200) ready = false;

  console.log(
    `  ${label.padEnd(21)} ${
      res.status === 200 ? "OK" : accountsOutage ? "503 — Accounts service" : `FAIL (${res.status})`
    }`,
  );
}

console.log("");
if (ready) {
  console.log("READY — the tenant-scoped surface is answering.");
  console.log("Test data setup and cleanup are now possible; F-05 can be designed against it.");
  console.log(
    "See aidlc-docs/automation/api-layer-plan.md for what was deferred until this day.\n",
  );
} else {
  console.log("NOT READY — the tenant-scoped surface is still unavailable.");
  console.log("Seeding, cleanup, and verification cannot be built against it. This is a backend");
  console.log("outage, not a fault in this suite, and no amount of retrying will change it.\n");
}
