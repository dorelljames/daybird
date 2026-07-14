import { useEffect } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { emit, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useNow } from "./hooks/useNow";
import TodayView from "./components/TodayView";
import TimeRail from "./components/TimeRail";
import IdleSheet from "./components/IdleSheet";
import Toast from "./components/Toast";
import Dock from "./components/Dock";
import PlaceholderView from "./components/PlaceholderView";
import { useDaybird, View } from "./state/store";
import { openEntry, todayTasks, workedMinToday } from "./state/selectors";
import { MIN } from "./lib/time";
import { setSoundEnabled, sfx } from "./lib/sound";
import { playCompletionSound } from "./lib/celebrate";
import { matchHotkey } from "./lib/hotkeys";

const VIEW_ORDER: View[] = ["today", "upcoming", "projects", "log"];

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
      title: active?.title ?? "",
      elapsedSec: entry ? Math.max(0, Math.floor((now - entry.start) / 1000)) : 0,
      estimateMin: active?.estimateMin ?? null,
      workedMin: active ? workedMinToday(s, active.id, now) : 0,
      running: s.activeTaskId !== null,
    });
  }, [now, s.activeTaskId]);

  // widget commands come back as events
  useEffect(() => {
    const un = listen<{ cmd: string }>("daybird://cmd", (e) => {
      const st = useDaybird.getState();
      if (e.payload.cmd === "pause") {
        sfx.stop();
        st.stopTimer();
      }
      if (e.payload.cmd === "done" && st.activeTaskId) {
        playCompletionSound(st, st.activeTaskId, Date.now());
        st.toggleDone(st.activeTaskId);
      }
    });
    return () => { un.then((f) => f()); };
  }, []);

  // widget window follows the timer
  useEffect(() => {
    void (async () => {
      const w = await WebviewWindow.getByLabel("widget");
      if (!w) return;
      if (s.activeTaskId) await w.show();
      else await w.hide();
    })();
  }, [s.activeTaskId]);

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
      for (let i = 0; i < VIEW_ORDER.length; i++) {
        if (matchHotkey(e, `mod+${i + 1}`)) { e.preventDefault(); return st.setView(VIEW_ORDER[i]); }
      }
      if (matchHotkey(e, "mod+n")) { e.preventDefault(); st.setView("today"); return st.setComposer(true); }
      if (matchHotkey(e, "mod+shift+i")) { e.preventDefault(); return st.openIdleSheet({ start: Date.now() - 23 * MIN, end: Date.now() }); }
      if (matchHotkey(e, "mod+\\")) { e.preventDefault(); return st.toggleRail(); }

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
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
        <button
          className="rail-toggle"
          title="Simulate 23m idle (⇧⌘I)"
          onClick={() => s.openIdleSheet({ start: Date.now() - 23 * MIN, end: Date.now() })}
        >
          💤
        </button>
        <button
          className="rail-toggle"
          title={s.soundOn ? "Mute sounds" : "Unmute sounds"}
          onClick={() => s.toggleSound()}
        >
          {s.soundOn ? "🔊" : "🔇"}
        </button>
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
              {s.view === "log" && (
                <PlaceholderView title="Log" hint="The truthful journal of your days — finished, dropped, and tracked time. Lands in Phase 2." />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <TimeRail now={now} />
      </div>
      <Dock now={now} />
      <IdleSheet />
      <Toast />
    </div>
    </MotionConfig>
  );
}
