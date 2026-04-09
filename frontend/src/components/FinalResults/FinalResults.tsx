import { useState } from "react";
import type { Solution } from "../../types";
import { ReportViewer } from "../ReportViewer/ReportViewer";
import styles from "./FinalResults.module.css";

interface Props {
  solutions: Solution[];
  reportPath: string | null;
}

const RANK_CLASS = ["gold", "silver", "bronze"];

function scoreColor(score: number): string {
  if (score >= 7) return "#16a34a";
  if (score >= 4) return "#d97706";
  return "#ef4444";
}

/** Extract a 1-2 sentence TL;DR from the full solution content */
function extractTldr(content: string): string {
  // Strip markdown: headers, bold, italic, code, bullets
  const plain = content.trim()
    .replace(/^#{1,4}\s+.+$/gm, "")       // remove header lines entirely
    .replace(/\*\*(.+?)\*\*/g, "$1")       // bold
    .replace(/\*(.+?)\*/g, "$1")           // italic
    .replace(/`(.+?)`/g, "$1")             // inline code
    .replace(/^[-*]\s+/gm, "")             // bullet points
    .replace(/\n{2,}/g, " ")               // collapse blank lines
    .replace(/\n/g, " ")                   // collapse single newlines
    .trim();

  // Try to grab the first sentence (ends in . ! ?)
  const sentenceMatch = plain.match(/^(.{30,220}[.!?])\s/);
  if (sentenceMatch) return sentenceMatch[1].trim();

  // Fallback: hard cut at 160 chars at a word boundary
  if (plain.length > 160) {
    const cut = plain.slice(0, 160);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut) + "…";
  }

  return plain;
}

function SolutionCard({ sol, index }: { sol: Solution; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const tldr = extractTldr(sol.content);
  const hasMore = sol.content.trim().length > tldr.length + 5;

  return (
    <div className={`${styles.card} ${index === 0 ? styles.top : ""} ${expanded ? styles.expanded : ""}`}>
      <div className={styles.header}>
        <div className={`${styles.rank} ${styles[RANK_CLASS[index] ?? ""]}`}>
          #{index + 1}
        </div>
        <div className={styles.meta}>
          <div className={styles.lineage}>{sol.lineage}</div>
        </div>
        <div className={styles.scorePill}>
          <span className={styles.scoreNum} style={{ color: scoreColor(sol.score) }}>
            {sol.score.toFixed(1)}
          </span>
          <span className={styles.scoreLabel}>/10</span>
        </div>
      </div>

      <div className={styles.divider} />

      {!expanded && (
        <p className={styles.tldr}>{tldr}</p>
      )}

      {expanded && (
        <p className={styles.content}>{sol.content}</p>
      )}

      {hasMore && (
        <button className={styles.toggle} onClick={() => setExpanded(v => !v)}>
          {expanded ? "Show less ↑" : "Read full solution ↓"}
        </button>
      )}
    </div>
  );
}

export function FinalResults({ solutions, reportPath }: Props) {
  if (solutions.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Top Evolved Solutions</h2>
        {reportPath && (
          <p className={styles.report}>
            saved → <code>{reportPath}</code>
          </p>
        )}
      </div>

      <div className={styles.list}>
        {solutions.map((sol, i) => (
          <SolutionCard key={sol.id} sol={sol} index={i} />
        ))}
      </div>

      <ReportViewer reportPath={reportPath} />
    </div>
  );
}
