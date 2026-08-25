# Briefing for the Clinical SME

**Date:** 2026-08-25
**From:** Masud Rana, Sr. QA Automation Engineer
**Asks:** two decisions and one confirmation
**Reading time:** about ten minutes. No access to the codebase is needed.

---

## Why you are being asked

We are building automated end-to-end tests for the Clinical application. Two questions have come up that are clinical judgements rather than engineering ones, and the process rules forbid us from guessing at them. Both requirements currently in progress are stopped until they are answered.

One point of honesty before the questions. `clinical-rules.md` §5 lists the authorities who may review clinical behaviour, and **QA lead is among them** — so routing these to you is stricter than the rules require, not a procedural necessity. We did it because the first question is about the severity of exposing one client's data to a clinician looking at another, and that judgement felt outside what a QA sign-off should absorb. If you disagree and want to hand either question back, that is a legitimate answer and we will record it as such.

---

## Question 1 — Is a wrong-client read-only view a safety defect, or a functional one?

**Tracked as GAP-010. Blocks three of five acceptance criteria on the client-selection requirement.**

### The situation

A clinician selects a client from a switcher at the top of the application. Three screens are then supposed to show information for that client: **Skills Programs**, **Behavior Support**, and **Analyze Data**. All three are read-only — the clinician is looking, not recording.

We need to write tests for those three screens, and we cannot, because we do not know how strict the test should be.

### Why the rule does not settle it

The rule everyone reaches for is `clinical-rules.md` §21. Here is its full text, because how it is summarised matters:

> **21. Patient-to-Session Association**
>
> Where applicable, tests MUST verify:
>
> ```text
> Patient
>    ↓
> Clinical Session
>    ↓
> Observations
> ```
>
> remain correctly associated.

Note what it actually covers: **Patient, Session, Observation**. Skills Programs, Behavior Support, and Analyze Data are none of those three, and none of them is a session or an observation. The rule also opens with *"Where applicable"*, which is precisely the judgement we are asking you to make.

We should flag that some of our own project documents paraphrase §21 more broadly, as *"data belonging to one subject must not appear under another."* That is a reasonable reading of its intent, but it is **not what the rule says**, and we would rather you decide against the real text than against our summary of it. If the broader reading is the correct one, that is worth stating explicitly, because it changes how the rule applies well beyond this requirement.

### What turns on your answer

| | If it is a §21 association failure | If it is a lesser context error |
|---|---|---|
| What the test must prove | That **no element** of any other client's data appears anywhere in the view | That the view is **scoped to** the selected client |
| A failure is | A clinical safety defect, highest severity, blocks release | A functional defect at normal severity |
| Test priority | Rises to P0 | Stays at P1 |

The two are not the same test. The first is an exhaustive negative check across the whole screen; the second is a positive check that the right client's identifier is shown. Writing the weaker one when the stronger is correct produces a test that passes while the defect it was meant to catch ships — which is the specific outcome we are trying to avoid by asking you rather than choosing.

### A framing that may help

The clinician is reading, not writing. No clinical record is altered by this defect. But a clinician who believes they are reading Client A's behaviour support plan while actually reading Client B's may then act on it elsewhere, and it is also a disclosure of one client's information to a clinician who may not be assigned to them.

Whether that risk belongs with association failures or with ordinary functional bugs is the question.

```text
GAP-010 — your answer

[  ] A §21 association failure. Treat as a clinical safety defect.
[  ] A lesser context error. Treat as a functional defect.
[  ] Depends on the screen — please specify which, and why:
[  ] Returning to QA under §5, which permits a QA lead to decide this.

Reasoning (this is recorded and cited in the tests):


Name:                        Role:                        Date:
```

---

## Question 2 — Ratify the expected outcome for adding a target

**Tracked as GAP-007. Blocks the entire second requirement at its first gate.**

### The situation

The second requirement covers a clinician adding a **target** to a program, for the client they have selected. We know the screen exists and we know which controls it has, because we looked. What we do not have is any approved statement of **what is supposed to happen** — and observing an application tells you what it does, not what it should do. Our rules rank observed behaviour seventh out of eight as a source, and explicitly forbid it as a source of expected results.

So we have written a candidate and are asking you to ratify, amend, or reject it. **It is not a specification and carries no authority until you sign it.**

> When an authorized user adds a target to a program belonging to the selected client and saves, the target appears in that program's Targets list for that client, and does not appear under any other client.

### Deliberately left open

No source answers these, and we have not invented answers:

1. Must a target name be unique within a program?
2. What should happen when the name is empty, or duplicates an existing target?
3. Is adding a target an audited event — that is, must it record who added it and when?

If any of these have obvious clinical answers, adding them here saves a round trip. If they need someone else, tell us who.

```text
GAP-007 — your answer

[  ] Ratified as written.
[  ] Ratified with amendments (write the corrected statement below).
[  ] Rejected — the approved requirement is held elsewhere; pointer below.

Corrected statement, or pointer to the approved source:


Answers to the three open points, if known:


Name:                        Role:                        Date:
```

---

## Question 3 — Confirmation: who signs clinical review from here?

**Tracked as GAP-011 and GAP-013. Blocks nothing today, but will keep recurring.**

For the first requirement, one person signed both the QA and the clinical lines. That is permitted by §5 and we judged it defensible because the requirement covers selecting a client and viewing read-only screens. It is recorded openly rather than left implicit.

The second requirement **writes clinical data**, so we did not carry that precedent over.

We need a standing answer: for which classes of requirement is an independent clinical signature required, and for which is a QA lead sufficient? A rough line is enough — for instance, "independent signature whenever a test creates, modifies, or deletes clinical data."

```text
GAP-011 / GAP-013 — your answer

Independent clinical sign-off is required when:


A QA lead signature is sufficient when:


Name:                        Role:                        Date:
```

---

## What is not being asked

So the scope is clear, and so you are not held responsible for things outside it:

- **Not whether the application is correct.** Our expected results come largely from screenshots of the running system, so these tests detect *change* from current behaviour. They cannot detect a defect already present in it. That limitation is recorded and is not yours to fix.
- **Not test design.** Once you answer, the assertions and scenarios are ours to write.
- **Not a schedule.** Both requirements are stopped, and stopped is the correct state until these are answered.

---

## Where each answer goes

| Your answer | Releases |
|---|---|
| GAP-010 | Three acceptance criteria on `REQ-CLIENT-001` move to test writing, and Gate G7 can close. The requirement currently finishes at 2 of 5 criteria |
| GAP-007 | Gate G0 on `REQ-CLIENT-002` opens, and the requirement can start |
| GAP-011 / GAP-013 | Removes the question from every future requirement |

Return this document with the blocks completed, or reply in any form you prefer — we will transcribe it into the requirement records and cite you as the source. The full context behind each question is in `aidlc-docs/OPEN-DECISIONS.md` if you want it, but you should not need it to answer.
