import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { useNow } from "./hooks/useNow";
import TodayView from "./components/TodayView";
import TimeRail from "./components/TimeRail";
import IdleSheet from "./components/IdleSheet";
import ActiveTaskBar from "./components/ActiveTaskBar";
import Toast from "./components/Toast";
import { useDaybird } from "./state/store";
import { MIN } from "./lib/time";
import { setSoundEnabled, sfx } from "./lib/sound";

export default function App() {
  const now = useNow(1000);
  const s = useDaybird();

  useEffect(() => {
    setSoundEnabled(s.soundOn);
  }, [s.soundOn]);

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
