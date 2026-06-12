# Contributing to Hone

Hone is an early, open toolkit for measuring **AI-Q** — a person's judgment over
AI-assisted work. The fastest way to make AI-Q *the* shared vocabulary for human-judgment
measurement is to make it genuinely useful in real workflows — so the most valuable
contributions are practical, not philosophical.

## Highest-value contributions (in order)

1. **Worked examples** ([`examples/`](examples/)) — a real piece of AI-assisted work, the
   human's interview answers, and the resulting Judgment Score with analysis. Examples are
   how people understand the framework in five minutes. We especially want examples that
   show a *high-quality output handled with low judgment* (the dangerous case).
2. **Domain rubrics** ([`rubrics/`](rubrics/)) — new domains (legal, medical, data
   science, design, finance) or improvements to existing ones. Rubrics are YAML and follow
   [`spec/rubric.schema.json`](spec/rubric.schema.json).
3. **SDK language ports** — Python, Go, Rust. The reference is the TypeScript SDK
   ([`sdk/typescript/`](sdk/typescript/)). Keep the bring-your-own-model design.
4. **Integrations** ([`integrations/`](integrations/)) — pre-commit hooks, CI plugins,
   editor extensions, framework adapters. The bar: a developer adopts it in ~15 minutes.
5. **Spec improvements** — only after discussion in an issue. The spec changes slowly and
   with care.

## Principles

- **Tool over manifesto.** If a change makes Hone easier to *use*, it's probably good.
- **Auditable over clever.** Scores must be explainable from the rubric. No black boxes.
- **Provider-neutral.** Nothing should hard-depend on a single model vendor.
- **Permissive.** All contributions are under [Apache-2.0](LICENSE).

## How to propose a change

1. Open an issue describing the problem and your proposed approach.
2. For rubrics/examples/integrations, a PR is welcome directly.
3. For spec/schema changes, get rough agreement in the issue first.

## What belongs elsewhere

Hone (and the open AI-Q standard it implements) is the framework. Hosted reviews, stored
judgment profiles, team dashboards, benchmark datasets, and adaptive coaching are out of
scope here — those live in the hosted Hone app built on it. Keep this repo a clean,
embeddable building block.
