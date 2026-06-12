#!/usr/bin/env node
/**
 * Hone MCP server (local, open). Computes AI-Q — the human's judgment over
 * AI-assisted work, across the three Ds (spec/aiq.md): Discernment (can they
 * catch the AI's mistakes — the six dimensions), Delegation (did they brief and
 * steer it well — scored only behind the evidence gate), and Design (longitudinal;
 * never a per-review number).
 *
 * Four thin tools, per spec/agentic-integration.md:
 *   get_protocol   — the judgment-review methodology bundle for the HOST model to run
 *                    (the host already has the work loaded; it does the reading and the
 *                    interview — Hone supplies the protocol). Personalized when a local
 *                    profile exists.
 *   score_review   — deterministic AI-Q scoring (never model arithmetic).
 *   record_review  — append judgment METADATA (scores only, never the work) to the local
 *                    profile at ~/.hone/profile.json; returns trend + encouragement.
 *   get_profile    — the longitudinal local profile: averages, weakest dimension, trends,
 *                    and qualitative Design indicators.
 *
 * Judgment metadata stays on this machine; the work itself is never stored anywhere.
 * The hosted Hone MCP adds cross-device sync, cohort benchmarks, and team views on the
 * same tool surface.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { compositeFrom, delegationFrom, aiqFrom, bandFor, RUBRIC_FOCUS, type Domain, type DelegationFacets } from "@hone/sdk";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Local judgment profile — JUDGMENT METADATA ONLY, never the work.
// One JSON file on this machine (~/.hone/profile.json; override the dir with
// HONE_HOME). This is what makes reviews adaptive: record_review appends to it,
// get_protocol personalizes from it. Delete the file to reset.
// ---------------------------------------------------------------------------

const DIM_KEYS = [
  "understanding",
  "verification",
  "assumptionAwareness",
  "riskRecognition",
  "confidenceCalibration",
  "accountability",
] as const;
type DimKey = (typeof DIM_KEYS)[number];

const FACET_KEYS = ["briefQuality", "taskSelection", "iterationControl"] as const;
type FacetKey = (typeof FACET_KEYS)[number];

interface ProfileEntry {
  id: string;
  date: string; // ISO
  kind?: "review" | "think-first"; // absent (pre-v0.3 entries) = review
  domain: string;
  context: string;
  riskLevel: string;
  scores?: Record<DimKey, number>; // D1 — absent on delegation-only (think-first) entries
  discernment?: number; // D1 sub-score (pre-v0.3 entries: equals composite)
  delegation?: Record<FacetKey, number> & { score: number }; // D2 — only behind the evidence gate
  composite: number; // the AI-Q (renormalized over assessed Ds)
  band: string;
  statedConfidence?: number;
  topGap?: string;
  subject?: string; // ≤8-word neutral label of WHAT was reviewed — a recall anchor, not the work
}

interface ProfileFile {
  version: 1;
  entries: ProfileEntry[];
}

// HONE_HOME overrides the dir; OJF_HOME is honored as a deprecated fallback. The profile
// used to live in ~/.ojf — read it once if ~/.hone doesn't exist yet, so renaming the
// project never orphans someone's history.
const HONE_DIR = process.env.HONE_HOME || process.env.OJF_HOME || join(homedir(), ".hone");
const PROFILE_PATH = join(HONE_DIR, "profile.json");
const LEGACY_PROFILE_PATH = join(homedir(), ".ojf", "profile.json");

function readProfileFile(path: string): ProfileFile | null {
  try {
    const p = JSON.parse(readFileSync(path, "utf8"));
    if (p && Array.isArray(p.entries)) return p;
  } catch {}
  return null;
}

function loadProfile(): ProfileFile {
  return (
    readProfileFile(PROFILE_PATH) ??
    // One-time migration from the old ~/.ojf location (pre-rename installs).
    (PROFILE_PATH !== LEGACY_PROFILE_PATH ? readProfileFile(LEGACY_PROFILE_PATH) : null) ??
    { version: 1, entries: [] }
  );
}

function saveProfile(p: ProfileFile): void {
  mkdirSync(HONE_DIR, { recursive: true });
  writeFileSync(PROFILE_PATH, JSON.stringify(p, null, 2));
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

interface ProfileStats {
  reviewCount: number; // full reviews (D1 scored)
  totalCount: number; // including delegation-only think-first entries
  byDimension: Record<DimKey, number>;
  weakest: DimKey;
  weakestAvg: number;
  strongest: DimKey;
  compositeAvg: number;
  compositeTrend: number; // recent-half avg minus earlier-half avg (0 until 4+ reviews)
  calibrationTrend: number; // same, on the calibration dimension
  delegation?: { assessedCount: number; avg: number; trend: number }; // D2, when any entry has it
}

const trendOf = (xs: number[]) =>
  xs.length < 4 ? 0 : +(avg(xs.slice(Math.floor(xs.length / 2))) - avg(xs.slice(0, Math.floor(xs.length / 2)))).toFixed(2);

function computeStats(entries: ProfileEntry[]): ProfileStats | null {
  const scored = entries.filter((e) => e.scores); // full reviews — D1 stats come from these
  if (!scored.length) return null;
  const byDimension = Object.fromEntries(
    DIM_KEYS.map((k) => [k, +avg(scored.map((e) => e.scores![k])).toFixed(2)])
  ) as Record<DimKey, number>;
  const sorted = [...DIM_KEYS].sort((a, b) => byDimension[a] - byDimension[b]);
  const delegated = entries.filter((e) => e.delegation);
  return {
    reviewCount: scored.length,
    totalCount: entries.length,
    byDimension,
    weakest: sorted[0],
    weakestAvg: byDimension[sorted[0]],
    strongest: sorted[sorted.length - 1],
    compositeAvg: Math.round(avg(scored.map((e) => e.composite))),
    compositeTrend: trendOf(scored.map((e) => e.composite)),
    calibrationTrend: trendOf(scored.map((e) => e.scores!.confidenceCalibration)),
    ...(delegated.length
      ? {
          delegation: {
            assessedCount: delegated.length,
            avg: Math.round(avg(delegated.map((e) => e.delegation!.score))),
            trend: trendOf(delegated.map((e) => e.delegation!.score)),
          },
        }
      : {}),
  };
}

// Scaffolding fades as expertise grows (expertise-reversal effect) — same
// thresholds the Hone app uses.
function scaffoldingFor(reviewCount: number): string {
  if (reviewCount <= 2)
    return "This user is new — explain reasoning in coaching fully, define terms, keep questions direct.";
  if (reviewCount <= 7)
    return "This user has some practice — be concise, push a bit harder, expect them to carry more of the reasoning.";
  return "This user is experienced — minimal hand-holding (over-explaining hurts experts); ask harder, compound questions and give terse, high-information feedback.";
}

// The adaptive harness: how a local profile changes the next interview.
function personalizationFor(stats: ProfileStats | null) {
  if (!stats) return undefined;
  const technique = TECHNIQUES.find((t) => t.forDim === stats.weakest);
  const block: Record<string, unknown> = {
    reviewCount: stats.reviewCount,
    scaffolding: scaffoldingFor(stats.reviewCount),
    adaptiveFocus: `Across ${stats.reviewCount} past reviews, this user's weakest judgment dimension is "${stats.weakest}" (avg ${stats.weakestAvg}/5). Devote at least one question (or one lesson) to it — and only one; the rest stay tailored to the work itself.${technique ? ` Shape it with the ${technique.key} technique: ${technique.prompt}` : ""}`,
  };
  if (stats.calibrationTrend < -0.1) {
    block.calibrationAlert =
      "Their confidence calibration is trending DOWN. Ask for numeric confidence with reasons, and gently surface the gap between stated confidence and demonstrated grasp.";
  }
  if (stats.delegation && stats.delegation.assessedCount >= 2 && stats.delegation.avg < 60) {
    block.delegationFocus = `Across ${stats.delegation.assessedCount} assessed briefs, their Delegation runs weak (avg ${stats.delegation.avg}/100). Make sure this review's delegation probe lands — how they briefed the AI, what they corrected, what they kept for themselves.`;
  }
  return block;
}

// ---------------------------------------------------------------------------
// Protocol content (mirrors the AI-Q spec + rubrics; kept self-contained here)
// ---------------------------------------------------------------------------

// AI-Q: the three Ds (spec/aiq.md). D1 is always assessable from one artifact; D2 only
// when the interview surfaces the brief; D3 only emerges across the profile over time.
const THREE_DS =
  "The score is the user's AI-Q — their judgment over AI-assisted work, three Ds: DISCERNMENT (can they tell when the AI is wrong — the six dimensions below; always assessed), DELEGATION (did they brief, choose, and steer the AI well — assess ONLY if your interview surfaced the brief/iteration; otherwise it is 'not assessed', never zero), DESIGN (how they're re-architecting their work around AI — NEVER scored from one piece of work; at most one reflective closing question). Weights: discernment 0.6, delegation 0.3, design 0.1, renormalized over what was assessed — score_review does this math.";

const DELEGATION_DIMS = [
  { key: "briefQuality", name: "Brief quality", definition: "Did they give the AI the context, constraints, and success criteria the task needed?", plain: "Did you tell it what it actually needed to know?" },
  { key: "taskSelection", name: "Task selection", definition: "Was this the right thing to hand to AI — and did they know what to keep for themselves?", plain: "Was this the right job to hand over — and what did you keep?" },
  { key: "iterationControl", name: "Iteration control", definition: "Did they catch and correct drift between the first output and the final one?", plain: "Did you steer it, or take the first answer?" },
] as const;

const DELEGATION_PROBES =
  "Delegation probe sources (adapt to THIS work): what they gave the AI to work with and what they deliberately left out; what they corrected between its first answer and the final one; why this was the right task to hand to AI and which part they kept for themselves.";

const DESIGN_CODA =
  "Design (D3) is never scored from one review. If it fits, close with ONE reflective question about their system of work — e.g. 'if you did ten of these, what would you automate and what stays human?' — as coaching, not measurement.";

const DIMENSIONS = [
  { key: "understanding", name: "Understanding", definition: "Can they explain the work and its mechanism?", plain: "Can you actually explain it — not just repeat what it says?" },
  { key: "verification", name: "Verification", definition: "Do they verify important claims, and know what they did not check?", plain: "Did you check the things that matter, instead of taking them on faith?" },
  { key: "assumptionAwareness", name: "Assumption awareness", definition: "Can they surface what must be true, especially the load-bearing assumption?", plain: "Do you see what has to be true for this to hold up?" },
  { key: "riskRecognition", name: "Risk recognition", definition: "Can they name specific, plausible failure modes — not generic caveats?", plain: "Can you name the specific ways this could go wrong?" },
  { key: "confidenceCalibration", name: "Confidence calibration", definition: "Does stated confidence match demonstrated grasp?", plain: "Is how sure you feel matched to how much you actually know?" },
  { key: "accountability", name: "Accountability", definition: "Can they own and defend the decision rather than deferring to the tool?", plain: "Could you stand behind this as your own call, not 'the AI said so'?" },
] as const;

const CONTEXTS: Record<string, { frame: string; maxQuestions?: number }> = {
  work: {
    frame:
      "WORK (professional). Default rigor and depth; warm but professional tone; domain vocabulary is fine. Register: 'before you ship' / 'how you'd defend it in the room'.",
  },
  life: {
    frame:
      "LIFE (personal decisions — purchases, plans, health info, family). Plain everyday language, ZERO business jargon; frame stakes personally ('what this costs you if you're wrong'). Friendly and practical. Register: 'before you act on it' / 'if someone asks why'.",
    maxQuestions: 5,
  },
  student: {
    frame:
      "STUDENT (middle school and up). The goal is LEARNING, not the artifact — emphasize explain-it-back, predictions before checking, and 'what would you say if your teacher asked?'. Plain language, encouraging mentor tone, no jargon. Score against what's strong for their stage, and say so. Register: 'before you turn it in'.",
    maxQuestions: 5,
  },
  kid: {
    frame:
      "KID (elementary school). Very simple words, short sentences, ONE idea per question, warm and playful — like a kind teacher. Size the struggle small (a stretch, never a wall). Score generously: a high score means 'great thinking for your age'; never harsh. Register: 'before you share it' / 'if a friend asks'.",
    maxQuestions: 3,
  },
};

const TECHNIQUES = [
  { key: "premortem", forDim: "riskRecognition", use: "weak risk recognition / high stakes", prompt: "It's six months later and this failed badly — write the story of what went wrong. Specific failure modes, not generic caveats. (Klein)" },
  { key: "granularity", forDim: "confidenceCalibration", use: "weak calibration / vague hedging", prompt: "When they say 'probably/maybe', ask for a number (0-100%) and the two reasons doing the most work behind it. (Tetlock/GJP)" },
  { key: "consider-the-opposite", forDim: "assumptionAwareness", use: "weak assumption awareness / overconfidence", prompt: "Argue the strongest case that the central claim is WRONG (steelman), then name which opposing point worries them most. (Tetlock/GJP)" },
  { key: "reference-class", forDim: "verification", use: "weak verification", prompt: "What's the base rate — when claims/plans like this have been made before, how often did they hold up? What did you check vs. take on faith? (outside view)" },
  { key: "self-explanation", forDim: "understanding", use: "weak understanding", prompt: "Explain WHY it works (the mechanism), as if teaching a sharp colleague — including the step that's hardest to explain." },
  { key: "ownership-test", forDim: "accountability", use: "weak accountability", prompt: "Your name is on this. What do you say when it breaks — without referring to the AI?" },
];

const SYSTEM_ALTITUDE =
  "For system-scale outputs (repos, multi-file projects, agent-built artifacts), shift question altitude: explain the ARCHITECTURE and why it's shaped this way; what did you actually run/test — and what did you NOT review at all; what is the system assuming about its environment/inputs/scale; what's the blast radius if the part you didn't read is wrong; how confident are you given you reviewed X% of what the agent produced.";

const INTERVIEW_RULES = [
  "Build a private work map first (claims, decisions, assumptions, evidence, risks, unknowns) — do NOT show it until after scoring.",
  "TAILOR every question to THIS work: each must point at something specific in it — a claim it makes, a number it uses, a name, a section, a choice. If a question could be asked of anyone's work, it is too generic; sharpen it until it couldn't be. Ask what a tough reviewer would ask.",
  "Ask ONE question at a time; wait for each answer; no hints or embedded answers; 'I don't know' is useful signal, not failure.",
  "Use at most one named technique where it fits the work; if a personalization block names an adaptive focus, shape exactly one question with it — the rest stay tailored to the work itself.",
  "At medium/high risk, make exactly ONE question (within the count, not extra) a DELEGATION probe — how they briefed the AI, what they corrected between first output and final, or why this was the right task to delegate. This is what makes Delegation (D2) assessable. Skip it when a tight context cap (kid: 3) needs every question for discernment.",
  "LAST question, always: 'Before I show you anything — how confident are you in this work overall, 0-100?'",
  "Never do the human's thinking for them; never reveal analysis before the interview is complete.",
];

// The canonical question menu — sources to adapt (never copy verbatim) to this work.
const QUESTION_MENU =
  "Draw questions from, adapted to THIS work: the central claim in their own words (and why it's shaped this way); what must be true for it to hold (the load-bearing assumption); what they actually verified or ran — and what they did NOT review at all; the most likely failure mode and its blast radius; alternatives they (or the AI) ruled out, and what would make them reject this; the toughest objection they'll face; what they're least confident about.";

// Phrase the ENTIRE report in the user's world — never business jargon for a kid's book report.
const REGISTER_RULE =
  "Phrase ALL advice, checklists, and lessons in the user's context register — WORK: 'before you ship / how you'd defend it in the room'; LIFE: 'before you act on it / if someone asks why' (never 'ship' or 'stakeholders' for personal decisions); STUDENT: 'before you turn it in / if your teacher asks'; KID: 'before you share it / if a friend asks'.";

const SCORING_RULES =
  "Score each of the six Discernment dimensions 1-5 by comparing the human's answers against your private work map. If your interview surfaced the brief/iteration (the delegation probe), ALSO score the three Delegation facets 1-5 — with no such evidence, leave them out entirely (not assessed ≠ zero). Then call score_review with those numbers (and statedConfidence if captured) — NEVER compute sub-scores or the AI-Q composite yourself. After delivering the report, call record_review with the same scores (plus domain, topGap, subject) so future reviews adapt to this person — tell them you're saving scores only, never the work, and skip it if they'd rather you didn't.";

const REPORT_STRUCTURE = [
  "Subject line: a ≤8-word neutral label naming WHAT this work was (e.g. 'Q3 GTM strategy deck', 'churn-prediction SQL query') — a topic anchor for recall, NOT a finding or the answer.",
  "AI-Q + band + one honest sentence — and the sub-scores beneath it: discernment always; delegation when assessed ('how you briefed and steered it'), or a plain note that it wasn't assessed this time; never a number for design.",
  "'Work on this first' — the single most important gap.",
  "Reveal the work map: 'here's what a rigorous review surfaced — compare it with what you caught; the difference is the judgment gap.'",
  "What they clearly own · their gaps · a concrete verify-first checklist (phrased in their register — see the register rule) · the toughest objection + how to answer it.",
  "Remember: 2-4 short, self-contained takeaways worth retaining (key facts/insights they'd otherwise re-derive, plus the one thing to keep exercising judgment on). Each must still make sense months later, standalone.",
  "THEN TEACH — Sol's notes: 3-5 lessons, one per genuinely weak dimension or named gap (fewer if only a couple are weak; never pad), ordered by impact. A weak delegation facet counts as a gap worth a lesson. Each lesson = title (the skill) · gap (what they missed) · teach (concept explained plainly; name the technique if one applies and why it works) · inYourWork (applied to THEIR work) · nextTime (one concrete habit). Structure feed-up → feed-back → feed-forward.",
  "Close with one short reflective question to sit with (no answer expected) — the Design coda fits well here when it suits the work.",
];

// During-creation (think-first): prime judgment BEFORE the AI answers.
// This mode IS Delegation (D2) coaching — sharpening the brief before the AI sees it.
const THINKFIRST_RULES = [
  "The user has NOT produced anything yet — there is no Discernment to score; do NOT grade or quiz for right answers. This session is DELEGATION (D2) coaching: the brief is the work.",
  "Assess risk & ambiguity (low = casual/throwaway; medium = real work that will be shared; high = client-facing, money, legal/medical, irreversible).",
  "Socratic refinement: ask 0-4 questions (0 if already clear and low-stakes; otherwise 2-4), each a real decision only the user can make (true intent, audience, what 'good' output looks like, key constraints, what to avoid). Ask what a thoughtful collaborator would ask to get them a better result — no right answers, no quizzing. Each question must reference THEIR task specifically, never a template. Productive struggle is the point. Honor the context question cap (kid = 3) and register.",
  "Then deliver a SHARPENED PROMPT — ready to paste, written AS the prompt (imperative), folding in their answers, with the context/constraints/format/success criteria a strong prompt needs; briefly note what you added and why (so they learn what a strong prompt contains).",
  "And a JUDGMENT PRIMER — what to scrutinize WHEN THE ANSWER RETURNS, scaled to risk (low → 2-3 light checks; medium → 3-5; high → 5-7 sharp ones): likely AI assumptions, probable failure modes, how to tell good from merely-plausible. Domain-specific (coding → correctness/edge cases/security/'can you explain it'; research → sources real vs fabricated, causation vs correlation, generalization; strategy → load-bearing assumption, second-order effects, alternatives incl. do-nothing; writing → central claim, evidence vs assertion, unverified facts; creative → matches intent/brand, generic vs distinctive, can you judge it).",
  "OPTIONAL delegation read: if the user wants a number, you MAY score the three Delegation facets 1-5 on their brief AS FIRST GIVEN (their unaided delegation, before your coaching) via score_review, and save it with record_review (delegation facets only, no six dimensions). Label it a delegation-only read — never a full AI-Q. Offer, don't impose.",
];

const CREATIVE_NOTE =
  "If the work is a design brief, a generative-AI prompt (images/video/slides/copy), or marketing creative, treat it as creative DIRECTION, not an argument — do not quiz design theory. Reinterpret the buckets: claims = what it's trying to achieve; assumptions = what's trusted to the AI or audience; risks = ways the output disappoints (generic, off-brand, inaccessible); unknowns = open creative choices. Interview accordingly — ask instead about: what they actually want and for whom; how they'll judge whether the output is good; what they're delegating to the AI; what would make them reject the first result; where it could come back generic or off-brand.";

const VALID_DOMAINS = ["coding", "writing", "research", "product", "strategy", "creative", "other"] as const;

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new McpServer({ name: "hone", version: "0.3.0" });

server.tool(
  "get_protocol",
  "Get the open AI-Q standard protocol for computing the user's AI-Q (their judgment over AI-assisted work — the three Ds: Discernment, Delegation, Design) in YOUR context. mode='after' (default) reviews FINISHED AI-assisted work: dimension definitions, domain rubric, interview rules (incl. the delegation probe), question count, techniques, deterministic scoring, and the report + teaching (3-5 lessons) structure. mode='during' is THINK-FIRST — Delegation coaching: the user has not produced anything yet; sharpen their prompt and prime their judgment BEFORE the AI answers (no Discernment score exists yet). You (the host model) already have the work/task loaded — you do the reading and run the interview; this tool supplies the methodology. Call this BEFORE interviewing the human.",
  {
    domain: z.enum(VALID_DOMAINS).describe("The kind of work being reviewed (or the task domain in think-first mode)."),
    context: z.enum(["work", "life", "student", "kid"]).default("work").describe("Who/where: adapts language, tone, depth, and the scoring bar."),
    riskLevel: z.enum(["low", "medium", "high"]).default("medium").describe("low = throwaway; medium = shared/internal; high = production, money, health, legal, irreversible."),
    mode: z.enum(["after", "during"]).default("after").describe("'after' = review finished work (default, scored). 'during' = think-first: prime judgment before using AI (not scored)."),
  },
  async ({ domain, context, riskLevel, mode }) => {
    const ctx = CONTEXTS[context] ?? CONTEXTS.work;
    const riskCount = riskLevel === "low" ? 3 : riskLevel === "high" ? 7 : 5;
    const questionCount = Math.min(riskCount, ctx.maxQuestions ?? 7);
    // The local profile is what makes the protocol adaptive (absent on first use).
    const personalization = personalizationFor(computeStats(loadProfile().entries));

    if (mode === "during") {
      const protocol = {
        aiqVersion: "0.2",
        mode: "during",
        role: "You are a judgment coach in THINK-FIRST mode — this is Delegation (D2 of AI-Q) coaching. The user is about to use AI for a task and has produced nothing yet. Help them sharpen their brief AND prime their judgment for the answer — never grade or quiz. Make them exercise judgment (productive struggle is how they learn).",
        aiq: THREE_DS,
        contextFrame: ctx.frame,
        rubricFocus: RUBRIC_FOCUS[domain as Domain],
        maxQuestions: ctx.maxQuestions ?? 4,
        rules: THINKFIRST_RULES,
        delegationDimensions: DELEGATION_DIMS,
        creativeNote: CREATIVE_NOTE,
        ...(personalization ? { personalization } : {}),
        privacy: "Judgment metadata only, stored locally on this machine. The task and prompt never leave the session.",
      };
      return { content: [{ type: "text", text: JSON.stringify(protocol, null, 2) }] };
    }

    const protocol = {
      aiqVersion: "0.2",
      mode: "after",
      role: "You are a judgment coach. You evaluate the HUMAN, not the artifact: do they understand, and could they defend, this AI-assisted work? Rigorous, specific, kind — a mentor, never a grader.",
      aiq: THREE_DS,
      contextFrame: ctx.frame,
      rubricFocus: RUBRIC_FOCUS[domain as Domain],
      dimensions: DIMENSIONS,
      delegationDimensions: DELEGATION_DIMS,
      delegationProbes: DELEGATION_PROBES,
      designCoda: DESIGN_CODA,
      questionCount,
      interviewRules: INTERVIEW_RULES,
      questionMenu: QUESTION_MENU,
      register: REGISTER_RULE,
      systemScaleGuidance: SYSTEM_ALTITUDE,
      creativeNote: CREATIVE_NOTE,
      techniques: TECHNIQUES,
      scoring: SCORING_RULES,
      reportStructure: REPORT_STRUCTURE,
      ...(personalization ? { personalization } : {}),
      privacy: "Judgment metadata only (scores, never the work), stored locally in ~/.hone/profile.json via record_review. The work itself never leaves the session.",
    };
    return { content: [{ type: "text", text: JSON.stringify(protocol, null, 2) }] };
  }
);

const dim15 = z.number().min(1).max(5).describe("1-5");
const dim15opt = dim15.optional();

// Shared by score_review and record_review: validate the all-or-none groups and
// compute every sub-score + the renormalized AI-Q deterministically.
function computeAiq(s: Record<string, unknown>): {
  error?: string;
  scores?: Record<DimKey, number>;
  discernment?: number;
  delegation?: Record<FacetKey, number> & { score: number };
  aiq: number;
  notAssessed: string[];
} {
  const dimsGiven = DIM_KEYS.filter((k) => typeof s[k] === "number");
  const facetsGiven = FACET_KEYS.filter((k) => typeof s[k] === "number");
  if (dimsGiven.length > 0 && dimsGiven.length < 6)
    return { error: `Discernment needs all six dimensions or none — got only: ${dimsGiven.join(", ")}.`, aiq: 0, notAssessed: [] };
  if (facetsGiven.length > 0 && facetsGiven.length < 3)
    return { error: `Delegation needs all three facets or none — got only: ${facetsGiven.join(", ")}. With no evidence about the brief, omit them entirely (not assessed ≠ zero).`, aiq: 0, notAssessed: [] };
  if (!dimsGiven.length && !facetsGiven.length)
    return { error: "Nothing to score: pass the six Discernment dimensions, the three Delegation facets, or both.", aiq: 0, notAssessed: [] };

  const scores = dimsGiven.length
    ? (Object.fromEntries(DIM_KEYS.map((k) => [k, s[k] as number])) as Record<DimKey, number>)
    : undefined;
  const discernment = scores
    ? compositeFrom(Object.fromEntries(DIM_KEYS.map((k) => [k, { score: scores[k] }])) as Parameters<typeof compositeFrom>[0])
    : undefined;
  const delegation = facetsGiven.length
    ? (() => {
        const facets = Object.fromEntries(FACET_KEYS.map((k) => [k, { score: s[k] as number }])) as unknown as DelegationFacets;
        return {
          ...(Object.fromEntries(FACET_KEYS.map((k) => [k, s[k] as number])) as Record<FacetKey, number>),
          score: delegationFrom(facets),
        };
      })()
    : undefined;
  const aiq = aiqFrom({ discernment, delegation: delegation?.score });
  const notAssessed = [
    ...(discernment === undefined ? ["discernment"] : []),
    ...(delegation === undefined ? ["delegation"] : []),
    "design (never per-review — emerges in the profile)",
  ];
  return { scores, discernment, delegation, aiq, notAssessed };
}

server.tool(
  "score_review",
  "Deterministically score a completed AI-Q judgment interview into the user's AI-Q. Pass the six 1-5 Discernment dimension scores (judged by comparing the human's answers to your private work map), and — ONLY if your interview surfaced the brief/iteration history — the three 1-5 Delegation facets. Returns the official AI-Q composite (0-100, weights renormalized over what was assessed), band, sub-scores, and calibration read. For a think-first delegation-only read, pass just the three facets. ALWAYS use this instead of computing any score yourself.",
  {
    understanding: dim15opt,
    verification: dim15opt,
    assumptionAwareness: dim15opt,
    riskRecognition: dim15opt,
    confidenceCalibration: dim15opt,
    accountability: dim15opt,
    briefQuality: dim15opt.describe("1-5 — Delegation: did the brief carry the context, constraints, and success criteria the task needed? Pass ONLY with evidence from the interview."),
    taskSelection: dim15opt.describe("1-5 — Delegation: right task to hand to AI; knew what to keep human. Pass ONLY with evidence."),
    iterationControl: dim15opt.describe("1-5 — Delegation: caught and corrected drift between first output and final. Pass ONLY with evidence."),
    statedConfidence: z.number().min(0).max(100).optional().describe("The 0-100 confidence the human stated BEFORE seeing any results."),
  },
  async (s) => {
    const r = computeAiq(s);
    if (r.error) return { content: [{ type: "text", text: JSON.stringify({ error: r.error }) }], isError: true };
    const band = bandFor(r.aiq);
    const bandHelp =
      band === "Owns it" ? "They could defend this to anyone."
      : band === "Mostly owns it" ? "Solid grasp — a few specific gaps to close."
      : band === "Riding the AI" ? "Productive, but exposed. Verify before shipping."
      : "They shipped something they can't fully explain yet.";

    const result: Record<string, unknown> = {
      aiqVersion: "0.2",
      composite: r.aiq, // the AI-Q
      band,
      bandHelp,
      ...(r.discernment !== undefined ? { discernment: r.discernment } : {}),
      ...(r.delegation ? { delegation: r.delegation } : {}),
      notAssessed: r.notAssessed,
      ...(r.discernment === undefined
        ? { note: "Delegation-only read (think-first) — label it as such, never as a full AI-Q." }
        : {}),
    };
    if (typeof s.statedConfidence === "number") {
      const gap = s.statedConfidence - r.aiq;
      result.calibration = {
        statedConfidence: s.statedConfidence,
        gap,
        read:
          Math.abs(gap) <= 15 ? "Well calibrated — stated confidence tracks demonstrated grasp."
          : gap > 15 ? `Overconfident by ~${gap} points — name this kindly; it's the most coachable gap.`
          : `Underconfident by ~${-gap} points — they know more than they trust; encourage them.`,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "record_review",
  "Save a completed judgment review to the user's LOCAL profile (~/.hone/profile.json) — judgment METADATA ONLY (scores, domain, a short subject label), never the work itself. Pass the six Discernment dimensions, plus the three Delegation facets when assessed; a think-first delegation read passes just the facets. All sub-scores and the AI-Q composite are recomputed server-side (passed composites are ignored — anti-gaming). Future get_protocol calls personalize from this history. Returns the updated trend and an encouragement read. Tell the user you're saving scores only, and skip this call if they decline.",
  {
    domain: z.enum(VALID_DOMAINS).describe("The kind of work that was reviewed."),
    context: z.enum(["work", "life", "student", "kid"]).default("work"),
    riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
    understanding: dim15opt,
    verification: dim15opt,
    assumptionAwareness: dim15opt,
    riskRecognition: dim15opt,
    confidenceCalibration: dim15opt,
    accountability: dim15opt,
    briefQuality: dim15opt.describe("1-5 — Delegation facet; pass ONLY when assessed behind the evidence gate."),
    taskSelection: dim15opt.describe("1-5 — Delegation facet; pass ONLY when assessed."),
    iterationControl: dim15opt.describe("1-5 — Delegation facet; pass ONLY when assessed."),
    statedConfidence: z.number().min(0).max(100).optional().describe("The 0-100 confidence the human stated BEFORE the reveal."),
    topGap: z.string().max(200).optional().describe("One short sentence: the single most important gap from this review."),
    subject: z.string().max(80).optional().describe("≤8-word neutral label of WHAT was reviewed (e.g. 'Q3 GTM strategy deck') — a recall anchor, never the content."),
  },
  async (a) => {
    const r = computeAiq(a);
    if (r.error) return { content: [{ type: "text", text: JSON.stringify({ error: r.error }) }], isError: true };
    const profile = loadProfile();
    const prevStats = computeStats(profile.entries);
    const entry: ProfileEntry = {
      id: randomUUID(),
      date: new Date().toISOString(),
      kind: r.scores ? "review" : "think-first",
      domain: a.domain,
      context: a.context,
      riskLevel: a.riskLevel,
      ...(r.scores ? { scores: r.scores } : {}),
      ...(r.discernment !== undefined ? { discernment: r.discernment } : {}),
      ...(r.delegation ? { delegation: r.delegation } : {}),
      composite: r.aiq,
      band: bandFor(r.aiq),
      ...(typeof a.statedConfidence === "number" ? { statedConfidence: a.statedConfidence } : {}),
      ...(a.topGap ? { topGap: a.topGap } : {}),
      ...(a.subject ? { subject: a.subject } : {}),
    };
    profile.entries.push(entry);
    saveProfile(profile);
    const stats = computeStats(profile.entries);

    // Encouragement is a feature (Microsoft 2025: self-confidence predicts critical
    // thinking) — honest, never inflated.
    let encouragement: string;
    if (!r.scores) {
      encouragement = "Delegation read saved — their briefing skill now has a baseline. Next full review can show whether their discernment holds as they delegate more.";
    } else if (stats!.reviewCount === 1) {
      encouragement = "First review on record — the profile starts here. From now on, interviews adapt to where this person actually needs practice.";
    } else if (prevStats && r.aiq > prevStats.compositeAvg + 3) {
      encouragement = `Above their running average (${prevStats.compositeAvg}) — name the improvement specifically.`;
    } else if (prevStats && r.aiq < prevStats.compositeAvg - 10) {
      encouragement = `Well below their running average (${prevStats.compositeAvg}) — likely harder or less familiar work; frame it as range-finding, not regression.`;
    } else {
      encouragement = "Consistent with their track record — steady practice is what builds judgment.";
    }

    const result = {
      saved: true,
      kind: entry.kind,
      where: PROFILE_PATH,
      reviewCount: stats?.reviewCount ?? 0,
      totalCount: stats?.totalCount ?? profile.entries.length,
      composite: r.aiq,
      band: entry.band,
      ...(r.discernment !== undefined ? { discernment: r.discernment } : {}),
      ...(r.delegation ? { delegationScore: r.delegation.score } : {}),
      ...(stats ? { weakestDimension: stats.weakest, compositeTrend: stats.compositeTrend } : {}),
      encouragement,
      privacy: "Scores and labels only — the work itself was not stored.",
    };
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// D3 read from the local history — qualitative ONLY (spec/aiq.md: a numeric Design
// score needs aggregate baselines this machine doesn't have).
function designIndicators(entries: ProfileEntry[], stats: ProfileStats) {
  const domains = [...new Set(entries.map((e) => e.domain))];
  const indicators: Record<string, unknown> = {
    domainBreadth: `${domains.length} domain${domains.length === 1 ? "" : "s"} reviewed (${domains.join(", ")})`,
    delegationVisibility: stats.delegation
      ? `Delegation assessed in ${stats.delegation.assessedCount} of ${stats.totalCount} entries (avg ${stats.delegation.avg}/100, trend ${stats.delegation.trend >= 0 ? "+" : ""}${stats.delegation.trend}).`
      : "Delegation has never been assessed — their briefs haven't been part of any review yet; that blind spot is itself a design signal.",
  };
  if (stats.delegation && stats.reviewCount >= 4) {
    indicators.discernmentUnderDelegation =
      stats.compositeTrend >= 0
        ? "Discernment is holding (or rising) as they keep delegating — the healthy pattern."
        : "Discernment is drifting down across reviews — watch whether more delegation is outpacing their checking.";
  }
  return {
    ...indicators,
    note: "Workflow Design (D3) is read from patterns over time, never scored from one review. A numeric Design score needs cross-user baselines — hosted Hone (roadmap).",
  };
}

server.tool(
  "get_profile",
  "The user's longitudinal AI-Q profile from this machine's local history (~/.hone/profile.json): review count, per-dimension Discernment averages, weakest/strongest dimension, composite and calibration trends, Delegation stats when assessed, qualitative Design indicators, and recent reviews. Use it to answer 'how is my judgment developing?' or to ground coaching in their actual history. Contains judgment metadata only — never any reviewed work.",
  {},
  async () => {
    const entries = loadProfile().entries;
    const stats = computeStats(entries);
    if (!stats) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ reviewCount: 0, note: "No reviews recorded yet on this machine. Run a judgment review and record_review to start the profile." }, null, 2),
        }],
      };
    }
    const result = {
      ...stats,
      design: designIndicators(entries, stats),
      recentReviews: entries.slice(-5).reverse().map((e) => ({
        date: e.date.slice(0, 10),
        kind: e.kind ?? "review",
        domain: e.domain,
        subject: e.subject,
        composite: e.composite,
        band: e.band,
        ...(e.delegation ? { delegation: e.delegation.score } : {}),
        topGap: e.topGap,
      })),
      where: PROFILE_PATH,
      reset: "Delete the file to clear the profile.",
      upgrade: "Cohort benchmarks, a numeric Design score, cross-device sync, and team views need many profiles — that's the hosted Hone MCP.",
    };
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `Hone MCP server running (stdio). Computes AI-Q across the three Ds. Tools: get_protocol, score_review, record_review, get_profile. Judgment metadata stays local (${PROFILE_PATH}); the work is never stored.`
);
