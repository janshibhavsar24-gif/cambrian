import type { HistoryEntry } from "../../types";
import { useRunHistory } from "../../hooks/useRunHistory";
import styles from "./RunHistory.module.css";

interface Props {
  onSelect: (entry: HistoryEntry) => void;
  onClose: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function RunHistory({ onSelect, onClose }: Props) {
  const { history, remove } = useRunHistory();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Run History</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {history.length === 0 ? (
          <div className={styles.empty}>No past runs yet. Complete a run to see it here.</div>
        ) : (
          <div className={styles.list}>
            {history.map(entry => (
              <div key={entry.id} className={styles.entry}>
                <div className={styles.entryMain}>
                  <p className={styles.problem}>{entry.problem}</p>
                  <div className={styles.meta}>
                    <span>{formatDate(entry.timestamp)}</span>
                    <span className={styles.dot}>·</span>
                    <span>{entry.generations} gen{entry.generations !== 1 ? "s" : ""}</span>
                    <span className={styles.dot}>·</span>
                    <span className={styles.score}>top {entry.topScore.toFixed(1)}</span>
                  </div>
                </div>
                <div className={styles.entryActions}>
                  <button className={styles.viewBtn} onClick={() => { onSelect(entry); onClose(); }}>
                    View →
                  </button>
                  <button className={styles.deleteBtn} onClick={() => remove(entry.id)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
