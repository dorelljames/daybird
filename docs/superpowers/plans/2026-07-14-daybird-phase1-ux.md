# Daybird Phase 1 — UX Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running Tauri v2 macOS app, entirely on mock data, where the Things 3-style Today view, task interactions, split-bar idle sheet, floating widget, and keyboard navigation feel great — so the UX can be judged and iterated before any persistence/integration plumbing exists.

**Architecture:** Single React bundle serving two Tauri windows (main app + frameless always-on-top widget, selected by URL hash). All state in one Zustand store seeded from mock data; pure logic (time math, idle-split allocation, rail layout, hotkey matching) lives in dependency-free `lib/` modules that are TDD'd with Vitest. No Rust changes beyond `tauri.conf.json`; no SQLite, Linear, or Calendar in this phase.

**Tech Stack:** Tauri v2, React + TypeScript + Vite (create-tauri-app template), Motion (`motion` package), Zustand, Vitest, plain CSS with design tokens.

## Global Constraints

- macOS only; Tauri v2 (`@tauri-apps/api` v2, `tauri` CLI v2).
- Spec: `docs/superpowers/specs/2026-07-14-daybird-design.md` — Things 3 aesthetic: calm, airy, soft depth, spring animations, minimal chrome. No Material Design idioms.
- Only new runtime deps allowed: `motion`, `zustand`. No router, no date library, no UI kit, no CSS framework.
- Plain CSS via `src/styles/tokens.css` + `src/styles/app.css`; system font stack (`-apple-system`); light and dark supported via `prefers-color-scheme`.
- Package manager: npm. TypeScript strict (template default).
- Phase 1 is mock-data only: no persistence, no network, no Rust logic. The only Rust-side file touched is `src-tauri/tauri.conf.json` (+ `src-tauri/capabilities/default.json`).
- Pure logic modules (`src/lib/*`, `src/state/*`) must have Vitest coverage; UI feel is verified manually per task.
- Commit after every task (conventional commits, imperative subject).

## File Structure

```
package.json, vite.config.ts, index.html      — from template (+vitest config)
src-tauri/tauri.conf.json                     — 2 windows, overlay titlebar, macOSPrivateApi
src-tauri/capabilities/default.json           — event + window show/hide permissions
src/main.tsx                                  — entry; hash → MainApp | WidgetApp
src/App.tsx                                   — main window shell: views, hotkeys, widget sync
src/types.ts                                  — Task/Project/TimeEntry/enums
src/mock/seed.ts                              — mock projects, tasks, time entries
src/lib/time.ts                               — clock/duration/day-key helpers (TDD)
src/lib/allocate.ts                           — split-bar math (TDD)
src/lib/rail.ts                               — time-rail block layout (TDD)
src/lib/hotkeys.ts                            — hotkey matcher (TDD)
src/state/store.ts                            — Zustand store + actions (TDD)
src/state/selectors.ts                        — today/overdue/estimate derivations (TDD)
src/hooks/useNow.ts                           — 1s ticking clock hook
src/components/TodayView.tsx                  — header + task list + overdue
src/components/TaskCard.tsx                   — card, check animation, drop
src/components/Composer.tsx                   — inline quick-add
src/components/TimeRail.tsx                   — collapsible right rail
src/components/IdleSheet.tsx                  — split-bar sheet (crown jewel)
src/components/Switcher.tsx                   — floating bottom view switcher
src/components/PlaceholderView.tsx            — Upcoming/Projects/Log placeholders
src/widget/WidgetApp.tsx                      — pill ⇄ card floating widget
src/styles/tokens.css, src/styles/app.css     — design system
```

---

### Task 1: Scaffold Tauri app + dependencies

**Files:**
- Create: entire app skeleton at repo root (template files), merged `.gitignore`
- Modify: `package.json` (deps + test script)

**Interfaces:**
- Produces: working `npm run tauri dev`, `npm test` (vitest), deps `motion`, `zustand` installed. Repo root == app root.

- [ ] **Step 1: Verify toolchain**

Run: `node --version && rustc --version && cargo --version`
Expected: node ≥ 20, rustc ≥ 1.77. If rustc missing: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && source "$HOME/.cargo/env"` then re-verify.

- [ ] **Step 2: Scaffold into temp dir and merge into repo root**

```bash
cd /Users/dorelljames/Projects/mine/my-super-productivity
rm -rf .firecrawl
npm create tauri-app@latest daybird-scaffold -- --template react-ts --yes
cat .gitignore daybird-scaffold/.gitignore | sort -u > .gitignore.merged
rsync -a --exclude .gitignore daybird-scaffold/ ./
mv .gitignore.merged .gitignore
rm -rf daybird-scaffold
```

- [ ] **Step 3: Set app identity in `src-tauri/tauri.conf.json`**

Edit these keys (leave the rest as scaffolded):

```json
{
  "productName": "Daybird",
  "identifier": "com.dorelljames.daybird",
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Daybird",
        "width": 1000,
        "height": 700,
        "minWidth": 760,
        "minHeight": 520,
        "titleBarStyle": "Overlay",
        "hiddenTitle": true
      }
    ]
  }
}
```

- [ ] **Step 4: Install deps and add test script**

```bash
npm install
npm install motion zustand
npm install -D vitest
```

In `package.json` `"scripts"` add: `"test": "vitest run"`.

- [ ] **Step 5: Verify dev app launches**

Run: `npm run tauri dev` (first Rust compile takes several minutes).
Expected: a window titled Daybird opens with the template page; traffic lights overlay content (no title bar). Quit with Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri v2 + React/TS app with motion, zustand, vitest"
```

---

### Task 2: Design tokens + app shell

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/app.css`
- Modify: `src/main.tsx`, `src/App.tsx`; Delete: `src/App.css`, template assets

**Interfaces:**
- Produces: CSS custom properties (documented below) used by every later component; `<div class="shell">` layout with `.shell-main` content column; `src/main.tsx` renders `<App/>` (hash routing added in Task 10).

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
:root {
  --bg: #f5f5f7;
  --surface: #ffffff;
  --surface-2: #fafafa;
  --ink: #1d1d1f;
  --ink-2: #6e6e73;
  --ink-3: #aeaeb2;
  --line: #e8e8ed;
  --accent: #007aff;
  --accent-soft: #eaf3ff;
  --green: #34c759;
  --green-soft: #eaf7ee;
  --red: #ff3b30;
  --radius-s: 8px;
  --radius-m: 12px;
  --radius-l: 16px;
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-2: 0 4px 16px rgba(0, 0, 0, 0.1);
  --shadow-3: 0 8px 30px rgba(0, 0, 0, 0.14);
  --font: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1c1c1e;
    --surface: #2c2c2e;
    --surface-2: #242426;
    --ink: #f5f5f7;
    --ink-2: #98989d;
    --ink-3: #636366;
    --line: #3a3a3c;
    --accent: #0a84ff;
    --accent-soft: #16304a;
    --green: #30d158;
    --green-soft: #17301d;
    --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow-2: 0 4px 16px rgba(0, 0, 0, 0.5);
    --shadow-3: 0 8px 30px rgba(0, 0, 0, 0.6);
  }
}
```

- [ ] **Step 2: Write `src/styles/app.css` (base layer; later tasks append sections)**

```css
/* === base === */
* { box-sizing: border-box; margin: 0; }
html, body, #root { height: 100%; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  user-select: none;
  overflow: hidden;
}
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; padding: 0; }
input { font: inherit; color: inherit; }

/* === shell === */
.shell { height: 100%; display: flex; flex-direction: column; }
.titlebar { height: 38px; flex-shrink: 0; }
.shell-body { flex: 1; display: flex; min-height: 0; }
.shell-main {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-4) var(--sp-6) 96px;
}
.shell-main > .content { max-width: 560px; margin: 0 auto; }
```

- [ ] **Step 3: Replace `src/App.tsx` and `src/main.tsx`; delete template leftovers**

`src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="shell">
      <div className="titlebar" data-tauri-drag-region />
      <div className="shell-body">
        <main className="shell-main">
          <div className="content">
            <h1 style={{ fontSize: 26, letterSpacing: "-0.4px" }}>Today</h1>
          </div>
        </main>
      </div>
    </div>
  );
}
```

```bash
rm -f src/App.css src/assets/react.svg public/tauri.svg public/vite.svg
```

- [ ] **Step 4: Verify**

Run: `npm run tauri dev`
Expected: calm empty window, soft gray background, "Today" heading centered column, draggable by top strip. Check dark mode via System Settings → Appearance.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: design tokens and app shell"
```

---

### Task 3: Types, time helpers (TDD), mock seed

**Files:**
- Create: `src/types.ts`, `src/lib/time.ts`, `src/lib/time.test.ts`, `src/mock/seed.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `TaskStatus = "todo"|"done"|"dropped"`, `EntryKind = "work"|"break"|"discarded"`, `Project {id,name,color}`, `Task {id,projectId?,title,estimateMin?,scheduledFor?,status,completedAt?,linearId?,sortOrder}`, `TimeEntry {id,taskId:string|null,kind,start:number,end:number|null}` (ms epochs; `scheduledFor` is a local `YYYY-MM-DD` string).
  - `time.ts`: `MIN` (60000), `fmtClock(totalSec:number):string`, `fmtMin(min:number):string`, `dayKey(t:number):string`, `minutesBetween(a:number,b:number):number`, `atToday(hour:number,min?:number):number`.
  - `seed.ts`: `seedProjects:Project[]`, `seedTasks:Task[]`, `seedEntries:TimeEntry[]`.

