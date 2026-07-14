import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IdleAllocation, useDaybird } from "../state/store";
import { allocate } from "../lib/allocate";
import { dayKey, minutesBetween } from "../lib/time";
import { playResolveSound } from "../lib/celebrate";

interface Seg {
  kind: "task" | "break" | "skip";
  taskId?: string;
  newTitle?: string;
}

const TASK_COLORS = ["var(--accent)", "#5e5ce6", "#64d2ff", "#bf5af2"];

export default function IdleSheet() {
  const s = useDaybird();
  const barRef = useRef<HTMLDivElement>(null);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [pos, setPos] = useState<number[]>([]); // boundaries between segments, ascending in [0,1]
  const [dragging, setDragging] = useState(false);
  const [picker, setPicker] = useState<number | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [editedMin, setEditedMin] = useState<string | null>(null);
  const activeTask = s.tasks.find((t) => t.id === s.activeTaskId);

  // fresh layout each time the sheet opens
  useEffect(() => {
    if (!s.idleSpan) return;
    if (s.activeTaskId) {
      setSegs([{ kind: "task", taskId: s.activeTaskId }, { kind: "break" }, { kind: "skip" }]);
      setPos([0.4, 0.8]);
    } else {
      setSegs([{ kind: "break" }, { kind: "skip" }]);
      setPos([0.8]);
    }
    setEditedMin(null);
    setPicker(null);
    setDraft(null);
  }, [s.idleSpan, s.activeTaskId]);

  // Esc closes the picker first, then dismisses without writing
  useEffect(() => {
    if (!s.idleSpan) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (picker !== null) { setPicker(null); setDraft(null); }
      else s.dismissIdleSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.idleSpan, picker]);

  if (!s.idleSpan) return null;

  const spanMin = minutesBetween(s.idleSpan.start, s.idleSpan.end);
  const parsed = editedMin === null ? NaN : parseInt(editedMin, 10);
  const total = !Number.isNaN(parsed) && parsed > 0 ? Math.min(parsed, 24 * 60) : spanMin;

  const fractions = segs.map((_, i) => (i < pos.length ? pos[i] : 1) - (i > 0 ? pos[i - 1] : 0));
  const mins = allocate(total, fractions);

  const todayK = dayKey(Date.now());
  const assignable = s.tasks.filter(
    (t) => t.status === "todo" && t.scheduledFor !== undefined && t.scheduledFor <= todayK
  );

  const segTitle = (seg: Seg) =>
    seg.kind === "break" ? "Break"
    : seg.kind === "skip" ? "Skip"
    : seg.newTitle?.trim() ? seg.newTitle
    : seg.taskId ? s.tasks.find((t) => t.id === seg.taskId)?.title ?? "Pick task…"
    : "Pick task…";

  const segColor = (seg: Seg, i: number) => {
    if (seg.kind === "break") return "var(--green)";
    if (seg.kind === "skip") return "var(--ink-3)";
    const taskIdx = segs.slice(0, i).filter((x) => x.kind === "task").length;
    return TASK_COLORS[taskIdx % TASK_COLORS.length];
  };

  const isUnassigned = (seg: Seg) => seg.kind === "task" && !seg.taskId && !seg.newTitle?.trim();
  const blocked = segs.some((seg, i) => isUnassigned(seg) && mins[i] > 0);

  function dragBoundary(index: number) {
    return (e: React.PointerEvent) => {
      const bar = barRef.current!;
      const rect = bar.getBoundingClientRect();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      const move = (ev: PointerEvent) => {
        const f = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
        setPos((p) => {
          const lo = index > 0 ? p[index - 1] : 0;
          const hi = index < p.length - 1 ? p[index + 1] : 1;
          const next = [...p];
          next[index] = Math.min(hi, Math.max(lo, f));
          return next;
        });
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  function assign(i: number, patch: Partial<Seg>) {
    setSegs((xs) => xs.map((sg, j) => (j === i ? { kind: "task", ...patch } as Seg : sg)));
    setPicker(null);
    setDraft(null);
  }

  function addTaskSegment() {
    const lastStart = pos.length ? pos[pos.length - 1] : 0;
    setSegs((xs) => [...xs, { kind: "task" }]);
    setPos((p) => [...p, (lastStart + 1) / 2]);
    setPicker(segs.length);
    setDraft(null);
  }

  function removeSegment(i: number) {
    if (segs.length <= 1) return;
    setSegs((xs) => xs.filter((_, j) => j !== i));
    setPos((p) => p.filter((_, j) => j !== (i === 0 ? 0 : i - 1)));
    setPicker(null);
  }

  function resetTo(seg: Seg) {
    setSegs([seg]);
    setPos([]);
    setPicker(null);
  }

  function done() {
    if (blocked || !s.idleSpan) return;
    if (total !== spanMin) {
      s.openIdleSheet({ start: s.idleSpan.end - total * 60_000, end: s.idleSpan.end });
    }
    const allocs: IdleAllocation[] = segs.map((seg, i) => ({
      kind: seg.kind,
      taskId: seg.taskId,
      newTitle: seg.newTitle,
      min: mins[i],
    }));
    const sum = (k: Seg["kind"]) => allocs.filter((a) => a.kind === k).reduce((x, a) => x + a.min, 0);
    playResolveSound(sum("task"), sum("break"), sum("skip"));
    s.resolveIdleSegments(allocs);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="sheet-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => s.dismissIdleSheet()}
      >
        <motion.div
          className="sheet"
          onClick={(e) => e.stopPropagation()}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          <div className="sheet-title">Welcome back 👋</div>
          <div className="sheet-sub">
            You were away for
            <input
              className="sheet-min-edit"
              inputMode="numeric"
              value={editedMin ?? String(spanMin)}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setEditedMin(e.target.value.replace(/\D/g, ""))}
              title="Adjust to the real minutes you were away"
            />
            minutes — click a segment to assign it
          </div>

          <div className={`split-bar ${dragging ? "dragging" : ""}`} ref={barRef}>
            {segs.map((seg, i) => (
              <div
                key={i}
                className={`seg ${isUnassigned(seg) ? "seg-unassigned" : ""}`}
                style={{ flexGrow: Math.max(fractions[i], 0.001), background: segColor(seg, i) }}
                onClick={() => { setPicker(picker === i ? null : i); setDraft(null); }}
                title={segTitle(seg)}
              >
                {mins[i] > 0 && fractions[i] > 0.09 && (
                  <>
                    <span className="seg-min">{mins[i]}m</span>
                    <span className="seg-label">{segTitle(seg)}</span>
                  </>
                )}
              </div>
            ))}
            {pos.map((p, i) => (
              <div key={`h${i}`} className="split-handle" style={{ left: `${p * 100}%` }} onPointerDown={dragBoundary(i)} />
            ))}
          </div>

          <AnimatePresence>
            {picker !== null && segs[picker] && (
              <motion.div
                className="seg-picker"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.14 }}
              >
                <button className="menu-item" onClick={() => assign(picker, { kind: "break", taskId: undefined, newTitle: undefined })}>
                  <span className="menu-icon">☕</span>Break
                </button>
                <button className="menu-item" onClick={() => assign(picker, { kind: "skip", taskId: undefined, newTitle: undefined })}>
                  <span className="menu-icon">✕</span>Skip (don't track)
                </button>
                <div className="menu-div" />
                <div className="seg-picker-list">
                  {assignable.map((t) => (
                    <button key={t.id} className="menu-item" onClick={() => assign(picker, { kind: "task", taskId: t.id, newTitle: undefined })}>
                      <span className="menu-icon">▸</span>
                      <span className="seg-picker-title">{t.title}</span>
                    </button>
                  ))}
                </div>
                {draft === null ? (
                  <button className="menu-item" onClick={() => setDraft("")}>
                    <span className="menu-icon">✎</span>New task…
                  </button>
                ) : (
                  <input
                    className="seg-picker-new"
                    autoFocus
                    placeholder="New task title…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && draft.trim()) assign(picker, { kind: "task", newTitle: draft, taskId: undefined });
                      if (e.key === "Escape") setDraft(null);
                    }}
                  />
                )}
                {segs.length > 1 && (
                  <>
                    <div className="menu-div" />
                    <button className="menu-item menu-danger" onClick={() => removeSegment(picker)}>
                      <span className="menu-icon">–</span>Remove segment
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="sheet-chips">
            {activeTask && (
              <button className="chip" onClick={() => resetTo({ kind: "task", taskId: activeTask.id })}>All task</button>
            )}
            <button className="chip" onClick={() => resetTo({ kind: "break" })}>All break</button>
            <button className="chip" onClick={() => resetTo({ kind: "skip" })}>Skip all</button>
            <button className="chip" onClick={addTaskSegment}>＋ Task</button>
          </div>

          <button className="sheet-done" disabled={blocked} title={blocked ? "Assign the striped segment first" : undefined} onClick={done}>
            Done
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
