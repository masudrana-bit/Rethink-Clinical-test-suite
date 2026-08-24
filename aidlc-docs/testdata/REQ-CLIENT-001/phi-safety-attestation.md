# PHI Safety Attestation — REQ-CLIENT-001

**Stage:** S5
**Gate this feeds:** G4
**Scope:** `TC-CLIENT-001`, `TC-CLIENT-002`
**Basis:** `clinical-rules.md` §6; requirement §15

---

## 1. Attestation

No real patient information appears in the test cases, the BDD feature file, the analysis or design artifacts, or this plan.

The scope is narrow enough to make this verifiable rather than merely asserted. Both tests exercise navigation and selector identity. Neither reads, writes, or displays clinical content, so the only patient-adjacent data involved is the client display name.

---

## 2. Field classes

Each class listed in `clinical-rules.md` §6 and requirement §15, with its status.

| Field class | Present? | Note |
|---|---|---|
| Patient names | Synthetic only | Client display name, required by `TC-CLIENT-002` to distinguish two fixtures |
| Identifiers | Synthetic only | Client identifier, shape only; no value defined |
| Medical record numbers | No | Not involved |
| Addresses | No | Not involved |
| Phone numbers | No | Not involved |
| Email addresses | No | Test account credential only, synthetic, referenced through the secret mechanism |
| Dates of birth | No | Not involved |
| Clinical notes | No | Not involved |
| Other PHI | No | No clinical content is read or written |

---

## 3. Screenshot-observed values are excluded

Requirement §15 records example values visible in the supplied application screenshots, including `Ava Martinez`, `Requesting a Break`, and `Task Refusal`.

**Updated 2026-08-24 following live reconnaissance.** `Ava Martinez` appears in the current client list on the dev environment, on a screen where the application displays this banner:

> The backend did not return clients for this screen, so example data is shown instead. These are not real clinical records.

The provenance question is therefore answered for that value: it is the application's own example data, self-declared as non-clinical.

The exclusion stands, for a reason that has changed. It is no longer a privacy concern — it is a stability one. These names are fallback content that appears only while the backend is unresponsive, so a fixture built on them breaks when the environment starts working. No value from the screenshots or from the live environment is hardcoded anywhere in the test cases; both read client names at runtime.

One caveat that this attestation cannot discharge. The root route displayed a different banner reading "Showing real data", so the same application *can* serve real records. Whether the clients screen would show real patient names once the backend responds is unknown, and it is the reason §4 below exists.

---

## 4. Residual risk

**The environment can serve real data, and the suite would not currently notice.**

The application's banner has three states. On `/clients` it currently reads `demo-banner-substituted` — example data, no real records. On the root route it read `demo-banner-preview` — "Showing real data". So real records are reachable in this environment when the backend responds.

The tests do not hardcode or store any client name, so nothing enters the repository either way. But two exposures remain and neither is closed by this attestation.

**Failure evidence.** `playwright.config.ts` retains traces, video, and screenshots on failure, per `clinical-rules.md` §36. If a test fails while the backend is serving real data, that evidence bundle will contain real patient names. Evidence is written to `test-results/`, which is git-ignored, so it stays out of the repository — but it will exist on disk and in any CI artifact store.

**Console and report output.** The same applies to anything a reporter captures.

The data mode decision in the test data plan §5 is the control for this. Option 2, recording the mode as execution evidence, makes it visible after the fact. Only option 1, requiring `preview`, would make it deliberate.

This attestation covers the specification and the test design. It does not and cannot attest to what the backend returns.

---

## 5. Sign-off

```text
[X] Specification confirmed free of real and realistic-but-unverified PHI  — AI assessment
[  ] Provisioned fixture values confirmed synthetic                        — pending, see §4
[  ] Human sign-off

Approver:
Role:
Date:
```
