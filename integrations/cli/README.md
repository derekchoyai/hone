# judgment-review CLI

An interactive Hone judgment review in your terminal. Reads a file (or stdin), runs the
work-map + interview, and prints a AI-Q. **Working v0.1.**

## Setup (once)

```bash
# build the SDK the CLI imports
cd ../../sdk/typescript && npm install && npm run build && cd -

# set a key (either provider)
export OPENAI_API_KEY=sk-...        # default
# export ANTHROPIC_API_KEY=sk-ant-...   # then pass --model anthropic
```

## Use

```bash
node judgment-review.mjs path/to/work.md
cat draft.md | node judgment-review.mjs --domain writing
node judgment-review.mjs api.ts --domain coding --mode after --min 55
```

| Flag | Meaning | Default |
|---|---|---|
| `--domain` | coding / writing / research / product / strategy / other / auto | `auto` |
| `--mode` | `after` (review finished work) or `during` (think-first) | `after` |
| `--model` | `openai` or `anthropic` | openai if key present |
| `--min N` | exit non-zero if the AI-Q is below N (for scripting/CI) | `0` |

Env `JUDGMENT_MODEL` overrides the model id (e.g. `gpt-4o`, `claude-sonnet-4-6`).

The `--min` flag is what makes this scriptable into a pre-commit hook or pipeline: a
review below threshold fails the command.

> Packaging this as a published `npx @hone/cli` binary (no build step, depends on the
> released `@hone/sdk`) is a v0.2 task — see [the roadmap](../../spec/roadmap.md).
