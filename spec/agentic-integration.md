# Hone in the agentic era — skills, MCP, and benchmarks

*Spec v0.2 (design). How judgment review works when AI outputs are whole systems — repos,
multi-file documents, running apps — not paragraphs.*

> This doc is about the **integration surfaces** (skill, MCP, benchmarks). How AI-Q itself
> applies to agentic work — agent loops, automations, multi-agent — is defined in
> [`aiq.md` §"AI-Q for agentic work"](aiq.md#ai-q-for-agentic-work-loops-automations-multi-agent):
> the three Ds re-point to the loop (Verification → verification design; Risk → blast-radius
> control; Delegation → mode selection), with **no new dimension**, and the matching
> think-first move is **mode selection** (prompt vs. loop vs. multi-agent vs. do-it-yourself).

---

## The principle: the host does the reading; Hone does the judging protocol

When an agent (Claude Code, Cowork, Cursor, a CI runner) produces or holds the work, **it
already has the full context loaded** — the repo, the documents, the diff. Re-ingesting
that into a separate review service (RAG, crawlers, parsers) duplicates the hardest
infrastructure in the industry and leaks the user's work.

Hone inverts it: the review runs **inside the host environment**. The host model reads the
artifacts and conducts the interview; Hone supplies the three things the host doesn't have:

1. **The protocol** — rubrics, dimension definitions, interview technique (premortem,
   reference class, consider-the-opposite…), risk-scaled depth, context framing
   (work/life/student/kid).
2. **The memory** — the user's longitudinal Judgment Profile, which personalizes the
   interview (weakest dimension, calibration trend, goals, faded scaffolding).
3. **The mirror** — deterministic scoring, and anonymized cohort benchmarks.

Data flows are asymmetric by design: **methodology flows in; only judgment metadata flows
out.** The work itself never leaves the host. (Privacy isn't a policy here; it's the
architecture.)

## Question altitude for system-scale outputs

The six dimensions are unchanged. For large agentic outputs, interviews shift altitude:

| Dimension | Text-era probe | System-era probe |
|---|---|---|
| Understanding | "Explain the argument" | "Explain the architecture and why it's shaped this way" |
| Verification | "Which claims did you check?" | "What did you actually run/test — and what did you **not** review at all?" |
| Assumptions | "What must be true?" | "What is this system assuming about its environment, inputs, scale?" |
| Risk | "What could make this wrong?" | "What's the blast radius if the part you didn't read is wrong?" |
| Calibration | "How confident, 0-100?" | "How confident — given you reviewed X% of what the agent produced?" |
| Accountability | "Can you defend this?" | "Your name is on the deploy. What do you say when it breaks?" |

## Surface 1 — the downloadable skill (open, no account)

A skill file ([`skills/claude/SKILL.md`](../skills/claude/SKILL.md)) that any Claude
surface (Claude Code, Cowork, claude.ai projects) can load. It instructs the host model to
run the full AI-Q protocol on whatever is in context — a repo, a document set, a diff —
interviewing the human in-chat and computing their AI-Q deterministically.
Zero infrastructure; pure methodology distribution.

## Surface 2 — the local MCP (open, no account)

A thin MCP server ([`mcp/`](../mcp/) — built, working) exposing the protocol as tools, so
any MCP-capable agent can run judgment reviews natively. Judgment metadata lives in one
local file (`~/.hone/profile.json`); the reviewed work is never stored; nothing leaves the
machine.

| Tool | In | Out |
|---|---|---|
| `get_protocol` | domain, context, risk, mode | the three-Ds frame, rubric focus, dimension definitions + delegation facets/probes, interview guidance, question cap — **personalized from the local profile** (weakest-dimension technique, delegation focus, scaffolding fade, calibration alert) once history exists |
| `score_review` | six 1-5 Discernment scores; three 1-5 Delegation facets when the evidence gate is met (either group may stand alone) | the AI-Q (renormalized weights over assessed Ds), band, sub-scores, what was not assessed (deterministic — never model arithmetic) |
| `record_review` | judgment metadata only (domain, context, risk, Discernment scores and/or Delegation facets, stated confidence, top gap, subject label) | appended to the LOCAL profile; updated trend + encouragement (all sub-scores recomputed server-side — anti-gaming) |
| `get_profile` | — | longitudinal local profile (averages, weakest/strongest dimension, trends, Delegation stats, qualitative Design indicators, recent reviews) |

The local/hosted boundary: **single-machine memory is open; aggregate memory is the
product.** A local profile is what makes the open MCP genuinely adaptive — and it creates
the exact data shape that syncing later upgrades. Everything that requires many users or
many devices (cohort benchmarks, cross-device profiles, team views, the numeric Design
score that needs cross-user baselines) needs the hosted graph.

## Surface 3 — the hosted MCP (authenticated — the product)

Same tool surface, plus cross-device memory and benchmarks. This is where the Judgment
Graph accrues.

| Tool | In | Out |
|---|---|---|
| `get_protocol` | domain, context, risk, mode | as the local server, plus goal framing and history that follows you across machines |
| `record_review` | judgment metadata only (domain, context, risk, six scores, stated confidence, top gap) | updated profile summary + **benchmark placement** + encouragement |
| `get_profile` | — | longitudinal profile (averages, trends, strengths/growth) — cross-device |
| `get_benchmarks` | domain, context, risk | cohort stats (see below) |

The host agent calls `get_protocol` before interviewing, runs the interview in its own
chat, computes dimensions, then calls `record_review`. One round-trip each way; the work
never transits.

## Benchmarks — design constraints

Cohort = same (context, domain, risk band). Store only anonymized judgment metadata.

- **Mastery framing, not leaderboards.** Output percentiles and growth-relative stats
  ("your Verification improved faster than 70% of engineers between their 3rd and 6th
  review"), never ranked identities. Evidence: mastery orientation supports learning;
  performance orientation and public ranking backfire — and invite Goodharting the score.
- **Honesty gates.** No percentiles until a cohort reaches a minimum N; show bands only
  ("typical range for this kind of work") below it. Label everything as self-reported,
  protocol-scored data, not certification.
- **Encouragement is a feature.** The Microsoft 2025 finding (self-confidence predicts
  critical thinking, β=+0.26) makes encouraging comparison genuinely on-mission: the
  benchmark exists to build warranted confidence, not anxiety.
- **Anti-gaming posture.** Composite is computed server-side from dimensions; repeated
  same-day reviews of near-identical metadata are rate-weighted; benchmarks inform the
  *user*, not third parties (no employer-facing scores without explicit, separate consent).

## Why this is the moat

Anyone can copy prompts. The hosted MCP accrues what cannot be copied: longitudinal
reasoning profiles across thousands of users and the **largest dataset of how humans
exercise judgment over AI-era work** — which is what makes the personalization and the
benchmarks better every week. Open protocol, proprietary memory.
