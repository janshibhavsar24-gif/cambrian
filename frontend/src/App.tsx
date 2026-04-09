import { useState } from "react";
import { useCambrian } from "./hooks/useCambrian";
import { EventFeed } from "./components/EventFeed/EventFeed";
import { FinalResults } from "./components/FinalResults/FinalResults";
import { EvolutionTree } from "./components/EvolutionTree/EvolutionTree";
import { RunHistory } from "./components/RunHistory/RunHistory";
import type { HistoryEntry } from "./types";
import styles from "./App.module.css";

const SUGGESTIONS = [
  "How do you make AI agents reliable enough to trust with real tasks?",
  "Why do most people quit learning something new after the first week?",
  "How do you stop technical debt from killing a codebase?",
  "How do you build trust between strangers on the internet?",
  "How do you make open source financially sustainable?",
  "How do you get people to actually change behaviour around something they know they should?",
];

export default function App() {
  const [problem, setProblem] = useState("");
  const [generations, setGenerations] = useState(3);
  const [showHistory, setShowHistory] = useState(false);
  const [restoredRun, setRestoredRun] = useState<HistoryEntry | null>(null);

  const { status, events, solutions, reportPath, error, treeData, isReplaying, isPaused, start, stop, startReplay, pause, resume } = useCambrian();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problem.trim()) {
      setRestoredRun(null);
      start(problem.trim(), generations);
    }
  };

  const isRunning = status === "running";
  const hasStarted = isRunning || events.length > 0;

  // When viewing a past run, overlay its data
  const displayTree = restoredRun?.treeData ?? treeData;
  const displaySolutions = restoredRun?.solutions ?? solutions;
  const displayReportPath = restoredRun ? null : reportPath;
  const displayProblem = restoredRun?.problem ?? problem;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Cambrian</h1>
        <p className={styles.tagline}>Ideas that compete, survive, and evolve</p>
        <button className={styles.historyBtn} onClick={() => setShowHistory(true)}>
          History
        </button>
      </header>

      {showHistory && (
        <RunHistory
          onSelect={(entry: HistoryEntry) => setRestoredRun(entry)}
          onClose={() => setShowHistory(false)}
        />
      )}

      <main className={styles.main}>
        {restoredRun && (
          <div className={styles.restoredBanner}>
            <span>Viewing past run: <em>{restoredRun.problem.slice(0, 60)}{restoredRun.problem.length > 60 ? "…" : ""}</em></span>
            <button className={styles.restoredBack} onClick={() => setRestoredRun(null)}>
              ← Back to current
            </button>
          </div>
        )}

        {!restoredRun && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <textarea
              className={styles.textarea}
              placeholder="What problem do you want to evolve solutions for?"
              value={problem}
              onChange={e => setProblem(e.target.value)}
              disabled={isRunning}
              rows={3}
            />

            {!hasStarted && (
              <div className={styles.suggestions}>
                <span className={styles.suggestionsLabel}>Try one of these</span>
                <div className={styles.chips}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={styles.chip}
                      onClick={() => setProblem(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.controls}>
              <label className={styles.genLabel}>
                Generations
                <select
                  className={styles.select}
                  value={generations}
                  onChange={e => setGenerations(Number(e.target.value))}
                  disabled={isRunning}
                >
                  {[1, 2, 3, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              {isRunning ? (
                <div className={styles.runningControls}>
                  {isPaused ? (
                    <button type="button" className={styles.resumeBtn} onClick={resume}>
                      ▶ Resume
                    </button>
                  ) : (
                    <button type="button" className={styles.pauseBtn} onClick={pause}>
                      ⏸ Pause
                    </button>
                  )}
                  <button type="button" className={styles.stopBtn} onClick={stop}>
                    Stop
                  </button>
                </div>
              ) : (
                <button type="submit" className={styles.runBtn} disabled={!problem.trim()}>
                  Evolve →
                </button>
              )}
            </div>
          </form>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!restoredRun && hasStarted && (
          <div className={styles.feedSection}>
            <div className={styles.feedHeader}>
              <span className={styles.feedTitle}>Live Evolution</span>
              {isRunning && !isPaused && (
                <span className={styles.pulse}>
                  <span className={styles.pulseDot} />
                  running
                </span>
              )}
              {isRunning && isPaused && (
                <span className={styles.pausedBadge}>⏸ paused</span>
              )}
              {status === "done" && <span className={styles.done}>✓ complete</span>}
            </div>
            <EventFeed events={events} />
          </div>
        )}

        <EvolutionTree
          data={displayTree}
          problem={displayProblem}
          onReplay={status === "done" && !restoredRun ? startReplay : undefined}
          isReplaying={isReplaying}
        />

        <FinalResults solutions={displaySolutions} reportPath={displayReportPath} />
      </main>
    </div>
  );
}
