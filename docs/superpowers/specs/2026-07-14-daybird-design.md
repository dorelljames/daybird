# Daybird — Design Spec

*(Working codename — rename anytime; nothing depends on it.)*

**Date:** 2026-07-14
**Status:** Approved design, pre-implementation

## 1. What & Why

A local-first macOS productivity app replacing Super Productivity for one user (Dorell). Super Productivity's feature set works, but its Material-Design UI feels dated, rigid, and tool-like, and its idle-time allocation flow is high-friction — which is why it stopped being opened daily.

**Goals (v1):**

- A UI in the **Things 3 school**: calm, airy, soft depth, fluid spring animations, minimal chrome.
- Tasks with subtasks, minute estimates, notes, and simple repeat rules; lightweight projects.
- A **Today** view with derived Overdue section and one-tap "Add to Today".
- Time tracking with a **humane idle-allocation flow** (the split bar — see §6).
- A **floating always-on-top widget** (pill ⇄ card) showing the active task.
- **Linear** issue sync (pull assigned issues; configurable completion writeback).
- **Apple Calendar** sync of an auto-scheduled day plan (past = actuals, future = plan) so upcoming tasks glance on Apple Watch via the standard calendar complication.
- **Discard (drop) tasks** without deleting them — a first-class terminal state Super Productivity lacks.

**Non-goals (v1):** multi-device sync, mobile/web clients, habits, boards, brain dump, dashboards, Pomodoro, task creation in Linear, watchOS app (calendar covers it).

## 2. Platform & Stack

- **Shell:** Tauri v2, macOS only for v1.
- **UI:** React + TypeScript + Vite. **Motion** (Framer Motion successor) for springs and layout morphs. **Zustand** for state.
- **Data:** SQLite via the Tauri SQL plugin, accessed through a typed repository layer in TS.
- **Rust side stays thin** — only what web tech can't do:
  - Idle detection: poll macOS "seconds since last input" every ~5s; emit `idle-started` / `activity-resumed` events with precise timestamps. All allocation *logic* lives in TS.
  - Window management: main window, widget window (frameless, transparent, always-on-top), menu bar tray (current task title, start/stop, open).
  - EventKit bridge for Apple Calendar writes.
- **Linear sync** runs in the frontend: GraphQL over HTTPS with a personal API key.

**Build order is UX-first:** the Today view, task interactions, and idle split sheet are built and tuned against realistic mock data before any SQLite/Rust/integration plumbing is wired. The feel is the project's reason to exist; de-risk it first.

## 3. Data Model

Five tables, deliberately boring:

- **projects** — id, name, color, sort_order, archived_at.
- **tasks** — id, project_id?, parent_id? (subtasks), title, notes, estimate_min?, scheduled_for? (date — this *is* the Today mechanism), status (`todo` | `done` | `dropped`), completed_at?, repeat_rule? (`daily` | weekday set), sort_order, linear_issue_id?, created_at.
- **time_entries** — id, task_id? (null = break/untracked), kind (`work` | `break` | `discarded`), started_at, ended_at, source (`timer` | `idle_allocation` | `manual`).
- **linear_links** — issue id, identifier (e.g. DEV-4563), url, team_id, state, last_synced_at.
- **settings** — key/value (Linear API key, per-team writeback status, idle threshold, calendar name, widget preferences…).

Derived, not stored: **Overdue** = unfinished tasks with `scheduled_for < today`. Day totals, estimate-remaining, and estimate-accuracy stats come from `time_entries` (accuracy stats exclude `dropped` tasks).

**Task states:** `todo → done` (check) or `todo → dropped` (discard). Both are terminal and reversible. `dropped` keeps all time entries and history — it records "I chose to stop", never deletes.

## 4. App Shell & Navigation

Single main window. Four destinations: **Today, Upcoming, Projects, Log.**

**Chosen layout: Today + live time rail** (companion option C, amended): the task list occupies a calm central column; a slim **collapsible** right rail visualizes today's hours as colored blocks — work (per-project color), break (green), unallocated gaps (striped). The rail is ambient feedback ("where did today actually go?") and is toggleable with one click / keyboard shortcut, remembered across launches.

Navigation chrome: **no sidebar** — a small floating pill switcher (bottom-center, Today/Upcoming/Projects/Log) keeps the window all-content, matching the chosen zero-chrome direction. Keyboard: ⌘1–4 switch views, ⌘N new task, space toggles timer on selected task.

## 5. Today View

