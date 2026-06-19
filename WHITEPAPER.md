# The AI Judgment Gap
### Why AI Evaluation Is Not Enough — and what an open framework for measuring human judgment looks like

*The open AI-Q standard · v0.2 · working draft. Feedback and contributions welcome.*

---

## Abstract

The AI ecosystem has built a mature stack for evaluating *models* — accuracy,
hallucination rate, toxicity, latency, cost. It has built almost nothing for evaluating
the *humans* who use those models. As AI collapses the cost of producing work, the
binding constraint shifts from producing output to **recognizing** whether output is
correct, and being able to verify, defend, and take accountability for it. We call the
distance between work a person produces and work a person actually understands the
**Judgment Gap**. This paper argues that measuring the model is insufficient, defines a
small set of **judgment metrics** for measuring the human, and proposes an open,
bring-your-own-model framework for scoring them in real workflows.

## 1. The shift: from producing to recognizing

For most of history, producing good work and understanding it were the same act. You
could not write the analysis without doing the reasoning, or ship the code without
learning the system. The artifact was *proof* of the understanding.

AI unbundles them. A credible analysis, a working function, a persuasive memo can now be
produced without the underlying comprehension that used to be its price of admission. The
output looks identical whether the author deeply understands it or typed three prompts.

So the cost of *producing* fell off a cliff. The cost of *judging* — knowing what to
trust, what to verify, which assumptions are load-bearing, what could make it wrong — did
not. That growing distance is the Judgment Gap.

## 2. Why model evaluation does not close the gap

Existing evaluation answers **"was the model correct?"** This is necessary and valuable.
It is also blind to the human. A model can produce a flawless output that its user cannot
explain, did not verify, and cannot defend — and every model-side metric will read green.

| Model evaluation measures | Judgment evaluation measures |
|---|---|
| accuracy / correctness | understanding |
| hallucination rate | verification behavior |
| toxicity / safety | assumption awareness |
| latency | risk recognition |
| cost | confidence calibration |
| benchmark scores | accountability |

The two are orthogonal. A high-quality output handled with low judgment is exactly the
dangerous case that model evals cannot see: confident, fluent, plausible, and unowned.

## 3. The five failure modes of an ungoverned Judgment Gap

1. **Understanding decay** — people produce work they cannot explain.
2. **Apprenticeship collapse** — juniors skip the reps that build intuition; they look
   productive immediately but never develop judgment. The reps *were* the job.
3. **False confidence** — AI output is articulate and self-assured by default; humans
   cannot detect errors in domains where they lack expertise, and fluency reads as
   competence.
4. **Learning avoidance** — reaching for AI before attempting reasoning skips the
   productive struggle that builds durable understanding.
5. **Accountability gap** — "the AI generated it" is not an answer an organization can
   run on. Someone must still own the decision.

None of these are visible on a model dashboard. That is why the gap is *invisible*.

## 4. Judgment metrics: AI-Q and the three Ds

We propose a 0–100 measure — **AI-Q** — of a human's judgment over AI-assisted work,
across three components ([the three Ds](spec/aiq.md)): **Discernment** (judgment about the
AI's output — always assessable from one artifact), **Delegation** (judgment about the
input: the brief, the choice to delegate, the steering — assessable when the interview
surfaces them), and **Design** (judgment about the system of work — visible only across
many reviews, so never scored from one). The components are weighted 0.6/0.3/0.1 and
renormalized over what was actually assessed; an unobserved component is reported as *not
assessed*, never defaulted.

Discernment — the spine of the score — decomposes into six core, measurable dimensions.
Each is scored 1–5 against an auditable, domain-specific rubric.

1. **Understanding** — can the human explain the work and its mechanism?
2. **Verification** — do they verify important claims, and know what they did not check?
3. **Assumption awareness** — can they surface what must be true, especially the
   load-bearing assumption?
4. **Risk recognition** — can they name specific, plausible failure modes (not generic
   caveats)?
5. **Confidence calibration** — does stated confidence match demonstrated grasp?
6. **Accountability** — can they own and defend the decision rather than deferring to
   the tool?

When the artifact is itself a *system the human built to run AI* — an agent loop, an
automation, a multi-agent setup — these same dimensions re-point to the loop rather than a
finished output: *verification* becomes whether the "done" check would catch confident-but-wrong
work, *risk* becomes whether the blast radius is bounded, and *delegation* becomes whether a
loop was even the right vehicle versus a one-shot prompt. No new dimension is needed.

Two extended dimensions — **counterargument** (can they steelman the opposing case?) and
**curiosity** (did they explore alternatives?) — are optional and defined in the spec.

The score is deliberately *transparent and rubric-derived*, not a black-box "quotient."
It can be read, audited, and modified per domain. (Full definitions:
[`spec/judgment-dimensions.md`](spec/judgment-dimensions.md).)

Because the score is bring-your-own-model, the rubric — not the judge's mood — has to carry
it. Each dimension is scored independently against published anchors, with explicit guards
against the self-preference and fluency biases an LLM judge is prone to, and the output leads
with the band rather than a false-precision number (an ensemble of judges is recommended for
high-stakes reviews). And it cuts the other way from the automated-metrics arms race:
in 2026 a single agent was shown to break every major agent benchmark via reward-hacking.
Whether a *human* can stand behind the work is the one thing that optimization can't game —
which is exactly what this measures.

## 5. How measurement works

A judgment review has three stages, all model-agnostic:

1. **Decompose** the work into a structured map: claims, recommendations, assumptions,
   evidence, risks, unknowns.
2. **Interview** the human with questions generated from that map (depth scaled to the
   work's risk level). Crucially, the human answers *before* consulting AI further — the
   struggle is where judgment is exercised and observed.
3. **Score** by comparing what review agents surface against what the human's answers
   demonstrate. The gap between the two *is* the judgment gap, made measurable.

This is provider-neutral: any capable LLM can run the stages. AI-Q specifies the rubric,
schema, and protocol — not the model.

## 6. Adaptive friction, not blanket friction

Measuring judgment should not mean slowing everything down. Risk should set the friction:
a brainstorm needs none; a client-facing financial recommendation or a production code
deploy deserves a real reflection step. The same framework supports reviewing work
*after* generation (preserving productivity) and a *think-first* mode for high-stakes or
learning contexts. Friction is a dial, set by stakes.

## 7. Why open

Judgment metrics only matter if they are trusted and adopted, and the audience most
affected — engineers, researchers, analysts, product managers — is rightly skeptical of
anyone claiming to measure their understanding. A proprietary black box cannot earn that
trust. An open, inspectable, modifiable standard can. Hone is therefore Apache-2.0 across
the spec, rubrics, prompts, schemas, SDK, and integrations. A hosted product may build on
it (for longitudinal profiles, team analytics, and adaptive coaching at scale), but the
framework itself stays free and open.

## 8. Call for contribution

v0.1 is an honest first draft — *a* framework, not yet *the* standard. Standards are
earned through use. The highest-value contributions are domain rubrics, worked examples,
language ports of the SDK, and integrations that make judgment measurement a drop-in part
of real workflows. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

*AI-Q is the open standard; Hone is the open-source toolkit that implements it. The hosted
Hone app builds on both (in private beta).*
