# Test case catalog — Rethink Clinical (Phase 1)

Printable copy: [`test-cases.pdf`](./test-cases.pdf).

Catalog of **automated** test cases already implemented against `clinical.dev2`. Each case follows a standard test-case structure (ID, objective, type, preconditions, steps, expected result). Traceability IDs match [`coverage-matrix.md`](./coverage-matrix.md). Defects live in [`defects.md`](./defects.md).

**How to read status**

| Status | Meaning |
|--------|---------|
| **Pass** | Included in `npm test`; last consecutive green runs on 2026-08-27 |
| **Known fail (`@bug`)** | Asserts *correct* product behaviour the app does not have yet. Excluded from `npm test`. Run with `npx cucumber-js -p bugs`. |

**Shared preconditions** (unless a case says otherwise)

1. `BASE_URL` and `API_BASE_URL` are reachable (preflight).
2. The suite has harvested a session from `/temp-dev-login` (no dedicated test account required).
3. A **resolved client** exists: an active client with at least one program that has at least one target. IDs are not hardcoded.
4. Each UI case starts in a **fresh browser context** seeded with auth only (no leftover demo-session or saved-report state).
5. Counts are asserted as **relationships** (UI vs API), not as fixed numbers.

**Execution**

| Profile | Command |
|---------|---------|
| Default (Pass cases) | `npm test` |
| Smoke (P0 UI/API) | `npm run test:smoke` |
| Known defects | `npx cucumber-js -p bugs` |

---

## Index

| Module | IDs | Count | Default run |
|--------|-----|------:|-------------|
| Foundations | FND-1 … FND-7 | 6 scenarios + harness | Yes |
| Authentication | AUTH-1 … AUTH-5 | 5 | Yes |
| Clients | CLI-1 … CLI-10 | 11 | Yes |
| Programs | PRG-1 … PRG-9 | 13 | Yes |
| Analyze Data | AZ-1 … AZ-14 | 22 (2 of which `@bug`) | 20 Pass + 2 Known fail |
| Behavior Support | BS-1 … BS-3 | 3 | 1 Pass + 2 Known fail |
| Negative | NEG-1 … NEG-11 | 11 | Yes |
| Write flows | WR-1 … WR-6 | 7 | 3 Ready + 1 Known fail + 3 WIP |
| **Total executable** | | **78** | **67 default + 11 filtered** |

Outline examples are listed as separate cases (AZ-5a–e, AZ-8a–c, PRG-3a-targets / PRG-3a-objectives).

---

## 0. Foundations

**Feature:** `features/preflight/foundations.feature`  
**Tags:** `@preflight`

### FND-2 — Both origins answer before any test runs

| Field | Detail |
|-------|--------|
| **Objective** | Fail fast if the app or API gateway is unreachable, with an actionable message. |
| **Type** | Harness / API |
| **Priority** | P0 |
| **Preconditions** | Environment variables for `BASE_URL` and `API_BASE_URL` are set. |
| **Test data** | None. |
| **Steps** | 1. Before the suite starts, GET the application origin. 2. GET the API gateway origin. |
| **Expected result** | Application origin returns HTTP 200. API origin answers (unauthenticated 401 is acceptable). If either is down, the suite aborts with a message naming the origin. |
| **Automation** | `foundations.feature` — *Both origins answer before any test runs* |
| **Status** | Pass |

### FND-1 — A session is harvested from the preview sign-in

| Field | Detail |
|-------|--------|
| **Objective** | Obtain a usable bearer session without storing credentials (D1). |
| **Type** | UI → token harvest |
| **Priority** | P0 |
| **Preconditions** | `/temp-dev-login` is available on the app origin. |
| **Test data** | Session is read from `localStorage["bh_clinical_auth_session"]`. |
| **Steps** | 1. Drive `/temp-dev-login` in a throwaway browser context. 2. Read access token and expiry from localStorage. 3. Call a protected API with that token. |
| **Expected result** | Access token is present and not expired. API accepts the token (HTTP 200 on a protected call). |
| **Automation** | *A session is harvested from the preview sign-in* |
| **Status** | Pass |

### FND-3 — A test client is resolved by capability rather than by id

| Field | Detail |
|-------|--------|
| **Objective** | Pick fixture data by capability so tests survive client-id churn (D2, D6). |
| **Type** | API |
| **Priority** | P0 |
| **Preconditions** | Harvested token. At least one active client has a program with targets. |
| **Test data** | Resolver walks clients and programs; optional `TEST_CLIENT_ID` only *narrows* candidates. |
| **Steps** | 1. Request clients. 2. For candidates, request programs then targets. 3. Select the first client with a program that has ≥1 target (preferring an active program). |
| **Expected result** | Resolved client is active. Resolved program has at least one target. |
| **Automation** | *A test client is resolved by capability rather than by id* |
| **Status** | Pass |

### FND-5 — A seeded context is authenticated and free of prior state

| Field | Detail |
|-------|--------|
| **Objective** | Prove scenario isolation: auth is injected, demo data-collection state is not. |
| **Type** | UI |
| **Priority** | P0 |
| **Preconditions** | Fresh context seeded with the harvested session only. |
| **Steps** | 1. Open `/clients`. 2. Inspect the app shell and localStorage. |
| **Expected result** | Shell shows a signed-in user. Browser holds no `clinical.rbt.session.demo-session-*` keys. |
| **Automation** | *A seeded context is authenticated and free of prior state* |
| **Status** | Pass |

