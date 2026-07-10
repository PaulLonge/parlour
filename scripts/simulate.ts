/**
 * Scripted-bot simulation: a full game, no LLM, straight through the referee.
 * Proves: phases, arming, the kill lock (near-miss race), death, voting,
 * banishment-with-reveal, respawn, endgame reveal — and that illegal moves bounce.
 *
 * Run:  npm run simulate   (needs .env.local with Supabase URL + service key)
 * It creates a throwaway game and deletes it afterwards.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// --- load .env.local (tsx doesn't) ---
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// imported AFTER env so lib code sees the vars
const { applyDirectorMoves, completeChallenge, castVote, closeVote } = await import(
  "../lib/engine/referee"
);
const { loadState } = await import("../lib/engine/state");
const { Story } = await import("../lib/schemas/story");
const goldenJson = (await import("../content/golden-story.json")).default;

const admin = createClient(url, key, { auth: { persistSession: false } });

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label} ${extra}`);
  }
}

const NAMES = ["Paul", "Co-Host", "Alex", "Sam", "Jess", "Tom", "Priya", "Dan"];

console.log("— creating throwaway game…");
const { data: game, error: gErr } = await admin
  .from("games")
  .insert({ code: `SIM${Math.floor(Math.random() * 90 + 10)}`, title: "Simulation" })
  .select()
  .single();
if (gErr) throw new Error(gErr.message);
const gid = game.id as string;

try {
  const players: { id: string; name: string }[] = [];
  for (const [i, name] of NAMES.entries()) {
    const { data: p, error } = await admin
      .from("players")
      .insert({ game_id: gid, name, is_host: i === 0, status: "alive", arrived_at: new Date().toISOString() })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    players.push(p);
  }

  // seal the golden story, dealing characters in order
  const golden = Story.parse(goldenJson);
  for (const [i, p] of players.entries()) {
    const c = golden.characters[i % golden.characters.length];
    await admin.from("players").update({ character: { ...c, forPlayer: p.name } }).eq("id", p.id);
  }
  await admin
    .from("games")
    .update({ sealed_story: golden, story_public: { meta: golden.meta, skin: golden.skin } })
    .eq("id", gid);

  console.log("— phases: lobby → act1");
  let v = await applyDirectorMoves(admin, gid, [{ tool: "advance_phase", to: "act1" }]);
  check("lobby → act1", v[0].ok, v[0].detail);
  v = await applyDirectorMoves(admin, gid, [{ tool: "advance_phase", to: "round.vote" }]);
  check("act1 → round.vote is ILLEGAL", !v[0].ok, v[0].detail);

  console.log("— hybrid arming: two kill offers, one wins, one near-misses");
  v = await applyDirectorMoves(admin, gid, [
    { tool: "offer_challenge", playerName: "Co-Host", type: "kill", brief: "Hand Sam the marked glass and say cheers.", targetName: "Sam", method: "The Marked Glass", expiresInMinutes: 20 },
    { tool: "offer_challenge", playerName: "Tom", type: "kill", brief: "Slip Jess the black envelope.", targetName: "Jess", method: "The Black Envelope", expiresInMinutes: 20 },
    { tool: "send_message", playerName: "Paul", kind: "flavor", title: "The house notices you", body: "Someone has been in the study." },
  ]);
  check("both kill offers + decoy flavor accepted", v.every((x) => x.ok), JSON.stringify(v.filter((x) => !x.ok)));

  let s = await loadState(admin, gid);
  const co-host = players.find((p) => p.name === "Co-Host")!;
  const tom = players.find((p) => p.name === "Tom")!;
  const co-hostKill = s.openChallenges.find((c) => c.player_id === co-host.id && c.type === "kill")!;
  const tomKill = s.openChallenges.find((c) => c.player_id === tom.id && c.type === "kill")!;

  let r = await completeChallenge(admin, gid, co-host.id, co-hostKill.id);
  check("Co-Host's kill registers (murder_registered)", r.ok && r.result === "murder_registered", r.result);
  r = await completeChallenge(admin, gid, tom.id, tomKill.id);
  check("Tom's same-round kill is a NEAR MISS (kill lock)", !r.ok && r.result === "near_miss", r.result);

  s = await loadState(admin, gid);
  check("Co-Host is now a traitor", s.players.find((p) => p.id === co-host.id)?.role === "traitor");
  check("Sam is dead", s.players.find((p) => p.name === "Sam")?.status === "dead");
  check("Tom is still faithful (chickened-out path stays silent)", s.players.find((p) => p.id === tom.id)?.role === "faithful");

  console.log("— body found → assembly → vote → banishment");
  v = await applyDirectorMoves(admin, gid, [
    { tool: "advance_phase", to: "round.body_found" },
    { tool: "announce", text: "A glass lies on its side…", viaAnnouncer: false },
    { tool: "advance_phase", to: "round.assembly" },
    { tool: "advance_phase", to: "round.vote" },
  ]);
  check("phase march to vote", v.every((x) => x.ok), JSON.stringify(v.filter((x) => !x.ok)));

  const alive = (await loadState(admin, gid)).alive;
  for (const voter of alive) {
    const target = voter.name === "Co-Host" ? players.find((p) => p.name === "Paul")! : co-host; // mob votes Co-Host
    const res = await castVote(admin, gid, voter.id, target.id);
    check(`${voter.name} votes`, res.ok, res.result);
  }
  const deadSam = players.find((p) => p.name === "Sam")!;
  const badVote = await castVote(admin, gid, deadSam.id, co-host.id);
  check("dead player cannot vote", !badVote.ok, badVote.result);

  const tally = await closeVote(admin, gid);
  check("vote closes: traitor banished", tally.ok && tally.result === "banished_traitor", tally.result);
  s = await loadState(admin, gid);
  check("Co-Host is banished", s.players.find((p) => p.id === co-host.id)?.status === "banished");

  console.log("— respawn the dead as a spare character");
  v = await applyDirectorMoves(admin, gid, [{ tool: "respawn", playerName: "Sam" }]);
  check("Sam respawns", v[0].ok, v[0].detail);
  s = await loadState(admin, gid);
  const sam = s.players.find((p) => p.name === "Sam")!;
  check("Sam is alive again, faithful, with a spare persona", sam.status === "alive" && sam.role === "faithful" && !!(sam.character as { personaName?: string })?.personaName);

  console.log("— next round, murder window kill, then endgame");
  v = await applyDirectorMoves(admin, gid, [
    { tool: "advance_phase", to: "round.social" },
    { tool: "advance_phase", to: "round.murder_window" },
    { tool: "offer_challenge", playerName: "Priya", type: "kill", brief: "Whisper the words.", targetName: "Dan", method: "The Whispered Word", expiresInMinutes: 10 },
  ]);
  check("round 2 setup", v.every((x) => x.ok), JSON.stringify(v.filter((x) => !x.ok)));
  s = await loadState(admin, gid);
  check("round_no incremented to 2", s.game.round_no === 2, String(s.game.round_no));
  const priya = players.find((p) => p.name === "Priya")!;
  const pKill = s.openChallenges.find((c) => c.player_id === priya.id && c.type === "kill")!;
  r = await completeChallenge(admin, gid, priya.id, pKill.id);
  check("round-2 murder registers", r.ok, r.result);

  v = await applyDirectorMoves(admin, gid, [
    { tool: "advance_phase", to: "round.body_found" },
    { tool: "advance_phase", to: "round.assembly" },
    { tool: "advance_phase", to: "round.vote" },
    { tool: "close_vote" }, // nobody voted → no banishment
    { tool: "advance_phase", to: "endgame" },
    { tool: "advance_phase", to: "reveal" },
    { tool: "advance_phase", to: "ended" },
  ]);
  check("march to ended", v.every((x) => x.ok), JSON.stringify(v.filter((x) => !x.ok)));

  const { data: revealEv } = await admin
    .from("events")
    .select("payload")
    .eq("game_id", gid)
    .eq("type", "reveal_roles")
    .single();
  check("reveal_roles event emitted with full cast", Array.isArray((revealEv?.payload as { players?: unknown[] })?.players));

  const { count } = await admin.from("events").select("*", { count: "exact", head: true }).eq("game_id", gid);
  console.log(`\nEvent log: ${count} events recorded.`);
} finally {
  await admin.from("games").delete().eq("id", gid);
  console.log("— throwaway game deleted.");
}

if (failures) {
  console.error(`\n❌ ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\n✅ full simulated game passed — engine holds.");
