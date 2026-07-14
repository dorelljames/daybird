import { motion } from "motion/react";
import { useDaybird, View } from "../state/store";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "projects", label: "Projects" },
  { id: "log", label: "Log" },
];

export default function Switcher() {
  const s = useDaybird();
  return (
    <nav className="switcher">
      {VIEWS.map((v) => (
        <button key={v.id} className={`sw-item ${s.view === v.id ? "is-on" : ""}`} onClick={() => s.setView(v.id)}>
          {s.view === v.id && (
            <motion.span layoutId="sw-pill" className="sw-pill" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
          )}
          <span className="sw-label">{v.label}</span>
        </button>
      ))}
    </nav>
  );
}
