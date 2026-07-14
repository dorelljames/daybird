import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDaybird } from "../state/store";

export default function Toast() {
  const s = useDaybird();

  useEffect(() => {
    if (!s.toast) return;
    const id = setTimeout(() => s.dismissToast(), 5000);
    return () => clearTimeout(id);
  }, [s.toast]);

  return (
    <div className="toast-wrap">
      <AnimatePresence>
        {s.toast && (
          <motion.div
            className="toast"
            initial={{ y: 16, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
          >
            <span>{s.toast.message}</span>
            {s.undoSnapshot && (
              <button className="toast-undo" onClick={() => s.undoToast()}>Undo</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
