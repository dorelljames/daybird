import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";

export default function Composer() {
  const s = useDaybird();
  const [title, setTitle] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (s.composerOpen) ref.current?.focus(); }, [s.composerOpen]);

  // Enter adds and keeps the field open for rapid entry (Esc closes) — closing
  // on submit collapsed the composer and shifted the whole list mid-animation.
  function submit() {
    const t = title.trim();
    if (t) s.addTask(t);
    setTitle("");
    ref.current?.focus();
  }

  return (
    <AnimatePresence>
      {s.composerOpen && (
        <motion.div
          className="composer"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        >
          <input
            ref={ref}
            value={title}
            placeholder="New task…"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setTitle(""); s.setComposer(false); }
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
