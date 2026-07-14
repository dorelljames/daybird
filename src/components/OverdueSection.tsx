import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";
import { overdueTasks } from "../state/selectors";
import TaskCard from "./TaskCard";

export default function OverdueSection({ now, onMenu }: { now: number; onMenu?: (id: string) => (e: React.MouseEvent) => void }) {
  const s = useDaybird();
  const overdue = overdueTasks(s, now);
  if (overdue.length === 0) return null;

  return (
    <motion.section layout className="overdue">
      <div className="overdue-head">
        <span className="overdue-label">Overdue · {overdue.length}</span>
        <button className="pill-btn" onClick={() => s.addAllOverdueToToday()}>☀️ Add all to Today</button>
      </div>
      <div className="task-list overdue-list">
        <AnimatePresence initial={false}>
          {overdue.map((t) => (
            <div className="overdue-row" key={t.id}>
              <TaskCard task={t} now={now} selected={s.selectedTaskId === t.id} onMenu={onMenu?.(t.id)} />
              <button className="pill-btn overdue-pull" onClick={() => s.addToToday(t.id)}>Today</button>
            </div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
