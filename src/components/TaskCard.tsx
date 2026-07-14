import { useRef } from "react";
import { motion, Reorder } from "motion/react";
import { Task } from "../types";
import { useDaybird } from "../state/store";
import { workedMinToday } from "../state/selectors";
import { fmtClock, fmtMin } from "../lib/time";
import { useAltKey } from "../hooks/useAltKey";
import { sfx } from "../lib/sound";
import { playCompletionSound } from "../lib/celebrate";
import { parseQuickAdd } from "../lib/quickadd";

interface Props {
  task: Task;
  now: number;
  selected: boolean;
  reorderable?: boolean;
  onMenu?: (e: React.MouseEvent) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

export default function TaskCard({ task, now, selected, reorderable = false, onMenu, onDragStateChange }: Props) {
  const s = useDaybird();
  const alt = useAltKey();
  const editing = s.editingId === task.id;
  const editRef = useRef<HTMLInputElement>(null);
  const active = s.activeTaskId === task.id;

  function commitEdit() {
    if (editRef.current) {
      const parsed = parseQuickAdd(editRef.current.value);
      s.renameTask(task.id, parsed.title);
      if (parsed.estimateMin !== undefined) s.setEstimate(task.id, parsed.estimateMin);
    }
    s.setEditing(null);
  }
  const open = s.entries.find((e) => e.end === null && e.taskId === task.id);
  const elapsedSec = open ? Math.max(0, Math.floor((now - open.start) / 1000)) : 0;
  const worked = workedMinToday(s, task.id, now);
  const project = s.projects.find((p) => p.id === task.projectId);
  const terminal = task.status !== "todo";

  // Reorder.Item owns layout + y-transforms internally; animating y/height/layout
  // on it from outside fights its projection and stutters. Opacity only there.
  const rootProps = {
    "data-task-id": task.id,
    className: `task ${active ? "task-active" : ""} ${terminal ? `task-${task.status}` : ""} ${selected ? "task-selected" : ""}`,
    onClick: () => s.setSelected(task.id),
    onContextMenu: onMenu,
    ...(reorderable
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.15 } as const,
        }
      : {
          layout: true as const,
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, height: 0, marginBottom: -8 },
          transition: { type: "spring", stiffness: 400, damping: 30 } as const,
        }),
  };

  const inner = (
    <>
      <motion.button
        className={`task-check ${task.status === "done" ? "is-done" : ""}`}
        aria-label="complete"
        whileTap={{ scale: 0.85 }}
        animate={task.status === "done" ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        onClick={(e) => {
          e.stopPropagation();
          if (task.status !== "done") playCompletionSound(s, task.id, now);
          s.toggleDone(task.id);
        }}
      >
        {task.status === "done" && (
          <svg viewBox="0 0 12 12" width="12" height="12">
            <motion.path
              d="M2.5 6.5 L5 9 L9.5 3.5"
              fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </svg>
        )}
        {task.status === "dropped" && <span className="task-x">×</span>}
      </motion.button>

      <div className="task-body" onDoubleClick={(e) => { e.stopPropagation(); if (task.status === "todo") s.setEditing(task.id); }}>
        {editing ? (
          <input
            ref={editRef}
            className="task-edit"
            defaultValue={task.title}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") s.setEditing(null);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="task-title"><span className="task-title-text">{task.title}</span></div>
        )}
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
        {task.priority && (
          <span className={`task-flag-static ${task.priority === "high" ? "is-high" : "is-later"}`}>⚑</span>
        )}
      </div>

      <div className="task-actions">
        {task.status === "todo" && (
          <button
            className={`task-flag ${task.priority === "high" ? "is-high" : ""}`}
            title={task.priority === "high" ? "Remove from Priority" : "Move to Priority"}
            onClick={(e) => { e.stopPropagation(); s.setPriority(task.id, task.priority === "high" ? undefined : "high"); }}
          >
            ⚑
          </button>
        )}
        {task.status === "todo" && (
          <button
            className={`task-play ${active ? "is-active" : ""}`}
            aria-label={active ? "pause" : "start"}
            onClick={(e) => {
              e.stopPropagation();
              if (active) { sfx.stop(); s.stopTimer(); }
              else { sfx.start(); s.startTimer(task.id); }
            }}
          >
            {active ? "❚❚" : "▶"}
          </button>
        )}
        {alt ? (
          <button
            className="task-drop task-delete"
            aria-label="delete forever"
            title="Delete forever"
            onClick={(e) => { e.stopPropagation(); s.deleteTask(task.id); }}
          >
            🗑
          </button>
        ) : (
          task.status === "todo" && (
            <button className="task-drop" aria-label="discard" title="Discard (keep history)" onClick={(e) => { e.stopPropagation(); s.dropTask(task.id); }}>
              ✕
            </button>
          )
        )}
      </div>
    </>
  );

  return reorderable ? (
    <Reorder.Item
      value={task.id}
      dragListener={!editing}
      onDragStart={() => onDragStateChange?.(true)}
      onDragEnd={(_e, info) => {
        onDragStateChange?.(false);
        sfx.drop();
        // cross-tier drop: whichever tier section the pointer landed in wins
        const target = Array.from(document.querySelectorAll<HTMLElement>("[data-tier]")).find((n) => {
          const r = n.getBoundingClientRect();
          return info.point.x >= r.left && info.point.x <= r.right && info.point.y >= r.top && info.point.y <= r.bottom;
        })?.dataset.tier;
        if (target) {
          const priority = target === "high" ? "high" as const : target === "later" ? "later" as const : undefined;
          if (priority !== task.priority) s.setPriority(task.id, priority);
        }
      }}
      {...rootProps}
    >
      {inner}
    </Reorder.Item>
  ) : (
    <motion.div {...rootProps}>{inner}</motion.div>
  );
}