### FND-5b — An unseeded context is not authenticated

| Field | Detail |
|-------|--------|
| **Objective** | Confirm the harness does not leak auth into a `@signed-out` scenario. |
| **Type** | UI |
| **Priority** | P0 |
| **Preconditions** | Browser context is **not** seeded with a session (`@signed-out`). |
| **Steps** | 1. Open the application root. |
| **Expected result** | Sign-in page is shown. |
| **Automation** | *An unseeded context is not authenticated* |
| **Status** | Pass |

### FND-7 — Credential fields are stripped before the browser sees them

| Field | Detail |
|-------|--------|
| **Objective** | `staff-role` must not expose `apiKey` / `password` (and related fields) to the page or traces (D7). |
| **Type** | UI + network intercept |
| **Priority** | P0 |
| **Preconditions** | Response scrubbing installed on the browser context. |
| **Steps** | 1. Open the clients page. 2. Capture the `staff-role` response as the browser received it. |
| **Expected result** | Captured JSON has no populated credential fields. App shell still shows the signed-in user (scrubbing must not break the UI). |
| **Automation** | *Credential fields are stripped before the browser sees them*. Also `npm run verify:scrub`. |
| **Status** | Pass |

FND-4 (page objects) and FND-6 (`@wip` gating, report script) are **harness work**, not Gherkin cases.

---

## 1. Authentication

**Feature:** `features/auth/authentication.feature`  
**Tags:** `@auth`

### AUTH-1 — The issued session is well formed

| Field | Detail |
|-------|--------|
| **Objective** | The harvested session has the token pair and expiry contract the app uses. |
| **Type** | API / session |
| **Priority** | P0 (smoke) |
| **Preconditions** | Session harvested in BeforeAll. |
| **Steps** | 1. Inspect harvested session fields. |
| **Expected result** | Access token and refresh token are present. Access expiry is in the future. Refresh expiry is on or after access expiry. |
| **Automation** | *The issued session is well formed* — `@api @smoke @auth` |
| **Status** | Pass |

### AUTH-2 — A refresh token exchanges for a new session

| Field | Detail |
|-------|--------|
| **Objective** | Refresh-token exchange returns a new, usable access token (D8: own sign-in, not the shared token). |
| **Type** | API |
| **Priority** | P1 |
| **Preconditions** | A **fresh** `/temp-dev-login` session for this case only (refresh tokens are single-use). |
| **Steps** | 1. Sign in independently. 2. POST refresh with that refresh token and `x-application-key`. 3. Call `staff-role` with the new access token. |
| **Expected result** | HTTP success with access token, refresh token, and both expiries. New access token ≠ previous. `staff-role` returns 200. |
| **Automation** | *A refresh token exchanges for a new session* — `@api @auth` |
| **Status** | Pass |

### AUTH-3 — The preview sign-in lands an unauthenticated visitor on the clients page

| Field | Detail |
|-------|--------|
| **Objective** | `/temp-dev-login` authenticates a visitor and lands them on the clients list. |
| **Type** | UI |
| **Priority** | P0 (smoke) |
| **Preconditions** | `@signed-out` — no seeded session. |
| **Steps** | 1. Open `/temp-dev-login`. |
| **Expected result** | User arrives on the clients page. App shell shows a signed-in user. |
| **Automation** | *The preview sign-in lands an unauthenticated visitor on the clients page* — `@ui @smoke @auth` |
| **Status** | Pass |

### AUTH-4 — Staff role identifies the current user

| Field | Detail |
|-------|--------|
| **Objective** | `staff-role` returns the signed-in user’s role identity. |
| **Type** | API |
| **Priority** | P1 |
| **Preconditions** | Harvested access token. |
| **Steps** | 1. GET staff-role. |
| **Expected result** | HTTP 200. Body names a role and a user. |
| **Automation** | *Staff role identifies the current user* — `@api @auth` |
| **Status** | Pass |

### AUTH-5 — A protected client record is closed to an unauthenticated visitor

| Field | Detail |
|-------|--------|
| **Objective** | Deep-linking a client Analyze Data URL without a session must not show clinical content. |
| **Type** | UI (negative) |
| **Priority** | P1 |
| **Preconditions** | `@signed-out`. A resolved client id is known to the suite. |
| **Steps** | 1. Open `/clients/{id}/analyze-data` without auth. |
| **Expected result** | Sign-in page is shown. No client-record content is rendered. |
| **Automation** | *A protected client record is closed to an unauthenticated visitor* — `@ui @negative @auth` |
| **Status** | Pass |

---

## 2. Clients list

**Feature:** `features/clients/clients.feature`  
**Tags:** `@clients`

### CLI-1 — The clients endpoint returns a coherent paged envelope

| Field | Detail |
|-------|--------|
| **Objective** | Clients list API is a valid paged envelope (no fixed `totalCount`). |
| **Type** | API |
| **Priority** | P0 (smoke) |
| **Steps** | 1. GET `/clinical/v1/clients`. |
| **Expected result** | HTTP 200. Content-Type includes `x-api-version=1`. Body has `page`, `pageSize`, `totalCount`, `totalPages`, `items`. `totalPages = max(1, ceil(totalCount / pageSize))`. Item length ≤ pageSize; if one page, `items.length = totalCount`. |
| **Automation** | *The clients endpoint returns a coherent paged envelope* |
| **Status** | Pass |