- [ ] **Step 1: Write `src/types.ts`**

```ts
export type TaskStatus = "todo" | "done" | "dropped";
export type EntryKind = "work" | "break" | "discarded";

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  estimateMin?: number;
  scheduledFor?: string; // local YYYY-MM-DD
  status: TaskStatus;
  completedAt?: number;
  linearId?: string; // e.g. "DEV-4563"
  sortOrder: number;
}

export interface TimeEntry {
  id: string;
  taskId: string | null; // null = break/untracked
  kind: EntryKind;
  start: number; // epoch ms
  end: number | null; // null = running
}
```

- [ ] **Step 2: Write failing tests `src/lib/time.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { fmtClock, fmtMin, dayKey, minutesBetween, MIN } from "./time";

describe("time helpers", () => {
  test("fmtClock formats mm:ss", () => {
    expect(fmtClock(0)).toBe("0:00");
    expect(fmtClock(61)).toBe("1:01");
    expect(fmtClock(761)).toBe("12:41");
  });
  test("fmtMin formats human durations", () => {
    expect(fmtMin(55)).toBe("55m");
    expect(fmtMin(60)).toBe("1h");
    expect(fmtMin(85)).toBe("1h 25m");
  });
  test("dayKey is local YYYY-MM-DD", () => {
    const t = new Date(2026, 6, 14, 9, 30).getTime();
    expect(dayKey(t)).toBe("2026-07-14");
  });
  test("minutesBetween rounds to nearest minute", () => {
    const a = new Date(2026, 6, 14, 9, 0).getTime();
    expect(minutesBetween(a, a + 23 * MIN)).toBe(23);
    expect(minutesBetween(a, a + 90_000)).toBe(2);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./time`.

- [ ] **Step 4: Implement `src/lib/time.ts`**

```ts
export const MIN = 60_000;

export function fmtClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtMin(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function dayKey(t: number): string {
  const d = new Date(t);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mo}-${da}`;
}

export function minutesBetween(a: number, b: number): number {
  return Math.round((b - a) / MIN);
}

