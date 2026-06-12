/**
 * @hone/sdk — the open AI-Q standard reference SDK.
 *
 * Measures a human's AI-Q — their judgment over AI-assisted work, across the three Ds
 * (spec/aiq.md): Discernment (the six dimensions — can they catch the AI's mistakes?),
 * Delegation (did they brief and steer it well? — scored only when evidence exists),
 * and Design (a longitudinal property; never a per-review number).
 *
 * Bring-your-own-model: you pass a `ModelFn` that calls whatever LLM you like;
 * Hone never touches your keys.
 *
 * Two calls:
 *   analyzeWork()    -> decompose the work + generate an interview
 *   reviewJudgment() -> score the human's answers into an AI-Q score
 */

export type Domain =
  | "coding"
  | "writing"
  | "research"
  | "product"
  | "strategy"
  | "creative"
  | "other";

export type RiskLevel = "low" | "medium" | "high";
export type Mode = "after" | "during";
export type Band = "Owns it" | "Mostly owns it" | "Riding the AI" | "Black box";

/** The single integration point. Implement with any LLM. Must return raw text. */
export interface ModelInput {
  system: string;
  user: string;
}
export type ModelFn = (input: ModelInput) => Promise<string>;

export interface EvidenceItem {
  claim: string;
  support?: string;
  strength: "weak" | "moderate" | "strong";
}
export interface WorkMap {
  claims: string[];
  recommendations: string[];
  assumptions: string[];
  evidence: EvidenceItem[];
  risks: string[];
  unknowns: string[];
}

export interface AnalyzeOptions {
  work: string;
  model: ModelFn;
  /** Omit or "auto" to let the model detect it. */
  domain?: Domain | "auto";
  mode?: Mode;
  /** One line: who it's for, what's at stake. Improves risk classification. */
  stakes?: string;
}
export interface AnalyzeResult {
  aiqVersion: "0.2";
  domain: Domain;
  riskLevel: RiskLevel;
  riskRationale: string;
  workMap: WorkMap;
  questions: string[];
}

export interface Answer {
  question: string;
  answer: string;
}
export interface ReviewOptions {
  work: string;
  domain: Domain;
  answers: Answer[];
  model: ModelFn;
  riskLevel?: RiskLevel;
  mode?: Mode;
  /**
   * Also score D2 (Delegation) when the answers contain evidence about the brief /
   * iteration history (default true). The evidence gate still applies: with no such
   * evidence the model returns null and the result omits `delegation`.
   */
  assessDelegation?: boolean;
}

export interface DimensionScore {
  score: number; // 1-5
  justification?: string;
}

/** D2 facets, 1-5 each. Score ONLY behind the evidence gate (spec/aiq.md). */
export interface DelegationFacets {
  briefQuality: DimensionScore;
  taskSelection: DimensionScore;
  iterationControl: DimensionScore;
}
export interface DelegationScore extends DelegationFacets {
  score: number; // 0-100 = round(sum of facets / 15 * 100)
}

export interface JudgmentScore {
  aiqVersion: "0.2";
  domain: Domain;
  riskLevel?: RiskLevel;
  mode?: Mode;
  /** The six Discernment (D1) dimensions. */
  dimensions: {
    understanding: DimensionScore;
    verification: DimensionScore;
    assumptionAwareness: DimensionScore;
    riskRecognition: DimensionScore;
    confidenceCalibration: DimensionScore;
    accountability: DimensionScore;
  };
  /** D1 sub-score, 0-100. */
  discernment: number;
  /** D2 — present only when the interview met the evidence gate. */
  delegation?: DelegationScore;
  /** The AI-Q composite: renormalized weights over assessed Ds. Equals `discernment` when only D1 was assessed. Computed by the SDK, never the model. */
  composite: number;
  band: Band;
  summary: string;
  owns: string[];
  gaps: string[];
  verifyBeforeShip: string[];
  howToDefend: { objection: string; response: string }[];
  practiceNext: string;
}

export const CORE_DIMENSIONS = [
  "understanding",
  "verification",
  "assumptionAwareness",
  "riskRecognition",
  "confidenceCalibration",
  "accountability",
] as const;

export const DELEGATION_FACETS = [
  "briefQuality",
  "taskSelection",
  "iterationControl",
] as const;

