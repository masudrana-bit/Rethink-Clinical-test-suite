# Defects and data anomalies

Findings from building the suite against `dev2`. Each entry says what we observed, how
it was verified, and what the suite does about it.

Scenarios tagged `@bug` assert the **correct** behaviour and are excluded from the
default run (`npm test`). Run them with `npx cucumber-js -p bugs`; they should start
passing once the defect is fixed, at which point the tag comes off.

Formal bug reports for those cases: [`bug-report.md`](./bug-report.md) · PDF: [`bug-report.pdf`](./bug-report.pdf).

---

## DEF-1 — The chart grouping select does not regroup the chart

**Severity:** medium — the control looks functional and silently does nothing.

Selecting `Category` or `Area` in `mastered-grouping-select` on Analyze Data updates the
select's own label, but the chart is unchanged: the x axis keeps the same domain
categories, and Highcharts' own accessible description still reads *"The chart has 1 X
axis displaying Domain"*.

Verified twice — once by hand in a browser, once from the harness
(`scripts/probe-grouping.ts`, since removed) — so it is not a test timing artefact.
Before and after selecting `Category`, the axis read the identical 13 domain values.

**Covered by:** `Changing the grouping regroups the chart` (`@bug`).
A companion non-`@bug` scenario asserts the select at least offers all three options,
so the control's presence stays under test meanwhile.

## DEF-4 — `automastery-evaluations` intermittently returns 500 under the report's load

**Severity:** medium — intermittent, and it silently degrades the report.

Opening Analyze Data fans out to roughly **two requests per program** (a `targets` call and
an `automastery-evaluations` call each), so on client `892745` a single page load fires about
40 XHRs at once. Under that concurrency the backend intermittently answers one of them with
500, sometimes returning a .NET exception string instead of JSON (`System.Inv…`).

Observed once in a full-suite run on `programs/256/automastery-evaluations?status=flagged`.
It does **not** reproduce sequentially: 60 consecutive requests across all 20 programs
(three passes each) all returned 200. The trigger appears to be concurrency, not any
particular program.

**Covered by:** `Every request the report makes succeeds` (`@bug`). The companion non-`@bug`
scenario asserts the requests are *made*, which is stable, so the fan-out itself stays under
test. Because the defect is intermittent, this `@bug` scenario will sometimes pass — it is a
monitor, not a binary gate.

**Worth raising separately:** the N+1 fan-out is itself a design concern. One report costing
~40 round trips is both the cause of this instability and a page-load cost.

## DEF-2 — `behaviorplans` returns 500 for every client

`GET /observations/v1/client/:id/behaviorplans` returns 500 for all 24 clients. The app
requests it, retries once, then shows an unavailable notice.

**Covered by:** `Behavior plans returns the client's plans` (`@bug`).

## DEF-5 — A server error is presented as an empty state

**Severity:** high for trust — a clinician cannot tell "no plans" from "we could not load
the plans".

With `behaviorplans` failing, the Behavior Support page shows both messages at once:

> Current (0) · Inactive (0) · **This client has no behavior plans yet.**
> **Behavior support data is unavailable right now. Try again shortly.**

The zero counts and the empty-state text are drawn from a failed request. A clinician
skimming the plan rail sees a confident "no behavior plans yet" for a client who may well
have plans.

**Covered by:** `The page does not claim there are no plans while data is unavailable`
(`@bug`). The invariant holds whichever way the endpoint behaves — if it is fixed and the
client genuinely has no plans, the empty state is right and the notice should be gone — so
the scenario passes once either side is corrected.

**Testing note:** the notice appears only after the app's *retry* fails, roughly a second
after the first failure. Asserting when the first response lands sees the empty state
alone and passes vacuously, which is exactly what happened before
`BehaviorSupportPage.goto` was changed to wait until the app stops re-requesting.

## DEF-7 — A client's programs cannot be listed (blocks most of the suite)

**Severity:** critical — this is the entry point to every client-scoped surface.

`GET /clinical/v1/clients/{id}/programs` returns 500 for every client on `dev2`:

> `Npgsql.PostgresException (0x80004005): 42703: column l.legacy_id does not exist`

The deployed query references a column the `dev2` schema does not have, so this is a
deploy/migration mismatch rather than a code path that can be worked around.

**Blast radius:** the suite resolves its test client *by capability* — an active client
with at least one program that has a target — and that resolution starts with this call.
When it 500s the resolver throws before any scenario asserts anything, so Skills Programs,
Analyze Data, Behavior Support, Sessions, the accessibility checks and the whole client
workspace UI stop at their first step. In the run of 2026-09-07 this single defect
accounted for **39 of 51** failing scenarios.

**Regression window:** the same scenarios passed at 10:33 UTC on 2026-09-07 and failed at
12:04 UTC the same day, so the change landed inside that window.

