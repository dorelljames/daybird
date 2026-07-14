<p align="center">
  <img src="art/icon-1024.png" width="128" alt="Daybird icon" />
</p>

<h1 align="center">Daybird 🐦</h1>

<p align="center">
  A calm, local-first task &amp; time tracker for macOS.<br/>
  The functionality of a serious time tracker, with a UI you actually want to open.
</p>

---

Daybird started as a replacement for [Super Productivity](https://github.com/johannesjo/super-productivity) — great engine, but the Material UI and the high-friction idle-time flow meant it stopped getting opened. Daybird keeps the honest time accounting and rebuilds the experience in the school of Things 3: airy, springy, quiet.

## What it does

- **Today view** with priority tiers (Priority / main / Later today) — drag tasks between them, drag to reorder, right-click for everything else
- **One-tap time tracking** with a live time rail showing where your day actually went
- **The "Welcome back" sheet** — come back from being away and split the time honestly across tasks, breaks, or skip it entirely; carve it into as many segments as reality had, assigning each to existing or brand-new tasks
- **A floating widget** that appears when the app can't be seen — live timer as a pill that morphs into a card, or a gentle "Not tracking" nudge
- **The Log** — a day journal of what actually happened: timeline strips, finished/dropped tasks, and estimate-vs-actual honesty
- **Discard ≠ delete** — tasks can be dropped (kept in history, time preserved) instead of deleted; everything destructive has Undo
- **Sound design that motivates** — completions climb a soft marimba scale through your day; clearing your last task earns a tiny arpeggio; rest never sounds like failure
- **Keyboard-first** — ⌘N, ⌘1–4, Space/E/X, press ? inside the app for the full map
- **Local-first** — your data lives on your Mac, no accounts, works offline

## Install

Grab the `.dmg` from [Releases](../../releases) (Apple Silicon). Builds from v0.1.1 onward are signed and notarized — they open like any Mac app.

## Build from source

Prereqs: Node 20+, Rust 1.88+ ([rustup](https://rustup.rs)).

```bash
npm install
npm run tauri dev     # development
npm test              # unit tests (time math, allocation, store)
npm run tauri build   # produces the .app and .dmg
```

## Status & roadmap

Early and moving fast — v0.1 shipped from an empty folder in a single day of AI-assisted development, and it's already my daily driver. Coming up: SQLite persistence, real idle detection (currently the away-sheet is manual), Linear sync, Apple Calendar (past = actuals, future = plan), an Upcoming calendar view, per-task history from the event trail, and signed builds.

Design principle in one line: **it should feel like stationery, not machinery.**

## License

[MIT](LICENSE)
