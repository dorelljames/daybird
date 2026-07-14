import { useDaybird } from "../state/store";
import { DayLog, dayLogs } from "../state/selectors";
import { dayKey, fmtMin, MIN, minutesBetween } from "../lib/time";
import { Task, TimeEntry } from "../types";

function dayHeading(day: string, now: number): string {
  if (day === dayKey(now)) return "Today";
  if (day === dayKey(now - 24 * 60 * MIN)) return "Yesterday";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function DayStrip({ entries, now, tasks }: { entries: TimeEntry[]; now: number; tasks: Task[] }) {
  if (entries.length === 0) return null;
  const start = Math.min(...entries.map((e) => e.start));
  const end = Math.max(...entries.map((e) => e.end ?? now));
  const span = Math.max(end - start, 30 * MIN);
  return (
    <div className="log-strip-wrap">
      <div className="log-strip">
        {entries.map((e) => {
          const left = ((e.start - start) / span) * 100;
          const width = Math.max((((e.end ?? now) - e.start) / span) * 100, 0.6);
          const title = e.taskId ? tasks.find((t) => t.id === e.taskId)?.title ?? "Task" : e.kind === "break" ? "Break" : "Skipped";
          return (
            <div
              key={e.id}
              className={`log-blk log-${e.kind}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${title} · ${fmtMin(Math.max(1, minutesBetween(e.start, e.end ?? now)))}`}
            />
          );
        })}
      </div>
      <div className="log-strip-times">
        <span>{fmtTime(start)}</span>
        <span>{fmtTime(end)}</span>
      </div>
    </div>
  );
}

function workedOnDay(entries: TimeEntry[], taskId: string, now: number): number {
  return entries
    .filter((e) => e.taskId === taskId && e.kind === "work")
    .reduce((sum, e) => sum + minutesBetween(e.start, e.end ?? now), 0);
}

function DayCard({ d, now, tasks }: { d: DayLog; now: number; tasks: Task[] }) {
  const statParts = [];
  if (d.workMin > 0) statParts.push(`${fmtMin(d.workMin)} focused`);
  if (d.breakMin > 0) statParts.push(`${fmtMin(d.breakMin)} break`);
  if (d.estMin > 0) statParts.push(`est ${fmtMin(d.estMin)} → ${fmtMin(d.actMin)}`);

  return (
    <section className="log-day">
      <div className="log-day-head">
        <h2>{dayHeading(d.day, now)}</h2>
        <span className="log-day-stats">{statParts.join(" · ")}</span>
      </div>
      <DayStrip entries={d.entries} now={now} tasks={tasks} />
      {(d.finished.length > 0 || d.dropped.length > 0) && (
        <div className="log-tasks">
          {d.finished.map((t) => (
            <div className="log-task" key={t.id}>
              <span className="log-glyph log-glyph-done">✓</span>
              <span className="log-task-title">{t.title}</span>
              {workedOnDay(d.entries, t.id, now) > 0 && (
                <span className="log-task-min">{fmtMin(workedOnDay(d.entries, t.id, now))}</span>
              )}
            </div>
          ))}
          {d.dropped.map((t) => (
            <div className="log-task log-task-dropped" key={t.id}>
              <span className="log-glyph">×</span>
              <span className="log-task-title">{t.title}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function LogView({ now }: { now: number }) {
  const s = useDaybird();
  const logs = dayLogs(s, now);

  if (logs.length === 0) {
    return (
      <div className="content placeholder-view">
        <h1>Log</h1>
        <p>Your days collect here once you track time and finish tasks.</p>
      </div>
    );
  }

  return (
    <div className="content">
      <header className="today-head">
        <h1>Log</h1>
        <div className="today-sub">What actually happened, day by day</div>
      </header>
      {logs.map((d) => (
        <DayCard key={d.day} d={d} now={now} tasks={s.tasks} />
      ))}
    </div>
  );
}