/**
 * AI-Q reference weights (spec/aiq.md). Applied over ASSESSED Ds only and
 * renormalized — Design is never per-review, so in practice: D1 alone → AI-Q =
 * discernment; D1 + D2 → round(2/3·discernment + 1/3·delegation).
 */
export const AIQ_WEIGHTS = { discernment: 0.6, delegation: 0.3, design: 0.1 } as const;

// Domain rubric focus — mirrors /rubrics/*.yaml (kept inline so the SDK is dependency-free).
const RUBRIC_FOCUS: Record<Domain, string> = {
  coding:
    "line-level understanding (explain why each non-trivial block is written this way); correctness & edge cases; security; tests/has-it-been-run; maintainability; why this approach vs what the AI silently ruled out.",
  writing:
    "the single central claim (argued vs merely asserted in fluent language); audience fit; evidence vs assertion/overclaiming; style-over-substance; unverified facts/stats/quotes; reputational/tone risk.",
  research:
    "source quality & possible fabrication; sample/scope; correlation vs causation; base-rate/number sanity; alternative explanations; how far findings generalize.",
  product:
    "is the user problem evidenced or assumed; who it's for and demand signal; tradeoffs & honest scope; gameable vs real success metrics; alternatives incl. do-nothing/buy; second-order effects.",
  strategy:
    "the load-bearing assumption; tradeoffs & cost of being wrong; second-order effects; alternatives incl. do-nothing; reversibility (one-way vs two-way door); failure modes & early signals; stakeholder incentives.",
  creative:
    "intent clarity (do you actually know what you want?); how you'll judge if the output is good (success criteria/taste); what's delegated to the AI vs decided by you; audience & brand fit; creative risk (generic, derivative, off-brand, wrong message). This is a creative/generative brief — judge the human's direction and ability to evaluate output, NOT design-theory correctness.",
  other:
    "central claim; load-bearing assumptions; evidence quality; failure modes; what must be verified; defensibility.",
};

export function depthForRisk(risk: RiskLevel): number {
  return risk === "low" ? 3 : risk === "high" ? 7 : 5;
}

/** D1 (Discernment) sub-score from the six dimensions. */
export function compositeFrom(dims: JudgmentScore["dimensions"]): number {
  const sum = CORE_DIMENSIONS.reduce((acc, k) => acc + clamp1to5(dims[k].score), 0);
  return Math.round((sum / 30) * 100);
}
/** Spec-v0.2 name for the same computation — D1 of AI-Q. */
export const discernmentFrom = compositeFrom;

/** D2 (Delegation) sub-score from the three facets. Call ONLY when the evidence gate is met. */
export function delegationFrom(facets: DelegationFacets): number {
  const sum = DELEGATION_FACETS.reduce((acc, k) => acc + clamp1to5(facets[k].score), 0);
  return Math.round((sum / 15) * 100);
}

/**
 * The AI-Q composite: AIQ_WEIGHTS renormalized over the sub-scores actually
 * assessed (pass undefined for anything unassessed — NEVER zero). Equals the
 * discernment sub-score when it is the only D assessed (v0.1 compatible).
 */
export function aiqFrom(sub: { discernment?: number; delegation?: number }): number {
  const parts: [number, number][] = [];
  if (typeof sub.discernment === "number") parts.push([AIQ_WEIGHTS.discernment, sub.discernment]);
  if (typeof sub.delegation === "number") parts.push([AIQ_WEIGHTS.delegation, sub.delegation]);
  if (!parts.length) throw new Error("Hone: aiqFrom needs at least one assessed sub-score.");
  const wsum = parts.reduce((a, [w]) => a + w, 0);
  return Math.round(parts.reduce((a, [w, s]) => a + w * s, 0) / wsum);
}

export function bandFor(composite: number): Band {
  if (composite >= 80) return "Owns it";
  if (composite >= 55) return "Mostly owns it";
  if (composite >= 30) return "Riding the AI";
  return "Black box";
}

function clamp1to5(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(5, Math.round(n)));
}

const MODE_FRAME: Record<Mode, string> = {
  after:
    "MODE: AFTER-GENERATION. The user finished AI-assisted work and wants to check whether they understand and can defend it before shipping.",
  during:
    "MODE: DURING-CREATION (think-first). The 'work' is a task plus the user's own initial thinking, BEFORE leaning on AI. Reward independent reasoning, predictions, and surfaced assumptions.",
};

