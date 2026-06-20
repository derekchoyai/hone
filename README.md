<div align="center">

# Hone

**Keep your edge.**

AI made producing work cheap. Hone measures the thing that's now scarce:
**whether the *human* actually understands the work they shipped with AI.**

Every AI eval scores the model. Hone scores you — your **AI-Q**.

[What it feels like](#what-a-review-feels-like) · [Quickstart](#quickstart) · [AI-Q](#ai-q--the-score) · [Why](#why-ai-evaluation-isnt-enough) · [Whitepaper](WHITEPAPER.md)

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![CI](https://github.com/derekchoyai/hone/actions/workflows/ci.yml/badge.svg)](https://github.com/derekchoyai/hone/actions/workflows/ci.yml)
[![Spec](https://img.shields.io/badge/AI-Q%20spec-v0.2-8A6FE8)](spec/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## The 30-second version

Every AI eval tool answers one question: **was the model's output good?** (accuracy, hallucination, toxicity, latency, cost.)

None of them answer the question that actually decides whether AI-assisted work is safe to ship: **does the human who produced it understand it well enough to defend it?**

Hone is an open toolkit for measuring exactly that. Give it a piece of AI-assisted work; it interviews the human — a few sharp questions, one at a time, the way a good mentor would — then returns their **AI-Q**: a score over the **three Ds** of working with AI. **Discernment** (can you tell when the AI is wrong? — six auditable dimensions, the spine of the score), **Delegation** (did you brief it, choose the task, and steer it well?), and **Design** (are you re-architecting how you work? — read over time, never faked from one review).

It's **bring-your-own-model** (any LLM), Apache-2.0, and drops into a coding agent, a CI pipeline, or your own app in minutes. The methodology is an open spec — the **AI-Q — the open standard** — so the score means the same thing everywhere it's computed.

## What a review feels like

```text
You:  Run hone on the pricing analysis we just built.

Sol:  Happy to take a look. This is a strategy memo recommending a Pro-tier
      price increase — real money riding on it, so I'll ask five questions.
      Just between us, and "I don't know" is a perfectly useful answer.

      First: walk me through the recommendation in your own words —
      why $49, and not $39 or $59?

      ...three more, one at a time — including: what did you give the
      AI to work with, and what did you have to correct in its first
      answer? ...

      Last one: before I show you anything — honestly, how confident
      are you in this work, 0 to 100?

You:  85.

Sol:  Here's my read.

      Pro-tier pricing recommendation · AI-Q 58 — Mostly owns it
      (discernment 57 · delegation 60)
      You can explain the mechanism, but you took the churn projection
      on faith — and that's the load-bearing number.

      Work on this first: the 4% churn assumption came straight from the
      AI with no source. If churn runs 8%, the revenue case inverts.

      [ what a rigorous review surfaced vs. what you caught ]
      [ before-you-ship checklist · the toughest objection you'll face ]
      [ worth remembering · 3 short notes on the skills you missed ]
```

No grades for the work. No "AI detector." A measure of *your grip on it* — and coaching to close the gap.

## Quickstart

### In your coding agent (the best way) — review work where it lives

When an agent built the thing — a repo, an analysis, a doc set — don't paste it anywhere. Hone runs **inside** the agent, which already has the work loaded:

**Claude Desktop — one click:** download `hone.mcpb` from the [latest release](https://github.com/derekchoyai/hone/releases/latest) and open it (Settings → Extensions). No config files, no terminal.

**Claude Code — add the MCP server** (protocol + deterministic scoring):

```bash
git clone https://github.com/derekchoyai/hone && cd hone/mcp && npm install && npm run build
claude mcp add hone -- node "$(pwd)/dist/index.js"
```

Or load the [Claude skill](skills/claude/SKILL.md) — zero infrastructure. Then just say:

> *"Run hone on what we built today."*

The agent reads the work it already has, interviews you one question at a time, commits your confidence **before** the reveal, and computes your AI-Q deterministically. With your okay it remembers the scores — **never the work** — in a local file, so the next review pushes on your actual weak spots ("your verification has been the soft dimension — let's start there"). Nothing leaves your machine.

### Gate AI-generated code in CI (GitHub Action)

```yaml
# .github/workflows/judgment.yml
- uses: derekchoyai/hone/integrations/github-action@v0
  with:
    domain: coding
    paths: "src/**/*.ts"
    model: openai            # or anthropic
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

On a PR touching AI-generated code, the author answers a few questions and the work gets a Judgment Score. Below your threshold → the check explains the gaps. See [integrations/github-action](integrations/github-action/).

### Build it into your own app (TypeScript SDK)

```bash
npm install @hone/sdk          # publishing to npm in v0.2 — until then, install from source:
# git clone https://github.com/derekchoyai/hone && npm --prefix hone/sdk/typescript install && npm --prefix hone/sdk/typescript run build
```

```ts
import { analyzeWork, reviewJudgment, type ModelFn } from "@hone/sdk";

// Bring your own model — Hone never sees your API keys.
const model: ModelFn = async ({ system, user }) => callYourLLM(system, user);

// 1. Decompose the work + generate an interview tailored to it.
const { workMap, questions } = await analyzeWork({
  work: aiGeneratedArtifact,
  domain: "coding",
  model,
});

// 2. Collect the human's answers (in YOUR ui), then score.
const result = await reviewJudgment({
  work: aiGeneratedArtifact,
  domain: "coding",
  answers,        // [{ question, answer }]
  model,
});

console.log(result.composite, result.band);       // 72  "Mostly owns it"  ← the AI-Q
console.log(result.discernment, result.delegation); // sub-scores (delegation only when assessed)
console.log(result.gaps, result.verifyBeforeShip);
```

`result` conforms to [`spec/score.schema.json`](spec/score.schema.json).

### No install at all — run the prompts by hand

Paste a [prompt](prompts/) into any chat model with your work. See [examples/](examples/) for fully worked reviews with scores.

## AI-Q — the score

A transparent 0–100 score derived from a rubric you can read and change — never vibes, never model arithmetic. AI-Q measures the **three Ds** of working with AI, weighted by how much they protect you (**Discernment 0.6 · Delegation 0.3 · Design 0.1**, renormalized over what was actually assessed):

### D1 · Discernment — *judgment about the AI's output* (the spine)

Can you tell when the AI is wrong, lazy, or hallucinating? Six auditable dimensions, always assessable from the work in front of the reviewer:

| Dimension | The question |
|---|---|
| **Understanding** | Can the human explain the work and its mechanism? |
| **Verification** | Do they verify important claims, and know what they didn't? |
| **Assumption awareness** | Can they surface what must be true (esp. the load-bearing assumption)? |
| **Risk recognition** | Can they name specific, plausible failure modes? |
| **Confidence calibration** | Does their confidence match their demonstrated grasp? |
| **Accountability** | Can they own and defend the decision (vs. "the AI did it")? |

### D2 · Delegation — *judgment about your input to the AI*

Did the brief carry what the task needed? Was this the right thing to hand to AI at all? Did you steer between the first output and the final one? Three facets — **brief quality, task selection, iteration control** — scored *only* when the interview actually surfaced the brief (the evidence gate). No evidence → reported as **not assessed**, never guessed, never zero.

### D3 · Design — *judgment about your system of work*

Are you re-architecting how you work around AI — or just using it where it lands? One artifact can't show a system, so **Design is never scored from a single review.** It's read qualitatively from your profile over time (domain breadth, delegation trend, whether discernment holds as you delegate more); a numeric Design score needs cross-user baselines and stays on the [roadmap](spec/roadmap.md).

> **Agentic work, too.** When the thing you made *is* a system — an agent loop, an automation, a multi-agent setup — the same three Ds re-point to the loop: is the "done" check real or just "looks done" (Discernment), was a loop even the right call vs. a one-shot prompt and is the blast radius bounded (Delegation). Hone measures judgment over how you *run* AI, not just one-shot answers. See [`spec/aiq.md`](spec/aiq.md#ai-q-for-agentic-work-loops-automations-multi-agent).

Bands: **80–100 Owns it · 55–79 Mostly owns it · 30–54 Riding the AI · 0–29 Black box.**

Scoring is deterministic — every sub-score and the composite are computed by the same code everywhere ([`@hone/sdk`](sdk/typescript/)), so a 72 in CI means the same thing as a 72 in your agent. A six-dimension review's AI-Q equals its Discernment sub-score, so every v0.1 Judgment Score is already a valid AI-Q. The full normative definition is [`spec/aiq.md`](spec/aiq.md); two extended Discernment dimensions — *Counterargument* and *Curiosity* — are optional and defined in [`spec/judgment-dimensions.md`](spec/judgment-dimensions.md).

A score *of* judgment has to itself be defensible. Each dimension is scored **independently against published 1–5 anchors** (not a holistic vibe), with explicit guards against the self-preference and fluency biases an LLM judge is prone to, and the implementation **leads with the band, not a false-precision integer** — with an ensemble option for high-stakes reviews. The full rules are in [`spec/aiq.md` → Scoring rigor](spec/aiq.md#scoring-rigor-judging-defensibly).

The interview methodology is built on the evidence, not vibes either: premortems (Klein), consider-the-opposite and reference-class forecasting (Tetlock/GJP), calibration against stated confidence (Kahneman–Klein), and confidence-before-reveal — because subjective confidence is not an accuracy signal.

## Why AI evaluation isn't enough

Current AI evaluation asks: *was the model correct?*
Hone asks: *does the human understand?*

As AI collapses the cost of producing work, the scarce skill becomes **recognizing** good work — knowing what to trust, what to verify, and what you're prepared to defend with your name on it. A 2025 CHI study of 319 knowledge workers (Lee et al., Carnegie Mellon & Microsoft Research) found confidence in AI associated with *less* self-reported critical thinking (β = −0.69, p < 0.001), while confidence in one's *own* ability was associated with *more* (β = +0.26). That gap — between what the work needed and what the human caught — is the **judgment gap**, and nothing in the eval stack measures it.

**The un-gameable layer.** Automated metrics get gamed: in 2026, a single automated agent was shown to break every major agent benchmark via reward-hacking — near-perfect scores without solving the task. The one thing that can't be optimized away by the model is whether the *human* can stand behind the result. That's what Hone measures, and why it scores the person rather than the output.

Full argument: [**The AI Judgment Gap — Why AI Evaluation Is Not Enough**](WHITEPAPER.md).

## How it works (the architecture bet)

**The host does the reading; Hone does the judging.** When your agent already has the repo/docs loaded, re-ingesting them into a review service duplicates the hardest infrastructure in the industry — and leaks your work. So Hone inverts it: methodology flows *in* (rubrics, interview protocol, question altitude), judgment metadata flows *out* (six scores, a band). **The work itself never transits.** Privacy isn't a policy here; it's the architecture.

```
┌─ your agent / CI / app ──────────────────────────┐
│  has the work loaded · runs the interview        │
│                                                  │
│   get_protocol ──►  AI-Q spec: rubric, questions, │
│                     techniques, report structure │
│   score_review ──►  deterministic AI-Q:          │
│                     sub-scores + composite+band  │
└──────────────────────────────────────────────────┘
        nothing stored · nothing leaves the machine
```

## Repo map

```
spec/             the AI-Q standard — dimensions, JSON schemas, agentic-integration spec
rubrics/          per-domain review rubrics (YAML, editable)
prompts/          copy-paste prompt library (works in any chat model)
examples/         fully worked reviews with scores
calibration/      human-scored gold transcripts + judge-calibration harness
sdk/typescript/   the drop-in, bring-your-own-model client        ← @hone/sdk
mcp/              MCP server — judgment review inside any agent   ← start here
skills/           the "hone" agent skill (Claude)
integrations/     github-action + cli
WHITEPAPER.md     the argument
```

## Status & roadmap

v0.1 is an early, honest draft — **a framework, not "the standard."** Standards are earned through use. The highest-value contributions right now: rubrics for new domains, worked examples, language ports of the SDK, and integrations. See [CONTRIBUTING.md](CONTRIBUTING.md) and [`spec/roadmap.md`](spec/roadmap.md).

## Open core

Everything here is and will remain open (Apache-2.0): the AI-Q spec, rubrics, prompts, schemas, SDK, MCP server, and integrations. A hosted product — **Hone, the app** *(in private beta)* — builds on this framework with the parts that need scale and data: longitudinal AI-Q profiles, adaptive coaching that learns your weak spots, spaced recall, cohort benchmarks, and the numeric Design score (D3) that needs cross-user baselines. The framework stays free forever.

## License

[Apache-2.0](LICENSE). Use it commercially, embed it, fork it.
