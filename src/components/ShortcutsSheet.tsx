import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";

const ROWS: Array<[string[], string]> = [
  [["⌘", "1–4"], "Switch views"],
  [["⌘", "N"], "New task"],
  [["↑", "↓"], "Select task"],
  [["Space"], "Start / pause selected"],
  [["E"], "Complete selected"],
  [["X"], "Discard selected"],
  [["⌥", "hover"], "Reveal delete-forever on a task"],
  [["2×click"], "Rename a task title"],
  [["~30m"], "Trailing ~time sets the estimate (add & rename)"],
  [["⌘", "\\"], "Toggle time rail"],
  [["⇧", "⌘", "I"], "Simulate idle sheet"],
  [["?"], "This cheat sheet"],
];

export default function ShortcutsSheet() {
  const s = useDaybird();
  return (
    <AnimatePresence>
      {s.helpOpen && (
        <motion.div
          className="sheet-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => s.setHelp(false)}
        >
          <motion.div
            className="sheet help-sheet"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-title">Keyboard shortcuts</div>
            <div className="sheet-sub">Esc or click away to close</div>
            <div className="help-rows">
              {ROWS.map(([keys, label]) => (
                <div className="help-row" key={label}>
                  <span className="help-keys">
                    {keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                  <span className="help-label">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