- Header: date + **estimate remaining** for unfinished scheduled tasks.
- Tasks are soft cards: circle checkbox, title, project dot, estimate/elapsed at right. The active task shows a filled play indicator and live timer.
- **Completing a task keeps it visible**: springy check animation, strikethrough, card stays in place (muted) until the day rolls over. Unchecking restores it. (Inspired by Google Calendar Tasks' checked-but-present look the user loves.)
- **Discarding a task** (context menu / swipe): muted ✕-strikethrough, visually distinct from done; leaves the active list, remains in Log and project views.
- **Overdue section** below today's list: count + "Add to Today" (all) and per-task pull-in; adding simply updates `scheduled_for`.
- Repeat rule tasks regenerate at launch/midnight for the current day.

## 6. Time Tracking & the Idle Split Sheet (crown jewel)

- One active timer at a time. Starting a task's timer creates an open `work` entry; pausing/finishing closes it.
- Rust emits `idle-started` when input has been absent past the threshold (default 5 min, configurable) and `activity-resumed` on return. Sleep/lid-close is inherently covered: spans are computed from wall-clock timestamps, so a 40-minute lid-close yields one accurate 40-minute span on wake.
- **On return, the split sheet slides up** (companion option A): "Welcome back — you were away 23 minutes" above a single horizontal bar representing the whole span. Drag dividers to apportion between **active task / break / skip**; segments show live minute counts. Preset chips: *All task · All break · Skip all · ½/½*. One gesture, Done.
- Resolution writes the corresponding `time_entries` rows over the span (source `idle_allocation`). "Skip" writes a `discarded` entry so the span is accounted for and never re-prompted.
- If no timer was running, the sheet offers break/skip (and "assign to a task…" picker) instead of the active task.
- A timer running across midnight is split into two entries at 00:00 so daily totals stay truthful.

## 7. Floating Widget & Menu Bar

- **Rest state — the pill:** tiny capsule (pause · task title · elapsed), draggable anywhere, remembers position.
- **Hover — expands into the card:** progress ring against the estimate, elapsed vs estimate, pause / done buttons. Collapses back on mouse-leave.
- Implemented as a second frameless transparent Tauri window rendering a dedicated route of the same React bundle — same design system for free.
- Appears while a timer runs (option to pin always). Menu bar tray mirrors: current task + timer, start/stop, open app.

## 8. Linear Integration

- Personal API key in settings. Poll (~5 min) + manual refresh: open issues assigned to me.
- Issues appear as tasks in an auto-created **Linear** project, with identifier badge (DEV-4563) and deep link. Linear wins on title/state for incoming changes; issues closed/reassigned in Linear archive their local task.
- **Completion writeback is configurable per Linear team:** *do nothing* (default) or *move issue to a chosen status* (team statuses fetched live). Setting lives in settings UI under the Linear section.
- One-way otherwise: no comments, no issue creation, no other field writes in v1.

## 9. Apple Calendar Sync

- A dedicated app-owned calendar (default name "Focus"), written via the Rust EventKit bridge. Never touches other calendars.
- **Auto-scheduled plan:** remaining Today tasks are stacked sequentially from *now* using estimates and written as events; the plan re-flows when tasks complete, overrun, or reorder. Writes are idempotent (events tagged with task id) and throttled/debounced.
- **Past = actuals, future = plan:** completing a task freezes its event at the actually-worked interval, retitled "✓ Title". Dropping freezes it as "✕ Title". The calendar becomes a truthful journal of the day; the Watch complication always shows the next planned block.
- Calendar/EventKit permission denial degrades gracefully: feature off, quiet status indicator, everything else unaffected.

## 10. Edge Cases & Error Handling

- **Local-first:** SQLite is the source of truth; the app is fully functional offline.
- **Integrations fail soft:** Linear/Calendar errors surface only as a quiet status dot with details on click; they never block task flow.
- **Idle spans survive restarts:** timestamps are persisted, so a crash/quit during idle still produces a correct split sheet on next launch.
- **Midnight rollover:** running timers split at 00:00; Today rolls over; completed/dropped cards from yesterday leave Today (visible in Log); repeat tasks regenerate.

## 11. Testing

- **Vitest unit tests (crown jewels):** idle-span math and split allocation, midnight rollover, overdue derivation, auto-schedule packing/re-flow, repeat regeneration.
- **Repository integration tests** against a real SQLite file (migrations, CRUD, derived queries).
- **Linear/Calendar adapters** tested against recorded fixtures; live APIs behind manual smoke checks.
- **UI feel** validated by hand — animations and gesture feel are reviewed, not unit-tested.

## 12. Later (explicitly deferred)

Habits, boards/kanban, multi-device sync, iPhone client, manual time-blocking planner, Linear issue creation/comments, themes beyond light/dark, notification nudges, weekly review dashboards.
