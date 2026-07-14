import { useEffect } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { emit, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNow } from "./hooks/useNow";
import TodayView from "./components/TodayView";
import TimeRail from "./components/TimeRail";
import IdleSheet from "./components/IdleSheet";
import Toast from "./components/Toast";
import Dock from "./components/Dock";
import LogView from "./components/LogView";
import PlaceholderView from "./components/PlaceholderView";
import ShortcutsSheet from "./components/ShortcutsSheet";
import UpdateBanner from "./components/UpdateBanner";
import { useDaybird, View } from "./state/store";
import { openEntry, todayTasks, workedMinToday } from "./state/selectors";
import { dayKey, MIN } from "./lib/time";
import { setSoundEnabled, sfx } from "./lib/sound";
import { playCompletionSound } from "./lib/celebrate";
import { matchHotkey } from "./lib/hotkeys";

const VIEW_ORDER: View[] = ["today", "upcoming", "projects", "log"];

// Manual "log time away": span defaults to the gap since the last tracked
// moment today (that's when you actually left), clamped to sane bounds; the
// sheet's minutes stay editable either way. Real idle detection is Phase 2.
function openAwaySheet() {
  const st = useDaybird.getState();
  const now = Date.now();
  const today = dayKey(now);
  const lastEnd = Math.max(0, ...st.entries.filter((e) => e.end !== null && dayKey(e.start) === today).map((e) => e.end!));
  const gap = now - lastEnd;
  const start = lastEnd > 0 && gap > 1 * MIN && gap < 12 * 60 * MIN ? lastEnd : now - 30 * MIN;
  st.openIdleSheet({ start, end: now });
}

// Widget shows only when the app can't be seen: main window minimized or
// unfocused. While you're in the app it stays out of the way entirely.
// Dedupe show/hide: calling show() on macOS re-orders the window, and doing
// that every tick disrupts whatever the user is in.
let widgetShown: boolean | null = null;
async function syncWidgetVisibility() {
  try {
    const main = getCurrentWindow();
    const [minimized, focused] = await Promise.all([main.isMinimized(), main.isFocused()]);
    const shouldShow = minimized || !focused;
    if (shouldShow === widgetShown) return;
    const w = await WebviewWindow.getByLabel("widget");
    if (!w) return;
    if (shouldShow) await w.show();
    else await w.hide();
    widgetShown = shouldShow;
  } catch {
    widgetShown = null; // window APIs unavailable outside Tauri
  }
}

