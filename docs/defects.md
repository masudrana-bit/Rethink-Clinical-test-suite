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

## DEF-3 — `staff-role` returns credential fields

The `staff-role` response carries `apiKey`, `password`, `passwordQuestion` and
`passwordAnswer`. The suite strips these before the browser or the trace sees them
(`support/scrub.ts`, decision D7), guarded by `npm run verify:scrub`.

This is a mitigation in our harness, not a fix — the API still sends them.

## DEF-6 — Add-target and record-data do not open a write UI

**Severity:** high for the write-flow program — the buttons exist (`program-details-add-target`,
`program-details-record-data`) and are clickable, but no dialog, toast, or navigation
occurs. Clinicians cannot add a target from Skills Programs. Record-data is the same
no-op; **Add Data Collection** instead leaves the clinical shell for `/sessions/new`.

The targets **API** does accept `POST { description }` (201), so the gap is the UI, not
the backend create.

**Covered by:** `Add target opens a form for a new target` (`@write @bug`). Companion
WR-2 asserts the click also does not silently POST (target count unchanged).

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
