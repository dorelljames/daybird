import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";
import { allocate, fractionsFromBoundaries } from "../lib/allocate";
import { minutesBetween } from "../lib/time";
import { sfx } from "../lib/sound";

const SEGMENTS = [
  { key: "task", cls: "seg-task" },
  { key: "break", cls: "seg-break" },
  { key: "skip", cls: "seg-skip" },
] as const;

export default function IdleSheet() {
  const s = useDaybird();
  const barRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<[number, number]>([0.4, 0.8]);
  const [dragging, setDragging] = useState(false);
  const activeTask = s.tasks.find((t) => t.id === s.activeTaskId);

  // re-initialize the split each time the sheet opens; no task segment when idle hit with no timer
  useEffect(() => {
    if (s.idleSpan) setBounds(s.activeTaskId ? [0.4, 0.8] : [0, 0.8]);
  }, [s.idleSpan, s.activeTaskId]);

  if (!s.idleSpan) return null;
  const total = minutesBetween(s.idleSpan.start, s.idleSpan.end);
  const fractions = fractionsFromBoundaries(bounds[0], bounds[1]);
  const mins = allocate(total, fractions);
  const labels = [activeTask ? activeTask.title : "Task", "Break", "Skip"];

  function dragBoundary(index: 0 | 1) {
    return (e: React.PointerEvent) => {
      const bar = barRef.current!;
      const rect = bar.getBoundingClientRect();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      setDragging(true);
      const move = (ev: PointerEvent) => {
        const f = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
        setBounds(([b1, b2]) =>
          index === 0 ? [Math.min(f, b2), b2] : [b1, Math.max(f, b1)]
        );
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  const presets: Array<[string, [number, number]]> = [
    ["All task", [1, 1]],
    ["All break", [0, 1]],
    ["Skip all", [0, 0]],
    ["½ / ½", [0.5, 1]],
  ];

  return (
    <AnimatePresence>
      <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="sheet"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          <div className="sheet-title">Welcome back 👋</div>
          <div className="sheet-sub">You were away for {total} minutes</div>

          <div className={`split-bar ${dragging ? "dragging" : ""}`} ref={barRef}>
            {SEGMENTS.map((seg, i) => (
              <div key={seg.key} className={`seg ${seg.cls}`} style={{ flexGrow: Math.max(fractions[i], 0.001) }}>
                {mins[i] > 0 && fractions[i] > 0.09 && (
                  <>
                    <span className="seg-min">{mins[i]}m</span>
                    <span className="seg-label">{labels[i]}</span>
                  </>
                )}
              </div>
            ))}
            <div className="split-handle" style={{ left: `${bounds[0] * 100}%` }} onPointerDown={dragBoundary(0)} />
            <div className="split-handle" style={{ left: `${bounds[1] * 100}%` }} onPointerDown={dragBoundary(1)} />
          </div>

          <div className="sheet-chips">
            {presets.map(([label, b]) => (
              <button key={label} className="chip" onClick={() => setBounds(b)}>{label}</button>
            ))}
          </div>

          <button
            className="sheet-done"
            onClick={() => {
              sfx.resolve();
              s.resolveIdle(activeTask ? mins[0] : 0, activeTask ? mins[1] : mins[0] + mins[1], mins[2]);
            }}
          >
            Done
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
