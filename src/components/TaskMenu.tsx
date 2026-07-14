import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";
import { dayKey } from "../lib/time";
import { sfx } from "../lib/sound";
import { playCompletionSound } from "../lib/celebrate";

export interface TaskMenuState {
  id: string;
  x: number;
  y: number;
}

export default function TaskMenu({
  menu,
  onClose,
  now,
  onEstimate,
}: {
  menu: TaskMenuState | null;
  onClose: () => void;
  now: number;
  onEstimate: (at: TaskMenuState) => void;
}) {
  const s = useDaybird();
  const task = menu ? s.tasks.find((t) => t.id === menu.id) : undefined;

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, onClose]);

  const x = menu ? Math.min(menu.x, window.innerWidth - 210) : 0;
  const y = menu ? Math.min(menu.y, window.innerHeight - 290) : 0;
  const overdue = task?.scheduledFor !== undefined && task.scheduledFor < dayKey(now);

  function run(fn: () => void) {
    fn();
    onClose();
  }

  return (
    <AnimatePresence>
      {menu && task && (
        <div className="menu-scrim" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
          <motion.div
            className="menu"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.08 } }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
          >
            {task.status === "todo" && (
              <>
                <button
                  className="menu-item"
                  onClick={() => run(() => s.setPriority(task.id, task.priority === "high" ? undefined : "high"))}
                >
                  <span className="menu-icon menu-flag">⚑</span>
                  {task.priority === "high" ? "Remove from Priority" : "Move to Priority"}
                </button>
                <button
                  className="menu-item"
                  onClick={() => run(() => s.setPriority(task.id, task.priority === "later" ? undefined : "later"))}
                >
                  <span className="menu-icon">↓</span>
                  {task.priority === "later" ? "Back to the main list" : "Do later today"}
                </button>
                {overdue && (
                  <button className="menu-item" onClick={() => run(() => s.addToToday(task.id))}>
                    <span className="menu-icon">☀️</span>Add to Today
                  </button>
                )}
                <div className="menu-div" />
                <button
                  className="menu-item"
                  onClick={() =>
                    run(() => {
                      if (s.activeTaskId === task.id) { sfx.stop(); s.stopTimer(); }
                      else { sfx.start(); s.startTimer(task.id); }
                    })
                  }
                >
                  <span className="menu-icon">{s.activeTaskId === task.id ? "❚❚" : "▶"}</span>
                  {s.activeTaskId === task.id ? "Pause" : "Start"}
                </button>
                <button
                  className="menu-item"
                  onClick={() => run(() => { playCompletionSound(s, task.id, now); s.toggleDone(task.id); })}
                >
                  <span className="menu-icon">✓</span>Complete
                </button>
                <button className="menu-item" onClick={() => run(() => s.setEditing(task.id))}>
                  <span className="menu-icon">✎</span>Rename
                </button>
                <button className="menu-item" onClick={() => onEstimate(menu)}>
                  <span className="menu-icon">◔</span>Change estimate…
                </button>
                <div className="menu-div" />
                <button className="menu-item" onClick={() => run(() => s.dropTask(task.id))}>
                  <span className="menu-icon">✕</span>Discard
                </button>
              </>
            )}
            {task.status !== "todo" && (
              <button
                className="menu-item"
                onClick={() => run(() => (task.status === "done" ? s.toggleDone(task.id) : s.dropTask(task.id)))}
              >
                <span className="menu-icon">↩</span>Restore
              </button>
            )}
            <button className="menu-item menu-danger" onClick={() => run(() => s.deleteTask(task.id))}>
              <span className="menu-icon">🗑</span>Delete forever
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