**Tracked as:** gate `client-programs-500` in [`gates.json`](./gates.json). Failures matching
its signature are reported as *blocked* rather than *failed*, so the coverage figures do not
read as if 39 surfaces silently lost their tests.

## DEF-8 — The program library catalogue cannot be read

**Severity:** high — the organisation-wide template catalogue is unavailable.

`GET /clinical/v1/program-library` (and the `?includeInactive=true` variant) returns HTTP
500 with a `text/plain` body. The Program Library administration page consequently renders
its error state instead of a grid, and `Patching a standard library program is refused`
cannot find a standard/core row to prove the catalogue is read-only.

**Blast radius:** 4 scenarios in the 2026-09-07 run.

**Tracked as:** gate `program-library-500` in [`gates.json`](./gates.json).

## DEF-3 — `staff-role` returns credential fields

The `staff-role` response carries `apiKey`, `password`, `passwordQuestion` and
`passwordAnswer`. The suite strips these before the browser or the trace sees them
(`support/scrub.ts`, decision D7), guarded by `npm run verify:scrub`.

This is a mitigation in our harness, not a fix — the API still sends them.

## DEF-6 — Add-target does not open a write UI

**Severity:** high for adding targets from Skills Programs — `program-details-add-target`
is clickable but no dialog, toast, or navigation occurs.

**Record-data (updated 2026-09-02):** `program-details-record-data` now navigates to
`/sessions/new` (RBT wizard, `new-session-page`, participants step). Covered by SES-1
in the default suite. Completing the wizard is still a write and is not in `npm test`.

The targets **API** does accept `POST { description }` (201), so the remaining gap is
the add-target UI, not backend create.

**Covered by:** `Add target opens a form for a new target` (`@write @bug`). Companion
WR-2 asserts the click also does not silently POST.

---

# Data anomalies (not defects, but they shape the tests)

## AN-1 — `Targets mastered` is always 0 because no target has mastery history

The mastered tile reads 0 for every client even with the "All" date window selected,
while the targets API reports targets with `status: "mastered"` (11 of 64 on client
`892745`). The reason is that every mastered target has an **empty `statusHistory`**, so
the report has no mastery date to place in any window.

The tile is therefore consistent with its inputs; the data is what is missing. This is
why AZ-2 was revised: `mastered + remaining == in scope` cannot fail while mastered is
pinned to 0, so the real assertion is `in scope == total targets across all programs`.

## AN-2 — Test data pollution in dev2

Another automated suite writes to the same clients we test. On client `892745` we saw
`ZZZ-E2E-<epoch>` programs created at 00:27, 03:05, 07:02, 07:56 and 08:10 UTC on
2026-08-27, plus `ZZZ-AUDIT-DELETE-ME`, carrying junk domains (`Test`, `AuditDomain`,
`E2EDomain`) and a misspelled `identificaion`. These flow into Analyze Data, so the
skill-area chart plots junk categories alongside real ones.

This caused one genuine intermittent failure before the suite was changed to re-read the
API on every poll. See "Shared environment" in `coverage-matrix.md`.

## AN-5 — Analyze Data tab navigation is delayed and logs a recoverable error

Clicking `client-tab-analyze-data` from a selected program can keep the URL on
`/clients/:id/programs/:programId` for several seconds. The browser may log:

> `Cannot read properties of undefined (reading 'enabled')`

The Analyze Data page then does render. A 5-second visibility assertion looks like a
crash; waiting on `/analyze-data` and retrying the tab click once (PRG-9) matches the
real transition. Not tagged `@bug`.

## AN-4 — An unknown client id returns 200 with an empty list

`GET /clinical/v1/clients/<id that does not exist>/programs` answers **200** with an empty
envelope rather than 404. The API therefore cannot distinguish "no such client" from "a
client with no programs", and neither can a caller.

In the UI the equivalent is graceful: `/clients/<missing id>` and any unknown route both
redirect to the clients list, with no crash or blank shell.

Recorded by NEG-5 as current behaviour. **Needs a product answer** on whether 404 is
intended before we assert one.

## AN-3 — The report scope select offers grouping values

`report-scope-select` offers `Programs`, `Behaviors`, `Programs + behaviors`, `Domain`,
`Category` and `Area`. The last three look like grouping values rather than scopes, and
`Behaviors` is selectable despite the adjacent note saying behaviours are not yet
available.

Not asserted either way — **needs a product answer** before we write a test that fixes
the wrong behaviour in place.

## AN-6 — axe finds serious (not critical) issues on main pages

Live WCAG 2.A/2.AA scan (2026-09-02): **zero critical** violations on sign-in, clients
list, workspace, Analyze Data, and Behavior Support. Recurring **serious**
`color-contrast` on the authenticated shell; Analyze Data also has a serious
`definition-list`. Unit 13 / D12 gates **critical** only; these serious hits are
attached on each `@a11y` scenario as `axe-scan.json` and are not a fail.