### CLI-2 — Every client item carries the fields the app depends on

| Field | Detail |
|-------|--------|
| **Objective** | Each client row the UI needs is present on every item. |
| **Type** | API |
| **Priority** | P1 |
| **Steps** | 1. GET clients list. |
| **Expected result** | Every item has a numeric `id`, a name, a client number, and an active flag. |
| **Automation** | *Every client item carries the fields the app depends on* |
| **Status** | Pass |

### CLI-3 — The clients page lists exactly the clients the API returned

| Field | Detail |
|-------|--------|
| **Objective** | UI list membership matches the API (set of ids), not a hardcoded count. |
| **Type** | UI |
| **Priority** | P0 (smoke) |
| **Steps** | 1. Open `/clients`. 2. Compare listed client ids with the API `items` ids. |
| **Expected result** | The two sets of ids are equal. |
| **Automation** | *The clients page lists exactly the clients the API returned* |
| **Status** | Pass |

### CLI-4 — Opening a client lands on their Skills Programs workspace

| Field | Detail |
|-------|--------|
| **Objective** | Selecting a client from the list opens that client’s workspace. |
| **Type** | UI |
| **Priority** | P0 |
| **Steps** | 1. Open `/clients`. 2. Open the resolved client from the table. |
| **Expected result** | Workspace is shown for that client. Client switcher names that client. |
| **Automation** | *Opening a client lands on their Skills Programs workspace* |
| **Status** | Pass |

### CLI-5 — Searching by name narrows the list to matching clients

| Field | Detail |
|-------|--------|
| **Objective** | Name filter is client-side and inclusive of the resolved client. |
| **Type** | UI |
| **Priority** | P1 |
| **Test data** | A substring of the resolved client’s name. |
| **Steps** | 1. Open `/clients`. 2. Type a partial name into the name search. |
| **Expected result** | Every remaining row’s name contains the search text. The resolved client is still listed. |
| **Automation** | *Searching by name narrows the list to matching clients* |
| **Status** | Pass |

### CLI-5b — Searching by an unmatched name empties the list

| Field | Detail |
|-------|--------|
| **Objective** | A name that matches nobody yields an empty table (not an error). |
| **Type** | UI |
| **Priority** | P1 |
| **Test data** | `zzz-no-such-client` |
| **Steps** | 1. Open `/clients`. 2. Search by that name. |
| **Expected result** | No client rows are listed. |
| **Automation** | *Searching by an unmatched name empties the list* |
| **Status** | Pass |

### CLI-6 — Searching by client ID narrows the list to one client

| Field | Detail |
|-------|--------|
| **Objective** | Client-number search isolates the resolved client. |
| **Type** | UI |
| **Priority** | P1 |
| **Test data** | Resolved client’s client number. |
| **Steps** | 1. Open `/clients`. 2. Search by that client number. |
| **Expected result** | Only the resolved client is listed. |
| **Automation** | *Searching by client ID narrows the list to one client* |
| **Status** | Pass |

### CLI-7 — The client switcher moves to the chosen client's record

| Field | Detail |
|-------|--------|
| **Objective** | Header client switcher navigates to the selected client. |
| **Type** | UI |
| **Priority** | P1 |
| **Steps** | 1. Open `/clients`. 2. Choose the resolved client in the PrimeNG client switcher. |
| **Expected result** | Workspace URL/state is that client’s record. |
| **Automation** | *The client switcher moves to the chosen client's record* |
| **Status** | Pass |

### CLI-8 — The clients page fires the expected calls and no failures

| Field | Detail |
|-------|--------|
| **Objective** | Page load issues the expected first-party calls without HTTP failures. |
| **Type** | Network |
| **Priority** | P2 |
| **Steps** | 1. Attach a network recorder. 2. Open `/clients`. |
| **Expected result** | Runtime config, staff-role, and clients calls succeeded. No recorded first-party call failed. |
| **Automation** | *The clients page fires the expected calls and no failures* — `@network` |
| **Status** | Pass |

### CLI-9 — Each row's status agrees with the API active flag

| Field | Detail |
|-------|--------|
| **Objective** | Visible status column matches API `active` / equivalent for each id. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Open `/clients`. 2. For each row, compare UI status with API active flag. |
| **Expected result** | Every row agrees with the API for that client. |
| **Automation** | *Each row's status agrees with the API active flag* |
| **Status** | Pass |

### CLI-10 — Clearing search restores the complete client list

| Field | Detail |
|-------|--------|
| **Objective** | Clearing both client search inputs removes the active filter. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Open `/clients`. 2. Enter an unmatched name. 3. Confirm no rows. 4. Clear both search inputs. |
| **Expected result** | Visible client ids again equal the current clients API response. |
| **Automation** | *Clearing client search restores the complete list* |
| **Status** | Pass |

---

## 3. Client programs

**Feature:** `features/programs/programs.feature`  
**Tags:** `@programs`

### PRG-1 — The programs endpoint describes a client's programs

