#!/usr/bin/env node
/**
 * Math-conformance check for the gold reference transcripts.
 *
 * For every gold file, recompute the sub-scores and AI-Q composite/band from its reference
 * dimension (and delegation) scores using @hone/sdk — the SAME code the SDK, MCP, CLI, and
 * app use — and assert they match the file's stated `expected`. This guards against the gold
 * set silently drifting from the published scoring math. Deterministic; no model required.
 *
 * Run: node calibration/check-math.mjs   (needs the SDK built: npm --prefix sdk/typescript run build)
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const sdkUrl = new URL("../sdk/typescript/dist/index.js", import.meta.url).href;
const { compositeFrom, delegationFrom, aiqFrom, bandFor } = await import(sdkUrl);

const goldDir = join(here, "gold");
const files = readdirSync(goldDir).filter((f) => f.endsWith(".json"));
let failures = 0;

for (const f of files) {
  const g = JSON.parse(readFileSync(join(goldDir, f), "utf8"));
  const r = g.reference;
  const d = r.dimensions;
  const discernment = compositeFrom(
    Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { score: v }]))
  );
  let delegation;
  if (r.delegation) {
    delegation = delegationFrom(
      Object.fromEntries(Object.entries(r.delegation).map(([k, v]) => [k, { score: v }]))
    );
  }
  const composite = aiqFrom({ discernment, delegation });
  const band = bandFor(composite);

  const problems = [];
  if (discernment !== r.expected.discernment)
    problems.push(`discernment ${discernment} ≠ expected ${r.expected.discernment}`);
  if (r.delegation && delegation !== r.expected.delegation)
    problems.push(`delegation ${delegation} ≠ expected ${r.expected.delegation}`);
  if (composite !== r.expected.composite)
    problems.push(`composite ${composite} ≠ expected ${r.expected.composite}`);
  if (band !== r.expected.band) problems.push(`band "${band}" ≠ expected "${r.expected.band}"`);

  if (problems.length) {
    failures++;
    console.error(`✗ ${g.id}: ${problems.join("; ")}`);
  } else {
    console.log(`✓ ${g.id}: AI-Q ${composite} (${band})`);
  }
}

if (failures) {
  console.error(`\n${failures} gold file(s) inconsistent with @hone/sdk math.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} gold transcripts are math-consistent with @hone/sdk.`);
