import type { SupabaseClient } from "@supabase/supabase-js";
import { emit, loadState } from "./state";
import { credit } from "./economy";
import { GameConfig } from "@/lib/schemas/config";

// ---------------------------------------------------------------------------
// D38: the corrupt postal service. Player mail is delivered instantly unless
// sender or recipient is under machine surveillance (→ held for the director's
// work queue). Active wiretaps get silent copies either way. Postage is the
// second economy sink and the spam throttle.
// ---------------------------------------------------------------------------

export async function sendNote(
  admin: SupabaseClient,
  gameId: string,
  senderId: string,
  recipientName: string,
  text: string
) {
  const s = await loadState(admin, gameId);
  if (s.game.paused) return { ok: false, result: "game_paused" };
  if (s.game.mode !== "rogue" || !s.game.hijacked_at)
    return { ok: false, result: "the_post_office_is_closed" };

  const sender = s.players.find((p) => p.id === senderId);
  const recipient = s.players.find(
    (p) => p.name.toLowerCase() === recipientName.toLowerCase()
  );
  if (!sender || sender.status !== "alive") return { ok: false, result: "not_alive" };
  if (!recipient) return { ok: false, result: "unknown_recipient" };
  if (recipient.id === sender.id) return { ok: false, result: "talking_to_yourself" };

  // D38a (Paul): sending is a PRIVILEGE, not a feature — no stamp, no post.
  // Stamps arrive as mission rewards and machine moods. Otherwise: go talk.
  if ((sender as { stamps?: number }).stamps === undefined || (sender as { stamps: number }).stamps < 1)
    return { ok: false, result: "no_stamps" };

  const cfg = GameConfig.parse(s.game.config ?? {});
  const postage = cfg.notePostage;
  if (sender.balance < postage) return { ok: false, result: "insufficient_postage" };

  await admin
    .from("players")
    .update({ stamps: (sender as { stamps: number }).stamps - 1 })
    .eq("id", sender.id);

  // is either party watched? (tapper_id null = the machine itself)
  const now = new Date().toISOString();
  const { data: taps } = await admin
    .from("wiretaps")
    .select("id, tapper_id, target_id, expires_at")
    .eq("game_id", gameId)
    .in("target_id", [sender.id, recipient.id]);
  const active = (taps ?? []).filter((t) => !t.expires_at || t.expires_at > now);
  const surveilled = active.some((t) => t.tapper_id === null);
  const tappers = [...new Set(active.map((t) => t.tapper_id).filter(Boolean))] as string[];

  const { data: note, error } = await admin
    .from("notes")
    .insert({
      game_id: gameId,
      sender_id: sender.id,
      recipient_id: recipient.id,
      text,
      postage,
      status: surveilled ? "held" : "delivered",
    })
    .select("id")
    .single();
  if (error) return { ok: false, result: error.message };

  await credit(admin, gameId, sender.id, -postage, "postage — the house carries your letters", "system");

  if (!surveilled) {
    await admin.from("messages").insert({
      game_id: gameId,
      player_id: recipient.id,
      round_no: s.game.round_no,
      kind: "note",
      title: "",
      body: text,
      claimed_sender: sender.name, // a name on an envelope proves nothing (D28/D38)
    });
  }

  // wiretap copies flow regardless of surveillance — silent, unmarked-to-sender
  for (const tapperId of tappers) {
    if (tapperId === sender.id || tapperId === recipient.id) continue;
    await admin.from("messages").insert({
      game_id: gameId,
      player_id: tapperId,
      round_no: s.game.round_no,
      kind: "intercept",
      title: `${sender.name} → ${recipient.name}`,
      body: text,
    });
  }

  await emit(admin, gameId, surveilled ? "note_held" : "note_sent", {
    payload: { noteId: note.id, tapped: tappers.length > 0 },
    actorId: sender.id,
  });
  return { ok: true, result: surveilled ? "posted" : "posted", noteId: note.id };
  // (held mail still reports "posted" — the sender must never learn which)
}

// director verdict on held mail
export async function handleNote(
  admin: SupabaseClient,
  gameId: string,
  noteId: string,
  action: "deliver" | "edit" | "drop" | "leak",
  finalText?: string,
  leakToName?: string
) {
  const s = await loadState(admin, gameId);
  const { data: note } = await admin
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("game_id", gameId)
    .single();
  if (!note) return { ok: false, result: "unknown_note" };
  if (note.status !== "held") return { ok: false, result: `note_already_${note.status}` };

  const sender = s.players.find((p) => p.id === note.sender_id);
  const recipient = s.players.find((p) => p.id === note.recipient_id);
  if (!sender || !recipient) return { ok: false, result: "players_missing" };

  if (action === "drop") {
    await admin.from("notes").update({ status: "dropped" }).eq("id", noteId);
    await emit(admin, gameId, "note_dropped", { payload: { noteId } });
    return { ok: true, result: "dropped" };
  }

  const body = action === "edit" ? (finalText ?? note.text) : note.text;
  await admin.from("messages").insert({
    game_id: gameId,
    player_id: recipient.id,
    round_no: s.game.round_no,
    kind: "note",
    title: "",
    body,
    claimed_sender: sender.name,
  });

  if (action === "leak" && leakToName) {
    const leakTo = s.players.find((p) => p.name.toLowerCase() === leakToName.toLowerCase());
    if (leakTo)
      await admin.from("messages").insert({
        game_id: gameId,
        player_id: leakTo.id,
        round_no: s.game.round_no,
        kind: "intercept",
        title: `${sender.name} → ${recipient.name}`,
        body: note.text,
      });
  }

  await admin
    .from("notes")
    .update({ status: action === "edit" ? "edited" : action === "leak" ? "leaked" : "delivered", final_text: body })
    .eq("id", noteId);
  await emit(admin, gameId, "note_handled", { payload: { noteId, action } });
  return { ok: true, result: action };
}

// director sets/removes taps. tapperName undefined = the machine's own surveillance.
export async function setWiretap(
  admin: SupabaseClient,
  gameId: string,
  targetName: string,
  minutes: number,
  tapperName?: string
) {
  const s = await loadState(admin, gameId);
  const target = s.players.find((p) => p.name.toLowerCase() === targetName.toLowerCase());
  if (!target) return { ok: false, result: "unknown_target" };
  let tapperId: string | null = null;
  if (tapperName) {
    const tapper = s.players.find((p) => p.name.toLowerCase() === tapperName.toLowerCase());
    if (!tapper) return { ok: false, result: "unknown_tapper" };
    if (tapper.id === target.id) return { ok: false, result: "cannot_tap_self" };
    tapperId = tapper.id;
  }
  const { error } = await admin.from("wiretaps").insert({
    game_id: gameId,
    tapper_id: tapperId,
    target_id: target.id,
    expires_at: new Date(Date.now() + minutes * 60000).toISOString(),
  });
  if (error) return { ok: false, result: error.message };
  await emit(admin, gameId, "wiretap_set", {
    payload: { target: target.name, machine: !tapperId },
  });
  return { ok: true, result: "tapped" };
}
