#!/usr/bin/env node
/**
 * Judge calibration — check whether YOUR bring-your-own-model judge agrees with the human
 * reference scores on the gold transcripts. This is what makes AI-Q a calibrated standard
 * rather than a vibe: a GPT-class judge and a Claude-class judge should land in the same
 * band as the human reference for the same transcript.
 *
 * It feeds each gold transcript's work + interview answers to hone-sdk's reviewJudgment()
 * using a model you wire up, then reports per-dimension mean absolute error and band-match
 * rate vs. the human reference.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-...  node calibration/calibrate.mjs
 *   OPENAI_API_KEY=sk-...     node calibration/calibrate.mjs
 *   (needs the SDK built: npm --prefix sdk/typescript run build)
 *
 * Bring your own model: edit `callModel` below to point at any provider/endpoint.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const { reviewJudgment, bandFor, CORE_DIMENSIONS } = await import(
  new URL("../sdk/typescript/dist/index.js", import.meta.url).href
);

// --- Bring your own model: returns the model's raw text for {system, user}. ---
async function callModel({ system, user }) {
  if (process.env.ANTHROPIC_API_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.HONE_JUDGE_MODEL || "claude-sonnet-4-6",
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const j = await res.json();
    return j.content?.map((b) => b.text).join("") ?? "";
  }
  if (process.env.OPENAI_API_KEY) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.HONE_JUDGE_MODEL || "gpt-4o",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    const j = await res.json();
    return j.choices?.[0]?.message?.content ?? "";
  }
  throw new Error("Set ANTHROPIC_API_KEY or OPENAI_API_KEY (or edit callModel for your provider).");
}

const goldDir = join(here, "gold");
const files = readdirSync(goldDir).filter((f) => f.endsWith(".json"));
let absErrSum = 0,
  dimCount = 0,
  bandMatches = 0;

console.log(`Calibrating judge against ${files.length} gold transcripts…\n`);
for (const f of files) {
  const g = JSON.parse(readFileSync(join(goldDir, f), "utf8"));
  const result = await reviewJudgment({
    work: g.work,
    domain: g.domain,
    riskLevel: g.riskLevel,
    answers: g.interview.map((qa) => ({ question: qa.q, answer: qa.a })),
    model: callModel,
  });
  const ref = g.reference;
  const deltas = CORE_DIMENSIONS.map((k) => {
    const e = Math.abs(result.dimensions[k].score - ref.dimensions[k]);
    absErrSum += e;
    dimCount++;
    return `${k.slice(0, 4)} ${result.dimensions[k].score}/${ref.dimensions[k]}`;
  });
  const bandMatch = result.band === ref.expected.band;
  if (bandMatch) bandMatches++;
  console.log(
    `${bandMatch ? "✓" : "✗"} ${g.id}: judge AI-Q ${result.composite} (${result.band}) vs ref ${ref.expected.composite} (${ref.expected.band})`
  );
  console.log(`    dims [judge/ref]: ${deltas.join("  ")}\n`);
}

console.log("— Calibration summary —");
console.log(`  band match:  ${bandMatches}/${files.length}`);
console.log(`  dimension mean absolute error: ${(absErrSum / dimCount).toFixed(2)} (target < 0.75)`);
console.log("  If MAE is high or bands disagree, your judge isn't reading the anchors —");
console.log("  check the model, or tighten the rubric anchors in spec/judgment-dimensions.md.");