export default function App() {
  const now = useNow(1000);
  const s = useDaybird();
  const active = s.tasks.find((t) => t.id === s.activeTaskId);

  useEffect(() => {
    setSoundEnabled(s.soundOn);
  }, [s.soundOn]);

  // broadcast timer state to the widget window
  useEffect(() => {
    const entry = openEntry(s);
    void emit("daybird://state", {
      taskId: active?.id ?? null,
      title: active?.title ?? "",
      elapsedSec: entry ? Math.max(0, Math.floor((now - entry.start) / 1000)) : 0,
      estimateMin: active?.estimateMin ?? null,
      workedMin: active ? workedMinToday(s, active.id, now) : 0,
      running: s.activeTaskId !== null,
    });
  }, [now, s.activeTaskId]);

  // widget commands come back as events; acting from the widget surfaces the
  // app and reveals the task it was about
  useEffect(() => {
    const bringToFront = () => {
      const main = getCurrentWindow();
      void main.unminimize().then(() => main.setFocus());
    };
    const reveal = (id: string | null) => {
      bringToFront();
      if (!id) return;
      const st = useDaybird.getState();
      st.setView("today");
      st.setSelected(id);
      setTimeout(() => {
        document.querySelector(`[data-task-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    };
    const un = listen<{ cmd: string; taskId?: string | null }>("daybird://cmd", (e) => {
      const st = useDaybird.getState();
      if (e.payload.cmd === "pause") {
        const id = st.activeTaskId;
        sfx.stop();
        st.stopTimer();
        reveal(id);
      }
      if (e.payload.cmd === "done" && st.activeTaskId) {
        const id = st.activeTaskId;
        playCompletionSound(st, id, Date.now());
        st.toggleDone(id);
        reveal(id);
      }
      if (e.payload.cmd === "open") bringToFront();
      if (e.payload.cmd === "open-task") reveal(e.payload.taskId ?? null);
    });
    return () => { un.then((f) => f()); };
  }, []);

  // widget visibility: every tick as backstop, focus changes for instant response
  useEffect(() => {
    void syncWidgetVisibility();
  }, [now, s.activeTaskId]);

  useEffect(() => {
    let un: (() => void) | undefined;
    void getCurrentWindow()
      .onFocusChanged(() => void syncWidgetVisibility())
      .then((f) => { un = f; });
    return () => un?.();
  }, []);

  // near-inaudible key tick on any button press
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest?.("button")) sfx.tick();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  // keyboard-first navigation
  useEffect(() => {
    function select(st: ReturnType<typeof useDaybird.getState>, id: string | null) {
      st.setSelected(id);
      if (id) {
        document.querySelector(`[data-task-id="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
    function onKey(e: KeyboardEvent) {
      const st = useDaybird.getState();
      if (st.helpOpen && e.key === "Escape") { e.preventDefault(); return st.setHelp(false); }
      if (matchHotkey(e, "mod+/")) { e.preventDefault(); return st.setHelp(!st.helpOpen); }
      for (let i = 0; i < VIEW_ORDER.length; i++) {
        if (matchHotkey(e, `mod+${i + 1}`)) { e.preventDefault(); return st.setView(VIEW_ORDER[i]); }
      }
      if (matchHotkey(e, "mod+n")) { e.preventDefault(); st.setView("today"); return st.setComposer(true); }
      if (matchHotkey(e, "mod+shift+i")) { e.preventDefault(); return openAwaySheet(); }
      if (matchHotkey(e, "mod+\\")) { e.preventDefault(); return st.toggleRail(); }

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (matchHotkey(e, "shift+?")) { e.preventDefault(); return st.setHelp(!st.helpOpen); }
      if (st.view !== "today") return;

      const list = todayTasks(st).filter((t) => t.status === "todo");
      const idx = list.findIndex((t) => t.id === st.selectedTaskId);
      if (matchHotkey(e, "arrowdown")) { e.preventDefault(); return select(st, list[Math.min(idx + 1, list.length - 1)]?.id ?? null); }
      if (matchHotkey(e, "arrowup")) { e.preventDefault(); return select(st, list[Math.max(idx - 1, 0)]?.id ?? null); }
      if (!st.selectedTaskId) return;

      if (matchHotkey(e, "space")) {
        e.preventDefault();
        if (st.activeTaskId === st.selectedTaskId) { sfx.stop(); return st.stopTimer(); }
        sfx.start();
        return st.startTimer(st.selectedTaskId);
      }
      if (matchHotkey(e, "e")) {
        e.preventDefault();
        const task = st.tasks.find((t) => t.id === st.selectedTaskId);
        if (task?.status !== "done") playCompletionSound(st, st.selectedTaskId, Date.now());
        return st.toggleDone(st.selectedTaskId);
      }
      if (matchHotkey(e, "x")) { e.preventDefault(); return st.dropTask(st.selectedTaskId); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className="shell">
      <div className="titlebar" data-tauri-drag-region>
        {import.meta.env.DEV && (
          <button
            className="rail-toggle"
            title="Reset demo data (dev builds only)"
            onClick={() => { localStorage.removeItem("daybird-v1"); location.reload(); }}
          >
            ⟲
          </button>
        )}
        <button className="rail-toggle" title="Log time away (⇧⌘I)" onClick={() => openAwaySheet()}>
          💤
        </button>
        <button
          className="rail-toggle"
          title={s.soundOn ? "Mute sounds" : "Unmute sounds"}
          onClick={() => s.toggleSound()}
        >
          {s.soundOn ? "🔊" : "🔇"}
        </button>
        <button className="rail-toggle" title="Keyboard shortcuts (?)" onClick={() => s.setHelp(!s.helpOpen)}>?</button>
        <button className="rail-toggle" title="Toggle time rail (⌘\)" onClick={() => s.toggleRail()}>◫</button>
      </div>
      <div className="shell-body">
        <main className="shell-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={s.view}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              {s.view === "today" && <TodayView now={now} />}
              {s.view === "upcoming" && (
                <PlaceholderView title="Upcoming" hint="Scheduled tasks and your real calendar, one glance ahead. Lands in Phase 2." />
              )}
              {s.view === "projects" && (
                <PlaceholderView title="Projects" hint="Project spaces land in Phase 2." />
              )}
              {s.view === "log" && <LogView now={now} />}
            </motion.div>
          </AnimatePresence>
        </main>
        <TimeRail now={now} />
      </div>
      <Dock now={now} />
      <IdleSheet />
      <ShortcutsSheet />
      <UpdateBanner />
      <Toast />
    </div>
    </MotionConfig>
  );
}