| Field | Detail |
|-------|--------|
| **Objective** | Programs list for the resolved client is a valid envelope with required fields. |
| **Type** | API |
| **Priority** | P1 |
| **Steps** | 1. GET `/clinical/v1/clients/{id}/programs`. |
| **Expected result** | HTTP 200. Paging arithmetic holds. Every item has numeric `id`, non-empty `title`, boolean `active`. |
| **Automation** | *The programs endpoint describes a client's programs* |
| **Status** | Pass |

### PRG-2 — The program library returns the template catalogue

| Field | Detail |
|-------|--------|
| **Objective** | Program library is a paged catalogue of templates. |
| **Type** | API |
| **Priority** | P2 |
| **Steps** | 1. GET `/clinical/v1/program-library`. |
| **Expected result** | HTTP 200. Paging holds. Every entry has `id` and non-empty `title`. Library is not empty. |
| **Automation** | *The program library returns the template catalogue* |
| **Status** | Pass |

### PRG-3a-targets — Targets return a valid paged envelope

| Field | Detail |
|-------|--------|
| **Objective** | Per-program `targets` uses the paged envelope (not a bare array). |
| **Type** | API |
| **Priority** | P1 |
| **Steps** | 1. GET `.../programs/{programId}/targets`. |
| **Expected result** | HTTP 200. Paging arithmetic is self-consistent. |
| **Automation** | Outline *Paged per-program endpoints* — `targets` |
| **Status** | Pass |

### PRG-3a-objectives — Objectives return a valid paged envelope

| Field | Detail |
|-------|--------|
| **Objective** | Per-program `objectives` uses the paged envelope. |
| **Type** | API |
| **Priority** | P1 |
| **Steps** | 1. GET `.../programs/{programId}/objectives`. |
| **Expected result** | HTTP 200. Paging arithmetic is self-consistent. |
| **Automation** | Outline — `objectives` |
| **Status** | Pass |

### PRG-3b — Mastery criteria returns a programme-scoped criteria document

| Field | Detail |
|-------|--------|
| **Objective** | `mastery-criteria` is `{ programId, phases[] }`, not a paged envelope. |
| **Type** | API |
| **Priority** | P1 |
| **Steps** | 1. GET `.../mastery-criteria`. |
| **Expected result** | HTTP 200. `programId` equals the requested program. `phases` is an array. |
| **Automation** | *Mastery criteria returns a programme-scoped criteria document* |
| **Status** | Pass |

### PRG-3c — Target groups returns a bare list

| Field | Detail |
|-------|--------|
| **Objective** | `target-groups` is a JSON array (may be empty). |
| **Type** | API |
| **Priority** | P1 |
| **Steps** | 1. GET `.../target-groups`. |
| **Expected result** | HTTP 200. Body is an array. |
| **Automation** | *Target groups returns a bare list* |
| **Status** | Pass |

### PRG-3d — Data collection describes how the programme is measured

| Field | Detail |
|-------|--------|
| **Objective** | `data-collection` names the program and a collection method. |
| **Type** | API |
| **Priority** | P1 |
| **Steps** | 1. GET `.../data-collection`. |
| **Expected result** | HTTP 200. `programId` matches. `method` is non-empty. `prompts` is an array. |
| **Automation** | *Data collection describes how the programme is measured* |
| **Status** | Pass |

### PRG-4 — Flagged automastery evaluations return only flagged items

| Field | Detail |
|-------|--------|
| **Objective** | `automastery-evaluations?status=flagged` is not a vacuous empty pass. |
| **Type** | API |
| **Priority** | P1 |
| **Preconditions** | At least one of the resolved client’s programs has flagged evaluations (else the case errors out rather than passing on `[]`). |
| **Steps** | 1. Walk programs until one has flagged items. 2. Assert that response. |
| **Expected result** | HTTP 200. Every item has `status = flagged` and a numeric `targetId`. List is non-empty. |
| **Automation** | *Flagged automastery evaluations return only flagged items* |
| **Status** | Pass |

### PRG-5 — The rail's Current tab lists exactly the active programs

| Field | Detail |
|-------|--------|
| **Objective** | Current tab = programs with `active: true` (not the full API list). |
| **Type** | UI |
| **Priority** | P1 |
| **Steps** | 1. Open `/clients/{id}` (Skills Programs). 2. Read rail item ids. 3. Re-read programs API and compare (D9). |
| **Expected result** | Rail ids equal the live API’s active program ids. |
| **Automation** | *The rail's Current tab lists exactly the active programs* |
| **Status** | Pass |

### PRG-7 — Current and Inactive tabs partition the client's programs

| Field | Detail |
|-------|--------|
| **Objective** | The two tabs are disjoint and together cover every program. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Open workspace. 2. Record Current ids. 3. Switch to Inactive and record ids. 4. Compare with a fresh programs API read. |
| **Expected result** | No id on both tabs. Every API program id appears on one tab. |
| **Automation** | *Current and Inactive tabs together list every program exactly once* |
| **Status** | Pass |

### PRG-6 — Selecting a program reveals its details

