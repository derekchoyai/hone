# Hone judgment-check — GitHub Action

Gate AI-assisted changes on whether the **author understands them**. On a pull request,
the author is asked a few judgment questions about the change; the answers are scored, and
the check fails if the AI-Q is below your threshold.

> **Status: v0.1 design scaffold.** [`action.yml`](action.yml) defines the contract
> (inputs/outputs) and prints the design. The runnable reference today is the
> [CLI](../cli). The full PR-comment bot is a v0.2 implementation task — see
> [the roadmap](../../spec/roadmap.md). It's documented here so the interface is stable
> before code lands. **Contributions welcome.**

## Intended usage

```yaml
# .github/workflows/judgment.yml
name: judgment
on: pull_request
jobs:
  judgment-check:
    runs-on: ubuntu-latest
    steps:
      - uses: derekchoyai/hone/integrations/github-action@v0
        with:
          domain: coding
          paths: "src/**/*.ts"
          model: openai
          min-score: 55
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Intended flow (the PR-bot UX)

1. **PR opened/updated** touching matched files → the Action runs `analyzeWork` on the
   diff and posts a comment: the Work Map + 3–7 interview questions (depth by risk).
2. **Author replies** to the comment answering in their own words.
3. **Re-run** → the Action runs `reviewJudgment`, edits its comment with the Judgment
   Score, gaps, and "verify before you ship" checklist, and sets the check
   pass/fail against `min-score`.

This keeps the friction proportional to risk (a low-risk change → 3 quick questions) and
makes "do you actually understand this AI-assisted change?" a visible, enforceable gate —
without slowing down generation.

## Inputs

| Input | Default | Description |
|---|---|---|
| `domain` | `auto` | coding / writing / research / product / strategy / auto |
| `paths` | PR diff | Glob of files to review |
| `model` | `openai` | `openai` or `anthropic` (key via `env`) |
| `min-score` | `55` | Fail below this AI-Q |
| `mode` | `after` | `after` or `during` |

## Want it now?

Use the [CLI](../cli) locally or in a non-interactive pipeline with `--min`:

```bash
node integrations/cli/judgment-review.mjs changed-file.ts --domain coding --min 55
```
