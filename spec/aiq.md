# AI-Q Specification — AI-Q and the Three Ds

*Version 0.2. The normative definition of AI-Q, the score Hone computes.*

**AI-Q** is a 0–100 measure of a human's judgment over AI-assisted work. It answers one
question: *how good is this person at working **with** AI — at briefing it, catching its
mistakes, and redesigning their work around it?*

Every AI eval scores the model. AI-Q scores the human — across the **three Ds**:

| | D | The judgment is about… | The question | Assessed from |
|---|---|---|---|---|
| **D1** | **Discernment** | the AI's **output** | Can you tell when the AI is wrong, lazy, or hallucinating? | One artifact + an interview — **always assessable** |
| **D2** | **Delegation** | your **input** to the AI | Did you brief it with the context it needed, pick the right task to hand it, and steer it when it drifted? | The brief and iteration history — **assessable when the interview probes them** |
| **D3** | **Design** | your **system** of work | Have you re-architected how you work so AI does what it's good at and you do what only you can? | Patterns **across many reviews** — never from one artifact |

The asymmetry is structural, not accidental: Hone natively sees the output, can recover
the input by asking, and cannot see the system from one sample. The scoring rules below
encode exactly that — **a dimension that wasn't observed is reported as not assessed,
never guessed and never zero.**

## D1 — Discernment

The six core judgment dimensions, defined normatively (with 1–5 anchors) in
[`judgment-dimensions.md`](judgment-dimensions.md): **Understanding, Verification,
Assumption Awareness, Risk Recognition, Confidence Calibration, Accountability.**

```
discernment = round( (sum of the six dimension scores) / 30 * 100 )
```

Discernment is weighted first because the other two Ds compound errors faster without it:
a strong delegator with weak discernment ships confident work they cannot defend — the
exact failure mode AI-Q exists to catch.

## D2 — Delegation

Three facets, each scored 1–5 against evidence from the interview:

### briefQuality
Did they give the AI what the task actually needed — context, constraints, success criteria?
- **5** the brief carried the load: context, constraints, and what "good" looks like, stated up front.
- **3** a reasonable ask, but the AI had to guess at audience, constraints, or criteria.
- **1** a bare instruction; everything important was left for the AI to assume.

### taskSelection
Was this the right thing to hand to AI — and did they know what to keep for themselves?
- **5** can articulate why this task suited AI and which part they deliberately kept human.
- **3** delegated by habit; can justify it when pushed.
- **1** no judgment applied — delegated because it was there, including the part that needed them.

### iterationControl
Did they steer — catch drift between the first output and the final one?
- **5** caught specific problems in early output and corrected them with sharper instructions.
- **3** some back-and-forth, mostly cosmetic.
- **1** accepted the first answer as final, unexamined.

```
delegation = round( (sum of the three facet scores) / 15 * 100 )
```

**Evidence gate (normative):** Delegation MUST NOT be scored unless the interview (or the
work itself) surfaced the brief, the delegation decision, or the iteration history. With no
evidence, delegation is **not assessed** — reported as such and excluded from the composite
by renormalization. An implementation MUST NOT substitute zero or a default.

Interview sources (adapt to the specific work, per the interview rules):
- *"What did you give the AI to work with — and what did you deliberately leave out?"*
- *"Between its first answer and what you have now, what did you have to correct?"*
- *"Why was this the right thing to hand to AI — and which part did you keep for yourself?"*

## D3 — Design

Workflow design is a property of **how someone works across tasks over time** — domain
breadth, what they choose to delegate, whether their discernment holds as they delegate
more. One artifact cannot show it, and self-report from one review is weak evidence.
Therefore:

- **Per review:** Design is never numerically scored. A review MAY close with one
  reflective design question (e.g. *"If you did ten of these, what would you automate and
  what stays human?"*) — coaching, not measurement.
- **Longitudinally:** an implementation with access to a review history (e.g. the local
  profile) SHOULD report **qualitative design indicators**: distinct domains reviewed,
  the share of reviews where delegation was assessed and its trend, and whether discernment
  holds stable as delegation scores rise.
- **Numerically:** a Design sub-score requires longitudinal baselines that single-machine
  history cannot yet normalize. It is reserved for aggregate implementations
  (see [`roadmap.md`](roadmap.md)) and MUST NOT be reported as a number until then.

## The AI-Q composite

Reference weights, applied over the **assessed** Ds only:

```
weights:  discernment 0.6 · delegation 0.3 · design 0.1

aiq = round( Σ (weight_d × subscore_d) / Σ weight_d )   over assessed Ds
```

Consequences (normative):

1. **Six dimensions only** (no delegation evidence): `aiq = discernment`. Every score
   computed under spec v0.1 is therefore a valid AI-Q — full backward compatibility.
2. **Discernment + delegation** (the common full review): `aiq = round(⅔·discernment + ⅓·delegation)`.
3. **Delegation only** (a think-first session that assessed the brief): `aiq = delegation`,
   and the result MUST be labeled a delegation-only read, not a full AI-Q.
4. Design currently never contributes numerically (rule above), so its weight always
   renormalizes away. The weight is reserved so aggregate implementations don't redefine
   the composite.

Sub-scores MUST be reported alongside the composite. A composite without its sub-scores
hides exactly the information AI-Q exists to surface.

### Bands

Unchanged from v0.1, applied to the AI-Q composite:

| Band | Range | Meaning |
|---|---|---|
| **Owns it** | 80–100 | Could defend this in front of anyone. |
| **Mostly owns it** | 55–79 | Solid grasp; specific gaps to close. |
| **Riding the AI** | 30–54 | Productive but exposed; verify before shipping. |
| **Black box** | 0–29 | Shipped something not yet understood. |

Implementations SHOULD lead with the band, not the number.

## Mode foregrounding

The review mode determines which D leads — it never changes the definitions:

- **`after` (review):** Discernment leads. At medium/high risk, ONE interview question
  SHOULD be a delegation probe (within the existing question count, not in addition to it),
  which is what makes D2 assessable. Skip the probe when the context question cap is
  binding (e.g. kid: 3 questions) and discernment needs them all.
- **`during` (think-first):** Delegation leads — the session *is* delegation coaching
  (sharpening the brief before the AI sees it). No discernment score exists yet. An
  implementation MAY offer a light delegation read of the brief **as first given** (their
  unaided delegation), recorded as delegation-only with the user's consent.

## Conformance

An implementation is **conformant to AI-Q v0.2** if it:
1. scores Discernment per [`judgment-dimensions.md`](judgment-dimensions.md) (all six, 1–5, published rubric),
2. scores Delegation only behind the evidence gate, using the three facets above,
3. never reports a numeric per-review Design score,
4. computes the composite by renormalized weights as defined here, with deterministic code
   — never model arithmetic,
5. reports unassessed Ds explicitly as not assessed, and
6. emits output validating against [`score.schema.json`](score.schema.json).

*The composite was called the **Judgment Score** in spec v0.1. AI-Q is the same number
when only discernment is assessed; v0.1 scores need no migration.*
