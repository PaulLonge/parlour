/**
 * THE INDUCTION, screenshotted (D47 companion): a Playwright harness that
 * plays a full two-phone-plus-TV induction game start to finish, capturing
 * doc screenshots to public/guide/ — and because every step is verified by
 * the SAME mechanic it teaches, this doubles as an E2E QA pass over the real
 * HTTP/UI layer (join, arrive, letters, the hijack, bribes, notes, paper,
 * briefings, an accusation, the unmasking) that `npm run simulate` never
 * touches (that one skips the browser and the referee's HTTP skin entirely).
 *
 * Run:
 *   npm run guide:capture
 *   npm run guide:capture -- --base-url=http://localhost:3002   (reuse a running dev server)
 *   BASE_URL=http://localhost:3002 npm run guide:capture         (same, via env)
 *
 * Needs .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * DIRECTOR_TICK_SECRET. No ANTHROPIC_API_KEY required — THE INDUCTION's one
 * optional LLM step ("an audience with the machine") auto-skips without it.
 *
 * First run on a fresh machine: `npx playwright install chromium` — NOT run
 * automatically by this script (the orchestrator handles that separately).
 *
 * Anonymous sign-in note: each phone context and the TV context signs in
 * anonymously via Supabase Auth (rate-limited ~30/hour/IP server-side) — one
 * full run of this script costs about 2-3 of those. Don't loop this in a tight
 * retry script.
 *
 * If BASE_URL isn't set (or doesn't respond), this spawns `npm run dev` itself
 * and parses the REAL port out of Next's ready output — port 3000 on this
 * machine is occupied by an unrelated Vite app, and parlour typically lands
 * on 3002. Never assume a fixed port.
 *
 * SPOILER INVARIANT: this script only ever screenshots the induction game
 * (deterministic, twist: "none", nothing to leak), /preview (mock data, no
 * DB), and pre-seal surfaces. It must never touch a real scenario game or
 * /bible.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join as pathJoin } from "node:path";
import { spawn, execSync, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Page } from "playwright";

type DevServerProcess = ChildProcessByStdio<null, Readable, Readable>;

// --- load .env.local (tsx doesn't) — same convention as scripts/simulate.ts ---
const envPath = pathJoin(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tickSecret = process.env.DIRECTOR_TICK_SECRET;
if (!url || !key || !tickSecret) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DIRECTOR_TICK_SECRET in .env.local"
  );
  process.exit(1);
}

// imported AFTER env so lib code sees the vars (scripts/simulate.ts convention)
const { skipTutorialStep } = await import("../lib/engine/tutorial");

const admin = createClient(url, key, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// check()/note() — pass/fail counter, ✓/✗ console output (scripts/simulate.ts)
// ---------------------------------------------------------------------------
let checks = 0;
let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  checks++;
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label} ${extra}`);
  }
}
// informational only — for assertions that are inherently racy against the
// app's own server-side auto-ticking (see the note on 04/06 below) and would
// make this script flaky for reasons that have nothing to do with a real bug
function note(label: string, cond: boolean, extra = "") {
  console.log(`  ${cond ? "·" : "?"} ${label}${extra ? ` ${extra}` : ""}`);
}

const GUIDE_DIR = pathJoin(process.cwd(), "public", "guide");
mkdirSync(GUIDE_DIR, { recursive: true });
const shots: string[] = [];

async function shot(target: Page | ReturnType<Page["locator"]>, filename: string, opts: { fullPage?: boolean } = {}) {
  const filePath = pathJoin(GUIDE_DIR, filename);
  await target.screenshot({ path: filePath, fullPage: opts.fullPage });
  shots.push(filename);
  console.log(`  📸 ${filename}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// dev server: reuse BASE_URL if it responds, else spawn `npm run dev` and
// discover the real port from stdout. Killed + whole tree reaped in finally.
// ---------------------------------------------------------------------------
const argBaseUrl = process.argv.find((a) => a.startsWith("--base-url="))?.split("=")[1];
let baseUrl = process.env.BASE_URL || argBaseUrl || "";
let devProc: DevServerProcess | null = null;

async function pingOk(u: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(u, { signal: ctrl.signal });
    clearTimeout(t);
    return res.status < 500;
  } catch {
    return false;
  }
}

async function ensureServer(): Promise<string> {
  if (baseUrl) {
    if (await pingOk(baseUrl)) {
      console.log(`— reusing running server at ${baseUrl}`);
      return baseUrl.replace(/\/$/, "");
    }
    console.log(`— BASE_URL ${baseUrl} did not respond; spawning a dev server instead`);
  }
  console.log("— spawning `npm run dev`…");
  // shell:true — Node 20+ refuses to spawn .cmd shims on Windows without it
  devProc = spawn("npm", ["run", "dev"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  }) as DevServerProcess;

  const discovered = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("dev server did not print a ready URL within 60s")), 60_000);
    let found = false;
    const onData = (buf: Buffer) => {
      const text = buf.toString();
      process.stdout.write(`  [next] ${text}`);
      if (found) return;
      const m = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
      if (m) {
        found = true;
        clearTimeout(timer);
        resolve(`http://localhost:${m[1]}`);
      }
    };
    devProc!.stdout.on("data", onData);
    devProc!.stderr.on("data", onData);
    devProc!.on("exit", (code) => {
      if (!found) {
        clearTimeout(timer);
        reject(new Error(`dev server exited early (code ${code})`));
      }
    });
  });

  // the ready line can print a beat before the listener actually accepts —
  // poll until it genuinely answers HTTP
  for (let i = 0; i < 60; i++) {
    if (await pingOk(discovered)) return discovered;
    await sleep(500);
  }
  return discovered;
}

function killServer() {
  if (!devProc || !devProc.pid) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${devProc.pid} /T /F`);
    else {
      try {
        process.kill(-devProc.pid, "SIGKILL");
      } catch {
        devProc.kill("SIGKILL");
      }
    }
    console.log("— dev server stopped.");
  } catch (e) {
    console.error("— failed to stop dev server:", e);
  }
}

// ---------------------------------------------------------------------------
// induction driver: POST /api/director/tick (with the secret, bypassing the
// heartbeat debounce) and poll the events table for the tutorial_step
// marker — NOT the TV heartbeat, per the brief.
// ---------------------------------------------------------------------------
let gameId = "";
let code = "";

async function tick(trigger: string) {
  const res = await fetch(`${baseUrl}/api/director/tick`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tick-secret": tickSecret! },
    body: JSON.stringify({ code, trigger }),
  });
  return res.json().catch(() => ({}));
}

async function marker(): Promise<{ step?: number; key?: string } | null> {
  const { data } = await admin
    .from("events")
    .select("payload")
    .eq("game_id", gameId)
    .eq("type", "tutorial_step")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.payload as { step?: number; key?: string } | undefined) ?? null;
}

// drives ticks until the marker reaches targetIdx, ~1s poll, 30s cap per step
async function advanceTo(targetIdx: number, label: string) {
  const start = Date.now();
  let m = await marker();
  while ((m?.step ?? -1) < targetIdx && Date.now() - start < 30_000) {
    await tick(`guide:${label}`);
    await sleep(1000);
    m = await marker();
  }
  check(`induction reached step ${targetIdx + 1} (${label})`, (m?.step ?? -1) >= targetIdx, `marker=${JSON.stringify(m)}`);
  return m;
}

async function skipCurrentStep(label: string) {
  const before = await marker();
  const r = await skipTutorialStep(admin, gameId);
  check(`skipped step "${label}" (by design — noted in the induction's own record)`, r.ok, JSON.stringify(r));
  console.log(`  ⏭ skipped step ${(before?.step ?? -1) + 1} (${label}) — too interaction-heavy to script live`);
  return r;
}

// ---------------------------------------------------------------------------
// Playwright helpers
// ---------------------------------------------------------------------------
async function openTab(page: Page, name: "Now" | "Inbox" | "Ask" | "More") {
  // no exact match: an unread badge extends the accessible name to
  // e.g. "Inbox 2 waiting in Inbox" (sr-only span in TabBar)
  await page.getByRole("tab", { name: new RegExp(`\\b${name}\\b`) }).click();
}

async function freshNow(page: Page) {
  await page.reload({ waitUntil: "load" });
}

// choice-verification MissionCard: click the option (correctIndex is 0 for
// every choice mission THE INDUCTION offers, but we click the literal
// correct-answer text, not "the first button", so this stays honest if the
// script content ever changes)
async function answerChoice(page: Page, briefSnippet: string, optionText: string) {
  const card = page.locator(".panel", { hasText: briefSnippet }).first();
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await card.getByRole("button", { name: optionText, exact: true }).click();
}

// submission-verification MissionCard: type the expected word, submit
async function answerSubmission(page: Page, briefSnippet: string, answer: string) {
  const card = page.locator(".panel", { hasText: briefSnippet }).first();
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await card.locator("textarea").fill(answer);
  await card.getByRole("button", { name: "Submit", exact: true }).click();
}

// ---------------------------------------------------------------------------
async function main() {
  baseUrl = await ensureServer();
  console.log(`— server ready at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const hostCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const secondCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const tvCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
  // Next's dev error overlay (<nextjs-portal>) swallows pointer events when a
  // dev-only warning fires (e.g. the hydration nit Playwright's caret-hiding
  // can trigger) and would photobomb screenshots — keep it out of the run.
  for (const c of [hostCtx, secondCtx, tvCtx]) {
    await c.addInitScript(() => {
      // plain interval: MutationObserver/DOMContentLoaded approaches proved
      // unreliable from init-script timing — this one verifiably works
      setInterval(() => document.querySelectorAll("nextjs-portal").forEach((n) => n.remove()), 100);
    });
  }
  const hostPage = await hostCtx.newPage();
  const secondPage = await secondCtx.newPage();
  const tvPage = await tvCtx.newPage();

  try {
    // ---------------------------------------------------------------- 01 --
    console.log("— 01: landing");
    await hostPage.goto(`${baseUrl}/`, { waitUntil: "load", timeout: 30_000 });
    check("landing shows the PARLOUR heading", await hostPage.getByRole("heading", { name: "PARLOUR" }).isVisible());
    await shot(hostPage, "01-landing.png");

    // ---------------------------------------------------------------- 02 --
    console.log("— 02: a new evening (THE INDUCTION)");
    await hostPage.goto(`${baseUrl}/new`, { waitUntil: "load", timeout: 30_000 });
    await hostPage.locator('input[placeholder="Paul\'s 30th"]').fill("THE INDUCTION");
    await hostPage.locator('input[placeholder="Paul"]').fill("Paul");
    await hostPage.locator('label', { hasText: "Staff induction" }).locator('input[type="checkbox"]').check();
    await shot(hostPage, "02-new-evening.png");
    await hostPage.getByRole("button", { name: /Create induction/ }).click();
    await hostPage.waitForURL(/\/g\/[A-Z0-9]+/i, { timeout: 30_000 });
    code = new URL(hostPage.url()).pathname.split("/").filter(Boolean).pop()!.toUpperCase();
    check("redirected to /g/{code} with a real code", /^[A-Z0-9]{3,8}$/.test(code), `code=${code}`);

    const { data: gameRow, error: gErr } = await admin.from("games").select("id").eq("code", code).single();
    check("throwaway game row found by code", !gErr && !!gameRow, gErr?.message ?? "");
    gameId = gameRow!.id as string;

    // ------------------------------------------------------------ 05/06 --
    // TV first, while the game is still guaranteed in the lobby: the join
    // code only shows there, and the SECOND join auto-ticks the induction
    // straight into act1 (advance_phase fires once two players exist).
    console.log("— 05/06: the TV (before the second join, so the code shows)");
    await tvPage.goto(`${baseUrl}/tv/${code}`, { waitUntil: "load", timeout: 30_000 });
    await tvPage.getByRole("button", { name: "🕯 Light the candles" }).waitFor({ state: "visible", timeout: 30_000 });
    await shot(tvPage, "05-tv-gate.png");
    await tvPage.getByRole("button", { name: "🕯 Light the candles" }).click();
    await tvPage.getByRole("button", { name: "🕯 Light the candles" }).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    await tvPage.waitForTimeout(500); // wake-lock/fullscreen may reject headless — both are try/caught client-side, harmless either way
    check("tv lobby shows the join code", (await tvPage.textContent("body"))?.includes(code) ?? false);
    await shot(tvPage, "06-tv-lobby.png");

    // park the TV: its heartbeat also ticks the director, and tutorialTick has
    // no concurrency guard — a TV tick racing this script's ticks double-runs
    // a step's moves (duplicate letters observed). Real engine race, flagged
    // upstream; for a clean capture this script must be the only ticker.
    await tvPage.goto("about:blank");

    // ---------------------------------------------------------------- 04 --
    console.log("— 04: host phone, Now tab, lobby");
    await openTab(hostPage, "Now");
    const hostBodyText = await hostPage.textContent("body");
    note("hostPhone Now tab reads as lobby (best-effort)", !!hostBodyText?.includes("doors are not yet open"));
    await shot(hostPage, "04-now-lobby.png");

    // ---------------------------------------------------------------- 03 --
    console.log("— 03: second phone joins");
    await secondPage.goto(`${baseUrl}/g/${code}`, { waitUntil: "load", timeout: 30_000 });
    await secondPage.getByText("The guest list").waitFor({ state: "visible", timeout: 30_000 });
    const hostGuestButton = secondPage.getByRole("button", { name: /Paul/ });
    check("guest list shows Paul (host, ✦)", (await hostGuestButton.textContent())?.includes("✦") ?? false);
    await shot(secondPage, "03-join-screen.png");
    await secondPage.getByLabel("your name").fill("Co-Host");
    await secondPage.getByRole("button", { name: "Step inside", exact: true }).click();
    await secondPage.getByRole("tablist").waitFor({ state: "visible", timeout: 30_000 });
    check("PlayerView renders for the second phone", await secondPage.getByRole("tablist").isVisible());

    // ---------------------------------------------------------------- 07 --
    // step0 "assemble" (players >= 2) is already satisfied by the two joins —
    // advance to step1 "arrive", which flips game.status off lobby.
    console.log("— step 1→2: arrive");
    await advanceTo(1, "arrive");
    await freshNow(hostPage);
    const arriveBtn = hostPage.getByRole("button", { name: "🚪 I have arrived at the party" });
    await arriveBtn.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    check("arrive button visible on host BEFORE tapping", await arriveBtn.isVisible());
    await shot(hostPage, "07-arrive.png");
    await arriveBtn.click();
    await freshNow(secondPage);
    await secondPage.getByRole("button", { name: "🚪 I have arrived at the party" }).click();
    const stepArrived = await advanceTo(2, "arrive→letters");
    check("both players marked arrived (induction step advanced)", (stepArrived?.step ?? -1) >= 2);

    // ---------------------------------------------------------------- 08 --
    console.log("— step 2→3: the letters");
    await freshNow(secondPage);
    await openTab(secondPage, "Inbox");
    await secondPage.getByText("A letter, sealed").first().waitFor({ state: "visible", timeout: 30_000 });
    await shot(secondPage, "08-inbox-letter.png");
    // both submit their reading-comprehension mission (verification: submission)
    await openTab(hostPage, "Now");
    await freshNow(hostPage);
    await answerSubmission(hostPage, "Reading comprehension", "LANTERN");
    await freshNow(secondPage);
    await answerSubmission(secondPage, "Reading comprehension", "CUTLASS");
    await advanceTo(3, "letters→takeover");

    // ---------------------------------------------------------------- -- --
    console.log("— step 3→4: THE TAKEOVER (hijack fires; meters/purse appear)");
    await freshNow(hostPage);
    await answerChoice(hostPage, "Look at YOUR PURSE", "Zero — everything is gone");
    await freshNow(secondPage);
    await answerChoice(secondPage, "Look at YOUR PURSE", "Zero — everything is gone");
    await advanceTo(4, "takeover→offer");

    // ---------------------------------------------------------------- 11 --
    console.log("— 11: meters + purse, now that the hijack has fired");
    await freshNow(hostPage);
    const meters = hostPage.locator(".panel", { hasText: "every coin accounted for" }).first();
    await meters.waitFor({ state: "visible", timeout: 30_000 });
    check("MetersStrip rendered post-hijack", await meters.isVisible());
    const purse = hostPage.locator(".panel", { hasText: "your purse" }).first();
    check("PurseChip rendered post-hijack", await purse.isVisible());
    await meters.scrollIntoViewIfNeeded();
    await shot(hostPage, "11-meters-purse.png");

    // ---------------------------------------------------------------- -- --
    console.log("— step 4→5: a private opportunity (bribe)");
    await freshNow(secondPage);
    const bribeCard = secondPage.locator(".panel", { hasText: "a private opportunity — yours alone" }).first();
    await bribeCard.waitFor({ state: "visible", timeout: 30_000 });
    await bribeCard.getByRole("button", { name: "Take the coin", exact: true }).click();
    await advanceTo(5, "offer→handshake");

    // ---------------------------------------------------------------- -- --
    // handshake (glyph face-to-face verification) — too interaction-heavy to
    // script honestly (needs a real second device to SHOW a mark), skipped by
    // design per the brief. Noted in the induction's own record too.
    await skipCurrentStep("handshake (glyph verification)");
    await advanceTo(6, "handshake(skipped)→post");

    // ---------------------------------------------------------------- 09 --
    console.log("— step 6→7: the post office (note-passing)");
    await freshNow(secondPage);
    await openTab(secondPage, "Inbox");
    const passNoteBtn = secondPage.getByRole("button", { name: /Pass a note/ });
    await passNoteBtn.waitFor({ state: "visible", timeout: 30_000 });
    await passNoteBtn.click();
    await shot(secondPage, "09-note-composer.png");
    await secondPage.getByLabel("recipient").selectOption({ label: "Paul" });
    await secondPage.getByLabel("your note").fill("Testing the post office — hello from THE INDUCTION.");
    await secondPage.getByRole("button", { name: /^Send ·/ }).click();
    await advanceTo(7, "post→paper");

    // ---------------------------------------------------------------- -- --
    console.log("— step 7→8: paper (the code slip)");
    await freshNow(secondPage);
    await openTab(secondPage, "Now");
    const paperToggle = secondPage.getByRole("button", { name: /Paper — found a slip/ });
    await paperToggle.waitFor({ state: "visible", timeout: 30_000 });
    await paperToggle.click();
    await secondPage.getByPlaceholder("TYPE THE CODE").fill("GROGWATCH");
    await secondPage.getByRole("button", { name: "I found this", exact: true }).click();
    await advanceTo(8, "paper→wager");

    // ---------------------------------------------------------------- -- --
    // wager: needs a phone-passed duel + BOTH sides self-reporting a matching
    // winner — the interaction-heaviest step in the script. Skipped by design.
    await skipCurrentStep("wager (phone-duel + dual report)");
    // step 9 "an audience with the machine" auto-skips only when the server
    // has no ANTHROPIC_API_KEY. When the key IS present (the live setup), the
    // step waits for a real paid question — grab the Ask tab for the guide,
    // then skip it explicitly rather than spend an LLM call in a QA loop.
    const afterWager = await advanceTo(9, "wager(skipped)→audience-or-beyond");
    if (afterWager?.key === "audience") {
      await freshNow(secondPage);
      await openTab(secondPage, "Ask");
      await shot(secondPage, "14-ask-audience.png");
      await skipCurrentStep("audience (would spend a real LLM call)");
    }
    await advanceTo(10, "→night-one");

    // ---------------------------------------------------------------- -- --
    // steps 10-13: four briefing quizzes. Each step's missions are only
    // CREATED when its startStep() runs (as part of the previous advanceTo),
    // so every quiz must be answered before advancing past it — batching two
    // steps' answers together would try to answer a mission that doesn't
    // exist in the DB yet.
    console.log("— step 10: briefing quiz — night one");
    await freshNow(hostPage);
    await answerChoice(hostPage, "what wins the evening?", "The fattest purse when the books close — and naming the collaborator");
    await freshNow(secondPage);
    await answerChoice(secondPage, "what wins the evening?", "The fattest purse when the books close — and naming the collaborator");
    await advanceTo(11, "night-one→night-two");

    console.log("— step 11: briefing quiz — night two");
    await freshNow(hostPage);
    await answerChoice(hostPage, "pirate murder mystery. What is actually true?", "There is no murder mystery — there never was");
    await freshNow(secondPage);
    await answerChoice(secondPage, "pirate murder mystery. What is actually true?", "There is no murder mystery — there never was");
    await advanceTo(12, "night-two→the-machine");

    // "the-machine" and "the-catalogue": host and second get DIFFERENT
    // questions each step (each device only ever sees its own challenge)
    await freshNow(hostPage);
    await answerChoice(hostPage, "proposes a move against the rules", "The referee kills it — the AI never touches the world directly");
    await freshNow(secondPage);
    await answerChoice(secondPage, "What fills the skull meter in November?", "Bribes people in the room chose to accept");
    await advanceTo(13, "the-machine→the-catalogue");

    await freshNow(hostPage);
    await answerChoice(hostPage, "does November NOT need you to buy?", "Stamps — postage is digital, the machine sells it");
    await freshNow(secondPage);
    await answerChoice(secondPage, "How does paper meet phone?", "A human writes a dictated word; a finder types it in");
    await advanceTo(14, "the-catalogue→accusation");

    // ---------------------------------------------------------------- 10 --
    console.log("— step 14: the accusation (vote UI)");
    await freshNow(hostPage);
    // NB: the InductionStrip is also a .panel containing "The accusation" —
    // require the candidate button so we anchor to the real vote panel
    const accusationVote = hostPage
      .locator(".panel", { hasText: "The accusation" })
      .filter({ has: hostPage.getByRole("button", { name: "Co-Host" }) })
      .first();
    await accusationVote.waitFor({ state: "visible", timeout: 30_000 });
    check("accusation VoteTable rendered", await accusationVote.isVisible());
    await shot(hostPage, "10-vote.png");
    await accusationVote.getByRole("button", { name: "Co-Host" }).click();
    await advanceTo(16, "accusation→verdict(auto)→unmasking");

    // ---------------------------------------------------------------- -- --
    console.log("— step 16: THE UNMASKING (final vote)");
    await freshNow(hostPage);
    const unmaskingVote = hostPage
      .locator(".panel", { hasText: "THE UNMASKING" })
      .filter({ has: hostPage.getByRole("button", { name: "Co-Host" }) })
      .first();
    await unmaskingVote.waitFor({ state: "visible", timeout: 30_000 });
    await unmaskingVote.getByRole("button", { name: "Co-Host" }).click();
    await advanceTo(17, "unmasking→curtain");
    await advanceTo(18, "curtain(auto)→complete");

    const { count: completeCount } = await admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("type", "tutorial_complete");
    check("tutorial_complete event emitted — the induction's own QA record closed out", (completeCount ?? 0) >= 1);

    // ---------------------------------------------------------------- 12/13
    console.log("— 12/13: More tab — About + Host Tools");
    await freshNow(hostPage);
    await openTab(hostPage, "More");
    await hostPage.getByText("About the game").waitFor({ state: "visible", timeout: 30_000 });
    check("About accordion open by default", await hostPage.getByText("how tonight works").isVisible());
    await shot(hostPage, "12-more-about.png");
    const hostTools = hostPage.locator(".panel", { hasText: "Host — ✦" }).first();
    await hostTools.scrollIntoViewIfNeeded();
    check("HostTools panel renders for the host", await hostTools.isVisible());
    await shot(hostPage, "13-host-tools.png");

    // ------------------------------------------------------------ preview --
    console.log("— /preview: theme switcher + component gallery (mock data, no DB)");
    await tvPage.goto(`${baseUrl}/preview`, { waitUntil: "load", timeout: 30_000 });
    const phoneFrame = tvPage.locator("section").first();
    const THEMES: { name: string; slug: string }[] = [
      { name: "Candlelit Manor", slug: "manor" },
      { name: "Deco Noir", slug: "deco" },
      { name: "Séance", slug: "seance" },
      { name: "Decoy (Act 1)", slug: "decoy" },
      { name: "HIJACKED", slug: "hijacked" },
    ];
    for (const t of THEMES) {
      await tvPage.getByRole("button", { name: t.name, exact: true }).click();
      await phoneFrame.waitFor({ state: "visible", timeout: 10_000 });
      const box = await phoneFrame.boundingBox();
      check(`preview theme "${t.name}" renders (non-zero size)`, !!box && box.width > 0 && box.height > 0);
      await shot(phoneFrame, `20-preview-${t.slug}.png`);
    }
    // ends on HIJACKED — capture the rogue-only components first
    for (const [file, textAnchor] of [
      ["21-meters-strip.png", "every coin accounted for"],
      ["21-purse-chip.png", "your purse"],
      ["21-bribe-card.png", "a private opportunity — yours alone"],
      ["21-glyph-badge.png", "your mark — show, never say"],
    ] as const) {
      const el = tvPage.locator(".panel", { hasText: textAnchor }).first();
      await el.waitFor({ state: "visible", timeout: 10_000 });
      const box = await el.boundingBox();
      check(`${file} anchor renders (non-zero size)`, !!box && box.width > 0 && box.height > 0);
      await shot(el, file);
    }
    const paperButton = tvPage.getByRole("button", { name: /Paper — found a slip/ });
    await paperButton.click();
    const paperPanel = tvPage.locator(".panel", { hasText: "the paper trail" }).first();
    await paperPanel.waitFor({ state: "visible", timeout: 10_000 });
    check("21-code-entry.png anchor renders (non-zero size)", !!(await paperPanel.boundingBox()));
    await shot(paperPanel, "21-code-entry.png");

    // switch to manor for the murder-mode components
    await tvPage.getByRole("button", { name: "Candlelit Manor", exact: true }).click();
    for (const [file, textAnchor] of [
      ["21-character-sheet.png", "unfold"],
      ["21-challenge-offer.png", "a dark offer"],
      ["21-vote-table.png", "The round table"],
      ["21-message-envelope.png", "A whisper as you arrive"],
    ] as const) {
      const el = tvPage.locator(".panel", { hasText: textAnchor }).first();
      await el.waitFor({ state: "visible", timeout: 10_000 });
      const box = await el.boundingBox();
      check(`${file} anchor renders (non-zero size)`, !!box && box.width > 0 && box.height > 0);
      await shot(el, file);
    }

    // ------------------------------------------------------------ manifest
    const manifest = {
      capturedAt: new Date().toISOString(),
      checksPassed: checks - failures,
      checksTotal: checks,
      shots,
    };
    writeFileSync(pathJoin(GUIDE_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(`— manifest written: ${shots.length} shots, ${checks - failures}/${checks} checks passed.`);
  } catch (err) {
    // post-mortem before the finally deletes the evidence: game state + the
    // last few director_log verdicts usually name the move that bounced
    if (gameId) {
      const { data: g } = await admin
        .from("games")
        .select("status, round_phase, round_no, hijacked_at")
        .eq("id", gameId)
        .maybeSingle();
      console.error("— post-mortem game row:", JSON.stringify(g));
      const { data: logs } = await admin
        .from("director_log")
        .select("trigger, proposals, verdicts")
        .eq("game_id", gameId)
        .order("id", { ascending: false })
        .limit(3);
      for (const l of logs ?? [])
        console.error(`— post-mortem director_log [${l.trigger}]:`, JSON.stringify(l.verdicts));
    }
    throw err;
  } finally {
    await browser.close().catch(() => {});
    if (gameId) {
      const { error: delErr } = await admin.from("games").delete().eq("id", gameId);
      if (delErr) console.error("— cleanup: failed to delete throwaway game:", delErr.message);
      else console.log("— throwaway game deleted.");
    }
    killServer();
  }
}

await main();

if (failures) {
  console.error(`\n❌ ${failures} of ${checks} check(s) FAILED`);
  process.exit(1);
}
console.log(`\n✅ THE INDUCTION captured end to end — ${checks} checks passed, ${shots.length} screenshots in public/guide/.`);
