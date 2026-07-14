import { AnimatePresence, Reorder } from "motion/react";
import { Task } from "../types";
import { useDaybird } from "../state/store";
import { estimateRemainingMin, todayTasks } from "../state/selectors";
import { fmtMin } from "../lib/time";
import TaskCard from "./TaskCard";
import Composer from "./Composer";
import OverdueSection from "./OverdueSection";

function TierSection({ label, cls, tasks, now }: { label?: string; cls?: string; tasks: Task[]; now: number }) {
  const s = useDaybird();
  if (tasks.length === 0) return null;
  return (
    <section className={`tier ${cls ?? ""}`}>
      {label && <div className="tier-label">{label}</div>}
      <Reorder.Group
        axis="y"
        as="div"
        className="task-list"
        values={tasks.map((t) => t.id)}
        onReorder={(ids: string[]) => s.reorderToday(ids)}
      >
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} now={now} selected={s.selectedTaskId === t.id} reorderable />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </section>
  );
}

export default function TodayView({ now }: { now: number }) {
  const s = useDaybird();
  const tasks = todayTasks(s, now);
  const remaining = estimateRemainingMin(s, now);
  const date = new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const priority = tasks.filter((t) => t.priority === "high");
  const normal = tasks.filter((t) => t.priority === undefined);
  const later = tasks.filter((t) => t.priority === "later");

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
      <TierSection label="Priority" cls="tier-priority" tasks={priority} now={now} />
      <TierSection tasks={normal} now={now} />
      <TierSection label="Later today" cls="tier-later" tasks={later} now={now} />
      <OverdueSection now={now} />
    </div>
  );
}
