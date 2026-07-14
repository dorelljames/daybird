import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useDaybird } from "../state/store";
import { isNewerVersion } from "../lib/version";

const RELEASES_API = "https://api.github.com/repos/dorelljames/daybird/releases/latest";
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;

export default function UpdateBanner() {
  const s = useDaybird();
  const [update, setUpdate] = useState<{ version: string; url: string } | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let cancelled = false;
    async function check() {
      try {
        const current = await getVersion();
        const res = await fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json" } });
        if (!res.ok) return;
        const data = await res.json();
        const latest = String(data.tag_name ?? "").replace(/^v/i, "");
        if (!cancelled && latest && isNewerVersion(current, latest)) {
          setUpdate({ version: latest, url: String(data.html_url ?? "https://github.com/dorelljames/daybird/releases") });
        }
      } catch {
        // offline or rate-limited — try again next interval
      }
    }
    void check();
    const id = setInterval(() => void check(), CHECK_EVERY_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const visible = update !== null && s.dismissedUpdate !== update.version;

  return (
    <div className="update-wrap">
    <AnimatePresence>
      {visible && update && (
        <motion.div
          className="update-banner"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        >
          <span className="w-dot" />
          <span className="update-text">Daybird {update.version} is available</span>
          <button className="pill-btn" onClick={() => void openUrl(update.url)}>Download</button>
          <button className="nowbar-btn" aria-label="dismiss" onClick={() => s.dismissUpdate(update.version)}>✕</button>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}