| Field | Detail |
|-------|--------|
| **Objective** | Selecting the resolved program shows details panels. |
| **Type** | UI |
| **Priority** | P1 |
| **Steps** | 1. Open workspace. 2. Switch to Current or Inactive as needed. 3. Click the resolved program. |
| **Expected result** | Targets, goals, and settings panels (`program-details-*`) are visible. |
| **Automation** | *Selecting a program reveals its details* |
| **Status** | Pass |

### PRG-8 — The domain filter narrows the rail to one domain

| Field | Detail |
|-------|--------|
| **Objective** | Domain filter restricts Current-tab programs; “All domains” restores the active set. |
| **Type** | UI |
| **Priority** | P2 |
| **Test data** | Most common domain among currently active programs (live API). |
| **Steps** | 1. Open workspace. 2. Filter by that domain. 3. Assert rail vs API. 4. Select “All domains”. 5. Assert full active set. |
| **Expected result** | After filter, rail = active programs in that domain. After clear, rail = all active programs. |
| **Automation** | *The domain filter narrows the rail to one domain* |
| **Status** | Pass |

### PRG-9 — Client tab bar navigates between client areas

| Field | Detail |
|-------|--------|
| **Objective** | The client-level tab bar reaches all three primary client areas. |
| **Type** | UI |
| **Priority** | P1 |
| **Steps** | 1. Open the resolved client workspace. 2. Open Analyze Data. 3. Open Behavior Support. 4. Return to Skills Programs. |
| **Expected result** | Each selected area renders its identifying page and content container. |
| **Automation** | *The client tab bar navigates between all three client areas* |
| **Status** | Pass |

---

## 4. Analyze Data

**Feature:** `features/analyze-data/analyze-data.feature`  
**Tags:** `@analyze-data`

### AZ-1 — The three summary tiles render numbers

| Field | Detail |
|-------|--------|
| **Objective** | Mastered, in-scope, and remaining tiles show non-negative numbers (not `--`). |
| **Type** | UI |
| **Priority** | P1 |
| **Steps** | 1. Open `/clients/{id}/analyze-data`. 2. Wait until in-scope shows a digit. 3. Read all three tiles. |
| **Expected result** | Each tile is visible and contains a finite number ≥ 0. |
| **Automation** | *The three summary tiles render numbers* |
| **Status** | Pass |

### AZ-2 — Mastered plus remaining equals in scope

| Field | Detail |
|-------|--------|
| **Objective** | The three tiles are internally consistent, and in-scope does not exceed the live target total (D10). |
| **Type** | UI + API |
| **Priority** | P1 |
| **Steps** | 1. Open Analyze Data. 2. Read mastered, remaining, in-scope. 3. Compare in-scope to the live target total. |
| **Expected result** | `mastered + remaining = in scope`. In-scope ≤ sum of `totalCount` across programs. |
| **Automation** | *Mastered plus remaining equals in scope* |
| **Status** | Pass |
| **Fails when** | A tile arithmetic bug, or in-scope counting more targets than the API reports. |

### AZ-3 — The skill-area chart plots one category per domain

| Field | Detail |
|-------|--------|
| **Objective** | Highcharts x-axis categories are the client’s distinct program domains; summary “across N skill areas” matches. |
| **Type** | UI + API |
| **Priority** | P2 |
| **Steps** | 1. Open Analyze Data. 2. Read chart SVG y-axis ticks and x-axis labels. 3. Compare with distinct `domain` values from programs API. |
| **Expected result** | Chart SVG visible with y-axis ticks. Categories equal distinct domains. Skill-area count = category count. |
| **Automation** | *The skill-area chart plots one category per domain* |
| **Status** | Pass |

### AZ-4 — Pending mastery determinations are grouped by program

| Field | Detail |
|-------|--------|
| **Objective** | Review rows match flagged automastery evaluations; grouping headings match each row’s program. |
| **Type** | UI + API |
| **Priority** | P2 |
| **Steps** | 1. Open Analyze Data. 2. Count `mastery-review-row`. 3. Sum flagged evaluations across programs. 4. Check each group heading vs row program names. |
| **Expected result** | Row count = flagged total. Headings unique. Every row’s program name matches its group heading (case-insensitive). |
| **Automation** | *Pending mastery determinations are grouped by program* |
| **Status** | Pass |

### AZ-5a … AZ-5e — Date range chip is the sole active selection

| Field | Detail |
|-------|--------|
| **Objective** | Each date-window chip becomes the only `aria-pressed="true"` chip. |
| **Type** | UI |
| **Priority** | P2 |
| **Test data** | One case per window: **2 weeks**, **1 month**, **3 months**, **6 months**, **All**. |
| **Steps** | 1. Open Analyze Data. 2. Click the chip. |
| **Expected result** | Only that window is active. |
| **Automation** | Outline *Each date range chip becomes the sole active selection* |
| **Status** | Pass (5 cases) |

### AZ-6 — Loading the report fetches targets for every program

| Field | Detail |
|-------|--------|
| **Objective** | Page load fans out a `targets` request per program and at least one automastery call. |
| **Type** | Network |
| **Priority** | P2 |
| **Steps** | 1. Record traffic. 2. Open Analyze Data. 3. Wait for network idle. |
| **Expected result** | A targets URL exists for every program id known at assertion time. ≥1 automastery-evaluations request. |
| **Automation** | *Loading the report fetches targets for every program* |
| **Status** | Pass |

