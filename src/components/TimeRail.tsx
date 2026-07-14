import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";
import { layoutRail } from "../lib/rail";

const DAY_START = 8;
const PX_PER_HOUR = 44;
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export default function TimeRail({ now }: { now: number }) {
  const s = useDaybird();
  const blocks = layoutRail(s.entries, DAY_START, PX_PER_HOUR, now);
  const nowTop = ((now - new Date(now).setHours(DAY_START, 0, 0, 0)) / 3_600_000) * PX_PER_HOUR;

  return (
    <AnimatePresence initial={false}>
      {s.railOpen && (
        <motion.aside
          className="rail"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 96, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
        >
          <div className="rail-inner">
            {HOURS.map((h, i) => (
              <div key={h} className="rail-hour" style={{ top: i * PX_PER_HOUR }}>
                {h <= 12 ? h : h - 12}
              </div>
            ))}
            {blocks.map((b, i) => (
              <motion.div
                key={i}
                className={`rail-block rail-${b.kind}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ top: b.top, height: Math.max(3, b.height) }}
              />
            ))}
            {nowTop > 0 && <div className="rail-now" style={{ top: nowTop }} />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
