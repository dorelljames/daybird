export type TaskStatus = "todo" | "done" | "dropped";
export type EntryKind = "work" | "break" | "discarded";
export type Priority = "high" | "later";

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  estimateMin?: number;
  scheduledFor?: string; // local YYYY-MM-DD
  status: TaskStatus;
  priority?: Priority; // undefined = normal tier
  completedAt?: number;
  linearId?: string; // e.g. "DEV-4563"
  sortOrder: number;
}

export interface TimeEntry {
  id: string;
  taskId: string | null; // null = break/untracked
  kind: EntryKind;
  start: number; // epoch ms
  end: number | null; // null = running
}
