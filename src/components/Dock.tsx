import { AnimatePresence, motion } from "motion/react";
import { useDaybird, View } from "../state/store";
import { openEntry } from "../state/selectors";
import { fmtClock } from "../lib/time";
import { sfx } from "../lib/sound";
import { playCompletionSound } from "../lib/celebrate";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "projects", label: "Projects" },
  { id: "log", label: "Log" },
];

const spring = { type: "spring", stiffness: 480, damping: 38 } as const;

export default function Dock({ now }: { now: number }) {
  const s = useDaybird();
  const task = s.tasks.find((t) => t.id === s.activeTaskId);
  const entry = openEntry(s);
  const elapsedSec = entry ? Math.max(0, Math.floor((now - entry.start) / 1000)) : 0;

  function scrollToTask() {
    if (!task) return;
    s.setView("today");
    s.setSelected(task.id);
    document
      .querySelector(`[data-task-id="${task.id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="dock-wrap">
      <motion.nav layout className="dock" transition={spring}>
        <AnimatePresence initial={false} mode="popLayout">
          {task && entry && (
            <motion.div
              key="task"
              layout
              className="dock-task"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.1 } }}
              transition={spring}
            >
              <button className="nowbar-main" onClick={scrollToTask} title="Jump to task">
                <span className="w-dot" />
                <span className="nowbar-title">{task.title}</span>
                <span className="nowbar-clock">{fmtClock(elapsedSec)}</span>
              </button>
              <button className="nowbar-btn" aria-label="pause" onClick={() => { sfx.stop(); s.stopTimer(); }}>
                ❚❚
              </button>
              <button
                className="nowbar-btn nowbar-done"
                aria-label="done"
                onClick={() => { playCompletionSound(s, task.id, now); s.toggleDone(task.id); }}
              >
                ✓
              </button>
              <span className="dock-div" />
            </motion.div>
          )}
        </AnimatePresence>
        {VIEWS.map((v) => (
          <button key={v.id} className={`sw-item ${s.view === v.id ? "is-on" : ""}`} onClick={() => s.setView(v.id)}>
            {s.view === v.id && (
              <motion.span layoutId="sw-pill" className="sw-pill" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
            )}
            <span className="sw-label">{v.label}</span>
          </button>
        ))}
      </motion.nav>
    </div>
  );
}
