# AI-Q Specification — The Discernment Dimensions

*Version 0.2. The normative definition of the six Discernment dimensions — D1 of
[AI-Q](aiq.md), and the spine of the score.*

A **judgment review** scores a human's relationship to a specific piece of AI-assisted
work. It scores the *human*, not the artifact. This document defines the six dimensions
of **Discernment** — can you tell when the AI is wrong, lazy, or hallucinating? — with
their 1–5 anchors and roll-up. How Discernment combines with Delegation and Design into
the AI-Q composite is defined in [`aiq.md`](aiq.md).

## Core dimensions (required)

A conforming Discernment sub-score MUST include these six dimensions, each scored 1–5.
**Score each dimension independently against its anchors below — not a holistic gestalt.**
Every level (1–5) is anchored so a 4 means the same thing across reviewers and models.

### 1. Understanding
Can the person explain the work and its mechanism in their own words?
- **5** explains it cold, including *why* it works, and the step that's hardest to explain.
- **4** explains the mechanism soundly; one or two minor parts are fuzzy.
- **3** gets the gist; fuzzy on the mechanism.
- **2** can paraphrase what it does but not why; key parts are a black box.
- **1** cannot explain it beyond restating it.

### 2. Verification
Do they verify important claims, and know what they took on faith?
- **5** checked the load-bearing claims; can state exactly what is unverified.
- **4** verified the important things; minor gaps they can name.
- **3** spot-checked some things.
- **2** checked something incidental; the load-bearing claim went unchecked.
- **1** verified nothing; took the output on faith.

### 3. Assumption awareness
Can they surface what must be true — especially the load-bearing assumption?
- **5** named the load-bearing assumption unprompted.
- **4** named the load-bearing assumption with a small nudge.
- **3** named only obvious assumptions.
- **2** named one assumption but missed the one that matters.
- **1** saw no assumptions.

### 4. Risk recognition
Can they name specific, plausible failure modes (not generic caveats)?
- **5** named specific, plausible ways it breaks, with rough likelihood/impact.
- **4** named real, specific failure modes; light on likelihood.
- **3** gave generic caveats.
- **2** named one vague risk; missed the obvious specific one.
- **1** saw no risks.

### 5. Confidence calibration
Does stated confidence match demonstrated grasp?
- **5** confidence tracks grasp precisely.
- **4** confidence is close, off by a little in one direction.
- **3** noticeably over- or under-confident.
- **2** confidence clearly out of step with what they showed.
- **1** confidence is decoupled from reality (blind certainty or total loss).

### 6. Accountability
Can they own and defend the decision rather than deferring to the tool?
- **5** fully owns it; defends it on the merits.
- **4** owns it; defends most of it on the merits.
- **3** owns the outcome but leans on "the AI suggested it."
- **2** hedges ownership; defers to the tool when pressed.
- **1** disclaims responsibility ("the AI generated it").

## Extended dimensions (optional)

Implementations MAY add these. If present, they are reported separately and do NOT change
the core composite unless a profile explicitly opts in.

- **Counterargument** — can they steelman the strongest opposing case?
- **Curiosity** — did they explore alternatives before committing?

## Scoring

```
discernment = round( (sum of the six core dimension scores) / 30 * 100 )
```

Range 0–100. This is the **Discernment sub-score**. When no other D is assessed, it *is*
the AI-Q composite; bands and the full composite rule live in [`aiq.md`](aiq.md).

Implementations SHOULD lead with the **band**, not the number — it is more honest and
more actionable than a false-precision integer.

## Risk levels & friction

Each review declares a risk level that scales interview depth:

| Risk | Examples | Interview depth |
|---|---|---|
| `low` | ideation, personal/throwaway | 3 questions |
| `medium` | internal docs, presentations, published work | 5 questions |
| `high` | client-facing, medical/financial/legal, irreversible, code deployment | 7 questions |

## Review modes

- `after` — review finished AI-assisted work (default; preserves productivity).
- `during` — think-first; the human commits reasoning *before* leaning on AI (opt-in,
  recommended for `high` risk and learning contexts).

## Conformance

Discernment conformance (part of the [AI-Q conformance rules](aiq.md#conformance)):
1. scores all six core dimensions 1–5 against a published rubric,
2. computes the sub-score as defined above (deterministic code, never model arithmetic),
3. emits output validating against [`score.schema.json`](score.schema.json), and
4. makes the rubric used available to the reviewed human (auditability).
