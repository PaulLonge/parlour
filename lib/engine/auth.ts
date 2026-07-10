import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlayerRow, GameRow } from "./state";

// Identify the calling player from their anonymous session + game code.
export async function getCaller(code: string): Promise<
  | { ok: true; player: PlayerRow; game: GameRow; uid: string }
  | { ok: false; status: number; error: string }
> {
  const supa = await supabaseServer();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "no session — join first" };

  const admin = supabaseAdmin();
  const { data: game } = await admin.from("games").select("*").eq("code", code).single();
  if (!game) return { ok: false, status: 404, error: "game not found" };
  const { data: player } = await admin
    .from("players")
    .select("*")
    .eq("game_id", game.id)
    .eq("auth_uid", user.id)
    .single();
  if (!player) return { ok: false, status: 403, error: "not a player in this game" };
  return { ok: true, player: player as PlayerRow, game: game as GameRow, uid: user.id };
}
