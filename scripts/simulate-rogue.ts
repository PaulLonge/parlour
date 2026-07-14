/**
 * Scripted ROGUE game, no LLM: hijack → bribes (arming) → codes → accusation
 * (wrongful, then burning) → frontman rotation → unmasking, asserting the
 * economy, meters, and burning rules along the way.
 *
 * Run:  npm run simulate:rogue   (needs .env.local with Supabase URL + service key)
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const { applyDirectorMoves, castVote } = await import("../lib/engine/referee");
const { acceptOffer, hideCode, findCode, closeAccusation, resolveUnmasking } = await import(
  "../lib/engine/rogue"
);
const { sendNote, handleNote } = await import("../lib/engine/notes");
const { loadState } = await import("../lib/engine/state");

const admin = createClient(url, key, { auth: { persistSession: false } });
let failures = 0;
const check = (label: string, cond: boolean, extra = "") => {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label} ${extra}`);
  }
};

const NAMES = ["Paul", "Co-Host", "Alex", "Sam", "Jess", "Tom"];

console.log("— creating throwaway ROGUE game…");
const { data: game, error: gErr } = await admin
  .from("games")
  .insert({
    code: `RSM${Math.floor(Math.random() * 90 + 10)}`,
    title: "Rogue Simulation",
    mode: "rogue",
    config: { timeScale: 60 },
  })
  .select()
  .single();
if (gErr) throw new Error(gErr.message);
const gid = game.id as string;

try {
  const players: { id: string; name: string }[] = [];
  for (const [i, name] of NAMES.entries()) {
    const { data: p, error } = await admin
      .from("players")
      .insert({
        game_id: gid,
        name,
        is_host: i === 0,
        status: "alive",
        arrived_at: new Date().toISOString(),
        balance: 1500,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    players.push(p);
  }
  const byName = (n: string) => players.find((p) => p.name === n)!;

  console.log("— act1 → THE HIJACK");
  await admin.from("games").update({ status: "act1" }).eq("id", gid);
  let v = await applyDirectorMoves(admin, gid, [{ tool: "offer_bribe", playerName: "Co-Host", amount: 750, memo: "x", mission: "y", publicTrace: "z", expiresInMinutes: 3 }]);
  check("bribes REJECTED before hijack", !v[0].ok, v[0].detail);
  v = await applyDirectorMoves(admin, gid, [{ tool: "hijack" }]);
  check("hijack fires", v[0].ok, v[0].detail);
  let s = await loadState(admin, gid);
  check("status is live", s.game.status === "live", s.game.status);
  check("balances read zero (the vault lie)", s.players.every((p) => p.balance === 0));
  v = await applyDirectorMoves(admin, gid, [{ tool: "hijack" }]);
  check("hijack cannot fire twice", !v[0].ok, v[0].detail);

  console.log("— bribes: taking the coin is the arming");
  v = await applyDirectorMoves(admin, gid, [
    { tool: "offer_bribe", playerName: "Co-Host", amount: 750, memo: "consulting fees", mission: "say the words dead men tell no tales", publicTrace: "someone just sold the map room", expiresInMinutes: 5 },
    { tool: "offer_bribe", playerName: "Tom", amount: 750, memo: "quiet work", mission: "swap two name badges", publicTrace: "coins have moved", expiresInMinutes: 5 },
  ]);
  check("two bribes offered", v.every((x) => x.ok), JSON.stringify(v.filter((x) => !x.ok)));
  s = await loadState(admin, gid);
  const co-hostBribe = s.openChallenges.find((c) => c.player_id === byName("Co-Host").id && c.type === "bribe")!;
  let r = await acceptOffer(admin, gid, byName("Co-Host").id, co-hostBribe.id);
  check("Co-Host takes the coin", r.ok, r.result);
  s = await loadState(admin, gid);
  check("Co-Host is now a minion", s.players.find((p) => p.name === "Co-Host")?.role === "minion");
  check("Co-Host's purse credited", (s.players.find((p) => p.name === "Co-Host")?.balance ?? 0) === 750);
  check("plunder meter = accepted bribes (the twist engine)", s.game.meters.plunder === 750, String(s.game.meters.plunder));
  // Tom lets his expire silently — nothing to assert except silence: no role change
  check("Tom stays faithful (silent no)", s.players.find((p) => p.name === "Tom")?.role === "faithful");

  console.log("— front man appointment rules");
  v = await applyDirectorMoves(admin, gid, [{ tool: "appoint_frontman", playerName: "Tom" }]);
  check("cannot appoint a non-minion", !v[0].ok, v[0].detail);
  // D48: even a bought host can never front — conductors keep their WHO-surprise
  v = await applyDirectorMoves(admin, gid, [
    { tool: "offer_bribe", playerName: "Paul", amount: 100, memo: "h", mission: "m", publicTrace: "t", expiresInMinutes: 5 },
  ]);
  check("host can be offered a bribe", v[0].ok, v[0].detail);
  s = await loadState(admin, gid);
  const paulBribe = s.openChallenges.find((c) => c.player_id === byName("Paul").id && c.type === "bribe")!;
  r = await acceptOffer(admin, gid, byName("Paul").id, paulBribe.id);
  check("host takes the coin (chaos agents may)", r.ok, r.result);
  v = await applyDirectorMoves(admin, gid, [{ tool: "appoint_frontman", playerName: "Paul" }]);
  check("hosts NEVER front (D48)", !v[0].ok && v[0].detail === "hosts_never_front", v[0].detail);
  v = await applyDirectorMoves(admin, gid, [{ tool: "appoint_frontman", playerName: "Co-Host" }]);
  check("Co-Host appointed front man", v[0].ok, v[0].detail);

  console.log("— the paper trail");
  await admin.from("codes").insert({ game_id: gid, code: "BLACKTIDE", color: "red" });
  r = await hideCode(admin, gid, byName("Alex").id, "blacktide", "behind the wall map");
  check("Alex hides BLACKTIDE (case-insensitive)", r.ok, r.result);
  r = await findCode(admin, gid, byName("Alex").id, "BLACKTIDE");
  check("hider cannot find own code", !r.ok, r.result);
  r = await findCode(admin, gid, byName("Jess").id, "BLACKTIDE");
  check("Jess finds BLACKTIDE", r.ok, r.result);
  r = await findCode(admin, gid, byName("Sam").id, "BLACKTIDE");
  check("codes are found once", !r.ok, r.result);

  console.log("— the post: delivery, wiretaps, surveillance holds");
  // postage requires coins — stake the letter-writers
  await admin.from("players").update({ balance: 100 }).eq("id", byName("Alex").id);
  await admin.from("players").update({ balance: 100 }).eq("id", byName("Sam").id);
  // D38a: no stamp, no post
  let n = await sendNote(admin, gid, byName("Alex").id, "Jess", "premature scribbling");
  check("stampless note is refused — go talk in person", !n.ok && n.result === "no_stamps", String(n.result));
  v = await applyDirectorMoves(admin, gid, [
    { tool: "grant_stamps", playerName: "Alex", everyone: false, count: 2 },
    { tool: "grant_stamps", playerName: "Sam", everyone: false, count: 1 },
  ]);
  check("stamps granted", v.every((x) => x.ok), JSON.stringify(v.filter((x) => !x.ok)));
  n = await sendNote(admin, gid, byName("Alex").id, "Jess", "I think Co-Host took the coin.");
  check("plain note delivers", n.ok, String(n.result));
  const { data: jessMail } = await admin
    .from("messages")
    .select("kind, body, claimed_sender")
    .eq("player_id", byName("Jess").id)
    .eq("kind", "note");
  check("recipient got it, signed by sender", !!jessMail?.some((m) => m.claimed_sender === "Alex"));
  v = await applyDirectorMoves(admin, gid, [
    { tool: "tap_wire", targetName: "Alex", minutes: 30, tapperName: "Co-Host" }, // player tap
    { tool: "tap_wire", targetName: "Sam", minutes: 30 }, // machine surveillance
  ]);
  check("wiretaps set", v.every((x) => x.ok), JSON.stringify(v.filter((x) => !x.ok)));
  n = await sendNote(admin, gid, byName("Alex").id, "Tom", "Meet me by the map.");
  check("tapped note still delivers", n.ok, String(n.result));
  const { data: co-hostCopies } = await admin
    .from("messages")
    .select("kind, title")
    .eq("player_id", byName("Co-Host").id)
    .eq("kind", "intercept");
  check("tapper received silent copy", (co-hostCopies?.length ?? 0) > 0);
  n = await sendNote(admin, gid, byName("Sam").id, "Paul", "The machine is bluffing.");
  check("surveilled note reports posted", n.ok && n.result === "posted", String(n.result));
  const { data: heldRow } = await admin
    .from("notes")
    .select("id, status")
    .eq("game_id", gid)
    .eq("status", "held")
    .maybeSingle();
  check("…but is HELD, not delivered", !!heldRow);
  if (heldRow) {
    const hr = await handleNote(admin, gid, heldRow.id, "edit", "The machine is generous.", undefined);
    check("director edits held mail", hr.ok && hr.result === "edit", String(hr.result));
    const { data: paulMail } = await admin
      .from("messages")
      .select("body")
      .eq("player_id", byName("Paul").id)
      .eq("kind", "note");
    check("recipient got the EDITED text", !!paulMail?.some((m) => m.body === "The machine is generous."));
  }

  console.log("— wrongful accusation: the rogue profits");
  v = await applyDirectorMoves(admin, gid, [{ tool: "open_accusation" }]);
  check("accusation opens", v[0].ok, v[0].detail);
  s = await loadState(admin, gid);
  const plunderBefore = s.game.meters.plunder;
  for (const voter of ["Paul", "Alex", "Sam", "Jess"]) {
    const res = await castVote(admin, gid, byName(voter).id, byName("Tom").id); // poor innocent Tom
    check(`${voter} votes Tom`, res.ok, res.result);
  }
  let acc = await closeAccusation(admin, gid);
  check("wrongful accusation result", acc.ok && acc.result === "wrongful", acc.result);
  s = await loadState(admin, gid);
  // GDD review #7: wrongful verdicts must NOT cook the books — the plunder
  // meter contains only money the room chose to take (the ceremony replays it)
  check("plunder UNCHANGED by wrongful verdict (receipts stay honest)", s.game.meters.plunder === plunderBefore, String(s.game.meters.plunder));
  const { data: tempoEv } = await admin
    .from("events")
    .select("id")
    .eq("game_id", gid)
    .eq("type", "rogue_tempo")
    .limit(1);
  check("rogue gains tempo via director cue instead", (tempoEv ?? []).length === 1);
  check("Tom NOT burned or eliminated", s.players.find((p) => p.name === "Tom")?.burned === false);

  console.log("— the burning: right accusation, front man stays in play");
  v = await applyDirectorMoves(admin, gid, [{ tool: "open_accusation" }]);
  check("second accusation opens", v[0].ok, v[0].detail);
  for (const voter of ["Paul", "Alex", "Sam", "Jess", "Tom"]) {
    await castVote(admin, gid, byName(voter).id, byName("Co-Host").id);
  }
  acc = await closeAccusation(admin, gid);
  check("BURNING", acc.ok && acc.result === "burned", acc.result);
  s = await loadState(admin, gid);
  const co-host = s.players.find((p) => p.name === "Co-Host")!;
  check("Co-Host burned but alive and in play", co-host.burned && co-host.status === "alive");
  check("front man seat vacated", s.game.frontman_player_id === null);
  v = await applyDirectorMoves(admin, gid, [{ tool: "appoint_frontman", playerName: "Co-Host" }]);
  check("burned players never front again", !v[0].ok, v[0].detail);

  console.log("— rotation + THE UNMASKING (two-sided)");
  // recruit Sam, appoint Sam — the hat moves
  v = await applyDirectorMoves(admin, gid, [
    { tool: "offer_bribe", playerName: "Sam", amount: 500, memo: "a promotion", mission: "nod slowly at the next parley", publicTrace: "coins have moved", expiresInMinutes: 5 },
  ]);
  s = await loadState(admin, gid);
  const samBribe = s.openChallenges.find((c) => c.player_id === byName("Sam").id && c.type === "bribe")!;
  await acceptOffer(admin, gid, byName("Sam").id, samBribe.id);
  v = await applyDirectorMoves(admin, gid, [{ tool: "appoint_frontman", playerName: "Sam" }]);
  check("the hat moves to Sam", v[0].ok, v[0].detail);

  v = await applyDirectorMoves(admin, gid, [{ tool: "open_unmasking" }]);
  check("unmasking opens", v[0].ok, v[0].detail);
  for (const voter of ["Paul", "Alex", "Jess", "Tom", "Co-Host"]) {
    await castVote(admin, gid, byName(voter).id, byName("Sam").id); // they solve the LAST chapter
  }
  const endR = await resolveUnmasking(admin, gid);
  check("humans win by naming the CURRENT front man", endR.ok && endR.result === "humans_win", endR.result);
  s = await loadState(admin, gid);
  check("game is at reveal", s.game.status === "reveal");

  const { count } = await admin.from("events").select("*", { count: "exact", head: true }).eq("game_id", gid);
  const { count: txns } = await admin.from("transactions").select("*", { count: "exact", head: true }).eq("game_id", gid);
  console.log(`\nEvent log: ${count} events. Transactions (THE RECEIPTS): ${txns}.`);
} finally {
  await admin.from("games").delete().eq("id", gid);
  console.log("— throwaway game deleted.");
}

if (failures) {
  console.error(`\n❌ ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\n✅ full simulated ROGUE game passed — the machine holds.");
