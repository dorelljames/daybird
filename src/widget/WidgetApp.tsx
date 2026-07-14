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
      <motion.div
        layout
        className={`widget ${hover ? "widget-card" : "widget-pill"}`}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        data-tauri-drag-region
      >
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
