"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PublicPlayer = {
  id: string;
  name: string;
  is_host: boolean;
  status: string;
  arrived_at: string | null;
};
export type GameShell = {
  id: string;
  code: string;
  title: string;
  status: string;
  round_no: number;
  round_phase: string;
  paused: boolean;
  config: Record<string, unknown>;
  story_public: {
    meta?: { title?: string; genre?: string; tagline?: string; setting?: string };
    skin?: { palette?: { bg?: string; accent?: string; text?: string }; motif?: string };
  } | null;
};
export type Me = {
  id: string;
  name: string;
  is_host: boolean;
  status: string;
  role: string;
  character: {
    personaName?: string;
    archetype?: string;
    publicBlurb?: string;
    costumeHint?: string;
    background?: string;
    connections?: { personaName: string; what: string }[];
    secret?: string;
    mannerism?: string;
  } | null;
  arrived_at: string | null;
};
export type Msg = {
  id: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
};
export type Challenge = {
  id: string;
  type: string;
  brief: string;
  data: { targetName?: string; method?: string };
  status: string;
  expires_at: string | null;
};
export type PublicEvent = {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...json };
}

export function useGame(code: string) {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [game, setGame] = useState<GameShell | null>(null);
  const [roster, setRoster] = useState<PublicPlayer[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [publicEvents, setPublicEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refetch = useCallback(async () => {
    const upper = code.toUpperCase();
    const { data: g } = await supa
      .from("games")
      .select("id, code, title, status, round_no, round_phase, paused, config, story_public")
      .eq("code", upper)
      .maybeSingle();
    if (!g) {
      setLoading(false);
      return;
    }
    setGame(g as GameShell);
    const [{ data: pub }, { data: mine }, { data: evs }] = await Promise.all([
      supa.from("players_public").select("*").eq("game_id", g.id).order("created_at"),
      supa.from("players").select("id, name, is_host, status, role, character, arrived_at").maybeSingle(),
      supa
        .from("events")
        .select("id, type, payload, created_at")
        .eq("game_id", g.id)
        .eq("is_public", true)
        .order("id", { ascending: false })
        .limit(30),
    ]);
    setRoster((pub ?? []) as PublicPlayer[]);
    setMe((mine as Me) ?? null);
    setPublicEvents((evs ?? []) as PublicEvent[]);
    if (mine) {
      const [{ data: msgs }, { data: chs }] = await Promise.all([
        supa
          .from("messages")
          .select("id, kind, title, body, created_at")
          .eq("player_id", (mine as Me).id)
          .order("created_at", { ascending: false })
          .limit(50),
        supa
          .from("challenges")
          .select("id, type, brief, data, status, expires_at")
          .eq("player_id", (mine as Me).id)
          .eq("status", "offered"),
      ]);
      setMessages((msgs ?? []) as Msg[]);
      setChallenges((chs ?? []) as Challenge[]);
    }
    setLoading(false);
  }, [code, supa]);

  // realtime: any relevant change → refetch (simple + correct beats clever).
  useEffect(() => {
    refetch();
    let cancelled = false;
    (async () => {
      // ensure a session exists so RLS-scoped realtime works
      const { data } = await supa.auth.getSession();
      if (!data.session) await supa.auth.signInAnonymously();
      if (cancelled) return;
      const ch = supa
        .channel(`game-${code}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "events" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "games" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "players" }, refetch)
        .subscribe();
      channelRef.current = ch;
    })();
    const onFocus = () => refetch(); // iOS wakes tabs cold — resync on focus
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      channelRef.current?.unsubscribe();
    };
  }, [code, refetch, supa]);

  const actions = useMemo(
    () => ({
      join: (name: string, takeover = false, intake: Record<string, unknown> = {}) =>
        post("/api/join", { code, name, takeover, intake }).then((r) => {
          refetch();
          return r;
        }),
      arrive: () => post("/api/arrive", { code }).then((r) => (refetch(), r)),
      completeChallenge: (challengeId: string, victimName?: string) =>
        post("/api/challenge/complete", { code, challengeId, victimName }).then((r) => (refetch(), r)),
      vote: (targetId: string) => post("/api/vote", { code, targetId }),
      panic: () => post("/api/panic", { code }),
      breakglass: (action: string) => post("/api/breakglass", { code, action }).then((r) => (refetch(), r)),
      sealStory: () => post("/api/story/generate", { code }),
      tick: () => post("/api/director/tick", { code, trigger: "heartbeat" }),
    }),
    [code, refetch]
  );

  return { game, roster, me, messages, challenges, publicEvents, loading, refetch, actions };
}
