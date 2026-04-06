import { useEffect, useRef } from "react";
import type { LiveEvent } from "../../hooks/useCambrian";
import styles from "./EventFeed.module.css";

interface Props {
  events: LiveEvent[];
}

function scoreColor(score: number): string {
  if (score >= 7) return "#16a34a";
  if (score >= 4) return "#d97706";
  return "#ef4444";
}

export function EventFeed({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className={styles.feed}>
      {events.map(e => (
        <div key={e.id} className={styles.row}>
          <span className={`${styles.badge} ${styles[e.type] ?? styles.default}`}>
            {e.type}
          </span>
          <span className={styles.label}>{e.label}</span>
          {e.score !== undefined && (
            <div className={styles.scoreBar}>
              <span className={styles.scoreValue} style={{ color: scoreColor(e.score) }}>
                {e.score.toFixed(1)}
              </span>
              <div className={styles.bar}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${(e.score / 10) * 100}%`,
                    background: scoreColor(e.score),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
