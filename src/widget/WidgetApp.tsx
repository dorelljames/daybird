import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { emit, listen } from "@tauri-apps/api/event";
import { fmtClock } from "../lib/time";

interface WidgetState {
  title: string;
  elapsedSec: number;
  estimateMin: number | null;
  workedMin: number;
  running: boolean;
}

const morph = { type: "spring", stiffness: 480, damping: 36 } as const;

export default function WidgetApp() {
  const [st, setSt] = useState<WidgetState | null>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const un = listen<WidgetState>("daybird://state", (e) => setSt(e.payload));
    return () => { un.then((f) => f()); };
  }, []);

  if (!st || !st.running) return null;
  const clock = fmtClock(st.elapsedSec);
  const pct = st.estimateMin ? Math.min(1, st.workedMin / st.estimateMin) : 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="widget-root" data-tauri-drag-region onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <motion.div
          layout
          className={`widget ${hover ? "widget-card" : "widget-pill"}`}
          transition={morph}
          data-tauri-drag-region
        >
          <motion.div layout className="w-head" transition={morph} data-tauri-drag-region>
            {hover ? (
              <motion.span key="ring" layoutId="w-ind" className="w-ind" transition={morph}>
                <svg viewBox="0 0 36 36" width="32" height="32">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ink-3)" strokeOpacity="0.35" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" stroke="var(--accent)" strokeWidth="3"
                    strokeLinecap="round" strokeDasharray={`${Math.max(0.02, pct) * 97.4} 97.4`}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
              </motion.span>
            ) : (
              <motion.span key="dot" layoutId="w-ind" className="w-ind w-ind-dot" transition={morph} />
            )}
            <div className="w-col">
              <motion.span layout="position" className="w-title" transition={morph}>
                {st.title}
              </motion.span>
              <AnimatePresence initial={false}>
                {hover && (
                  <motion.div
                    key="sub"
                    className="w-sub"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.06, duration: 0.14 } }}
                    exit={{ opacity: 0, transition: { duration: 0.06 } }}
                  >
                    {clock}
                    {st.estimateMin ? ` · ${st.workedMin}m of ${st.estimateMin}m` : ""}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence initial={false}>
              {!hover && (
                <motion.span
                  key="clock"
                  className="w-clock"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.05 } }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                >
                  {clock}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence initial={false}>
            {hover && (
              <motion.div
                key="actions"
                className="w-actions"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.08, duration: 0.16 } }}
                exit={{ opacity: 0, y: -2, transition: { duration: 0.08 } }}
              >
                <button onClick={() => emit("daybird://cmd", { cmd: "pause" })}>❚❚ Pause</button>
                <button className="w-done" onClick={() => emit("daybird://cmd", { cmd: "done" })}>✓ Done</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