### AZ-6b — Every request the report makes succeeds

| Field | Detail |
|-------|--------|
| **Objective** | Per-program `targets` and `automastery-evaluations` calls return HTTP status below 400. |
| **Type** | Network |
| **Priority** | P2 |
| **Defect** | **DEF-4** — intermittent 500 under concurrent fan-out. |
| **Steps** | Same as AZ-6. |
| **Expected result** | No per-program request has status ≥ 400. |
| **Automation** | *Every request the report makes succeeds* — `@bug` |
| **Status** | Known fail (`@bug`) |

### AZ-7 — Changing the grouping regroups the chart

| Field | Detail |
|-------|--------|
| **Objective** | Selecting Category regroups the x-axis away from Domain. |
| **Type** | UI + API |
| **Priority** | P2 |
| **Defect** | **DEF-1** — select label changes; chart stays on Domain. |
| **Steps** | 1. Open Analyze Data. 2. Snapshot domain categories. 3. Group by Category. |
| **Expected result** | Chart categories cover distinct program `category` values and differ from the domain snapshot. |
| **Automation** | *Changing the grouping regroups the chart* — `@bug` |
| **Status** | Known fail (`@bug`) |

### AZ-7b — The grouping select offers domain, category and area

| Field | Detail |
|-------|--------|
| **Objective** | The grouping control at least exposes the three options. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Open Analyze Data. 2. Open grouping select. |
| **Expected result** | Options **Domain**, **Category**, and **Area** are visible. |
| **Automation** | *The grouping select offers domain, category and area* |
| **Status** | Pass |

### AZ-8a … AZ-8c — Mode tabs switch the report view

| Field | Detail |
|-------|--------|
| **Objective** | Mode tabs are exclusive; the matching panel is shown and the others are absent. |
| **Type** | UI |
| **Priority** | P2 |
| **Test data** | **custom** → custom panel; **bulk** → bulk panel; **mastered** → mastered panel. |
| **Steps** | 1. Open Analyze Data. 2. Click the mode. |
| **Expected result** | Only that mode is `aria-pressed`. Named panel visible; other two report panels have count 0. |
| **Automation** | Outline *Mode tabs switch the report view* |
| **Status** | Pass (3 cases) |

### AZ-9 — Custom Graph offers every program as a comparison series

| Field | Detail |
|-------|--------|
| **Objective** | “N available in this scope” equals the programs API item count. |
| **Type** | UI + API |
| **Priority** | P2 |
| **Steps** | 1. Open Analyze Data. 2. Switch to custom mode. 3. Compare series count with live programs list. |
| **Expected result** | Series count = program count. |
| **Automation** | *Custom Graph offers every program as a comparison series* |
| **Status** | Pass |

### AZ-10 — Bulk Graph offers every program as a comparison series

| Field | Detail |
|-------|--------|
| **Objective** | Bulk Graph's “N available in this scope” reconciles with the programs API. |
| **Type** | UI + API |
| **Priority** | P2 |
| **Steps** | 1. Open Analyze Data. 2. Switch to bulk mode. 3. Compare series count with the live programs list. |
| **Expected result** | Series count = program count. |
| **Automation** | *Bulk Graph offers every program as a comparison series* |
| **Status** | Pass |

### AZ-11 — Print requests the browser print dialog

| Field | Detail |
|-------|--------|
| **Objective** | The Print control asks the browser to print the current report. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Open Analyze Data. 2. Stub `window.print`. 3. Click `analyze-print`. |
| **Expected result** | `window.print` is invoked. |
| **Automation** | *Print requests a browser print of the current report* |
| **Status** | Pass |

### AZ-12 — Summary tiles stay `--` while targets are in flight

| Field | Detail |
|-------|--------|
| **Objective** | In-scope does not show a number before targets resolve. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Hold targets XHRs. 2. Open Analyze Data. 3. Assert `--`. 4. Release. 5. Tiles are numbers. |
| **Expected result** | Loading shows `--`; after release, tiles are non-negative numbers. |
| **Automation** | *Summary tiles stay unresolved while targets are in flight* |
| **Status** | Pass |

### AZ-13 — Empty programs zero the report

| Field | Detail |
|-------|--------|
| **Objective** | No programs → tiles 0 and `mastered-report-empty`. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Stub programs as `{ items: [] }`. 2. Open Analyze Data. |
| **Expected result** | Mastered, in-scope, remaining are 0. Empty-report sentinel is visible. |
| **Automation** | *A client with no programs shows a zeroed empty report* |
| **Status** | Pass |

### AZ-14 — Report scope select is present

| Field | Detail |
|-------|--------|
| **Objective** | `report-scope-select` is on the page. Option values are not contracted (AN-3). |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Open Analyze Data. 2. Assert the scope select is visible. |
| **Expected result** | Scope select is displayed. |
| **Automation** | *The report scope select is present* |
| **Status** | Pass (partial — values not asserted) |

---

## 5. Behavior Support

**Feature:** `features/behavior-support/behavior-support.feature`  
**Tags:** `@behavior-support`

### BS-1 — The page renders its plan rail and novel behaviors panel

