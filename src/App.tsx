import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { emit, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useNow } from "./hooks/useNow";
import TodayView from "./components/TodayView";
import TimeRail from "./components/TimeRail";
import IdleSheet from "./components/IdleSheet";
import ActiveTaskBar from "./components/ActiveTaskBar";
import Toast from "./components/Toast";
import { useDaybird } from "./state/store";
import { openEntry, workedMinToday } from "./state/selectors";
import { MIN } from "./lib/time";
import { setSoundEnabled, sfx } from "./lib/sound";
import { playCompletionSound } from "./lib/celebrate";

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

  return (
    <MotionConfig reducedMotion="user">
    <div className="shell">
      <div className="titlebar" data-tauri-drag-region>
        <button
          className="rail-toggle"
          title="Simulate 23m idle"
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
        <button className="rail-toggle" onClick={() => s.toggleRail()} aria-label="toggle time rail">◫</button>
      </div>
      <div className="shell-body">
        <main className="shell-main">
          <TodayView now={now} />
        </main>
        <TimeRail now={now} />
      </div>
      <IdleSheet />
      <ActiveTaskBar now={now} />
      <Toast />
    </div>
    </MotionConfig>
  );
}
