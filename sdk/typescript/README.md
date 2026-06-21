# hone-sdk

The open-source reference SDK for **AI-Q** — measure whether a **human** understands
AI-assisted work, not whether the model's output was good.

**Bring-your-own-model.** You pass a `ModelFn` that calls whatever LLM you use; the SDK
never sees your API keys and has zero runtime dependencies.

```bash
npm install hone-sdk
```

## Two calls

```ts
import { analyzeWork, reviewJudgment, type ModelFn } from "hone-sdk";

// 1) Adapt your LLM once. (Examples for OpenAI/Anthropic below.)
const model: ModelFn = async ({ system, user }) => callYourLLM(system, user);

// 2) Decompose the work + get a tailored interview.
const analysis = await analyzeWork({
  work: aiGeneratedArtifact,
  domain: "coding",        // or "auto" to detect
  stakes: "ships to production; handles user payments",
  model,
});
// analysis.workMap, analysis.questions, analysis.riskLevel

// 3) Ask the human analysis.questions in YOUR ui, collect answers, then score.
const score = await reviewJudgment({
  work: aiGeneratedArtifact,
  domain: analysis.domain,
  riskLevel: analysis.riskLevel,
  answers,                 // [{ question, answer }]
  model,
});

console.log(score.composite, score.band);   // 72 "Mostly owns it"
console.log(score.gaps, score.verifyBeforeShip, score.howToDefend);
```

`score` conforms to [`spec/score.schema.json`](../../spec/score.schema.json). The SDK
computes `composite` and `band` deterministically from the six 1–5 dimension scores — it
never trusts the model's arithmetic.

## Adapt your model (copy-paste)

**OpenAI**
```ts
import OpenAI from "openai";
const client = new OpenAI();
const model: ModelFn = async ({ system, user }) => {
  const r = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return r.choices[0]?.message?.content ?? "";
};
```

**Anthropic**
```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const model: ModelFn = async ({ system, user }) => {
  const m = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: user }],
  });
  return m.content.filter((b) => b.type === "text").map((b: any) => b.text).join("\n");
};
```

Any model works as long as it can follow "return JSON" instructions.

## API

| Export | Purpose |
|---|---|
| `analyzeWork(opts)` | Decompose work → `workMap`, `questions`, `domain`, `riskLevel` |
| `reviewJudgment(opts)` | Score answers → `JudgmentScore` (six dimensions, composite, band, report) |
| `compositeFrom(dims)` / `bandFor(n)` | Deterministic scoring helpers |
| `depthForRisk(risk)` | Interview length for a risk level (3/5/7) |
| `RUBRIC_FOCUS` | The per-domain rubric focus strings |
| `extractJSON(text)` | Tolerant JSON extraction |

Types: `Domain`, `RiskLevel`, `Mode`, `WorkMap`, `Answer`, `JudgmentScore`, `ModelFn`.

## Design notes

- **Provider-neutral** by construction — the only LLM coupling is your `ModelFn`.
- **Auditable** — scoring is rubric-derived and the composite is computed in code, not by
  the model.
- **Two modes** — `mode: "after"` (review finished work, default) or `mode: "during"`
  (think-first, for high-stakes/learning).

Build: `npm run build`. License: Apache-2.0.
