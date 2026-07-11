/**
 * Land a swarm-produced ROGUE story: read the workflow output JSON, apply its
 * repair patches, validate against the RogueStory schema + structural checks,
 * and write content/rogue-reference-story.json.
 *
 * Usage: npx tsx scripts/land-story.ts <workflow-output-file> [merge-fields.json]
 * (merge-fields: top-level fields to merge into the story before validation —
 *  used to recover fields a workflow merge step dropped.)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { RogueStory, validateRogueStructure } from "../lib/schemas/rogue";

const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, ""));

const src = process.argv[2];
if (!src) {
  console.error("usage: npx tsx scripts/land-story.ts <workflow-output-file> [merge-fields.json]");
  process.exit(1);
}

const outer = readJson(src);
const result = outer.result ?? outer;
const story = result.story;
const patches: { path: string; newValue: string; reason?: string }[] = result.patches ?? [];

// apply repair patches (dot-paths, string fields only)
for (const p of patches) {
  const parts = p.path.split(".");
  let node: Record<string, unknown> = story;
  for (const part of parts.slice(0, -1)) {
    const next = (node as Record<string, unknown>)[/^\d+$/.test(part) ? Number(part) : part];
    if (next == null || typeof next !== "object") { node = null as never; break; }
    node = next as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (node && typeof node[/^\d+$/.test(last) ? Number(last) : last] === "string") {
    (node as Record<string, unknown>)[/^\d+$/.test(last) ? Number(last) : last] = p.newValue;
    console.log(`patched ${p.path}${p.reason ? ` (${p.reason})` : ""}`);
  } else {
    console.warn(`SKIPPED patch ${p.path} — path not found or not a string`);
  }
}

if (process.argv[3]) {
  const extra = readJson(process.argv[3]);
  Object.assign(story, extra);
  console.log(`merged fields: ${Object.keys(extra).join(", ")}`);
}

// the workflow's character schema omits forPlayer (reference stories are uncast)
for (const c of [...(story.characters ?? []), ...(story.spares ?? [])])
  if (!("forPlayer" in c)) c.forPlayer = null;

const parsed = RogueStory.safeParse(story);
if (!parsed.success) {
  console.error("SCHEMA FAIL:");
  for (const issue of parsed.error.issues.slice(0, 30))
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

const problems = validateRogueStructure(parsed.data, []);
if (problems.length) {
  console.warn(`STRUCTURAL WARNINGS (${problems.length}):`);
  for (const p of problems) console.warn(`  - ${p}`);
}

writeFileSync(
  "content/rogue-reference-story.json",
  JSON.stringify(parsed.data, null, 2) + "\n",
  "utf8"
);
console.log(
  `\n✓ content/rogue-reference-story.json written — "${parsed.data.meta.title}"\n  ${parsed.data.characters.length} characters, ${parsed.data.spares.length} spares, ${parsed.data.missions.rogue.length}+${parsed.data.missions.good.length} missions, ${parsed.data.parleys.length} parleys${problems.length ? `, ${problems.length} structural warnings` : ", structurally clean"}`
);
