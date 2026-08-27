# Coverage Matrix — Rethink Clinical

> Produced in the **Inception** phase (Mob Elaboration). Every automated test must
> trace back to a row here. Review and prune with the team before Construction.

## Legend

- **Priority:** P0 (smoke, must pass on every PR) · P1 · P2
- **Type:** `@api` (contract) · `@ui` (end-to-end) · `@network` (XHR assertion)
- **Status:** ☐ not started · ◐ in progress · ☑ done

## Tag taxonomy

| Tag | Meaning |
|-----|---------|
| `@smoke` | Login + clients list + open one client. Every PR. |
| `@api` | Endpoint contract checks. |
| `@ui` | Browser end-to-end flows. |
| `@network` | Asserts the right XHRs fire on a page. |
| `@negative` | Expected error paths. |
| `@bug` | Known defect kept visible until fixed. |
| `@auth` `@clients` `@programs` `@analyze-data` `@behavior-support` | Feature areas. |

## Units of work (AIDLC bolts)

Construction proceeds one unit per bolt, in this order.

### Unit 1 — Authentication  `@auth`

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| AUTH-1 | API login returns a token and 200 | @api | P0 | ☐ |
| AUTH-2 | Refresh-token succeeds after login | @api | P1 | ☐ |
| AUTH-3 | UI login via temp-dev-login lands on /clients | @ui @smoke | P0 | ☐ |
| AUTH-4 | staff-role returns current user with a role | @api | P1 | ☐ |

### Unit 2 — Clients list  `@clients`

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| CLI-1 | Clients endpoint returns valid paged envelope | @api | P0 | ☐ |
| CLI-2 | Each client item has required fields | @api | P1 | ☐ |
| CLI-3 | Clients page renders a non-empty client list | @ui @smoke | P0 | ☐ |
| CLI-4 | Selecting a client opens its Skills Programs page | @ui | P1 | ☐ |
| CLI-5 | Clients page fires the expected XHRs | @network | P2 | ☐ |

### Unit 3 — Client programs  `@programs`

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| PRG-1 | Programs endpoint returns items for a client | @api | P1 | ☐ |
| PRG-2 | program-library returns the template catalog | @api | P2 | ☐ |
| PRG-3 | targets / objectives / mastery-criteria return 200 | @api | P1 | ☐ |

### Unit 4 — Analyze Data  `@analyze-data`

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| AZ-1 | Analyze-data page shows the three summary cards | @ui | P1 | ☐ |
| AZ-2 | mastered + remaining equals in-scope | @ui | P1 | ☐ |
| AZ-3 | "Mastered targets by skill area" chart renders | @ui | P2 | ☐ |
| AZ-4 | Pending mastery determinations list renders | @ui | P2 | ☐ |
| AZ-5 | Date-range chips are present and selectable | @ui | P2 | ☐ |
| AZ-6 | Page fires targets + automastery-evaluations XHRs | @network | P2 | ☐ |

### Unit 5 — Negative & error cases  `@negative`

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| NEG-1 | behaviorplans endpoint returns 500 (known bug) | @api @bug | P1 | ☐ |
| NEG-2 | Unauthenticated API call is rejected | @api | P1 | ☐ |
| NEG-3 | Invalid client ID handled gracefully in UI | @ui | P2 | ☐ |

## Explicitly out of scope (for now)

Staff, Supervision, Settings, Training, Reporting, Template, Schedule, Notifications,
Billing — present in the nav but not crawled. Add as new units only after Phase 1 sign-off.
