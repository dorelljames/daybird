import { motion } from "motion/react";
import { Task } from "../types";
import { useDaybird } from "../state/store";
import { workedMinToday } from "../state/selectors";
import { fmtClock, fmtMin } from "../lib/time";

export default function TaskCard({ task, now, selected }: { task: Task; now: number; selected: boolean }) {
  const s = useDaybird();
  const active = s.activeTaskId === task.id;
  const open = s.entries.find((e) => e.end === null && e.taskId === task.id);
  const elapsedSec = open ? Math.floor((now - open.start) / 1000) : 0;
  const worked = workedMinToday(s, task.id, now);
  const project = s.projects.find((p) => p.id === task.projectId);
  const terminal = task.status !== "todo";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`task ${active ? "task-active" : ""} ${terminal ? `task-${task.status}` : ""} ${selected ? "task-selected" : ""}`}
      onClick={() => s.setSelected(task.id)}
    >
      <button
        className={`task-check ${task.status === "done" ? "is-done" : ""}`}
        aria-label="complete"
        onClick={(e) => { e.stopPropagation(); s.toggleDone(task.id); }}
      >
        {task.status === "done" && (
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path d="M2.5 6.5 L5 9 L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {task.status === "dropped" && <span className="task-x">×</span>}
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          {project && <span className="task-dot" style={{ background: project.color }} />}
          {task.linearId && <span className="task-linear">{task.linearId}</span>}
          {project && <span>{project.name}</span>}
        </div>
      </div>

      <div className="task-right">
        {active ? (
          <span className="task-clock">{fmtClock(elapsedSec)}</span>
        ) : (
          task.estimateMin !== undefined && (
            <span className="task-est">{worked > 0 ? `${fmtMin(worked)} / ` : ""}{fmtMin(task.estimateMin)}</span>
          )
        )}
        {task.status === "todo" && (
          <button
            className={`task-play ${active ? "is-active" : ""}`}
            aria-label={active ? "pause" : "start"}
            onClick={(e) => { e.stopPropagation(); active ? s.stopTimer() : s.startTimer(task.id); }}
          >
            {active ? "❚❚" : "▶"}
          </button>
        )}
        {task.status === "todo" && (
          <button className="task-drop" aria-label="discard" onClick={(e) => { e.stopPropagation(); s.dropTask(task.id); }}>
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}
