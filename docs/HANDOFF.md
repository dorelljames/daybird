# Daybird — Session Handoff

_Last updated: 2026-07-14, end of day one. Read this first; it replaces re-deriving context._

## What this is

Daybird 🐦 — calm, local-first macOS task & time tracker (Tauri v2 + React/TS + Motion + Zustand, localStorage persistence). Born this morning as a Super Productivity replacement; Dorell's daily driver since this afternoon.

- Repo: https://github.com/dorelljames/daybird (public, MIT) — this folder's name predates the repo name; renaming the folder also relocates Claude's memory dir, so coordinate if ever done.
- Releases: v0.1.0 (unsigned), **v0.1.1 (signed + notarized)** — installed at `/Applications/Daybird.app`.
- Spec: `docs/superpowers/specs/2026-07-14-daybird-design.md` (approved; don't relitigate locked decisions). Phase 1 plan fully executed (tag `phase1`).

## Working commands

- `npm run tauri dev` — dev app (own localStorage origin `http://localhost:1420`; **user's real data lives only in the installed app**, origin `tauri://localhost`). Dev titlebar has ⟲ = reset demo seed.
- `npm test` — 55 Vitest tests (time math, store, allocation, rail, hotkeys, cues, quickadd, version). `npx tsc --noEmit` before commits.
- **Releases:** bump `version` in `src-tauri/tauri.conf.json` AND `package.json` → `./scripts/build-signed.sh` (sources gitignored `.env.signing`; produces signed+notarized dmg, ends with spctl verdict) → `gh release create vX.Y.Z <dmg> --title … --notes …`. The in-app update banner (checks GitHub latest, release builds only) tells users.

## Tomorrow's goals (user-stated)

1. **Import todos from Super Productivity.** Needs Dorell's SP export (SP: Settings → Sync & Export → backup/export JSON; or the app data dir). Design an import mapping SP tasks/projects/time-tracked → Daybird tasks/projects/entries + stamp `created` events. A generic JSON import also rescues any stray data from the old dev-origin storage.
2. **Idle-sheet leftovers are DONE** (v2 shipped: N segments, per-segment assign/create). Next queued instead:
   - **Timeline/history views** on the event trail (`events` in store — recording since tonight): interleave events into Log day cards; right-click → History for per-task biography.
   - **Upcoming rethink** (big design conversation; consider visual companion): calendar view, future scheduling (nothing can be scheduled beyond today yet!), snooze (Google-Inbox love), EventKit *read* for real calendar events.
   - **Projects rethink**: leaning "buckets that know their time" (per-project time reporting), skeleton = simple filter view.

## Architecture crib sheet

- `src/state/store.ts` — single Zustand store, persist key `daybird-v1` (partialize: projects/tasks/entries/events/activeTaskId/railOpen/soundOn/dismissedUpdate). **Every lifecycle mutation appends a `TaskEvent`** (created/completed/restored/dropped/renamed/estimated/priority/rescheduled/deleted) — keep this invariant for new actions. Undo = full snapshot restore.
- `src/state/selectors.ts` — derivations incl. `dayLogs` (Log view). `src/lib/` — pure, tested: time, allocate (largest-remainder), rail layout, hotkeys, quickadd (`~30m` syntax), celebrate (completion scale-climb + all-clear arpeggio; resolve moods), version, hydrate (stale-timer guard).
- `src/components/` — TodayView (tiers + drag between via `[data-tier]` hit-test), TaskCard (Reorder.Item; context menu via TaskMenu; EstimatePopover presets), IdleSheet (N segments; editable minutes; Esc dismisses), LogView, Dock (task + switcher), Toast, UpdateBanner, ShortcutsSheet (?), widget in `src/widget/WidgetApp.tsx`.
- Widget: separate window, event-synced (`daybird://state` / `daybird://cmd`); shows only when main is minimized/unfocused; anchor flips when placed low on screen; title = drag-on-move + double-click-to-reveal.
- Sounds: `src/lib/sound.ts`, all WebAudio-synthesized, 🔊 toggle persisted.

## Hard-won gotchas (do not re-learn)

- **Never** pass `layout`/y/height animations to `Reorder.Item` (owns its transforms) — and never give an element with `layout` an infinite-repeat transition without per-value scoping (`transition={{ layout: spring, "--var": loop }}`).
- WKWebView renders box-shadow-spread rings fat at corners → use borders. `translateX(-50%)` centering fights Motion transforms → use flex-center wrapper.
- `window.show()` every tick = focus theft; dedupe window ops; widget is `focus: false` + `acceptFirstMouse`.
- Piping builds to `tail` masks exit codes — `set -o pipefail`.
- Apple notary 403 "agreement missing" → accept updated agreement on developer.apple.com under team **4XD6R65XN9** (multi-team account), wait minutes.
- `.env.signing` values with spaces/parens must be quoted (bash `source`).

## Product principles (Dorell's bar)

Delightful and thoughtful over quick: "stationery, not machinery." Separate actions stay separate (rename ≠ estimate). No instructional clutter in calm surfaces (syntax niceties live in the ? cheat sheet). Rest never sounds like failure. Discard ≠ delete; Undo everywhere. He pushes back when it drifts — invite that.
