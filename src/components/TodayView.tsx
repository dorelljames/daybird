import { AnimatePresence } from "motion/react";
import { useDaybird } from "../state/store";
import { estimateRemainingMin, todayTasks } from "../state/selectors";
import { fmtMin } from "../lib/time";
import TaskCard from "./TaskCard";
import Composer from "./Composer";

export default function TodayView({ now }: { now: number }) {
  const s = useDaybird();
  const tasks = todayTasks(s, now);
  const remaining = estimateRemainingMin(s, now);
  const date = new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="content">
      <header className="today-head">
        <div className="today-head-row">
          <h1>Today</h1>
          <button className="add-btn" aria-label="new task" onClick={() => s.setComposer(true)}>＋</button>
        </div>
        <div className="today-sub">
          {date}
          {remaining > 0 && <span> · ~{fmtMin(remaining)} left</span>}
        </div>
      </header>
      <Composer />
      <section className="task-list">
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} now={now} selected={s.selectedTaskId === t.id} />
          ))}
        </AnimatePresence>
      </section>
    </div>
  );
}
