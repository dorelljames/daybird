import { useState } from "react";
import { AnimatePresence, Reorder } from "motion/react";
import { Task } from "../types";
import { useDaybird } from "../state/store";
import { estimateRemainingMin, todayTasks } from "../state/selectors";
import { fmtMin } from "../lib/time";
import { sfx } from "../lib/sound";
import TaskCard from "./TaskCard";
import Composer from "./Composer";
import OverdueSection from "./OverdueSection";
import TaskMenu, { TaskMenuState } from "./TaskMenu";

interface TierProps {
  label?: string;
  cls?: string;
  tier: "high" | "normal" | "later";
  tasks: Task[];
  now: number;
  dragging: boolean;
  onMenu: (id: string) => (e: React.MouseEvent) => void;
  onDragStateChange: (d: boolean) => void;
}

function TierSection({ label, cls, tier, tasks, now, dragging, onMenu, onDragStateChange }: TierProps) {
  const s = useDaybird();
  if (tasks.length === 0 && !dragging) return null;
  return (
    <section className={`tier ${cls ?? ""}`} data-tier={tier}>
      {label && <div className="tier-label">{label}</div>}
      {tasks.length === 0 ? (
        <div className="tier-drop-hint">Drop here</div>
      ) : (
        <Reorder.Group
          axis="y"
          as="div"
          className="task-list"
          values={tasks.map((t) => t.id)}
          onReorder={(ids: string[]) => s.reorderToday(ids)}
        >
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                now={now}
                selected={s.selectedTaskId === t.id}
                reorderable
                onMenu={onMenu(t.id)}
                onDragStateChange={onDragStateChange}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </section>
  );
}

export default function TodayView({ now }: { now: number }) {
  const s = useDaybird();
  const [menu, setMenu] = useState<TaskMenuState | null>(null);
  const [dragging, setDragging] = useState(false);
  const tasks = todayTasks(s, now);
  const remaining = estimateRemainingMin(s, now);
  const date = new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const priority = tasks.filter((t) => t.priority === "high");
  const normal = tasks.filter((t) => t.priority === undefined);
  const later = tasks.filter((t) => t.priority === "later");

  const openMenu = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sfx.tick();
    setMenu({ id, x: e.clientX, y: e.clientY });
  };

  const tierProps = { now, dragging, onMenu: openMenu, onDragStateChange: setDragging };

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
      <TierSection label="Priority" cls="tier-priority" tier="high" tasks={priority} {...tierProps} />
      <TierSection tier="normal" tasks={normal} {...tierProps} />
      <TierSection label="Later today" cls="tier-later" tier="later" tasks={later} {...tierProps} />
      <OverdueSection now={now} onMenu={openMenu} />
      <TaskMenu menu={menu} onClose={() => setMenu(null)} now={now} />
    </div>
  );
}
