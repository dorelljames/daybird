import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";
import { fmtMin } from "../lib/time";
import { parseDuration } from "../lib/quickadd";
import { TaskMenuState } from "./TaskMenu";

const PRESETS = [5, 10, 15, 25, 30, 45, 60, 90, 120, 180];

export default function EstimatePopover({ at, onClose }: { at: TaskMenuState | null; onClose: () => void }) {
  const s = useDaybird();
  const [custom, setCustom] = useState("");
  const task = at ? s.tasks.find((t) => t.id === at.id) : undefined;

  useEffect(() => {
    setCustom("");
  }, [at]);

  useEffect(() => {
    if (!at) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, onClose]);

  const x = at ? Math.min(at.x, window.innerWidth - 230) : 0;
  const y = at ? Math.min(at.y, window.innerHeight - 200) : 0;

  function apply(min: number | undefined) {
    if (at) s.setEstimate(at.id, min);
    onClose();
  }

  return (
    <AnimatePresence>
      {at && task && (
        <div className="menu-scrim" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
          <motion.div
            className="menu est-pop"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.08 } }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="est-grid">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  className={`chip est-chip ${task.estimateMin === m ? "is-on" : ""}`}
                  onClick={() => apply(m)}
                >
                  {fmtMin(m)}
                </button>
              ))}
            </div>
            <input
              className="seg-picker-new"
              placeholder="Custom — 1h20m"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const min = parseDuration(custom);
                  if (min) apply(min);
                }
              }}
            />
            {task.estimateMin !== undefined && (
              <button className="menu-item menu-danger" onClick={() => apply(undefined)}>
                <span className="menu-icon">✕</span>Clear estimate
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
