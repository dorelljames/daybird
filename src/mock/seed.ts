import { Project, Task, TimeEntry } from "../types";
import { atToday, dayKey, MIN } from "../lib/time";

const today = dayKey(Date.now());
const yesterday = dayKey(Date.now() - 24 * 60 * MIN);
const atYesterday = (h: number, m = 0) => atToday(h, m) - 24 * 60 * MIN;

export const seedProjects: Project[] = [
  { id: "p-personal", name: "Personal", color: "#34c759" },
  { id: "p-dorellworks", name: "DorellWorks", color: "#ff9f0a" },
  { id: "p-linear", name: "Linear", color: "#5e6ad2" },
];

export const seedTasks: Task[] = [
  { id: "t-setup", projectId: "p-dorellworks", title: "Set up Daybird", estimateMin: 60, scheduledFor: yesterday, status: "done", completedAt: atYesterday(16, 30), sortOrder: 0 },
  { id: "t-meditate", projectId: "p-personal", title: "Daily meditation", estimateMin: 15, scheduledFor: today, status: "todo", sortOrder: 1 },
  { id: "t-journal", projectId: "p-personal", title: "Daily journal", estimateMin: 15, scheduledFor: today, status: "todo", sortOrder: 2 },
  { id: "t-vwra", projectId: "p-personal", title: "Get a clear direction on consistent VWRA monthly savings", estimateMin: 55, scheduledFor: today, status: "todo", priority: "high", sortOrder: 3 },
  { id: "t-inbox", projectId: "p-dorellworks", title: "Cleanup Linear to allow managing personal projects properly", estimateMin: 60, scheduledFor: yesterday, status: "todo", sortOrder: 4 },
  { id: "t-dev-4563", projectId: "p-linear", title: "[settings & nav] Top bar: add 1px bottom border", estimateMin: 60, scheduledFor: yesterday, status: "todo", linearId: "DEV-4563", sortOrder: 5 },
  { id: "t-dev-4535", projectId: "p-linear", title: "[sell] Polish Stripe Terminal flow copy", estimateMin: 60, scheduledFor: yesterday, status: "todo", linearId: "DEV-4535", sortOrder: 6 },
];

export const seedEntries: TimeEntry[] = [
  { id: "e-y1", taskId: "t-setup", kind: "work", start: atYesterday(14, 0), end: atYesterday(15, 10) },
  { id: "e-y2", taskId: null, kind: "break", start: atYesterday(15, 10), end: atYesterday(15, 30) },
  { id: "e-y3", taskId: "t-setup", kind: "work", start: atYesterday(15, 30), end: atYesterday(16, 30) },
  { id: "e-1", taskId: "t-journal", kind: "work", start: atToday(9, 0), end: atToday(9, 50) },
  { id: "e-2", taskId: null, kind: "break", start: atToday(9, 50), end: atToday(10, 5) },
  { id: "e-3", taskId: "t-vwra", kind: "work", start: atToday(10, 5), end: atToday(10, 35) },
];