/** Stage 1 — decompose the work and generate a tailored interview. */
export async function analyzeWork(opts: AnalyzeOptions): Promise<AnalyzeResult> {
  const mode = opts.mode ?? "after";
  const domain = opts.domain ?? "auto";
  const system =
    "You are the AI-Q analysis stage. You decompose AI-assisted work and prepare a judgment interview. Output ONLY valid JSON. Be concise and concrete.";
  const user = `${MODE_FRAME[mode]}
${domain === "auto" ? "Detect the domain (coding/writing/research/product/strategy/other)." : `Domain is "${domain}" unless clearly wrong.`}
Context / stakes: ${opts.stakes || "(none given)"}

Return ONLY this JSON:
{
  "domain": "coding|writing|research|product|strategy|other",
  "riskLevel": "low|medium|high",
  "riskRationale": "one sentence",
  "workMap": {
    "claims": [], "recommendations": [], "assumptions": [],
    "evidence": [{"claim":"","support":"","strength":"weak|moderate|strong"}],
    "risks": [], "unknowns": []
  },
  "questions": []
}
Risk: low = ideation/personal; medium = internal/presentations/published; high = client-facing, medical/financial/legal, irreversible, or code deployment.
The NUMBER of questions must match riskLevel: 3 if low, 5 if medium, 7 if high.
Tailor questions to THIS work; ask what a tough reviewer would ask; no hints, no answers.
At medium/high risk, make exactly ONE question (within that count) a DELEGATION probe —
how they briefed the AI, what they corrected between first output and final, or why this
was the right task to hand to AI — so D2 becomes assessable (spec/aiq.md).
${mode === "during" ? "Bias questions toward predictions and assumptions to commit BEFORE seeing an AI answer." : ""}

WORK:
"""
${opts.work}
"""`;

  const raw = await opts.model({ system, user });
  const parsed = extractJSON<any>(raw);
  const riskLevel: RiskLevel = ["low", "medium", "high"].includes(parsed.riskLevel)
    ? parsed.riskLevel
    : "medium";
  return {
    aiqVersion: "0.2",
    domain: normalizeDomain(parsed.domain, domain),
    riskLevel,
    riskRationale: parsed.riskRationale ?? "",
    workMap: normalizeWorkMap(parsed.workMap),
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
  };
}

/** Stage 2 — score the human's answers into an AI-Q score. */
export async function reviewJudgment(opts: ReviewOptions): Promise<JudgmentScore> {
  const mode = opts.mode ?? "after";
  const riskLevel = opts.riskLevel ?? "medium";
  const assessDelegation = opts.assessDelegation ?? true;
  const system =
    "You are the open AI-Q standard Judgment Coach. You evaluate the HUMAN, not the artifact — whether they understand and can defend the work. Rigorous, specific, kind. Never do their thinking. Output ONLY valid JSON.";
  const user = `${MODE_FRAME[mode]}
Domain: ${opts.domain}. Risk: ${riskLevel}. Rubric focus: ${RUBRIC_FOCUS[opts.domain]}

The user's interview answers are your main evidence about the human:
${opts.answers
  .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer || "(no answer)"}`)
  .join("\n\n")}

Score the HUMAN on the six Discernment dimensions, 1-5 each, by comparing what they
demonstrated against what the work actually requires.${
    assessDelegation
      ? `
ALSO: if (and ONLY if) the answers or work surfaced how they briefed the AI, why they
delegated this task, or how they steered between first output and final, score the three
Delegation facets 1-5: briefQuality (did the brief carry context/constraints/success
criteria), taskSelection (right thing to hand to AI; knew what to keep human),
iterationControl (caught and corrected drift). With NO such evidence, return null for
"delegation" — never guess, never default.`
      : ""
  } Return ONLY this JSON:
{
  "dimensions": {
    "understanding": {"score":1-5,"justification":""},
    "verification": {"score":1-5,"justification":""},
    "assumptionAwareness": {"score":1-5,"justification":""},
    "riskRecognition": {"score":1-5,"justification":""},
    "confidenceCalibration": {"score":1-5,"justification":""},
    "accountability": {"score":1-5,"justification":""}
  },${
    assessDelegation
      ? `
  "delegation": null OR {
    "briefQuality": {"score":1-5,"justification":""},
    "taskSelection": {"score":1-5,"justification":""},
    "iterationControl": {"score":1-5,"justification":""}
  },`
      : ""
  }
  "summary": "1-2 sentence honest headline read",
  "owns": ["specific things the user clearly owns"],
  "gaps": ["specific judgment gaps, kind but honest"],
  "verifyBeforeShip": ["concrete checklist items"],
  "howToDefend": [{"objection":"toughest objection","response":"suggested response"}],
  "practiceNext": "one specific thing to practice"
}

