# Evidence Bundle — run-2026-08-24T1204Z

**Requirement:** REQ-CLIENT-001
**Stage:** S9 — Execution, Evidence & Classification
**Run start:** 2026-08-24T12:04:29.892Z
**Result:** 3 passed, 0 failed, 0 flaky, 0 skipped

This is the first execution made **after** G6 sign-off, and therefore the first that counts as evidence rather than as a working note.

---

## Contents

| File | What it is |
|---|---|
| `results.json` | Machine-readable result: per-scenario status, tags, durations, annotations |
| `traces/TC-CLIENT-001.trace.zip` | Full Playwright trace — screenshots, DOM snapshots, network, console |
| `traces/TC-CLIENT-002.trace.zip` | As above |
| `traces/setup-authenticate.trace.zip` | The sign-in that produced the shared session |

Open a trace with:

```bash
npx playwright show-trace aidlc-docs/evidence/run-2026-08-24T1204Z/traces/TC-CLIENT-002.trace.zip
```

Traces were captured with `--trace on`. The committed configuration retains traces only on failure, which is right for routine runs and wrong for an evidence run — a passing run would otherwise produce nothing to look at. No configuration file was modified to achieve this; the override is a command-line flag.

No video is included. A trace already carries screenshots and DOM snapshots at every step, so video would add size without adding evidence.

---

## §36 evidence set

`clinical-rules.md` §36, item by item.

| Required | Value |
|---|---|
| Test ID | `TC-CLIENT-001`, `TC-CLIENT-002` |
| Requirement ID | `REQ-CLIENT-001` (AC-001, AC-002) |
| Environment | `https://clinical.dev.rethinkbhtech.com/` — dev |
| Test data reference | None seeded. Clients read from the application at runtime; see the data mode note below |
| User / role | The `/temp-dev-login` dev user. Account menu displays "DataProp1 DataProp1", role "Role 4." — placeholder values, not a configured clinical role |
| Execution result | Both scenarios `PASSED`, first attempt |
| Screenshot | In the traces, at every step |
| Trace / video | Traces included; video deliberately omitted |
| API evidence | Not applicable — neither scenario calls an API. Network activity is in the traces |
| Failure details | None. No failures to detail |

---

## Data mode — read this before trusting the result

Both scenarios recorded:

```text
data-mode: substituted — backend did not respond, example data shown
```

**The backend did not serve clients during this run.** The four clients on screen are the application's fallback example data, which it labels "not real clinical records".

So this run demonstrates that client selection works in the user interface. It does **not** demonstrate that the backend returns clients, nor that selection works against real records. Gate G4 chose to tolerate any data mode and record it rather than fail on it, which is why this is a recorded caveat and not a failed run — but the caveat is the point of recording it.

## PHI statement

**No real PHI in this bundle.**

The traces contain the client names and identifiers visible during the run. Those are the application's substituted example data, on a screen the application itself declares contains no real clinical records. The data mode annotation above is the evidence for that claim, captured programmatically during the run rather than asserted afterwards.

### Constraint on future bundles

This bundle is committable **because** the run was in `substituted` mode. A run in `preview` mode renders real backend data, and its traces would contain real client records — committing those to the repository would breach `clinical-rules.md` §36.

Before committing any future evidence bundle, check the `data-mode` annotation in `results.json`. If it is `preview` or `mixed`, the traces must not be committed; record the result and retain the artifacts outside version control.
