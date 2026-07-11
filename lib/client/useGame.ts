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
  mode: "murder" | "rogue";
  hijacked_at: string | null;
  meters: { plunder: number; compute: number; confidence: number };
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
  balance: number;
  burned: boolean;
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
  claimed_sender: string | null;
  created_at: string;
};
export type Txn = {
  id: number;
  amount: number;
  memo: string;
  claimed_source: string;
  created_at: string;
};
export type Challenge = {
  id: string;
  type: string;
  brief: string;
  data: {
    targetName?: string;
    method?: string;
    amount?: number;
    side?: string;
    verification?: string;
    asSender?: string;
    memo?: string;
  } & Record<string, unknown>;
  status: string;
  response?: unknown;
  expires_at: string | null;
};
export type PublicEvent = {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

async function post(path: string, body: unknown) {
  // party wifi is hostile — a thrown fetch must never strand a busy-flag (review C1)
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...json };
  } catch {
    return { ok: false, status: 0, error: "The house lost you for a moment — try again." };
  }
}

export function useGame(code: string) {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [game, setGame] = useState<GameShell | null>(null);
  const [roster, setRoster] = useState<PublicPlayer[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [publicEvents, setPublicEvents] = useState<PublicEvent[]>([]);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [history, setHistory] = useState<Challenge[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refetch = useCallback(async () => {
    const upper = code.toUpperCase();
    const { data: g, error: gErr } = await supa
      .from("games")
      .select(
        "id, code, title, status, round_no, round_phase, paused, mode, hijacked_at, meters, config, story_public"
      )
      .eq("code", upper)
      .maybeSingle();
    // a transient network error is NOT "no such game" (review C3)
    if (gErr) {
      setError("The house is unreachable — check your connection.");
      setLoading(false);
      return;
    }
    setError(null);
    if (!g) {
      setLoading(false);
      return;
    }
    setGame(g as GameShell);
    setGameId(g.id);
    const [{ data: pub }, { data: mine }, { data: evs }] = await Promise.all([
      supa.from("players_public").select("*").eq("game_id", g.id).order("created_at"),
      supa
        .from("players")
        .select("id, name, is_host, status, role, balance, burned, character, arrived_at")
        .maybeSingle(),
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
      const [{ data: msgs }, { data: chs }, { data: txns }, { data: vote }] = await Promise.all([
        supa
          .from("messages")
          .select("id, kind, title, body, claimed_sender, created_at")
          .eq("player_id", (mine as Me).id)
          .order("created_at", { ascending: false })
          .limit(50),
        supa
          .from("challenges")
          .select("id, type, brief, data, status, response, expires_at")
          .eq("player_id", (mine as Me).id)
          .order("offered_at", { ascending: false })
          .limit(40),
        supa
          .from("transactions")
          .select("id, amount, memo, claimed_source, created_at")
          .eq("player_id", (mine as Me).id)
          .order("id", { ascending: false })
          .limit(20),
        supa
          .from("votes")
          .select("target_id")
          .eq("voter_id", (mine as Me).id)
          .eq("round_no", (g as GameShell).round_no)
          .maybeSingle(),
      ]);
      setMessages((msgs ?? []) as Msg[]);
      const all = (chs ?? []) as Challenge[];
      setChallenges(all.filter((c) => c.status === "offered"));
      setHistory(all.filter((c) => c.status !== "offered")); // "Earlier tonight"
      setTransactions((txns ?? []) as Txn[]);
      setMyVote(vote?.target_id ?? null); // vote receipt survives reloads (review H8)
    }
    setLoading(false);
  }, [code, supa]);

  // initial load + focus resync
  useEffect(() => {
    refetch();
    const onFocus = () => refetch(); // iOS wakes tabs cold — resync on focus
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refetch]);

  // realtime: subscriptions are FILTERED to this game (review H6 — without the
  // filter every insert in ANY game refetched every client). Created once the
  // game id is known.
  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supa.auth.getSession();
      if (!data.session) await supa.auth.signInAnonymously();
      if (cancelled) return;
      const f = `game_id=eq.${gameId}`;
      const ch = supa
        .channel(`game-${gameId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: f }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: f }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: f }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: f }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: f }, refetch)
        .subscribe();
      channelRef.current = ch;
    })();
    return () => {
      cancelled = true;
      channelRef.current?.unsubscribe();
    };
  }, [gameId, refetch, supa]);

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
      vote: (targetId: string) => post("/api/vote", { code, targetId }).then((r) => (refetch(), r)),
      panic: () => post("/api/panic", { code }),
      breakglass: (action: string) => post("/api/breakglass", { code, action }).then((r) => (refetch(), r)),
      sealStory: () => post("/api/story/generate", { code }),
      tick: () => post("/api/director/tick", { code, trigger: "heartbeat" }),
      // ROGUE actions
      acceptOffer: (challengeId: string) =>
        post("/api/offer/accept", { code, challengeId }).then((r) => (refetch(), r)),
      respond: (challengeId: string, text: string) =>
        post("/api/challenge/respond", { code, challengeId, text }).then((r) => (refetch(), r)),
      hideCode: (slipCode: string, locationHint: string) =>
        post("/api/code/hide", { code, slipCode, locationHint }).then((r) => (refetch(), r)),
      findCode: (slipCode: string) =>
        post("/api/code/find", { code, slipCode }).then((r) => (refetch(), r)),
      compose: (asSender: string, draft: string) =>
        post("/api/compose", { code, asSender, draft }).then((r) => (refetch(), r)),
      audience: (ai: "rogue" | "good", question: string) =>
        post("/api/audience", { code, ai, question }).then((r) => (refetch(), r)),
      petition: (text: string) => post("/api/petition", { code, text }).then((r) => (refetch(), r)),
      volunteer: () => post("/api/volunteer", { code }),
      sendNote: (to: string, text: string) =>
        post("/api/note", { code, to, text }).then((r) => (refetch(), r)),
    }),
    [code, refetch]
  );

  return {
    game,
    roster,
    me,
    messages,
    challenges,
    history,
    publicEvents,
    transactions,
    myVote,
    loading,
    error,
    refetch,
    actions,
  };
}
