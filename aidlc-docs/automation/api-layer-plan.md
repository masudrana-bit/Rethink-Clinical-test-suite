# API Layer — plan and current state

**Date:** 2026-08-25
**Decision:** build an API layer, taken by Masud Rana, Sr. QA Automation Engineer, following `analysis/cross-suite-review-2026-08-25.md` §7
**Status:** foundation built; the layer the decision was aimed at **cannot be built yet**, for a reason outside this suite
**Gate:** not yet presented. This is framework work and belongs at a G5-equivalent review

---

## 1. Why the decision was taken

`GAP-005` / `P-05` had been open since intake, recorded as "no API contract exists for this application". The cross-suite review found that untrue at the organisation level: live Swagger on three services, three Postman collections covering 86 requests, and a working API client in the sibling suite.

The intent was to enable what a UI-only suite cannot do — seed test data, clean it up afterwards, and verify through a second channel rather than trusting the screen. That would also settle `F-05`, the test data lifecycle question.

## 2. Why most of it cannot be built today

Probed directly against dev2 on 2026-08-25, with a valid bearer token:

| Surface | Result |
|---|---|
| Reference data (`/lookup/*`) | **200** — 6 lesson statuses returned |
| Auth boundary (no application key) | **401**, correctly |
| Security login | **200**, token issued |
| Gateway `users/current` | **200** with the bearer |
| Tenant-scoped read (`/accounts/{id}/target-groups`) | **503** `Unavailable/AccountsService` |
| Client programs (`/accounts/{id}/clients/{id}/programs`) | **503** `Unavailable/AccountsService` |

The gateway returning 200 on the same token is what makes this conclusive: the 503 is not an authentication problem. It is the Accounts-service outage the sibling suite records as its top blocker — a removed trust key, unchanged for eleven days at the time of writing, with no fix in flight.

**Everything setup and cleanup would need lives under that tenant prefix.** There is no route to create a client, a program, or a target while it is down. An API layer for test data cannot be written against a surface that returns 503 to every call, and writing one speculatively would produce code that has never executed successfully — which is worse than none, because it looks finished.

This is also the same outage that explains the substituted data in every UI run and the inert "Add a program" control.

## 3. What was built

Foundation only, all of it exercised:

| Component | Purpose |
|---|---|
| `src/api/config.ts` | Configuration from environment variables, with a clear error naming exactly what is missing |
| `src/api/paths.ts` | Route builders for the endpoints we have reason to call |
| `src/api/client.ts` | Security login and an authenticated Playwright `APIRequestContext` |
| `scripts/api-readiness.mjs` | Reports whether the tenant surface has recovered |

Two details worth recording because they cost time.

**The token is nested.** The security service returns `{ tokenInfo, errorMessage, securityLevel }`, and the token is inside `tokenInfo` — not at the top level. Reading `token` yields `undefined` and every subsequent call returns 401, which looks exactly like bad credentials. `extractToken` handles both shapes.

**Gateway routes must not carry the application key**, and carry no division or account segments — the gateway injects both from the JWT.

## 4. No credentials in this repository

The sibling suite's `support/config.ts` and `.env.example` carry application keys and a test-account username and password as literals, so it runs out of the box. This suite does not follow that, under `aidlc-e2e-rules.md` §18 and §19.

Every value is read from the environment with no default. The cost is that API work needs a populated `.env`; `requireApiConfig()` turns that into a clear message rather than a confusing 401. `.env.example` documents the variables and supplies none of them.

## 5. Why there are no API tests

Beyond the outage, a second reason stands on its own: **no requirement describes API behaviour.** Every test in this suite traces to an approved acceptance criterion, and there is none to trace an API test to. Writing scenarios against observed API behaviour would repeat the mistake `SRC-001` already records for the UI, on a surface where the sibling suite has documented that reference-data ids mean different things in different environments.

The foundation is a capability, not coverage. The traceability record is unchanged and still reports 2 of 5 criteria.

## 6. What happens when the outage clears

`npm run api:readiness` reports `READY` on the day the tenant surface answers. Then:

1. Present this plan at a G5-equivalent gate, with the seeding and cleanup design it currently cannot contain.
2. Design the test data lifecycle against real routes and close `F-05`.
3. Decide whether UI scenarios may use API setup — a real change to what a UI test proves, and one for the gate rather than for whoever writes the first fixture.
4. Revisit the substituted-data caveat on the S9 evidence, which should disappear once the backend serves clients.

Until then the probe is the deliverable, and its value is that nobody has to keep checking by hand.
