# Hone Roadmap

Hone is intentionally small at v0.1. Scope grows only as real usage and contributors
justify it — a neglected, sprawling repo signals abandonment, which is worse for
credibility than a tight, maintained core.

## v0.1 (now) — the tool-first core
- Spec: six core dimensions, scoring, conformance.
- JSON schemas: review, score, rubric.
- Six domain rubrics: coding, writing, research, product, strategy, creative.
- Prompt library (zero-install reviews).
- TypeScript SDK (bring-your-own-model): `analyzeWork`, `reviewJudgment`.
- GitHub Action + CLI: `judgment-check`.
- Whitepaper + worked examples.

## v0.2 — adoption hardening
- **AI-Q and the three Ds** *(shipped — [`aiq.md`](aiq.md))*: Delegation scored behind the
  evidence gate; Design read qualitatively from the local profile; renormalized composite,
  fully v0.1-compatible.
- SDK published to npm; CLI as a standalone binary.
- **MCP bundle (`.mcpb`) for Claude Desktop** — package `mcp/` as a one-file, double-click
  install (manifest + `npx @anthropic-ai/mcpb pack`), so Desktop users never touch
  `claude_desktop_config.json`. Ship it as a GitHub release asset ("Download for Claude
  Desktop") next to the install script.
- More worked examples (especially "high-quality output, low judgment" cases).
- Rubric authoring guide; community rubric submissions.
- Conformance test suite (validate any implementation against the schemas).

## v0.3 — reach
- Python SDK port.
- Pre-commit hook; editor extensions.
- Additional domains (legal, medical, data science, design, finance) via contributors.
- A small, public benchmark of *example reviews* (not a benchmark of models).

## Out of scope (by design — belongs in the hosted product, not the framework)

The boundary: **single-machine memory is open; aggregate memory is the product.** The local
MCP keeps a judgment profile on your own machine (`~/.hone/profile.json`) and personalizes
reviews from it — that stays open. What needs many users or many devices does not:

- Cross-device, synced judgment profiles (the Judgment Graph).
- Cohort benchmarks ("how does my verification compare to other PMs?").
- The **numeric Design (D3) score** — workflow design needs cross-user baselines to be a
  defensible number; locally it stays a qualitative read ([`aiq.md`](aiq.md)).
- Team/manager analytics and dashboards.
- Any proprietary behavioral dataset.

## How to influence the roadmap
Open an issue. Usage evidence ("we adopted the Action and hit X") moves things up the list
faster than feature requests in the abstract.
