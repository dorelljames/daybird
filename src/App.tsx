import { useNow } from "./hooks/useNow";
import TodayView from "./components/TodayView";
import TimeRail from "./components/TimeRail";
import IdleSheet from "./components/IdleSheet";
import { useDaybird } from "./state/store";
import { MIN } from "./lib/time";

export default function App() {
  const now = useNow(1000);
  const s = useDaybird();
  return (
    <div className="shell">
      <div className="titlebar" data-tauri-drag-region>
        <button
          className="rail-toggle"
          title="Simulate 23m idle"
          onClick={() => s.openIdleSheet({ start: Date.now() - 23 * MIN, end: Date.now() })}
        >
          💤
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
    </div>
  );
}
