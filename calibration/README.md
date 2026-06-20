# Calibration — making AI-Q a standard, not a vibe

A judgment score is only credible if the same transcript earns the same score from different
graders. This folder is how AI-Q earns that: a small set of **human-scored reference
transcripts** (the gold set) plus two checks.

## The gold set (`gold/*.json`)

Each file is a complete review — the work, the interview answers, and the **human reference
scores** for every dimension — chosen to span the bands:

| Transcript | Band | Exercises |
|---|---|---|
| `coding-owns-it` | Owns it (93) | strong Discernment |
| `writing-mostly-owns-it` | Mostly owns it (73) | Discernment **+ Delegation** (the brief was probed) |
| `strategy-riding-the-ai` | Riding the AI (43) | took the load-bearing number on faith |
| `research-black-box` | Black box (27) | confident, fluent, can't defend it |

Each file's `reference.rationale` explains *why* each score, anchored to
[`../spec/judgment-dimensions.md`](../spec/judgment-dimensions.md).

## Two checks

**1. Math conformance** — `node check-math.mjs` (needs the SDK built: `npm --prefix
../sdk/typescript run build`). Recomputes every gold transcript's sub-scores and AI-Q from
its reference dimensions using `@hone/sdk` — the same code the SDK, MCP, CLI, and app use —
and asserts they match the stated `expected`. This guards the gold set (and the published
math) against silent drift. It runs in CI.

**2. Judge calibration** — `ANTHROPIC_API_KEY=… node calibrate.mjs` (bring your own model;
edit `callModel` for any provider). Feeds each transcript to your judge via the SDK and
reports per-dimension **mean absolute error** and **band-match rate** vs. the human
reference. This is how an adopter confirms their BYO judge actually reads the anchors —
a GPT-class and a Claude-class judge should land in the same band as the human. Not in CI
(needs a model key); run it when you adopt the standard or change your judge.

If MAE is high or bands disagree, the judge isn't reading the rubric — change the model or
tighten the anchors. Contributions of new gold transcripts (especially "high-quality output,
low judgment" cases and other domains) are welcome — see [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
