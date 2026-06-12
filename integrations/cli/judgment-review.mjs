#!/usr/bin/env node
/**
 * judgment-review — an interactive Hone judgment review in your terminal.
 *
 * Usage:
 *   node judgment-review.mjs <file>            # review a file
 *   cat work.md | node judgment-review.mjs     # review stdin
 *   node judgment-review.mjs <file> --domain coding --mode after
 *
 * Model: set OPENAI_API_KEY (default) or ANTHROPIC_API_KEY (use --model anthropic).
 * Requires the SDK to be built once:  (cd ../../sdk/typescript && npm install && npm run build)
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, argv, env, exit } from "node:process";
import { analyzeWork, reviewJudgment } from "../../sdk/typescript/dist/index.js";

// ---- args ----
const args = argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const filePath = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1]?.startsWith("--") !== true && !["coding","writing","research","product","strategy","other","after","during","openai","anthropic"].includes(a));
const domain = flag("domain", "auto");
const mode = flag("mode", "after");
const provider = flag("model", env.OPENAI_API_KEY ? "openai" : "anthropic");
const threshold = parseInt(flag("min", "0"), 10);

// ---- read work ----
let work = "";
if (filePath) {
  work = readFileSync(filePath, "utf8");
} else if (!stdin.isTTY) {
  work = readFileSync(0, "utf8");
}
if (!work || work.trim().length < 20) {
  console.error("Provide work to review: a file path or piped stdin (min ~20 chars).");
  exit(2);
}

// ---- model adapter (bring-your-own, via fetch — no SDK deps) ----
const model = async ({ system, user }) => {
  if (provider === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set.");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.JUDGMENT_MODEL || "claude-sonnet-4-6",
        max_tokens: 2500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || `Anthropic ${r.status}`);
    return (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  }
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set.");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: env.JUDGMENT_MODEL || "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `OpenAI ${r.status}`);
  return j.choices?.[0]?.message?.content ?? "";
};

// ---- run ----
const rl = createInterface({ input: stdin, output: stdout });
const c = { dim: (s) => `\x1b[2m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, cy: (s) => `\x1b[36m${s}\x1b[0m` };

try {
  console.log(c.dim(`\nHone judgment review · provider=${provider} · mode=${mode}\n`));
  console.log(c.dim("Analyzing the work…"));
  const a = await analyzeWork({ work, domain, mode, model });
  console.log(`\nDomain: ${c.b(a.domain)}  Risk: ${c.b(a.riskLevel)}  ${c.dim(a.riskRationale)}`);
  console.log(c.dim(`\nAnswer in your own words BEFORE asking AI. "I don't know" is valid.\n`));

  const answers = [];
  for (let i = 0; i < a.questions.length; i++) {
    const ans = await rl.question(`${c.cy(`Q${i + 1}/${a.questions.length}`)} ${a.questions[i]}\n> `);
    answers.push({ question: a.questions[i], answer: ans });
  }

  console.log(c.dim("\nScoring…"));
  const s = await reviewJudgment({ work, domain: a.domain, riskLevel: a.riskLevel, mode, answers, model });

  console.log(`\n${c.b(`AI-Q: ${s.composite}/100`)}  —  ${c.b(s.band)}`);
  console.log(c.dim(s.summary) + "\n");
  const dn = { understanding: "Understanding", verification: "Verification", assumptionAwareness: "Assumptions", riskRecognition: "Risk recognition", confidenceCalibration: "Calibration", accountability: "Accountability" };
  for (const k of Object.keys(dn)) console.log(`  ${dn[k].padEnd(16)} ${s.dimensions[k].score}/5  ${c.dim(s.dimensions[k].justification || "")}`);
  const sect = (t, items) => { if (items?.length) { console.log(`\n${c.b(t)}`); items.forEach((x) => console.log("  • " + x)); } };
  sect("What you clearly own", s.owns);
  sect("Your judgment gaps", s.gaps);
  sect("Verify before you ship", s.verifyBeforeShip);
  if (s.howToDefend?.length) { console.log(`\n${c.b("How to defend this")}`); s.howToDefend.forEach((d) => console.log(`  • “${d.objection}” — ${c.dim(d.response)}`)); }
  if (s.practiceNext) console.log(`\n${c.b("Practice next")}\n  ${s.practiceNext}`);
  console.log("");

  rl.close();
  if (threshold && s.composite < threshold) {
    console.error(`AI-Q ${s.composite} is below the required ${threshold}.`);
    exit(1);
  }
} catch (e) {
  rl.close();
  console.error("\nError:", e.message);
  exit(1);
}
