# hone-mcp — the open AI-Q standard MCP server

Judgment review for the agentic era, as an MCP server. Your agent (Claude Code, Cowork,
Cursor, anything MCP-capable) already has the work loaded — a repo, a diff, a document set.
This server gives it the **protocol** to review the *human's* judgment of that work, the
**deterministic AI-Q scoring** (the three Ds — Discernment, Delegation, Design;
[`spec/aiq.md`](../spec/aiq.md)) to grade it honestly, and a **local judgment profile** so
reviews adapt to where you actually need practice.

**Local and open: judgment metadata only, and only on your machine.** Scores live in
`~/.hone/profile.json`; the work you review is never stored anywhere, and nothing makes a
network call. (The hosted Hone MCP adds what one machine can't: cross-device sync, cohort
benchmarks, and team views — on this same tool surface.)

## Tools

| Tool | What it does |
|---|---|
| `get_protocol(domain, context, riskLevel, mode)` | Returns the full review methodology for the host model to run: the three-Ds frame, dimension definitions + delegation facets and probes, domain rubric, interview rules (one question at a time, confidence-before-reveal, the delegation probe at medium+ risk, techniques like premortem / consider-the-opposite / reference class), question count (risk-scaled, capped by context — kid = 3 max), system-scale guidance, and report structure. `mode: "during"` returns the think-first protocol (Delegation coaching: pick the vehicle — one-shot prompt vs. agent loop vs. multi-agent vs. do-it-yourself — then sharpen the prompt *or* the loop brief, and prime judgment; no Discernment score) instead. For agentic artifacts (loops, automations), both modes carry an `agenticNote` that re-points the probes to the loop's verification design and blast radius. **Personalized when you have history**: it tells the host your weakest dimension, which technique to shape one question with, whether your delegation needs the probe to land, and how much scaffolding you still need. |
| `score_review(six 1-5 Discernment dims, three 1-5 Delegation facets?, statedConfidence?)` | Computes the official AI-Q (0-100; weights renormalized over what was assessed), band, and sub-scores deterministically — never model arithmetic — plus a calibration read against the human's pre-reveal confidence. Delegation facets are passed ONLY when the interview surfaced the brief (the evidence gate); a think-first session can pass just the facets for a delegation-only read. |
| `record_review(domain, dims and/or facets, topGap?, subject?, …)` | Appends judgment **metadata only** to your local profile — scores, domain, band, a ≤8-word subject label. Never the work. All sub-scores and the AI-Q are recomputed server-side (passed composites are ignored — anti-gaming). Returns your trend and an honest encouragement read. |
| `get_profile()` | Your longitudinal AI-Q profile: review count, per-dimension averages, weakest/strongest dimension, composite & calibration trends, Delegation stats, qualitative Design indicators (domain breadth, delegation trend, whether discernment holds as you delegate more), recent reviews. Delete `~/.hone/profile.json` to reset. |

Contexts adapt everything: `work` (default rigor) · `life` (plain language, personal stakes)
· `student` (learning over artifact) · `kid` (simple words, max 3 questions, generous bar).

Set `HONE_HOME` to relocate the profile directory (defaults to `~/.hone`).

## Setup

**Claude Desktop — one click:** grab `hone.mcpb` from the
[latest release](https://github.com/derekchoyai/hone/releases/latest) and open it
(Settings → Extensions). No config files, no terminal. (Discoverable in the
[MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.derekchoyai/hone`.)

**Claude Code — from source:**

```bash
cd mcp && npm install && npm run build
claude mcp add hone -- node /absolute/path/to/hone/mcp/dist/index.js
```

**Claude Desktop / other MCP clients** (config JSON):

```json
{
  "mcpServers": {
    "hone": {
      "command": "node",
      "args": ["/absolute/path/to/hone/mcp/dist/index.js"]
    }
  }
}
```

## Use

In your agent session, just ask:

> "Run a judgment review on what we built today."

The agent calls `get_protocol`, reads the work it already has, interviews you one question
at a time (committing your confidence before any reveal), calls `score_review`, coaches
you on the gap between what the work needed and what you caught — then `record_review`
remembers the scores (never the work), so your next review pushes where you're weakest.

Ask *"how is my judgment developing?"* and the agent answers from `get_profile`.

## Design notes

- **Thin by design** — methodology in, judgment metadata out. The host is the ingestion and
  reasoning engine; no RAG, no network, and the only file it touches is its own profile.
- **The profile is yours**: one readable JSON file, scores only, delete to reset.
- Scoring math comes from [`hone-sdk`](../sdk/typescript) — the same code the SDK, CLI, and
  hosted product use.
- Spec: [`spec/agentic-integration.md`](../spec/agentic-integration.md). License: Apache-2.0.
