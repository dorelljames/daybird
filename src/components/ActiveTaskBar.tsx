import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";
import { openEntry } from "../state/selectors";
import { fmtClock } from "../lib/time";
import { sfx } from "../lib/sound";

export default function ActiveTaskBar({ now }: { now: number }) {
  const s = useDaybird();
  const task = s.tasks.find((t) => t.id === s.activeTaskId);
  const entry = openEntry(s);
  const elapsedSec = entry ? Math.max(0, Math.floor((now - entry.start) / 1000)) : 0;

  function scrollToTask() {
    if (!task) return;
    document
      .querySelector(`[data-task-id="${task.id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    s.setSelected(task.id);
  }

  return (
    <div className="nowbar-wrap">
      <AnimatePresence>
        {task && entry && (
          <motion.div
            className="nowbar"
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          >
            <button className="nowbar-main" onClick={scrollToTask} title="Jump to task">
              <span className="w-dot" />
              <span className="nowbar-title">{task.title}</span>
              <span className="nowbar-clock">{fmtClock(elapsedSec)}</span>
            </button>
            <button
              className="nowbar-btn"
              aria-label="pause"
              onClick={() => { sfx.stop(); s.stopTimer(); }}
            >
              ❚❚
            </button>
            <button
              className="nowbar-btn nowbar-done"
              aria-label="done"
              onClick={() => { sfx.complete(); s.toggleDone(task.id); }}
            >
              ✓
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
