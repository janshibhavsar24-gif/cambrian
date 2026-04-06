import { useState, useRef, useCallback } from "react";
import type { CambrianEvent, Solution, SeedData, CombatData, CullData, EvolveData } from "../types";

export type RunStatus = "idle" | "running" | "done" | "error";

export interface LiveEvent {
  id: number;
  type: string;
  label: string;
  score?: number;
  generation?: number;
}

export function useCambrian() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const counterRef = useRef(0);

  const addEvent = useCallback((type: string, label: string, score?: number, generation?: number) => {
    setEvents(prev => [...prev, {
      id: counterRef.current++,
      type,
      label,
      score,
      generation,
    }]);
  }, []);

  const start = useCallback((problem: string, generations: number) => {
    if (wsRef.current) wsRef.current.close();

    setStatus("running");
    setEvents([]);
    setSolutions([]);
    setReportPath(null);
    setError(null);
    counterRef.current = 0;

    const ws = new WebSocket("ws://localhost:8000/ws/run");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ problem, generations }));
    };

    ws.onmessage = (msg) => {
      const event: CambrianEvent = JSON.parse(msg.data);

      if (event.type === "seed") {
        const d = event.data as unknown as SeedData;
        if (d.content) {
          addEvent("seed", `Gen ${d.generation} · ${d.phenotype}`, undefined, d.generation);
        }
      } else if (event.type === "combat") {
        const d = event.data as unknown as CombatData;
        if (d.fitness_score !== undefined) {
          addEvent("combat", `[${d.id}] scored`, d.fitness_score, d.generation);
        }
      } else if (event.type === "cull") {
        const d = event.data as unknown as CullData;
        addEvent("cull", `Gen ${d.generation}: ${d.survivors} survived, ${d.eliminated} culled`, undefined, d.generation);
      } else if (event.type === "evolve") {
        const d = event.data as unknown as EvolveData;
        addEvent("evolve", `Evolving → Gen ${d.generation} (${d.offspring} offspring)`, undefined, d.generation);
      } else if (event.type === "done") {
        const d = event.data as unknown as { top_solutions: Solution[] };
        setSolutions(d.top_solutions);
      } else if (event.type === "report") {
        const d = event.data as { path: string };
        setReportPath(d.path);
        setStatus("done");
        ws.close();
      } else if (event.type === "error") {
        const d = event.data as { message: string };
        setError(d.message);
        setStatus("error");
        ws.close();
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection failed. Is the server running?");
      setStatus("error");
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }, [addEvent]);

  const stop = useCallback(() => {
    wsRef.current?.close();
    setStatus("idle");
  }, []);

  return { status, events, solutions, reportPath, error, start, stop };
}
