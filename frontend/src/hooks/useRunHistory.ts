import { useState, useEffect, useCallback } from "react";
import type { HistoryEntry } from "../types";

const HISTORY_KEY = "cambrian_history";

function load(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useRunHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(load);

  useEffect(() => {
    const handler = () => setHistory(load());
    window.addEventListener("cambrian-history-updated", handler);
    return () => window.removeEventListener("cambrian-history-updated", handler);
  }, []);

  const remove = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(e => e.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { history, remove };
}