export function atToday(hour: number, min = 0): number {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d.getTime();
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (4 tests).

- [ ] **Step 6: Write `src/mock/seed.ts`**

```ts
import { Project, Task, TimeEntry } from "../types";
import { atToday, dayKey, MIN } from "../lib/time";

const today = dayKey(Date.now());
const yesterday = dayKey(Date.now() - 24 * 60 * MIN);

export const seedProjects: Project[] = [
  { id: "p-personal", name: "Personal", color: "#34c759" },
  { id: "p-dorellworks", name: "DorellWorks", color: "#ff9f0a" },
  { id: "p-linear", name: "Linear", color: "#5e6ad2" },
];

export const seedTasks: Task[] = [
  { id: "t-meditate", projectId: "p-personal", title: "Daily meditation", estimateMin: 15, scheduledFor: today, status: "todo", sortOrder: 1 },
  { id: "t-journal", projectId: "p-personal", title: "Daily journal", estimateMin: 15, scheduledFor: today, status: "todo", sortOrder: 2 },
  { id: "t-vwra", projectId: "p-personal", title: "Get a clear direction on consistent VWRA monthly savings", estimateMin: 55, scheduledFor: today, status: "todo", sortOrder: 3 },
  { id: "t-inbox", projectId: "p-dorellworks", title: "Cleanup Linear to allow managing personal projects properly", estimateMin: 60, scheduledFor: yesterday, status: "todo", sortOrder: 4 },
  { id: "t-dev-4563", projectId: "p-linear", title: "[settings & nav] Top bar: add 1px bottom border", estimateMin: 60, scheduledFor: yesterday, status: "todo", linearId: "DEV-4563", sortOrder: 5 },
  { id: "t-dev-4535", projectId: "p-linear", title: "[sell] Polish Stripe Terminal flow copy", estimateMin: 60, scheduledFor: yesterday, status: "todo", linearId: "DEV-4535", sortOrder: 6 },
];

export const seedEntries: TimeEntry[] = [
  { id: "e-1", taskId: "t-journal", kind: "work", start: atToday(9, 0), end: atToday(9, 50) },
  { id: "e-2", taskId: null, kind: "break", start: atToday(9, 50), end: atToday(10, 5) },
  { id: "e-3", taskId: "t-vwra", kind: "work", start: atToday(10, 5), end: atToday(10, 35) },
];
```

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/lib/time.ts src/lib/time.test.ts src/mock/seed.ts
git commit -m "feat: domain types, time helpers, mock seed"
```

---

### Task 4: Zustand store + selectors (TDD)

**Files:**
- Create: `src/state/store.ts`, `src/state/selectors.ts`, `src/state/store.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `time.ts`, `seed.ts`.
- Produces:
  - `store.ts`: `View = "today"|"upcoming"|"projects"|"log"`, `IdleSpan {start:number,end:number}`, `DaybirdState` (fields: `projects,tasks,entries,activeTaskId,view,selectedTaskId,idleSpan,railOpen,composerOpen`; actions: `toggleDone(id,now?)`, `dropTask(id,now?)`, `addTask(title,estimateMin?,now?)`, `addToToday(id,now?)`, `addAllOverdueToToday(now?)`, `startTimer(id,now?)`, `stopTimer(now?)`, `openIdleSheet(span)`, `resolveIdle(taskMin,breakMin,skipMin)`, `setView(v)`, `setSelected(id)`, `toggleRail()`, `setComposer(open)`), `storeCreator: StateCreator<DaybirdState>`, `useDaybird = create(storeCreator)`.
  - `selectors.ts`: `todayTasks(s,now?):Task[]`, `overdueTasks(s,now?):Task[]`, `workedMinToday(s,taskId,now?):number`, `estimateRemainingMin(s,now?):number`, `openEntry(s):TimeEntry|undefined`.

- [ ] **Step 1: Write failing tests `src/state/store.test.ts`**

```ts
import { beforeEach, describe, expect, test } from "vitest";
import { create } from "zustand";
import { storeCreator, DaybirdState } from "./store";
import { estimateRemainingMin, overdueTasks, todayTasks, workedMinToday } from "./selectors";
import { atToday, MIN } from "../lib/time";

let store: ReturnType<typeof create<DaybirdState>>;
beforeEach(() => {
  store = create<DaybirdState>()(storeCreator);
});
const NOW = atToday(11, 0);

describe("task state", () => {
  test("toggleDone marks done with timestamp and back", () => {
    store.getState().toggleDone("t-journal", NOW);
    let t = store.getState().tasks.find((t) => t.id === "t-journal")!;
    expect(t.status).toBe("done");
    expect(t.completedAt).toBe(NOW);
    store.getState().toggleDone("t-journal", NOW);
    t = store.getState().tasks.find((t) => t.id === "t-journal")!;
    expect(t.status).toBe("todo");
    expect(t.completedAt).toBeUndefined();
  });
  test("dropTask is terminal but reversible and never deletes", () => {
    store.getState().dropTask("t-vwra", NOW);
    const t = store.getState().tasks.find((t) => t.id === "t-vwra")!;
    expect(t.status).toBe("dropped");
    expect(store.getState().tasks.length).toBe(6);
  });
  test("completing the active task stops the timer", () => {
    store.getState().startTimer("t-journal", NOW);
    store.getState().toggleDone("t-journal", NOW + 5 * MIN);
    expect(store.getState().activeTaskId).toBeNull();
    const open = store.getState().entries.find((e) => e.end === null);
    expect(open).toBeUndefined();
  });
  test("addToToday reschedules an overdue task", () => {
    store.getState().addToToday("t-dev-4563", NOW);
    expect(overdueTasks(store.getState(), NOW).map((t) => t.id)).not.toContain("t-dev-4563");
    expect(todayTasks(store.getState(), NOW).map((t) => t.id)).toContain("t-dev-4563");
  });
  test("addTask appends a todo scheduled today", () => {
    store.getState().addTask("New thing", 25, NOW);
    const t = store.getState().tasks.at(-1)!;
    expect(t.title).toBe("New thing");
    expect(t.status).toBe("todo");
    expect(todayTasks(store.getState(), NOW).map((x) => x.id)).toContain(t.id);
  });
});

describe("timer", () => {
  test("startTimer opens a work entry; switching closes previous", () => {
    store.getState().startTimer("t-journal", NOW);
    store.getState().startTimer("t-vwra", NOW + 10 * MIN);
    const entries = store.getState().entries;
    const closed = entries.find((e) => e.taskId === "t-journal" && e.start === NOW)!;
    expect(closed.end).toBe(NOW + 10 * MIN);
    const open = entries.find((e) => e.end === null)!;
    expect(open.taskId).toBe("t-vwra");
    expect(store.getState().activeTaskId).toBe("t-vwra");
  });
});

describe("idle allocation", () => {
  test("openIdleSheet trims the running entry to idle start", () => {
    store.getState().startTimer("t-vwra", NOW);
    const span = { start: NOW + 10 * MIN, end: NOW + 33 * MIN };
    store.getState().openIdleSheet(span);
    const trimmed = store.getState().entries.find((e) => e.taskId === "t-vwra" && e.start === NOW)!;
    expect(trimmed.end).toBe(span.start);
    expect(store.getState().idleSpan).toEqual(span);
  });
  test("resolveIdle writes task/break/skip entries covering the span", () => {
    store.getState().startTimer("t-vwra", NOW);
    store.getState().openIdleSheet({ start: NOW + 10 * MIN, end: NOW + 33 * MIN });
    store.getState().resolveIdle(9, 10, 4);
    const s = store.getState();
    expect(s.idleSpan).toBeNull();
    const span = s.entries.filter((e) => e.start >= NOW + 10 * MIN && e.end !== null && e.end <= NOW + 33 * MIN);
    expect(span.map((e) => e.kind)).toEqual(["work", "break", "discarded"]);
    expect(span[0].taskId).toBe("t-vwra");
    expect((span[2].end! - span[0].start) / MIN).toBe(23);
  });
});

describe("selectors", () => {
  test("workedMinToday sums closed and open entries", () => {
    expect(workedMinToday(store.getState(), "t-journal", NOW)).toBe(50);
    store.getState().startTimer("t-journal", NOW);
    expect(workedMinToday(store.getState(), "t-journal", NOW + 10 * MIN)).toBe(60);
  });
  test("estimateRemainingMin sums max(0, estimate - worked) for today's todos", () => {
    // meditation 15-0 + journal 15-50→0 + vwra 55-30=25 → 40
    expect(estimateRemainingMin(store.getState(), NOW)).toBe(40);
  });
  test("overdue excludes done/dropped", () => {
    store.getState().dropTask("t-inbox", NOW);
    expect(overdueTasks(store.getState(), NOW).map((t) => t.id)).toEqual(["t-dev-4563", "t-dev-4535"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./store`.

- [ ] **Step 3: Implement `src/state/store.ts`**

```ts
import { create, StateCreator } from "zustand";
import { Project, Task, TimeEntry } from "../types";
import { seedEntries, seedProjects, seedTasks } from "../mock/seed";
import { dayKey, MIN } from "../lib/time";

export type View = "today" | "upcoming" | "projects" | "log";
export interface IdleSpan { start: number; end: number; }

export interface DaybirdState {
  projects: Project[];
  tasks: Task[];
  entries: TimeEntry[];
  activeTaskId: string | null;
  view: View;
  selectedTaskId: string | null;
  idleSpan: IdleSpan | null;
  railOpen: boolean;
  composerOpen: boolean;
  toggleDone(id: string, now?: number): void;
  dropTask(id: string, now?: number): void;
  addTask(title: string, estimateMin?: number, now?: number): void;
  addToToday(id: string, now?: number): void;
  addAllOverdueToToday(now?: number): void;
  startTimer(id: string, now?: number): void;
  stopTimer(now?: number): void;
  openIdleSheet(span: IdleSpan): void;
  resolveIdle(taskMin: number, breakMin: number, skipMin: number): void;
  setView(v: View): void;
  setSelected(id: string | null): void;
  toggleRail(): void;
  setComposer(open: boolean): void;
}

function closeOpenEntry(entries: TimeEntry[], at: number): TimeEntry[] {
  return entries.map((e) => (e.end === null ? { ...e, end: Math.max(e.start, at) } : e));
}

export const storeCreator: StateCreator<DaybirdState> = (set, get) => ({
  projects: seedProjects,
  tasks: seedTasks,
  entries: seedEntries,
  activeTaskId: null,
  view: "today",
  selectedTaskId: null,
  idleSpan: null,
  railOpen: true,
  composerOpen: false,

  toggleDone: (id, now = Date.now()) =>
    set((s) => {
      const target = s.tasks.find((t) => t.id === id);
      const finishing = target?.status !== "done";
      return {
        tasks: s.tasks.map((t) =>
          t.id !== id
            ? t
            : finishing
              ? { ...t, status: "done", completedAt: now }
              : { ...t, status: "todo", completedAt: undefined }
        ),
        entries: finishing && s.activeTaskId === id ? closeOpenEntry(s.entries, now) : s.entries,
        activeTaskId: finishing && s.activeTaskId === id ? null : s.activeTaskId,
      };
    }),

  dropTask: (id, now = Date.now()) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id !== id
          ? t
          : t.status === "dropped"
            ? { ...t, status: "todo", completedAt: undefined }
            : { ...t, status: "dropped", completedAt: now }
      ),
      entries: s.activeTaskId === id ? closeOpenEntry(s.entries, now) : s.entries,
      activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
    })),

  addTask: (title, estimateMin, now = Date.now()) =>
    set((s) => ({
      tasks: [
        ...s.tasks,
        {
          id: crypto.randomUUID(),
          title,
          estimateMin,
          scheduledFor: dayKey(now),
          status: "todo",
          sortOrder: Math.max(0, ...s.tasks.map((t) => t.sortOrder)) + 1,
        },
      ],
    })),

  addToToday: (id, now = Date.now()) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, scheduledFor: dayKey(now) } : t)),
    })),

  addAllOverdueToToday: (now = Date.now()) =>
    set((s) => {
      const today = dayKey(now);
      return {
        tasks: s.tasks.map((t) =>
          t.status === "todo" && t.scheduledFor && t.scheduledFor < today
            ? { ...t, scheduledFor: today }
            : t
        ),
      };
    }),

  startTimer: (id, now = Date.now()) =>
    set((s) => ({
      entries: [
        ...closeOpenEntry(s.entries, now),
        { id: crypto.randomUUID(), taskId: id, kind: "work", start: now, end: null },
      ],
      activeTaskId: id,
    })),

  stopTimer: (now = Date.now()) =>
    set((s) => ({ entries: closeOpenEntry(s.entries, now), activeTaskId: null })),

  openIdleSheet: (span) =>
    set((s) => ({ entries: closeOpenEntry(s.entries, span.start), idleSpan: span })),

  resolveIdle: (taskMin, breakMin, skipMin) =>
    set((s) => {
      if (!s.idleSpan) return {};
      const { start } = s.idleSpan;
      const mk = (kind: TimeEntry["kind"], taskId: string | null, from: number, min: number): TimeEntry => ({
        id: crypto.randomUUID(), taskId, kind, start: from, end: from + min * MIN,
      });
      const out: TimeEntry[] = [];
      let cursor = start;
      if (taskMin > 0) { out.push(mk("work", s.activeTaskId, cursor, taskMin)); cursor += taskMin * MIN; }
      if (breakMin > 0) { out.push(mk("break", null, cursor, breakMin)); cursor += breakMin * MIN; }
      if (skipMin > 0) { out.push(mk("discarded", null, cursor, skipMin)); }
      return { entries: [...s.entries, ...out], idleSpan: null };
    }),

  setView: (view) => set({ view }),
  setSelected: (selectedTaskId) => set({ selectedTaskId }),
  toggleRail: () => set((s) => ({ railOpen: !s.railOpen })),
  setComposer: (composerOpen) => set({ composerOpen }),
});

export const useDaybird = create<DaybirdState>()(storeCreator);
```

- [ ] **Step 4: Implement `src/state/selectors.ts`**

```ts
import { Task, TimeEntry } from "../types";
import { dayKey, minutesBetween } from "../lib/time";
import { DaybirdState } from "./store";

const bySort = (a: Task, b: Task) => a.sortOrder - b.sortOrder;

export function todayTasks(s: DaybirdState, now = Date.now()): Task[] {
  const k = dayKey(now);
  return s.tasks.filter((t) => t.scheduledFor === k).sort(bySort);
}

export function overdueTasks(s: DaybirdState, now = Date.now()): Task[] {
  const k = dayKey(now);
  return s.tasks
    .filter((t) => t.status === "todo" && t.scheduledFor !== undefined && t.scheduledFor < k)
    .sort(bySort);
}

export function openEntry(s: DaybirdState): TimeEntry | undefined {
  return s.entries.find((e) => e.end === null);
}

export function workedMinToday(s: DaybirdState, taskId: string, now = Date.now()): number {
  const k = dayKey(now);
  return s.entries
    .filter((e) => e.taskId === taskId && e.kind === "work" && dayKey(e.start) === k)
    .reduce((sum, e) => sum + minutesBetween(e.start, e.end ?? now), 0);
}

export function estimateRemainingMin(s: DaybirdState, now = Date.now()): number {
  return todayTasks(s, now)
    .filter((t) => t.status === "todo")
    .reduce((sum, t) => sum + Math.max(0, (t.estimateMin ?? 0) - workedMinToday(s, t.id, now)), 0);
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (all suites; 15 tests total so far).

- [ ] **Step 6: Commit**

```bash
git add src/state/
git commit -m "feat: zustand store, actions, and selectors with tests"
```

---

### Task 5: Today view — header, cards, live timer

**Files:**
- Create: `src/hooks/useNow.ts`, `src/components/TaskCard.tsx`, `src/components/TodayView.tsx`
- Modify: `src/App.tsx`, append to `src/styles/app.css`

**Interfaces:**
- Consumes: `useDaybird`, selectors, `fmtClock/fmtMin`, Motion.
- Produces: `useNow(ms:number):number`; `<TaskCard task now selected/>` (renders one task; handles check/drop/play internally via store); `<TodayView now/>`. Task 6 refines TaskCard's animations; Task 7 adds `<OverdueSection/>` into TodayView.

- [ ] **Step 1: Write `src/hooks/useNow.ts`**

```ts
import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
```

- [ ] **Step 2: Write `src/components/TaskCard.tsx` (first pass; animations refined in Task 6)**

```tsx
import { motion } from "motion/react";
import { Task } from "../types";
import { useDaybird } from "../state/store";
import { workedMinToday } from "../state/selectors";
import { fmtClock, fmtMin } from "../lib/time";

export default function TaskCard({ task, now, selected }: { task: Task; now: number; selected: boolean }) {
  const s = useDaybird();
  const active = s.activeTaskId === task.id;
  const open = s.entries.find((e) => e.end === null && e.taskId === task.id);
  const elapsedSec = open ? Math.floor((now - open.start) / 1000) : 0;
  const worked = workedMinToday(s, task.id, now);
  const project = s.projects.find((p) => p.id === task.projectId);
  const terminal = task.status !== "todo";

  return (
    <motion.div
      layout
      className={`task ${active ? "task-active" : ""} ${terminal ? `task-${task.status}` : ""} ${selected ? "task-selected" : ""}`}
      onClick={() => s.setSelected(task.id)}
    >
      <button
        className={`task-check ${task.status === "done" ? "is-done" : ""}`}
        aria-label="complete"
        onClick={(e) => { e.stopPropagation(); s.toggleDone(task.id); }}
      >
        {task.status === "done" && (
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path d="M2.5 6.5 L5 9 L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {task.status === "dropped" && <span className="task-x">×</span>}
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          {project && <span className="task-dot" style={{ background: project.color }} />}
          {task.linearId && <span className="task-linear">{task.linearId}</span>}
          {project && <span>{project.name}</span>}
        </div>
      </div>

      <div className="task-right">
        {active ? (
          <span className="task-clock">{fmtClock(elapsedSec)}</span>
        ) : (
          task.estimateMin !== undefined && <span className="task-est">{worked > 0 ? `${fmtMin(worked)} / ` : ""}{fmtMin(task.estimateMin)}</span>
        )}
        {task.status === "todo" && (
          <button
            className={`task-play ${active ? "is-active" : ""}`}
            aria-label={active ? "pause" : "start"}
            onClick={(e) => { e.stopPropagation(); active ? s.stopTimer() : s.startTimer(task.id); }}
          >
            {active ? "❚❚" : "▶"}
          </button>
        )}
        {task.status === "todo" && (
          <button className="task-drop" aria-label="discard" onClick={(e) => { e.stopPropagation(); s.dropTask(task.id); }}>
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Write `src/components/TodayView.tsx`**

```tsx
import { useDaybird } from "../state/store";
import { estimateRemainingMin, todayTasks } from "../state/selectors";
import { fmtMin } from "../lib/time";
import TaskCard from "./TaskCard";

export default function TodayView({ now }: { now: number }) {
  const s = useDaybird();
  const tasks = todayTasks(s, now);
  const remaining = estimateRemainingMin(s, now);
  const date = new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="content">
      <header className="today-head">
        <h1>Today</h1>
        <div className="today-sub">
          {date}
          {remaining > 0 && <span> · ~{fmtMin(remaining)} left</span>}
        </div>
      </header>
      <section className="task-list">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} now={now} selected={s.selectedTaskId === t.id} />
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Wire into `src/App.tsx`**

```tsx
import { useNow } from "./hooks/useNow";
import TodayView from "./components/TodayView";

export default function App() {
  const now = useNow(1000);
  return (
    <div className="shell">
      <div className="titlebar" data-tauri-drag-region />
      <div className="shell-body">
        <main className="shell-main">
          <TodayView now={now} />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Append to `src/styles/app.css`**

```css
/* === today === */
.today-head { margin-bottom: var(--sp-5); }
.today-head h1 { font-size: 26px; letter-spacing: -0.4px; }
.today-sub { color: var(--ink-2); font-size: 13px; margin-top: var(--sp-1); }

.task-list { display: flex; flex-direction: column; gap: var(--sp-2); }
.task {
  display: flex; align-items: center; gap: var(--sp-3);
  background: var(--surface);
  border-radius: var(--radius-m);
  padding: var(--sp-3) var(--sp-4);
  box-shadow: var(--shadow-1);
}
.task-selected { box-shadow: 0 0 0 2px var(--accent-soft), var(--shadow-1); }
.task-active { box-shadow: 0 0 0 1.5px var(--accent), var(--shadow-2); }
.task-check {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  border: 1.5px solid var(--ink-3);
  display: flex; align-items: center; justify-content: center;
  color: #fff; transition: border-color 0.15s;
}
.task-check:hover { border-color: var(--accent); }
.task-check.is-done { background: var(--accent); border-color: var(--accent); }
.task-x { color: var(--ink-3); font-size: 13px; }
.task-body { flex: 1; min-width: 0; }
.task-title { font-size: 14px; line-height: 1.35; }
.task-meta { display: flex; align-items: center; gap: var(--sp-2); color: var(--ink-3); font-size: 11px; margin-top: 2px; }
.task-dot { width: 7px; height: 7px; border-radius: 50%; }
.task-linear { color: var(--ink-2); font-weight: 500; }
.task-right { display: flex; align-items: center; gap: var(--sp-2); }
.task-est { color: var(--ink-3); font-size: 12px; font-variant-numeric: tabular-nums; }
.task-clock { color: var(--accent); font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.task-play, .task-drop {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--ink-2);
  opacity: 0; transition: opacity 0.15s, background 0.15s;
}
.task:hover .task-play, .task:hover .task-drop, .task-play.is-active { opacity: 1; }
.task-play.is-active { background: var(--accent); color: #fff; }
.task-play:hover { background: var(--accent-soft); color: var(--accent); }
.task-play.is-active:hover { background: var(--accent); color: #fff; }
.task-drop:hover { background: var(--line); }
.task-done .task-title { text-decoration: line-through; color: var(--ink-3); }
.task-done, .task-dropped { opacity: 0.6; }
.task-dropped .task-title { text-decoration: line-through; color: var(--ink-3); text-decoration-color: var(--ink-3); }
```

- [ ] **Step 6: Verify manually**

Run: `npm run tauri dev`
Expected: three tasks for today; hovering reveals ▶ and ✕; pressing ▶ rings the card blue and a live m:ss counter ticks; checking strikes through but the card stays; ✕ mutes with an ×.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Today view with task cards and live timer"
```

---

### Task 6: Check/drop animations + inline composer

**Files:**
- Modify: `src/components/TaskCard.tsx`, `src/components/TodayView.tsx`, append `src/styles/app.css`
- Create: `src/components/Composer.tsx`

**Interfaces:**
- Consumes: store (`addTask`, `composerOpen`, `setComposer`).
- Produces: springy check (circle pop + path draw), drop fade, `AnimatePresence` list moves; `<Composer/>` rendered by TodayView; the "+ New task" affordance. `⌘N` binding arrives in Task 11.

- [ ] **Step 1: Upgrade `TaskCard` animations**

In `src/components/TaskCard.tsx` replace the check button and wrap with motion springs:

```tsx
// replace the <button className="task-check"...> block with:
<motion.button
  className={`task-check ${task.status === "done" ? "is-done" : ""}`}
  aria-label="complete"
  whileTap={{ scale: 0.85 }}
  animate={task.status === "done" ? { scale: [1, 1.25, 1] } : { scale: 1 }}
  transition={{ type: "spring", stiffness: 500, damping: 22 }}
  onClick={(e) => { e.stopPropagation(); s.toggleDone(task.id); }}
>
  {task.status === "done" && (
    <svg viewBox="0 0 12 12" width="12" height="12">
      <motion.path
        d="M2.5 6.5 L5 9 L9.5 3.5"
        fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
    </svg>
  )}
  {task.status === "dropped" && <span className="task-x">×</span>}
</motion.button>
```

And give the root card entrance/exit + layout springs:

```tsx
<motion.div
  layout
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, height: 0, marginBottom: -8 }}
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
  ...
```

- [ ] **Step 2: Write `src/components/Composer.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";

export default function Composer() {
  const s = useDaybird();
  const [title, setTitle] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (s.composerOpen) ref.current?.focus(); }, [s.composerOpen]);

  function submit() {
    const t = title.trim();
    if (t) s.addTask(t);
    setTitle("");
    s.setComposer(false);
  }

  return (
    <AnimatePresence>
      {s.composerOpen && (
        <motion.div
          className="composer"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        >
          <input
            ref={ref}
            value={title}
            placeholder="New task…"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setTitle(""); s.setComposer(false); }
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Mount composer + AnimatePresence list in `TodayView`**

```tsx
// additions to TodayView.tsx
import { AnimatePresence } from "motion/react";
import Composer from "./Composer";

// header gains a + button:
<header className="today-head">
  <div className="today-head-row">
    <h1>Today</h1>
    <button className="add-btn" aria-label="new task" onClick={() => s.setComposer(true)}>＋</button>
  </div>
  <div className="today-sub">…(unchanged)…</div>
</header>
<Composer />
<section className="task-list">
  <AnimatePresence initial={false}>
    {tasks.map((t) => (
      <TaskCard key={t.id} task={t} now={now} selected={s.selectedTaskId === t.id} />
    ))}
  </AnimatePresence>
</section>
```

- [ ] **Step 4: Append to `src/styles/app.css`**

```css
/* === composer === */
.today-head-row { display: flex; align-items: center; justify-content: space-between; }
.add-btn {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--accent-soft); color: var(--accent);
  font-size: 15px; display: flex; align-items: center; justify-content: center;
}
.composer { overflow: hidden; margin-bottom: var(--sp-2); }
.composer input {
  width: 100%;
  background: var(--surface);
  border: none; outline: none;
  border-radius: var(--radius-m);
  padding: var(--sp-3) var(--sp-4);
  box-shadow: 0 0 0 2px var(--accent), var(--shadow-2);
  font-size: 14px;
}
```

- [ ] **Step 5: Verify manually**

Run: `npm run tauri dev`
Expected: checking pops the circle with a drawn checkmark; ＋ opens a focused input with spring; Enter adds a task that springs into the list; Esc closes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: springy check/drop animations and inline composer"
```

---

### Task 7: Overdue section + Add to Today

**Files:**
- Create: `src/components/OverdueSection.tsx`
- Modify: `src/components/TodayView.tsx`, append `src/styles/app.css`

**Interfaces:**
- Consumes: `overdueTasks`, `addToToday`, `addAllOverdueToToday`, `TaskCard`.
- Produces: `<OverdueSection now/>` rendered under the task list. Cards animate from Overdue into Today via shared `layout` (they render the same `TaskCard key=task.id`, so Motion morphs position automatically).

- [ ] **Step 1: Write `src/components/OverdueSection.tsx`**

```tsx
import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";
import { overdueTasks } from "../state/selectors";
import TaskCard from "./TaskCard";

export default function OverdueSection({ now }: { now: number }) {
  const s = useDaybird();
  const overdue = overdueTasks(s, now);
  if (overdue.length === 0) return null;

  return (
    <motion.section layout className="overdue">
      <div className="overdue-head">
        <span className="overdue-label">Overdue · {overdue.length}</span>
        <button className="pill-btn" onClick={() => s.addAllOverdueToToday()}>☀️ Add all to Today</button>
      </div>
      <div className="task-list overdue-list">
        <AnimatePresence initial={false}>
          {overdue.map((t) => (
            <div className="overdue-row" key={t.id}>
              <TaskCard task={t} now={now} selected={s.selectedTaskId === t.id} />
              <button className="pill-btn overdue-pull" onClick={() => s.addToToday(t.id)}>Today</button>
            </div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: Mount in `TodayView` after the task list**

```tsx
import OverdueSection from "./OverdueSection";
// after </section> of task-list:
<OverdueSection now={now} />
```

- [ ] **Step 3: Append to `src/styles/app.css`**

```css
/* === overdue === */
.overdue { margin-top: var(--sp-6); }
.overdue-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-2); }
.overdue-label { color: var(--ink-2); font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
.pill-btn {
  background: var(--accent-soft); color: var(--accent);
  border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600;
}
.overdue-row { display: flex; align-items: center; gap: var(--sp-2); }
.overdue-row .task { flex: 1; opacity: 0.75; }
.overdue-pull { flex-shrink: 0; opacity: 0; transition: opacity 0.15s; }
.overdue-row:hover .overdue-pull { opacity: 1; }
```

- [ ] **Step 4: Verify manually**

Run: `npm run tauri dev`
Expected: Overdue section lists 3 muted tasks; hovering a row reveals "Today"; clicking it springs the card up into the Today list; "Add all" moves the rest.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: overdue section with add-to-today pull-in"
```

---

### Task 8: Collapsible time rail (TDD layout math)

**Files:**
- Create: `src/lib/rail.ts`, `src/lib/rail.test.ts`, `src/components/TimeRail.tsx`
- Modify: `src/App.tsx`, append `src/styles/app.css`

**Interfaces:**
- Consumes: `entries` from store, `useNow`.
- Produces: `layoutRail(entries, dayStartHour, pxPerHour, now): RailBlock[]` where `RailBlock {top:number; height:number; kind: EntryKind | "gap"}`; `<TimeRail now/>` mounted beside `.shell-main`; `railOpen`/`toggleRail` already in store.

- [ ] **Step 1: Write failing tests `src/lib/rail.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { layoutRail } from "./rail";
import { TimeEntry } from "../types";
import { atToday, MIN } from "./time";

const PX = 40; // px per hour
const e = (start: number, end: number | null, kind: TimeEntry["kind"]): TimeEntry => ({
  id: String(start), taskId: kind === "work" ? "t" : null, kind, start, end,
});

describe("layoutRail", () => {
  test("positions blocks from day start and inserts gaps ≥3min", () => {
    const blocks = layoutRail(
      [e(atToday(9, 0), atToday(9, 50), "work"), e(atToday(10, 0), atToday(10, 30), "break")],
      8, PX, atToday(11, 0)
    );
    expect(blocks.map((b) => b.kind)).toEqual(["work", "gap", "break"]);
    expect(blocks[0].top).toBe(PX); // 9:00 is 1h after 8:00
    expect(blocks[0].height).toBeCloseTo((50 / 60) * PX);
    expect(blocks[1].top).toBeCloseTo(PX + (50 / 60) * PX);
    expect(blocks[1].height).toBeCloseTo((10 / 60) * PX);
  });
  test("ignores sub-3-minute gaps", () => {
    const blocks = layoutRail(
      [e(atToday(9, 0), atToday(9, 30), "work"), e(atToday(9, 32), atToday(9, 45), "break")],
      8, PX, atToday(10, 0)
    );
    expect(blocks.map((b) => b.kind)).toEqual(["work", "break"]);
  });
  test("open entry extends to now", () => {
    const blocks = layoutRail([e(atToday(9, 0), null, "work")], 8, PX, atToday(9, 30));
    expect(blocks[0].height).toBeCloseTo((30 / 60) * PX);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./rail`.

- [ ] **Step 3: Implement `src/lib/rail.ts`**

```ts
import { EntryKind, TimeEntry } from "../types";
import { MIN } from "./time";

export interface RailBlock {
  top: number;
  height: number;
  kind: EntryKind | "gap";
}

const GAP_MIN = 3;

export function layoutRail(
  entries: TimeEntry[],
  dayStartHour: number,
  pxPerHour: number,
  now: number
): RailBlock[] {
  const dayStart = new Date(now);
  dayStart.setHours(dayStartHour, 0, 0, 0);
  const origin = dayStart.getTime();
  const toPx = (ms: number) => ((ms - origin) / (60 * MIN)) * pxPerHour;

  const sorted = entries
    .filter((e) => (e.end ?? now) > origin)
    .map((e) => ({ ...e, end: e.end ?? now }))
    .sort((a, b) => a.start - b.start);

  const blocks: RailBlock[] = [];
  let prevEnd: number | null = null;
  for (const e of sorted) {
    if (prevEnd !== null && e.start - prevEnd >= GAP_MIN * MIN) {
      blocks.push({ top: toPx(prevEnd), height: toPx(e.start) - toPx(prevEnd), kind: "gap" });
    }
    blocks.push({ top: toPx(e.start), height: toPx(e.end) - toPx(e.start), kind: e.kind });
    prevEnd = e.end;
  }
  return blocks;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (3 new tests).

- [ ] **Step 5: Write `src/components/TimeRail.tsx`**

```tsx
import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";
import { layoutRail } from "../lib/rail";

const DAY_START = 8;
const PX_PER_HOUR = 44;
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export default function TimeRail({ now }: { now: number }) {
  const s = useDaybird();
  const blocks = layoutRail(s.entries, DAY_START, PX_PER_HOUR, now);
  const nowTop = ((now - new Date(now).setHours(DAY_START, 0, 0, 0)) / 3_600_000) * PX_PER_HOUR;

  return (
    <AnimatePresence initial={false}>
      {s.railOpen && (
        <motion.aside
          className="rail"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 96, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
        >
          <div className="rail-inner">
            {HOURS.map((h, i) => (
              <div key={h} className="rail-hour" style={{ top: i * PX_PER_HOUR }}>
                {h <= 12 ? h : h - 12}
              </div>
            ))}
            {blocks.map((b, i) => (
              <motion.div
                key={i}
                className={`rail-block rail-${b.kind}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ top: b.top, height: Math.max(3, b.height) }}
              />
            ))}
            {nowTop > 0 && <div className="rail-now" style={{ top: nowTop }} />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 6: Mount rail + toggle in `App.tsx`**

```tsx
import { useNow } from "./hooks/useNow";
import TodayView from "./components/TodayView";
import TimeRail from "./components/TimeRail";
import { useDaybird } from "./state/store";

export default function App() {
  const now = useNow(1000);
  const s = useDaybird();
  return (
    <div className="shell">
      <div className="titlebar" data-tauri-drag-region>
        <button className="rail-toggle" onClick={() => s.toggleRail()} aria-label="toggle time rail">◫</button>
      </div>
      <div className="shell-body">
        <main className="shell-main">
          <TodayView now={now} />
        </main>
        <TimeRail now={now} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Append to `src/styles/app.css`**

```css
/* === time rail === */
.titlebar { display: flex; align-items: center; justify-content: flex-end; padding: 0 var(--sp-3); }
.rail-toggle { color: var(--ink-3); font-size: 14px; width: 26px; height: 26px; border-radius: 6px; }
.rail-toggle:hover { background: var(--line); color: var(--ink-2); }
.rail { overflow: hidden; border-left: 1px solid var(--line); background: var(--surface-2); }
.rail-inner { position: relative; width: 96px; height: 100%; padding: var(--sp-2); }
.rail-hour { position: absolute; left: 8px; color: var(--ink-3); font-size: 9px; border-top: 1px solid var(--line); width: 80px; padding-top: 1px; }
.rail-block { position: absolute; left: 30px; width: 52px; border-radius: 4px; }
.rail-work { background: var(--accent); opacity: 0.5; }
.rail-break { background: var(--green); opacity: 0.5; }
.rail-discarded { background: var(--ink-3); opacity: 0.3; }
.rail-gap {
  background: repeating-linear-gradient(45deg, var(--line), var(--line) 3px, transparent 3px, transparent 6px);
  border: 1px dashed var(--ink-3); opacity: 0.7;
}
.rail-now { position: absolute; left: 26px; width: 60px; height: 2px; background: var(--red); border-radius: 1px; }
```

- [ ] **Step 8: Verify manually**

Run: `npm run tauri dev`
Expected: right rail shows morning blocks (blue work, green break, striped gap), red "now" line; ◫ collapses/expands with a spring; starting a timer grows a live blue block.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: collapsible time rail with tested block layout"
```

---

### Task 9: Idle split sheet — the crown jewel (TDD allocation math)

**Files:**
- Create: `src/lib/allocate.ts`, `src/lib/allocate.test.ts`, `src/components/IdleSheet.tsx`
- Modify: `src/App.tsx`, append `src/styles/app.css`

**Interfaces:**
- Consumes: store (`idleSpan`, `openIdleSheet`, `resolveIdle`, `activeTaskId`), `minutesBetween`.
- Produces: `fractionsFromBoundaries(b1:number,b2:number):[number,number,number]`, `allocate(totalMin:number,fractions:number[]):number[]` (largest-remainder rounding, sums exactly to total); `<IdleSheet/>` mounted at App root. Dev trigger: the `⇧⌘I` binding lands in Task 11; until then a temporary "Simulate idle" button in the titlebar (added here, kept — it's useful during the whole prototype phase).

- [ ] **Step 1: Write failing tests `src/lib/allocate.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { allocate, fractionsFromBoundaries } from "./allocate";

describe("fractionsFromBoundaries", () => {
  test("converts two boundary positions into three fractions", () => {
    expect(fractionsFromBoundaries(0.4, 0.8)).toEqual([0.4, 0.4, 0.2]);
  });
  test("clamps and orders boundaries", () => {
    expect(fractionsFromBoundaries(-0.2, 1.4)).toEqual([0, 1, 0]);
    expect(fractionsFromBoundaries(0.7, 0.3)).toEqual([0.7, 0, 0.3]);
  });
});

describe("allocate", () => {
  test("splits minutes and always sums to total", () => {
    expect(allocate(23, [0.39, 0.44, 0.17])).toEqual([9, 10, 4]);
    for (let total = 1; total <= 120; total++) {
      const parts = allocate(total, [1 / 3, 1 / 3, 1 / 3]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
  test("all-in-one presets", () => {
    expect(allocate(23, [1, 0, 0])).toEqual([23, 0, 0]);
    expect(allocate(23, [0, 0, 1])).toEqual([0, 0, 23]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./allocate`.

- [ ] **Step 3: Implement `src/lib/allocate.ts`**

```ts
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function fractionsFromBoundaries(b1: number, b2: number): [number, number, number] {
  const x1 = clamp01(b1);
  const x2 = Math.max(clamp01(b2), x1);
  return [x1, x2 - x1, 1 - x2];
}

export function allocate(totalMin: number, fractions: number[]): number[] {
  const raw = fractions.map((f) => totalMin * f);
  const base = raw.map(Math.floor);
  let left = totalMin - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => [r - base[i], i] as const)
    .sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    base[i]++;
    left--;
  }
  return base;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (4 new tests).

- [ ] **Step 5: Write `src/components/IdleSheet.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";
import { allocate, fractionsFromBoundaries } from "../lib/allocate";
import { minutesBetween } from "../lib/time";

const SEGMENTS = [
  { key: "task", cls: "seg-task" },
  { key: "break", cls: "seg-break" },
  { key: "skip", cls: "seg-skip" },
] as const;

export default function IdleSheet() {
  const s = useDaybird();
  const barRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<[number, number]>([0.4, 0.8]);
  const activeTask = s.tasks.find((t) => t.id === s.activeTaskId);

  // re-initialize the split each time the sheet opens; no task segment when idle hit with no timer
  useEffect(() => {
    if (s.idleSpan) setBounds(s.activeTaskId ? [0.4, 0.8] : [0, 0.8]);
  }, [s.idleSpan, s.activeTaskId]);

  if (!s.idleSpan) return null;
  const total = minutesBetween(s.idleSpan.start, s.idleSpan.end);
  const fractions = fractionsFromBoundaries(bounds[0], bounds[1]);
  const mins = allocate(total, fractions);
  const labels = [activeTask ? activeTask.title : "Task", "Break", "Skip"];

  function dragBoundary(index: 0 | 1) {
    return (e: React.PointerEvent) => {
      const bar = barRef.current!;
      const rect = bar.getBoundingClientRect();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const f = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
        setBounds(([b1, b2]) =>
          index === 0 ? [Math.min(f, b2), b2] : [b1, Math.max(f, b1)]
        );
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  const presets: Array<[string, [number, number]]> = [
    ["All task", [1, 1]],
    ["All break", [0, 1]],
    ["Skip all", [0, 0]],
    ["½ / ½", [0.5, 1]],
  ];

  return (
    <AnimatePresence>
      <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="sheet"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          <div className="sheet-title">Welcome back 👋</div>
          <div className="sheet-sub">You were away for {total} minutes</div>

          <div className="split-bar" ref={barRef}>
            {SEGMENTS.map((seg, i) => (
              <div key={seg.key} className={`seg ${seg.cls}`} style={{ flexGrow: Math.max(fractions[i], 0.001) }}>
                {mins[i] > 0 && fractions[i] > 0.09 && (
                  <>
                    <span className="seg-min">{mins[i]}m</span>
                    <span className="seg-label">{labels[i]}</span>
                  </>
                )}
              </div>
            ))}
            <div className="split-handle" style={{ left: `${bounds[0] * 100}%` }} onPointerDown={dragBoundary(0)} />
            <div className="split-handle" style={{ left: `${bounds[1] * 100}%` }} onPointerDown={dragBoundary(1)} />
          </div>

          <div className="sheet-chips">
            {presets.map(([label, b]) => (
              <button key={label} className="chip" onClick={() => setBounds(b)}>{label}</button>
            ))}
          </div>

          <button className="sheet-done" onClick={() => s.resolveIdle(activeTask ? mins[0] : 0, activeTask ? mins[1] : mins[0] + mins[1], mins[2])}>
            Done
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 6: Mount in `App.tsx` + temporary trigger**

```tsx
import IdleSheet from "./components/IdleSheet";
import { MIN } from "./lib/time";
// inside titlebar, next to rail toggle:
<button
  className="rail-toggle"
  title="Simulate 23m idle"
  onClick={() => s.openIdleSheet({ start: Date.now() - 23 * MIN, end: Date.now() })}
>
  💤
</button>
// at end of .shell, after shell-body:
<IdleSheet />
```

- [ ] **Step 7: Append to `src/styles/app.css`**

```css
/* === idle sheet === */
.sheet-scrim {
  position: fixed; inset: 0; z-index: 40;
  background: rgba(0, 0, 0, 0.25);
  display: flex; align-items: flex-end; justify-content: center;
  padding-bottom: 48px;
}
.sheet {
  background: var(--surface);
  border-radius: var(--radius-l);
  box-shadow: var(--shadow-3);
  padding: var(--sp-5);
  width: 400px;
}
.sheet-title { font-size: 16px; font-weight: 700; letter-spacing: -0.2px; }
.sheet-sub { color: var(--ink-2); font-size: 12px; margin: var(--sp-1) 0 var(--sp-4); }
.split-bar { position: relative; display: flex; height: 44px; border-radius: var(--radius-s); overflow: visible; margin-bottom: var(--sp-3); }
.seg {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: #fff; font-size: 10px; overflow: hidden; flex-basis: 0;
  transition: flex-grow 0.18s cubic-bezier(0.3, 1.2, 0.4, 1);
}
.seg:first-child { border-radius: var(--radius-s) 0 0 var(--radius-s); }
.seg:last-child { border-radius: 0 var(--radius-s) var(--radius-s) 0; }
.seg-min { font-weight: 700; font-size: 12px; }
.seg-label { opacity: 0.85; max-width: 90%; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.seg-task { background: var(--accent); }
.seg-break { background: var(--green); }
.seg-skip { background: var(--ink-3); }
.split-handle {
  position: absolute; top: -4px; bottom: -4px; width: 12px;
  transform: translateX(-6px);
  cursor: col-resize; z-index: 2;
}
.split-handle::after {
  content: ""; position: absolute; top: 0; bottom: 0; left: 4px; width: 4px;
  background: var(--surface); border-radius: 2px;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.18);
}
.sheet-chips { display: flex; gap: var(--sp-2); margin-bottom: var(--sp-4); }
.chip { background: var(--surface-2); border: 1px solid var(--line); border-radius: 16px; padding: 4px 10px; font-size: 11px; color: var(--ink-2); }
.chip:hover { border-color: var(--accent); color: var(--accent); }
.sheet-done {
  width: 100%; background: var(--accent); color: #fff;
  border-radius: var(--radius-s); padding: var(--sp-3); font-weight: 600; font-size: 13px;
}
```

- [ ] **Step 8: Verify manually**

Run: `npm run tauri dev`
Expected: start a timer, press 💤 → sheet springs up: "away for 23 minutes"; dragging handles reflows segments with live minute counts; chips snap; Done writes blocks onto the rail (work/break/striped) and closes the sheet.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: idle split-bar sheet with tested allocation math"
```

---

### Task 10: Floating widget window (pill ⇄ card)

**Files:**
- Create: `src/widget/WidgetApp.tsx`
- Modify: `src/main.tsx`, `src/App.tsx`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, append `src/styles/app.css`

**Interfaces:**
- Consumes: Tauri event API (`emit`, `listen` from `@tauri-apps/api/event`), `WebviewWindow` (from `@tauri-apps/api/webviewWindow`).
- Produces: event `daybird://state` payload `{title:string; elapsedSec:number; estimateMin:number|null; workedMin:number; running:boolean}` (main → widget, 1/s); event `daybird://cmd` payload `{cmd:"pause"|"done"}` (widget → main). Widget window label: `"widget"`.

- [ ] **Step 1: Add widget window to `src-tauri/tauri.conf.json`**

In `app.windows` add after the main window, and enable transparency support:

```json
{
  "label": "widget",
  "url": "index.html#/widget",
  "width": 340,
  "height": 170,
  "decorations": false,
  "transparent": true,
  "alwaysOnTop": true,
  "resizable": false,
  "skipTaskbar": true,
  "visible": false,
  "shadow": false
}
```

And inside `"app"`: `"macOSPrivateApi": true`.

- [ ] **Step 2: Extend `src-tauri/capabilities/default.json`**

Ensure both windows and needed permissions:

```json
{
  "identifier": "default",
  "windows": ["main", "widget"],
  "permissions": [
    "core:default",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-start-dragging",
    "core:event:default",
    "opener:default"
  ]
}
```

(Keep any permissions the template already lists. If the dev console logs a `not allowed` permission error, add the named permission here.)

- [ ] **Step 3: Hash-route in `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import WidgetApp from "./widget/WidgetApp";
import "./styles/tokens.css";
import "./styles/app.css";

const isWidget = window.location.hash.startsWith("#/widget");
if (isWidget) document.documentElement.classList.add("widget-mode");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isWidget ? <WidgetApp /> : <App />}</React.StrictMode>
);
```

- [ ] **Step 4: Write `src/widget/WidgetApp.tsx`**

```tsx
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { emit, listen } from "@tauri-apps/api/event";
import { fmtClock } from "../lib/time";

interface WidgetState {
  title: string;
  elapsedSec: number;
  estimateMin: number | null;
  workedMin: number;
  running: boolean;
}

export default function WidgetApp() {
  const [st, setSt] = useState<WidgetState | null>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const un = listen<WidgetState>("daybird://state", (e) => setSt(e.payload));
    return () => { un.then((f) => f()); };
  }, []);

  if (!st || !st.running) return null;
  const pct = st.estimateMin ? Math.min(1, st.workedMin / st.estimateMin) : 0;

  return (
    <div className="widget-root" data-tauri-drag-region onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <motion.div layout className={`widget ${hover ? "widget-card" : "widget-pill"}`} transition={{ type: "spring", stiffness: 400, damping: 30 }} data-tauri-drag-region>
        {!hover ? (
          <>
            <span className="w-dot" />
            <span className="w-title" data-tauri-drag-region>{st.title}</span>
            <span className="w-clock">{fmtClock(st.elapsedSec)}</span>
          </>
        ) : (
          <>
            <div className="w-row" data-tauri-drag-region>
              <svg className="w-ring" viewBox="0 0 36 36" width="34" height="34">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="var(--accent)" strokeWidth="3"
                  strokeLinecap="round" strokeDasharray={`${pct * 97.4} 97.4`}
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <div>
                <div className="w-title">{st.title}</div>
                <div className="w-sub">
                  {fmtClock(st.elapsedSec)}{st.estimateMin ? ` · ${st.workedMin}m of ${st.estimateMin}m` : ""}
                </div>
              </div>
            </div>
            <div className="w-actions">
              <button onClick={() => emit("daybird://cmd", { cmd: "pause" })}>❚❚ Pause</button>
              <button className="w-done" onClick={() => emit("daybird://cmd", { cmd: "done" })}>✓ Done</button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 5: Broadcast + command handling + show/hide in `src/App.tsx`**

Add inside `App` component:

```tsx
import { useEffect } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { openEntry, workedMinToday } from "./state/selectors";

// inside App():
const active = s.tasks.find((t) => t.id === s.activeTaskId);
useEffect(() => {
  const entry = openEntry(s);
  emit("daybird://state", {
    title: active?.title ?? "",
    elapsedSec: entry ? Math.floor((now - entry.start) / 1000) : 0,
    estimateMin: active?.estimateMin ?? null,
    workedMin: active ? workedMinToday(s, active.id, now) : 0,
    running: s.activeTaskId !== null,
  });
}, [now, s.activeTaskId]);

useEffect(() => {
  const un = listen<{ cmd: string }>("daybird://cmd", (e) => {
    if (e.payload.cmd === "pause") useDaybird.getState().stopTimer();
    if (e.payload.cmd === "done" && useDaybird.getState().activeTaskId)
      useDaybird.getState().toggleDone(useDaybird.getState().activeTaskId!);
  });
  return () => { un.then((f) => f()); };
}, []);

useEffect(() => {
  (async () => {
    const w = await WebviewWindow.getByLabel("widget");
    if (!w) return;
    if (s.activeTaskId) await w.show();
    else await w.hide();
  })();
}, [s.activeTaskId]);
```

- [ ] **Step 6: Append to `src/styles/app.css`**

```css
/* === widget === */
.widget-mode, .widget-mode body { background: transparent !important; overflow: hidden; }
.widget-root { height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding-top: 8px; }
.widget {
  background: var(--surface);
  box-shadow: var(--shadow-3);
  display: flex; align-items: center; gap: var(--sp-2);
}
.widget-pill { border-radius: 24px; padding: 8px 14px 8px 10px; }
.widget-card { border-radius: var(--radius-l); padding: var(--sp-4); flex-direction: column; align-items: stretch; width: 300px; }
.w-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
@keyframes pulse { 50% { opacity: 0.4; } }
.w-title { font-size: 12.5px; font-weight: 600; max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.w-clock { color: var(--ink-2); font-size: 12px; font-variant-numeric: tabular-nums; }
.w-row { display: flex; align-items: center; gap: var(--sp-3); }
.w-sub { color: var(--ink-2); font-size: 11px; margin-top: 2px; font-variant-numeric: tabular-nums; }
.w-actions { display: flex; gap: var(--sp-2); margin-top: var(--sp-3); }
.w-actions button { flex: 1; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius-s); padding: 6px; font-size: 11px; font-weight: 600; color: var(--ink-2); }
.w-actions .w-done { background: var(--green-soft); color: var(--green); border-color: transparent; }
```

- [ ] **Step 7: Verify manually**

Run: `npm run tauri dev`
Expected: starting a timer pops a floating pill (over other apps too); hovering morphs it into the card with a live ring; Pause hides it and stops the timer in the main window; Done completes the task. Drag moves it. (Known prototype tradeoff: the transparent area around the pill still captures clicks.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: floating pill-to-card widget window with event sync"
```

---

### Task 11: Keyboard-first navigation + switcher + placeholder views (TDD matcher)

**Files:**
- Create: `src/lib/hotkeys.ts`, `src/lib/hotkeys.test.ts`, `src/components/Switcher.tsx`, `src/components/PlaceholderView.tsx`
- Modify: `src/App.tsx`, append `src/styles/app.css`

**Interfaces:**
- Consumes: store (`view/setView`, `setComposer`, selection, timers, `openIdleSheet`).
- Produces: `matchHotkey(e:{key,metaKey,ctrlKey,shiftKey,altKey}, spec:string):boolean` (specs like `"mod+1"`, `"mod+shift+i"`, `"space"`, `"x"`); `<Switcher/>`; `<PlaceholderView title hint/>`. Bindings: ⌘1–4 views, ⌘N composer, ↑/↓ select, Space start/pause selected, E complete selected, X drop selected, ⇧⌘I simulate idle, ⌘\ toggle rail.

- [ ] **Step 1: Write failing tests `src/lib/hotkeys.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { matchHotkey } from "./hotkeys";

const evt = (key: string, mods: Partial<{ meta: boolean; ctrl: boolean; shift: boolean; alt: boolean }> = {}) => ({
  key, metaKey: !!mods.meta, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt,
});

describe("matchHotkey", () => {
  test("mod matches meta or ctrl", () => {
    expect(matchHotkey(evt("1", { meta: true }), "mod+1")).toBe(true);
    expect(matchHotkey(evt("1", { ctrl: true }), "mod+1")).toBe(true);
    expect(matchHotkey(evt("1"), "mod+1")).toBe(false);
  });
  test("bare keys reject modified presses", () => {
    expect(matchHotkey(evt("e"), "e")).toBe(true);
    expect(matchHotkey(evt("e", { meta: true }), "e")).toBe(false);
  });
  test("space and shift combos", () => {
    expect(matchHotkey(evt(" "), "space")).toBe(true);
    expect(matchHotkey(evt("i", { meta: true, shift: true }), "mod+shift+i")).toBe(true);
    expect(matchHotkey(evt("i", { meta: true }), "mod+shift+i")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./hotkeys`.

- [ ] **Step 3: Implement `src/lib/hotkeys.ts`**

```ts
export interface KeyLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function matchHotkey(e: KeyLike, spec: string): boolean {
  const parts = spec.toLowerCase().split("+");
  const key = parts.pop()!;
  const wantMod = parts.includes("mod");
  const wantShift = parts.includes("shift");
  const wantAlt = parts.includes("alt");
  if ((e.metaKey || e.ctrlKey) !== wantMod) return false;
  if (e.shiftKey !== wantShift) return false;
  if (e.altKey !== wantAlt) return false;
  const k = e.key === " " ? "space" : e.key.toLowerCase();
  return k === key;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (3 new tests; full suite green).

- [ ] **Step 5: Write `src/components/Switcher.tsx` and `src/components/PlaceholderView.tsx`**

`Switcher.tsx`:

```tsx
import { motion } from "motion/react";
import { useDaybird, View } from "../state/store";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "projects", label: "Projects" },
  { id: "log", label: "Log" },
];

export default function Switcher() {
  const s = useDaybird();
  return (
    <nav className="switcher">
      {VIEWS.map((v) => (
        <button key={v.id} className={`sw-item ${s.view === v.id ? "is-on" : ""}`} onClick={() => s.setView(v.id)}>
          {s.view === v.id && <motion.span layoutId="sw-pill" className="sw-pill" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
          <span className="sw-label">{v.label}</span>
        </button>
      ))}
    </nav>
  );
}
```

`PlaceholderView.tsx`:

```tsx
export default function PlaceholderView({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="content placeholder-view">
      <h1>{title}</h1>
      <p>{hint}</p>
    </div>
  );
}
```

- [ ] **Step 6: Wire views + global hotkeys in `src/App.tsx`**

```tsx
import Switcher from "./components/Switcher";
import PlaceholderView from "./components/PlaceholderView";
import { matchHotkey } from "./lib/hotkeys";
import { todayTasks } from "./state/selectors";

// view rendering inside .shell-main:
{s.view === "today" && <TodayView now={now} />}
{s.view === "upcoming" && <PlaceholderView title="Upcoming" hint="Calendar view — designed in Phase 2." />}
{s.view === "projects" && <PlaceholderView title="Projects" hint="Designed in Phase 2." />}
{s.view === "log" && <PlaceholderView title="Log" hint="Day journal — designed in Phase 2." />}
// after </div> of shell-body:
<Switcher />

// hotkeys effect inside App():
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    const typing = (e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA";
    const st = useDaybird.getState();
    const views = ["today", "upcoming", "projects", "log"] as const;
    for (let i = 0; i < 4; i++)
      if (matchHotkey(e, `mod+${i + 1}`)) { e.preventDefault(); return st.setView(views[i]); }
    if (matchHotkey(e, "mod+n")) { e.preventDefault(); return st.setComposer(true); }
    if (matchHotkey(e, "mod+shift+i")) { e.preventDefault(); return st.openIdleSheet({ start: Date.now() - 23 * 60000, end: Date.now() }); }
    if (matchHotkey(e, "mod+\\")) { e.preventDefault(); return st.toggleRail(); }
    if (typing) return;
    const list = todayTasks(st).filter((t) => t.status === "todo");
    const idx = list.findIndex((t) => t.id === st.selectedTaskId);
    if (matchHotkey(e, "arrowdown")) { e.preventDefault(); return st.setSelected(list[Math.min(idx + 1, list.length - 1)]?.id ?? null); }
    if (matchHotkey(e, "arrowup")) { e.preventDefault(); return st.setSelected(list[Math.max(idx - 1, 0)]?.id ?? null); }
    if (st.selectedTaskId) {
      if (matchHotkey(e, "space")) { e.preventDefault(); return st.activeTaskId === st.selectedTaskId ? st.stopTimer() : st.startTimer(st.selectedTaskId); }
      if (matchHotkey(e, "e")) { e.preventDefault(); return st.toggleDone(st.selectedTaskId); }
      if (matchHotkey(e, "x")) { e.preventDefault(); return st.dropTask(st.selectedTaskId); }
    }
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

- [ ] **Step 7: Append to `src/styles/app.css`**

```css
/* === switcher === */
.switcher {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 2px; z-index: 30;
  background: color-mix(in srgb, var(--surface) 85%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--line);
  border-radius: 24px; padding: 4px;
  box-shadow: var(--shadow-2);
}
.sw-item { position: relative; padding: 6px 14px; font-size: 12px; color: var(--ink-2); border-radius: 18px; }
.sw-item.is-on { color: var(--ink); font-weight: 600; }
.sw-pill { position: absolute; inset: 0; background: var(--bg); border-radius: 18px; }
.sw-label { position: relative; z-index: 1; }
/* === placeholders === */
.placeholder-view h1 { font-size: 26px; letter-spacing: -0.4px; }
.placeholder-view p { color: var(--ink-3); font-size: 13px; margin-top: var(--sp-2); }
```

- [ ] **Step 8: Verify manually**

Run: `npm run tauri dev`
Expected: floating switcher at bottom, active pill glides between items (⌘1–4 too); ⌘N opens composer; ↑/↓ move selection ring; Space starts/pauses; E completes with the check animation; X drops; ⇧⌘I opens the idle sheet; ⌘\ toggles the rail.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: keyboard-first navigation, floating switcher, placeholder views"
```

---

### Task 12: Full verification pass

**Files:** none new.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass (time, store, rail, allocate, hotkeys — 25 tests).

- [ ] **Step 2: Run the app and walk the UX checklist**

Run: `npm run tauri dev` — verify each, in light **and** dark mode:

1. Today: header date + "~Xh left"; three seeded tasks.
2. Check a task → springy pop, drawn checkmark, strikethrough, card stays.
3. Uncheck → restores cleanly.
4. ✕ a task → mutes with ×; X key does the same for selection.
5. Overdue: hover-reveal "Today" pulls a card up with layout spring; "Add all" clears the section.
6. Start timer → blue ring card, ticking m:ss, live block growing on rail, floating pill appears over other apps.
7. Hover pill → morphs to card with progress ring; Pause/Done work and reflect in main window.
8. 💤 (or ⇧⌘I) → sheet springs up; drag handles; chips; Done writes correct blocks to rail.
9. Rail ◫ / ⌘\ collapses with spring; hour labels, striped gap, red now-line correct.
10. ⌘1–4 glide the switcher pill; ⌘N composer; ↑/↓/Space/E flow works without mouse.

- [ ] **Step 3: Fix anything broken, then commit**

```bash
git add -A
git commit -m "chore: phase 1 UX prototype verification pass"
```

---

## Out of Scope for Phase 1 (parking lot)

Real idle detection (Rust), SQLite persistence, Linear sync, Apple Calendar/EventKit, recurring tasks, snooze/Sweep/zero-state (Inbox-inspired cleanup), Upcoming calendar view, Projects/Log views, menu bar tray, onboarding/settings. Phase 2 planning starts from the spec after the UX feels right.
