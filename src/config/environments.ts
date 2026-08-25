import "./load-env.js";

/**
 * Target environment selection.
 *
 * Adopted from the sibling NextGen Clinical suite, which selects an environment
 * from an ENV variable rather than carrying one base URL. Two reasons it is
 * worth having here: the Clinical WebApp is deployed once per environment, and
 * dev2 — not dev — is that suite's mandatory daily target, so pinning ourselves
 * to a single host was a decision we had made without noticing.
 *
 * What is deliberately NOT adopted from that suite's equivalent file: it also
 * carries API application keys and a test-account username and password as
 * literals. aidlc-e2e-rules.md §18 and §19 prohibit credentials in this
 * repository. Nothing secret belongs in this file, and today nothing needs to —
 * the dev sign-in route takes no credentials.
 */

export type EnvName = "dev" | "dev2";

/** What a run reports as its target. "custom" means BASE_URL, not a named environment. */
export type EnvLabel = EnvName | "custom";

/**
 * One Clinical WebApp per environment.
 *
 * qas is intentionally absent. The sibling suite maps qas to the dev host with
 * the note that the QAS UI is not deployed, which is a placeholder rather than
 * an environment; adding it here would imply a target that does not exist.
 */
const UI_BASE_URLS: Record<EnvName, string> = {
  dev: "https://clinical.dev.rethinkbhtech.com",
  dev2: "https://clinical.dev2.rethinkbhtech.com",
};

const rawEnv = process.env.ENV?.trim();
const rawBaseUrl = process.env.BASE_URL?.trim();

/**
 * dev2 is the default as of 2026-08-25.
 *
 * It is the mandatory daily environment for the sibling NextGen Clinical suite,
 * and aligning removes a split nobody had chosen — this suite had been on dev
 * only because that is what the first screenshots happened to show.
 *
 * The S9 evidence for REQ-CLIENT-001 was produced on dev. That evidence is not
 * invalidated: reconnaissance on 2026-08-25 found both environments serving
 * identical substituted data with the same four example clients, and the suite
 * was re-run green on both. But the evidence does name dev, so a future run on
 * dev2 is a different run against a different host and should be recorded as
 * such rather than treated as a repeat.
 */
const DEFAULT_ENV: EnvName = "dev2";

function resolveEnvName(raw: string | undefined): EnvName {
  if (raw === undefined || raw === "") return DEFAULT_ENV;
  if (raw in UI_BASE_URLS) return raw as EnvName;

  // Failing loudly beats silently testing somewhere else: a typo in ENV would
  // otherwise produce a green run against the default and look like a pass.
  throw new Error(
    `Unknown ENV "${raw}". Expected one of: ${Object.keys(UI_BASE_URLS).join(", ")}.`,
  );
}

/** Trailing slashes are cosmetic; "…com" and "…com/" are the same target. */
const sameHost = (a: string, b: string) => a.replace(/\/+$/, "") === b.replace(/\/+$/, "");

const envName = resolveEnvName(rawEnv);

/**
 * When both are set they must agree.
 *
 * This is not hypothetical: a BASE_URL left in .env silently beat `ENV=dev2` on
 * 2026-08-25, and the run reported itself as dev2 while actually exercising dev.
 * Only the report metadata revealed it. An hour of that and the evidence record
 * would name an environment nobody tested — which is worse than any failure the
 * suite is designed to catch, because it looks like a pass.
 */
if (rawEnv !== undefined && rawEnv !== "" && rawBaseUrl !== undefined && rawBaseUrl !== "") {
  if (!sameHost(rawBaseUrl, UI_BASE_URLS[envName])) {
    throw new Error(
      `ENV and BASE_URL disagree. ENV="${rawEnv}" means ${UI_BASE_URLS[envName]}, ` +
        `but BASE_URL="${rawBaseUrl}". Unset one of them — a run must not report ` +
        `an environment it did not target.`,
    );
  }
}

export const baseURL =
  rawBaseUrl !== undefined && rawBaseUrl !== "" ? rawBaseUrl : UI_BASE_URLS[envName];

/**
 * Derived from the URL actually in use, not from what was requested, so a run
 * can never report an environment it did not target. A BASE_URL pointing
 * somewhere unrecognised reports "custom" rather than borrowing a name.
 */
export const envLabel: EnvLabel =
  (Object.keys(UI_BASE_URLS) as EnvName[]).find((e) => sameHost(UI_BASE_URLS[e], baseURL)) ??
  "custom";

export const isDefaultEnv = envLabel === DEFAULT_ENV;