| Field | Detail |
|-------|--------|
| **Objective** | Chrome that is true whether or not `behaviorplans` is healthy. |
| **Type** | UI |
| **Priority** | P1 |
| **Steps** | 1. Open `/clients/{id}/behavior-support`. 2. Wait until the app stops retrying `behaviorplans`. |
| **Expected result** | Plan rail visible. Current and Inactive tabs match `Current (n)` / `Inactive (n)`. Novel behaviors panel shows a numeric count. |
| **Automation** | *The page renders its plan rail and novel behaviors panel* |
| **Status** | Pass |

### BS-2 — Behavior plans returns the client's plans

| Field | Detail |
|-------|--------|
| **Objective** | Observations `behaviorplans` should succeed for the resolved client. |
| **Type** | API |
| **Priority** | P1 |
| **Defect** | **DEF-2** — HTTP 500 for all clients. |
| **Steps** | 1. GET `/observations/v1/client/{id}/behaviorplans`. |
| **Expected result** | HTTP 200. |
| **Automation** | *Behavior plans returns the client's plans* — `@bug` |
| **Status** | Known fail (`@bug`) |

### BS-3 — The page does not claim there are no plans while data is unavailable

| Field | Detail |
|-------|--------|
| **Objective** | Empty-state copy and unavailable notice must not both be shown (DEF-5). |
| **Type** | UI |
| **Priority** | P1 |
| **Defect** | **DEF-5** — both messages visible after the retry fails. |
| **Steps** | 1. Open Behavior Support and wait until `behaviorplans` traffic goes quiet. 2. Check visibility of empty rail message and unavailable notice. |
| **Expected result** | Not both visible. |
| **Automation** | *The page does not claim there are no plans while data is unavailable* — `@bug` |
| **Status** | Known fail (`@bug`) |

---

## 6. Negative and error cases

**Feature:** `features/negative/negative.feature`  
**Tags:** `@negative`

### NEG-1 — An API call without a token is rejected

| Field | Detail |
|-------|--------|
| **Objective** | Unauthenticated clients list is rejected. |
| **Type** | API |
| **Priority** | P1 |
| **Preconditions** | No `Authorization` header. |
| **Steps** | 1. GET `/clinical/v1/clients`. |
| **Expected result** | HTTP 401. |
| **Automation** | *An API call without a token is rejected* |
| **Status** | Pass |

### NEG-2 — An API call with a malformed token is rejected

| Field | Detail |
|-------|--------|
| **Objective** | Garbage bearer token is rejected. |
| **Type** | API |
| **Priority** | P2 |
| **Test data** | `Authorization: Bearer not-a-real-token` |
| **Steps** | 1. GET `/clinical/v1/clients`. |
| **Expected result** | HTTP 401. |
| **Automation** | *An API call with a malformed token is rejected* |
| **Status** | Pass |

### NEG-5 — An unknown client id returns an empty list rather than an error

| Field | Detail |
|-------|--------|
| **Objective** | Document current API behaviour for a non-existent client (not 404). |
| **Type** | API |
| **Priority** | P2 |
| **Test data** | `max(existing client ids) + 1` |
| **Steps** | 1. Derive a missing id. 2. GET that client’s programs. |
| **Expected result** | HTTP 200. `items` is empty. |
| **Automation** | *An unknown client id returns an empty list rather than an error* |
| **Status** | Pass |

### NEG-6 — Invalid credentials are rejected by the login endpoint

| Field | Detail |
|-------|--------|
| **Objective** | Exercise `/login` safely without storing or requiring a real username/password. |
| **Type** | API |
| **Priority** | P2 |
| **Test data** | Unique `.invalid` username and deliberately invalid password; runtime application key. |
| **Steps** | 1. Read runtime config. 2. POST invalid credentials to `/login`. |
| **Expected result** | HTTP 401; no session is created. |
| **Automation** | *Invalid credentials are rejected by the login endpoint* |
| **Status** | Pass |

### NEG-7 — Target creation rejects an unknown client

| Field | Detail |
|-------|--------|
| **Objective** | Exercise the target POST route without mutating a real client. |
| **Type** | API |
| **Priority** | P2 |
| **Test data** | Derived missing client id, placeholder program id, `ZZZ-SUITE-NON-MUTATING-ENDPOINT-PROBE`. |
| **Steps** | 1. Derive a missing client id. 2. POST a target beneath that client. |
| **Expected result** | HTTP 4xx; no resource is created. |
| **Automation** | *Target creation rejects an unknown client without writing data* |
| **Status** | Pass |

### NEG-8 — Target deletion rejects an unknown client

| Field | Detail |
|-------|--------|
| **Objective** | Exercise the target DELETE route without deleting real data. |
| **Type** | API |
| **Priority** | P2 |
| **Test data** | Derived missing client id with placeholder program and target ids. |
| **Steps** | 1. Derive a missing client id. 2. DELETE a target beneath that client. |
| **Expected result** | HTTP 4xx; no resource is deleted. |
| **Automation** | *Target deletion rejects an unknown client without deleting data* |
| **Status** | Pass |

### NEG-3 — An unknown client id in the URL falls back to the clients list

| Field | Detail |
|-------|--------|
| **Objective** | Deep link to a non-existent client does not crash or blank the shell. |
| **Type** | UI |
| **Priority** | P2 |
| **Test data** | Same derived missing id as NEG-5. |
| **Steps** | 1. Navigate to `/clients/{missingId}`. |
| **Expected result** | Clients list page is shown. URL settles on `/clients`. |
| **Automation** | *An unknown client id in the URL falls back to the clients list* |
| **Status** | Pass |

