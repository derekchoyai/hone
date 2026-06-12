# Security Policy

## The short version

Hone's architecture is privacy-first by design: the open SDK, MCP server, and prompts run
**locally, store nothing, and make no network calls of their own**. Your work and your API
keys never transit through anything in this repository — the SDK is bring-your-own-model
(you pass a `ModelFn`; we never see credentials), and the MCP server has no filesystem,
network, or storage access.

That said, security issues are still possible (dependency vulnerabilities, prompt-injection
vectors in the protocol, schema-validation gaps), and we want to hear about them.

## Reporting a vulnerability

**Please do not open a public issue for security reports.**

Email **choy.derek@gmail.com** with:

- A description of the issue and where it lives (`sdk/`, `mcp/`, `integrations/`, prompts)
- Steps to reproduce
- Your assessment of impact

You'll get an acknowledgment within 72 hours and a fix-or-explanation within 14 days.

## Scope notes

- **Prompt injection:** the judgment-review protocol deliberately feeds untrusted work to
  the host model. If you find a way for reviewed work to subvert the interview or inflate
  a score (e.g. embedded instructions that manipulate the coach), that's in scope and we
  want it.
- **Supported versions:** pre-1.0, only the latest release/`main` receives fixes.