WORK:
"""
${opts.work}
"""`;

  const raw = await opts.model({ system, user });
  const parsed = extractJSON<any>(raw);
  const dimensions = normalizeDimensions(parsed.dimensions);
  // The SDK computes all sub-scores & the composite deterministically — never model arithmetic.
  const discernment = compositeFrom(dimensions);
  const delegation = assessDelegation ? normalizeDelegation(parsed.delegation) : undefined;
  const composite = aiqFrom({ discernment, delegation: delegation?.score });
  return {
    aiqVersion: "0.2",
    domain: opts.domain,
    riskLevel,
    mode,
    dimensions,
    discernment,
    ...(delegation ? { delegation } : {}),
    composite,
    band: bandFor(composite),
    summary: parsed.summary ?? "",
    owns: arr(parsed.owns),
    gaps: arr(parsed.gaps),
    verifyBeforeShip: arr(parsed.verifyBeforeShip),
    howToDefend: Array.isArray(parsed.howToDefend) ? parsed.howToDefend : [],
    practiceNext: parsed.practiceNext ?? "",
  };
}

// ---------- helpers ----------

function arr(x: any): string[] {
  return Array.isArray(x) ? x.filter((i) => typeof i === "string") : [];
}

function normalizeDomain(d: any, fallback: Domain | "auto"): Domain {
  const ok: Domain[] = ["coding", "writing", "research", "product", "strategy", "creative", "other"];
  if (ok.includes(d)) return d;
  return fallback !== "auto" && ok.includes(fallback as Domain)
    ? (fallback as Domain)
    : "other";
}

function normalizeWorkMap(m: any): WorkMap {
  const base: WorkMap = {
    claims: [],
    recommendations: [],
    assumptions: [],
    evidence: [],
    risks: [],
    unknowns: [],
  };
  if (!m || typeof m !== "object") return base;
  return {
    claims: arr(m.claims),
    recommendations: arr(m.recommendations),
    assumptions: arr(m.assumptions),
    evidence: Array.isArray(m.evidence) ? m.evidence : [],
    risks: arr(m.risks),
    unknowns: arr(m.unknowns),
  };
}

// The evidence gate, enforced at the parsing layer: anything other than three
// well-formed facets means D2 was not assessed — return undefined, never a default.
function normalizeDelegation(d: any): DelegationScore | undefined {
  if (!d || typeof d !== "object") return undefined;
  for (const k of DELEGATION_FACETS) {
    if (typeof d?.[k]?.score !== "number") return undefined;
  }
  const facets: DelegationFacets = {
    briefQuality: { score: clamp1to5(d.briefQuality.score), justification: d.briefQuality.justification ?? "" },
    taskSelection: { score: clamp1to5(d.taskSelection.score), justification: d.taskSelection.justification ?? "" },
    iterationControl: { score: clamp1to5(d.iterationControl.score), justification: d.iterationControl.justification ?? "" },
  };
  return { ...facets, score: delegationFrom(facets) };
}

function normalizeDimensions(d: any): JudgmentScore["dimensions"] {
  const one = (k: string): DimensionScore => ({
    score: clamp1to5(d?.[k]?.score),
    justification: d?.[k]?.justification ?? "",
  });
  return {
    understanding: one("understanding"),
    verification: one("verification"),
    assumptionAwareness: one("assumptionAwareness"),
    riskRecognition: one("riskRecognition"),
    confidenceCalibration: one("confidenceCalibration"),
    accountability: one("accountability"),
  };
}

/** Tolerant JSON extraction — survives stray prose around the JSON. */
export function extractJSON<T>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error("Hone: no JSON found in model response.");
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return JSON.parse(candidate.slice(start, i + 1)) as T;
    }
  }
  throw new Error("Hone: unterminated JSON in model response.");
}

export { RUBRIC_FOCUS };
