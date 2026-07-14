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
