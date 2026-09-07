# App Context — Endpoint & Flow Reference

> Steering file. Detailed context for generating grounded tests. Sourced from the
> site-crawler snapshot (75 pages, 15 unique API endpoints, 1057 API/XHR calls).

## Endpoint inventory

| # | Method | Endpoint (pattern) | Crawl status | Notes |
|---|--------|--------------------|--------------|-------|
| 1 | POST | `/mobile-security/api/v1/auth/login` | 200 | Small JSON body. Entry point. |
| 2 | POST | `/mobile-security/api/v1/auth/refresh-token` | 200 | Token refresh. |
| 3 | GET | `/accounts/v1/members/me/staff-role` | 200 | Current user + role. Sends `x-api-version=1.0`. |
| 4 | GET | `/clinical/v1/clients?page&pageSize` | 200 | Paged client list. `totalCount` observed = 24. |
| 5 | GET | `/clinical/v1/program-library` | 200 | Catalog. `source` is `standard` or `custom`. `copiedFromLessonId` is null or a core lesson id (Clinical #39). `includeInactive=true` includes retired rows. |
| 5a | PATCH | `/clinical/v1/program-library/:id` | **409** on `source: "standard"` | Clinical PR #37. Refusal is `Conflict/LibraryProgramReadOnly`, checked before If-Match. |
| 5b | POST | `/clinical/v1/program-library/:id/copy` | 201 | Clinical PR #37. Creates an undeletable custom copy. Do not call from default tests. |
| 6 | GET | `/clinical/v1/clients/:id/programs` | 200 | Programs for a client. |
| 7 | GET | `/clinical/v1/clients/:id/programs/:id/targets` | 200 | Paged targets. |
| 8 | GET | `/clinical/v1/clients/:id/programs/:id/automastery-evaluations?status` | 200 | `status=flagged` observed. |
| 9 | GET | `/clinical/v1/clients/:id/programs/:id/data-collection` | 200 | Domain shape (Clinical PR #41): `programId` string, `typeId`, `dimensions`, optional `simpleSettings`, `updatedAt`, plus the storage `method`/`prompts` view. |
| 10 | GET | `/clinical/v1/clients/:id/programs/:id/mastery-criteria` | 200 | |
| 11 | GET | `/clinical/v1/clients/:id/programs/:id/objectives` | 200 | |
| 12 | GET | `/clinical/v1/clients/:id/programs/:id/target-groups` | 200 | |
| 13 | GET | `/observations/v1/client/:id/behaviorplans` | **500** | Known defect — negative test. |
| 14 | GET | `/runtime-config.json` | 200 | Front-end config. |
| 15 | GET | `fonts.gstatic.com/...woff2` | 200 | Third-party font — ignore in tests. |
| 16 | GET | `/clinical/healthcheck` | 200 | Gateway PR 49218. Anonymous (no Bearer). Live dev2 also returns 200 without `x-application-key`; do not infer enforcement from the configured handler. |
| 17 | GET | `/clinical/healthcheck/report` | 200 | Same route policy as 16. Catch-all `{everything}` so `/report` is not rewritten under `/api`. |
| 18 | GET | `/clinical/v1/abc-options?page&pageSize` | 200 | WebApp PR #69 + Clinical #44. Account ABC library. Kinds: `context`, `antecedent`, `consequence`, `possibleFunction`. Live columns include `parentId`, `active`, `isDefault`, `functionClass`, `origin`, `referenceCount`. |
| 19 | GET | `/clinical/v1/lookup/{name}` | 200 | LookupController (no account segment). Bare `{value, label}` arrays. Names: behavior-categories, method-types, consecutive-unit-types, record-results, phase-change-types, curriculum-types, lesson-statuses, lesson-step-statuses, track-intensity-statuses, lesson-categories, abc-option-types, data-collection-scale-types, goal-types, phase-change-data-types, strategy-types, validation-statuses. |
| 20 | GET | `/clinical/v1/data-collection-scales` | 200 | Account scale catalogs: `id`, `name`, `scaleType`, `items[]`. |
| 21 | GET | `/clinical/v1/reports/analyze-data/series?clientId=` | 200 | Graphable programs/behaviors. Envelope `items` with `id` (`{kind}:{id}`), `kind`, `label`, `graphable`, `dataType`. |
| 22 | GET | `/clinical/v1/reports/analyze-data/mastered-targets?clientId=` | 200 | `{summary, bySkillArea, provenance}`. `summary.targetsMastered + remaining == targetsInScope`. |
| 23 | GET | `/clinical/v1/reports/analyze-data/graphs?clientId=&seriesIds=` | 200 | Only for series with a supported `dataType`. Body uses `graphs[]` (not `items`) plus paging + `meta`. Unfiltered GET 400s when non-graphable series are in scope. |

## Standard response envelope

Paged list endpoints return:

```json
{ "page": 1, "pageSize": 200, "totalCount": 24, "totalPages": 1, "items": [ ... ] }
```

A client item looks like:

```json
{
  "id": 892745, "firstName": "William", "lastName": "Alderton", "middleName": "C",
  "isActive": true, "clientNumber": "STATE-23768", "dateOfBirth": "2018-04-16",
  "locationName": "Westbrook Clinic", "staffMemberNames": ["Marcus Tolliver"]
}
```

Content-Type carries an API version, e.g. `application/json; charset=utf-8; x-api-version=1`.

## UI navigation tree

```
/temp-dev-login                       auth entry
  └── /clients                        client list (24 clients)
        └── /clients/:id              Skills Programs tab
              ├── /clients/:id/behavior-support
              └── /clients/:id/analyze-data
/settings/clinical/program-library    organization Program Library catalog
/settings/clinical/abc-settings       account-level ABC option library
```

### Page: `/clients/:id/analyze-data` (richest UI target)

Rendered content proven present by the crawl:
- Tabs: "Mastered Targets", "Custom Graph", "Bulk Graphs", "Print".
- "Report controls" — date range chips: 2 weeks / 1 month / 3 months / 6 months / All.
- Summary cards: "Targets mastered" (e.g. 0), "Targets in scope" (e.g. 38), "Remaining".
  Invariant: **mastered + remaining == in scope**.
- "Mastered targets by skill area" bar chart, X axis = Domain, Y axis = Targets.
- "Pending mastery determinations" grouped by program (e.g. "Washing Hands",
  "Meal Cleanup Routine", "Toileting - Simple") with Dismiss / Confirm mastery actions.

### XHRs fired on analyze-data load (for network-assertion tests)

`runtime-config.json`, `staff-role`, `clients?page=1&pageSize=200`, `program-library`,
`clients/:id/programs`, then per-program `targets` and `automastery-evaluations?status=flagged`.

## Auth flow

On `/temp-dev-login`: `GET runtime-config.json` → `POST auth/login` → `POST auth/refresh-token`
→ `GET staff-role` → `GET clients?page=1&pageSize=200`. Tests should either replay the API
login to obtain a token, or drive the temp-dev-login UI for one smoke path.

The app response's CSP `connect-src` must include the origins published as `apiBaseUrl` and
`authApiBaseUrl` by `runtime-config.json`. WebApp PR #68 adds retry/self-heal behavior, but the
external invariant is simply that both configured backends remain reachable from the browser.
