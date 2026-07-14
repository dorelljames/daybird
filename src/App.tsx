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