### NEG-4 — An unknown route falls back to the clients list

| Field | Detail |
|-------|--------|
| **Objective** | Unknown path is handled without a blank app (product has no dedicated 404 page). |
| **Type** | UI |
| **Priority** | P2 |
| **Test data** | `/no-such-route-xyz` |
| **Steps** | 1. Open that path while authenticated. |
| **Expected result** | Clients list is shown. URL is `/clients`. |
| **Automation** | *An unknown route falls back to the clients list* |
| **Status** | Pass |

### NEG-9 — Clients list loading state

| Field | Detail |
|-------|--------|
| **Objective** | The list shows `clients-list-loading` while the clients XHR is in flight. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Hold the clients API. 2. Open `/clients`. 3. Assert loading. 4. Release. 5. List matches API. |
| **Expected result** | Loading sentinel visible until the XHR completes; then rows match the live API. |
| **Automation** | *The clients list shows a loading state while the API is in flight* |
| **Status** | Pass |
| **Fails when** | Rows appear with no loading sentinel, or the list never recovers. |

### NEG-10 — Clients list error state on 503

| Field | Detail |
|-------|--------|
| **Objective** | A 503 clients response shows `clients-list-error` and no rows; retry recovers. |
| **Type** | UI |
| **Priority** | P1 |
| **Steps** | 1. Stub clients as 503. 2. Open `/clients`. 3. Assert error + retry + zero rows. 4. Unstub. 5. Click retry. |
| **Expected result** | Error state, no client links. After retry, list matches the live API. |
| **Automation** | *A failed clients list shows an error instead of rows* |
| **Status** | Pass |
| **Fails when** | A failed load still shows stale/empty-as-success rows, or retry does nothing. |

### NEG-11 — Empty program rail

| Field | Detail |
|-------|--------|
| **Objective** | A successful empty programs envelope shows `program-rail-empty`. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Stub programs as `{ items: [] }`. 2. Open the resolved client workspace. |
| **Expected result** | Empty-rail sentinel visible; no `program-rail-item-*` nodes. |
| **Automation** | *A client with no programs shows an empty program rail* |
| **Status** | Pass |
| **Fails when** | An empty caseload is rendered as leftover programs or a blank shell. |

---

## 7. Write flows (Phase 2b)

**Feature:** `features/write/write.feature`  
**Tags:** `@write` — requires `TEST_CLIENT_ID`. Not in `npm test`. `npm run test:write`.

### WR-1 — Creating a target via the API lists it

| Field | Detail |
|-------|--------|
| **Objective** | `POST .../targets` with `{ description }` creates a row the GET list includes. |
| **Type** | API |
| **Priority** | P1 |
| **Preconditions** | `TEST_CLIENT_ID` dedicated client with a program that has targets. |
| **Test data** | Description `ZZZ-SUITE-{timestamp}-target`. Deleted in After (`If-Match: *`). |
| **Steps** | 1. POST the description. 2. GET targets for that program. |
| **Expected result** | HTTP 201. GET items include that description. |
| **Automation** | *Creating a target via the API lists it for the dedicated client* |
| **Status** | Pass (when `TEST_CLIENT_ID` is set) |

### WR-2 — Clicking add-target does not create a target without a form

| Field | Detail |
|-------|--------|
| **Objective** | The stub add-target click must not silently POST. |
| **Type** | UI |
| **Priority** | P1 |
| **Steps** | 1. Open dedicated workspace and program. 2. Note target count. 3. Click add-target. |
| **Expected result** | No dialog. Target count unchanged. |
| **Automation** | *Clicking add-target does not create a target without a form* |
| **Status** | Pass (when `TEST_CLIENT_ID` is set) |

### WR-2b — Add target opens a form

| Field | Detail |
|-------|--------|
| **Objective** | Add-target should open a create form. |
| **Type** | UI |
| **Priority** | P1 |
| **Defect** | **DEF-6** — click is a no-op. |
| **Automation** | *Add target opens a form for a new target* — `@bug` |
| **Status** | Known fail (`@bug`) |

### WR-3 / WR-4 / WR-5 — Record data and mastery confirm/dismiss

| Field | Detail |
|-------|--------|
| **Status** | `@wip` — no session POST captured; cannot create flagged evaluations without recording. |

### WR-6 — Saving a report lists it in the same session

| Field | Detail |
|-------|--------|
| **Objective** | Named save on this device appears in saved-report controls in this context. |
| **Type** | UI |
| **Priority** | P2 |
| **Steps** | 1. Open Analyze Data. 2. Save report as `ZZZ-SUITE-{timestamp}-report`. |
| **Expected result** | That name is visible. Empty-state is gone. |
| **Automation** | *Saving a report on this device lists it in the same session* |
| **Status** | Pass (when `TEST_CLIENT_ID` is set) |

---

## Out of scope (not in this catalog)

- Nav areas never crawled: Staff, Supervision, Settings, Training, Reporting, Template, Schedule, Notifications, Billing.
- CI pipeline (decision D5).
- WR-3–WR-5 until session/mastery write APIs are reconned.
