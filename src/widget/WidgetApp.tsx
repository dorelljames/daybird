import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig, Transition } from "motion/react";
import { emit, listen } from "@tauri-apps/api/event";
import { fmtClock } from "../lib/time";
import { useNow } from "../hooks/useNow";

// Long titles glide to reveal their end (pause → drift → pause → back);
// short titles stay put. Fade masks replace hard clipping while moving.
function MarqueeTitle({ text }: { text: string }) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [dist, setDist] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => setDist(Math.max(0, inner.scrollWidth - outer.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [text]);

  const glide: Transition = {
    duration: Math.max(6, dist / 25 + 4),
    times: [0, 0.3, 0.7, 1],
    repeat: Infinity,
    repeatType: "reverse",
    ease: "linear",
  };

  // fades track the glide: a side only fades while text is hidden on that side
  const masks = dist > 0
    ? ({ "--fadeL": ["0px", "0px", "12px", "12px"], "--fadeR": ["12px", "12px", "0px", "0px"] } as never)
    : ({ "--fadeL": "0px", "--fadeR": "0px" } as never);

  return (
    <motion.span
      layout="position"
      ref={outerRef}
      className={`w-title w-marquee ${dist > 0 ? "is-overflow" : ""}`}
      animate={masks}
      // scope transitions: the layout morph must NOT inherit the infinite glide
      transition={{ layout: morph, "--fadeL": glide, "--fadeR": glide } as never}
    >
      <motion.span
        ref={innerRef}
        className="w-marquee-inner"
        animate={dist > 0 ? { x: [0, 0, -dist, -dist] } : { x: 0 }}
        transition={dist > 0 ? glide : undefined}
      >
        {text}
      </motion.span>
    </motion.span>
  );
}

interface WidgetState {
  title: string;
  elapsedSec: number;
  estimateMin: number | null;
  workedMin: number;
  running: boolean;
}

const morph = { type: "spring", stiffness: 480, damping: 36 } as const;

export default function WidgetApp() {
  const [snap, setSnap] = useState<{ st: WidgetState; at: number } | null>(null);
  const [hover, setHover] = useState(false);
  const now = useNow(1000);

  useEffect(() => {
    const un = listen<WidgetState>("daybird://state", (e) => setSnap({ st: e.payload, at: Date.now() }));
    return () => { un.then((f) => f()); };
  }, []);

  if (!snap) return null;
  const st = snap.st;

  // ambient idle state: shown while the main window is minimized with no timer
  if (!st.running) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="widget-root" data-tauri-drag-region>
          <button className="widget widget-pill widget-idle" title="Open Daybird" onClick={() => emit("daybird://cmd", { cmd: "open" })}>
            <span className="w-ind w-ind-dot w-dot-idle" />
            <span className="w-title w-title-idle">Not tracking</span>
          </button>
        </div>
      </MotionConfig>
    );
  }

  // self-ticking clock: the minimized main window's timers throttle, so the
  // widget extrapolates elapsed time from the last snapshot itself
  const clock = fmtClock(st.elapsedSec + Math.max(0, Math.round((now - snap.at) / 1000)));
  const pct = st.estimateMin ? Math.min(1, st.workedMin / st.estimateMin) : 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="widget-root" data-tauri-drag-region onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <motion.div
          layout
          className={`widget ${hover ? "widget-card" : "widget-pill"}`}
          transition={morph}
          data-tauri-drag-region
        >
          <motion.div layout className="w-head" transition={morph} data-tauri-drag-region>
            {hover ? (
              <motion.span key="ring" layoutId="w-ind" className="w-ind" transition={morph}>
                <svg viewBox="0 0 36 36" width="32" height="32">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ink-3)" strokeOpacity="0.35" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" stroke="var(--accent)" strokeWidth="3"
                    strokeLinecap="round" strokeDasharray={`${Math.max(0.02, pct) * 97.4} 97.4`}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
              </motion.span>
            ) : (
              <motion.span key="dot" layoutId="w-ind" className="w-ind w-ind-dot" transition={morph} />
            )}
            <div className="w-col">
              <MarqueeTitle text={st.title} />
              <AnimatePresence initial={false}>
                {hover && (
                  <motion.div
                    key="sub"
                    className="w-sub"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.06, duration: 0.14 } }}
                    exit={{ opacity: 0, transition: { duration: 0.06 } }}
                  >
                    {clock}
                    {st.estimateMin ? ` · ${st.workedMin}m of ${st.estimateMin}m` : ""}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence initial={false}>
              {!hover && (
                <motion.span
                  key="clock"
                  className="w-clock"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.05 } }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                >
                  {clock}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence initial={false}>
            {hover && (
              <motion.div
                key="actions"
                className="w-actions"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.08, duration: 0.16 } }}
                exit={{ opacity: 0, y: -2, transition: { duration: 0.08 } }}
              >
                <button onClick={() => emit("daybird://cmd", { cmd: "pause" })}>❚❚ Pause</button>
                <button className="w-done" onClick={() => emit("daybird://cmd", { cmd: "done" })}>✓ Done</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
