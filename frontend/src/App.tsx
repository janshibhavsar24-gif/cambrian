import { useState } from "react";
import { useCambrian } from "./hooks/useCambrian";
import { EventFeed } from "./components/EventFeed/EventFeed";
import { FinalResults } from "./components/FinalResults/FinalResults";
import { EvolutionTree } from "./components/EvolutionTree/EvolutionTree";
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
  const { status, events, solutions, reportPath, error, treeData, start, stop } = useCambrian();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problem.trim()) start(problem.trim(), generations);
  };

  const isRunning = status === "running";
  const hasStarted = isRunning || events.length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Cambrian</h1>
        <p className={styles.tagline}>Ideas that compete, survive, and evolve</p>
      </header>

      <main className={styles.main}>
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
              <button type="button" className={styles.stopBtn} onClick={stop}>
                Stop
              </button>
            ) : (
              <button type="submit" className={styles.runBtn} disabled={!problem.trim()}>
                Evolve →
              </button>
            )}
          </div>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        {hasStarted && (
          <div className={styles.feedSection}>
            <div className={styles.feedHeader}>
              <span className={styles.feedTitle}>Live Evolution</span>
              {isRunning && (
                <span className={styles.pulse}>
                  <span className={styles.pulseDot} />
                  running
                </span>
              )}
              {status === "done" && <span className={styles.done}>✓ complete</span>}
            </div>
            <EventFeed events={events} />
          </div>
        )}

        <EvolutionTree data={treeData} problem={problem} />

        <FinalResults solutions={solutions} reportPath={reportPath} />
      </main>
    </div>
  );
}
