import { DaybirdState } from "../state/store";
import { todayTasks } from "../state/selectors";
import { dayKey } from "./time";
import { sfx } from "./sound";

export type CompletionCue = { kind: "all-done" } | { kind: "step"; step: number };

// Which sound a completion deserves: each finished task today climbs one scale
// step; finishing the LAST todo of today earns the all-done arpeggio.
export function completionCue(s: DaybirdState, taskId: string, now: number): CompletionCue {
  const list = todayTasks(s, now);
  const doneCount = list.filter((t) => t.status === "done").length;
  const todosLeft = list.filter((t) => t.status === "todo").length;
  const task = s.tasks.find((t) => t.id === taskId);
  const isTodayTask = task?.scheduledFor === dayKey(now) && task.status === "todo";
  if (isTodayTask && todosLeft === 1) return { kind: "all-done" };
  return { kind: "step", step: doneCount };
}

export function playCompletionSound(s: DaybirdState, taskId: string, now: number) {
  const cue = completionCue(s, taskId, now);
  if (cue.kind === "all-done") sfx.allDone();
  else sfx.complete(cue.step);
}
