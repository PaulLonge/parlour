import type { SupabaseClient } from "@supabase/supabase-js";
import { emit, loadState, type PlayerRow } from "./state";
import { credit } from "./economy";
import { GameConfig } from "@/lib/schemas/config";

// ---------------------------------------------------------------------------
// D61: the secret powers economy. Scarce one-use powers the AI grants to anyone.
// SHIELD (defence) wards your money + privacy for a window. ROB (offence) steals
// capped coins from a target — UNLESS they're shielded. Deterministic + instant;
// the involuntary effect reaches the victim as a message + a balance change,
// never a live query of the attacker. (Swap / Copy are staged.)
// ---------------------------------------------------------------------------

export type Power = "rob" | "swap" | "copy" | "shield";

function held(p: PlayerRow, power: Power): number {
  return Number((p.powers ?? {})[power] ?? 0);
}

async function spendPower(admin: SupabaseClient, p: PlayerRow, power: Power) {
  const powers = { ...(p.powers ?? {}) };
  powers[power] = Math.max(0, held(p, power) - 1);
  // optimistic-concurrency: the whole jsonb must be unchanged (two taps can't
  // share a charge — the second write sees a different object and no-ops)
  await admin.from("players").update({ powers }).eq("id", p.id).eq("powers", p.powers as never);
}

export async function usePower(
  admin: SupabaseClient,
  gameId: string,
  playerId: string,
  power: Power,
  targetName: string | undefined
): Promise<{ ok: boolean; result: string }> {
  const s = await loadState(admin, gameId);
  if (s.game.paused) return { ok: false, result: "game_paused" };
  const me = s.players.find((x) => x.id === playerId);
  if (!me || me.status !== "alive") return { ok: false, result: "not_alive" };
  if (held(me, power) < 1) return { ok: false, result: "you_don't_hold_that" };
  const cfg = GameConfig.parse(s.game.config ?? {});

  // --- SHIELD: raise your ward (D59 reframe — money + privacy, not life) ------
  if (power === "shield") {
    const until = new Date(Date.now() + (cfg.shieldMinutes / cfg.timeScale) * 60000).toISOString();
    await admin.from("players").update({ shielded_until: until }).eq("id", me.id);
    await spendPower(admin, me, "shield");
    await admin.from("messages").insert({
      game_id: gameId,
      player_id: me.id,
      round_no: s.game.round_no,
      kind: "info",
      title: "🛡 Your ward is up",
      body: `For ${cfg.shieldMinutes} minutes your purse can't be robbed and your mail can't be tapped. Nobody is told you raised it.`,
    });
    await emit(admin, gameId, "shield_raised", { actorId: me.id });
    return { ok: true, result: "warded" };
  }

  // target-taking powers
  const target = s.players.find((x) => x.name.toLowerCase() === (targetName ?? "").toLowerCase());
  if (!target) return { ok: false, result: "who?" };
  if (target.id === me.id) return { ok: false, result: "not_on_yourself" };
  if (target.status !== "alive") return { ok: false, result: "target_not_in_play" };

  // --- ROB: steal capped coins, unless they're shielded -----------------------
  if (power === "rob") {
    if (target.shielded_until && new Date(target.shielded_until) > new Date()) {
      // the ward holds — the charge is spent, the theft fails (that's the risk)
      await spendPower(admin, me, "rob");
      await emit(admin, gameId, "rob_blocked", { payload: { target: target.name }, actorId: me.id });
      return { ok: false, result: "warded_—_they_saw_you_coming" };
    }
    const take = Math.min(cfg.robCap, Math.max(0, target.balance));
    await spendPower(admin, me, "rob");
    if (take > 0) {
      await credit(admin, gameId, target.id, -take, "a hand in your purse — coins gone", "system");
      await credit(admin, gameId, me.id, take, "lifted, quietly", "system");
    }
    // the victim learns they were robbed, never by whom
    await admin.from("messages").insert({
      game_id: gameId,
      player_id: target.id,
      round_no: s.game.round_no,
      kind: "secret",
      title: "👛 Lighter than you were",
      body: take > 0 ? `${take} coins lifted from your purse. No note. No name. Raise a ward if you have one.` : "Someone reached for your purse and found it empty. Small mercies.",
    });
    await emit(admin, gameId, "robbed", { payload: { amount: take }, actorId: me.id });
    return { ok: true, result: take > 0 ? "lifted" : "empty_purse" };
  }

  return { ok: false, result: "not_built_yet" }; // swap / copy — staged
}
