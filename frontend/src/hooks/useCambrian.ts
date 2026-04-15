import { useState, useRef, useCallback } from "react";
import type { CambrianEvent, Solution, SeedData, CombatData, CullData, EvolveData, TreeData, VizNode, VizEdge, HistoryEntry } from "../types";
import { DEMO_PROBLEM, DEMO_EVENTS } from "../demo/demoData";

export type RunStatus = "idle" | "running" | "done" | "error";

export interface LiveEvent {
  id: number;
  type: string;
  label: string;
  score?: number;
  generation?: number;
}

type ReplayStep =
  | { t: "node"; node: VizNode }
  | { t: "score"; id: string; score: number }
  | { t: "edge"; edge: VizEdge }
  | { t: "survivors"; ids: string[] };

const HISTORY_KEY = "cambrian_history";
const MAX_HISTORY = 10;
const REPLAY_DELAY_MS = 200;

function saveRunToHistory(entry: HistoryEntry): void {
  try {
    const prev: HistoryEntry[] = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...prev].slice(0, MAX_HISTORY)));
    window.dispatchEvent(new CustomEvent("cambrian-history-updated"));
  } catch {}
}

export function useCambrian() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TreeData>({ nodes: [], edges: [] });
  const [isReplaying, setIsReplaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const counterRef = useRef(0);
  const pendingEdgesRef = useRef<VizEdge[]>([]);
  const replayStepsRef = useRef<ReplayStep[]>([]);
  const treeSnapshotRef = useRef<TreeData>({ nodes: [], edges: [] });
  const replayAbortRef = useRef(false);
  const demoAbortRef = useRef(false);
  const problemRef = useRef("");
  const generationsRef = useRef(3);

  const addLiveEvent = useCallback((type: string, label: string, score?: number, generation?: number) => {
    setEvents(prev => [...prev, { id: counterRef.current++, type, label, score, generation }]);
  }, []);

  const upsertNode = useCallback((patch: Partial<VizNode> & { id: string }) => {
    setTreeData(prev => {
      const existing = prev.nodes.find(n => n.id === patch.id);
      if (existing) {
        return {
          ...prev,
          nodes: prev.nodes.map(n => n.id === patch.id ? { ...n, ...patch } : n),
        };
      }
      const newNode: VizNode = {
        label: patch.label ?? "?",
        generation: patch.generation ?? 1,
        score: patch.score ?? 0,
        survived: patch.survived ?? true,
        scored: patch.scored ?? false,
        ...patch,
      };
      const flushed = pendingEdgesRef.current.filter(
        e => e.sourceId === patch.id || e.targetId === patch.id
      );
      pendingEdgesRef.current = pendingEdgesRef.current.filter(
        e => e.sourceId !== patch.id && e.targetId !== patch.id
      );
      return {
        nodes: [...prev.nodes, newNode],
        edges: flushed.length > 0 ? [...prev.edges, ...flushed] : prev.edges,
      };
    });
  }, []);

  const addEdge = useCallback((edge: VizEdge) => {
    setTreeData(prev => {
      const sourceExists = prev.nodes.some(n => n.id === edge.sourceId);
      const targetExists = prev.nodes.some(n => n.id === edge.targetId);
      if (sourceExists && targetExists) {
        return { ...prev, edges: [...prev.edges, edge] };
      }
      pendingEdgesRef.current.push(edge);
      return prev;
    });
  }, []);

  const startReplay = useCallback(async () => {
    if (isReplaying || status !== "done") return;
    replayAbortRef.current = false;
    setIsReplaying(true);
    setTreeData({ nodes: [], edges: [] });
    let nodes: VizNode[] = [];
    let edges: VizEdge[] = [];

    for (const step of replayStepsRef.current) {
      if (replayAbortRef.current) break;
      await new Promise<void>(r => setTimeout(r, REPLAY_DELAY_MS));
      if (replayAbortRef.current) break;
      if (step.t === "node") {
        nodes = [...nodes, step.node];
      } else if (step.t === "score") {
        nodes = nodes.map(n => n.id === step.id ? { ...n, score: step.score, scored: true } : n);
      } else if (step.t === "edge") {
        edges = [...edges, step.edge];
      } else if (step.t === "survivors") {
        const ids = new Set(step.ids);
        nodes = nodes.map(n => ({
          ...n,
          survived: ids.has(n.id) ? true : (n.scored ? false : n.survived),
        }));
      }
      setTreeData({ nodes, edges });
    }

    setTreeData(treeSnapshotRef.current);
    setIsReplaying(false);
  }, [isReplaying, status]);

  const pause = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ action: "pause" }));
  }, []);

  const resume = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ action: "resume" }));
  }, []);

  const startDemo = useCallback(async () => {
    if (wsRef.current) wsRef.current.close();
    replayAbortRef.current = true;
    demoAbortRef.current = false;

    problemRef.current = DEMO_PROBLEM;
    generationsRef.current = 2;
    replayStepsRef.current = [];
    treeSnapshotRef.current = { nodes: [], edges: [] };

    setStatus("running");
    setEvents([]);
    setSolutions([]);
    setReportPath(null);
    setError(null);
    setTreeData({ nodes: [], edges: [] });
    setIsPaused(false);
    setIsReplaying(false);
    pendingEdgesRef.current = [];
    counterRef.current = 0;

    for (const { delay, type, data } of DEMO_EVENTS) {
      if (demoAbortRef.current) return;
      await new Promise<void>(r => setTimeout(r, delay));
      if (demoAbortRef.current) return;

      const event = { type, data } as CambrianEvent;

      if (event.type === "seed") {
        const d = event.data as unknown as SeedData;
        addLiveEvent("seed", `Gen ${d.generation} · ${d.phenotype}`, undefined, d.generation);
        upsertNode({ id: d.id, label: d.phenotype, generation: d.generation });
        replayStepsRef.current.push({ t: "node", node: { id: d.id, label: d.phenotype, generation: d.generation, score: 0, survived: true, scored: false } });

      } else if (event.type === "combat") {
        const d = event.data as unknown as CombatData;
        addLiveEvent("combat", `[${d.id}] scored`, d.fitness_score, d.generation);
        upsertNode({ id: d.id, score: d.fitness_score, scored: true, generation: d.generation });
        replayStepsRef.current.push({ t: "score", id: d.id, score: d.fitness_score });

      } else if (event.type === "cull") {
        const d = event.data as unknown as CullData;
        addLiveEvent("cull", `Gen ${d.generation}: ${d.survivors} survived, ${d.eliminated} culled`, undefined, d.generation);

      } else if (event.type === "lineage") {
        const d = event.data as { child_id: string; parent_ids: string[]; type: string };
        const edgeType = d.type === "crossover" ? "crossover" : "mutation";
        d.parent_ids.forEach(parentId => {
          const edge: VizEdge = { sourceId: parentId, targetId: d.child_id, type: edgeType };
          addEdge(edge);
          replayStepsRef.current.push({ t: "edge", edge });
        });

      } else if (event.type === "evolve") {
        const d = event.data as unknown as EvolveData;
        addLiveEvent("evolve", `Evolving → Gen ${d.generation} (${d.offspring} offspring)`, undefined, d.generation);

      } else if (event.type === "done") {
        const d = event.data as unknown as { top_solutions: Solution[] };
        setSolutions(d.top_solutions);
        const survivorIds = new Set(d.top_solutions.map(s => s.id));
        replayStepsRef.current.push({ t: "survivors", ids: Array.from(survivorIds) });
        setTreeData(prev => {
          const finalTree = {
            ...prev,
            nodes: prev.nodes.map(n => ({
              ...n,
              survived: survivorIds.has(n.id) ? true : (n.scored ? false : n.survived),
            })),
          };
          treeSnapshotRef.current = finalTree;
          const entry: HistoryEntry = {
            id: crypto.randomUUID(),
            problem: DEMO_PROBLEM,
            timestamp: Date.now(),
            generations: 2,
            topScore: Math.max(...d.top_solutions.map(s => s.score), 0),
            solutions: d.top_solutions,
            treeData: finalTree,
          };
          saveRunToHistory(entry);
          return finalTree;
        });
        setStatus("done");
      }
    }
  }, [addLiveEvent, upsertNode, addEdge]);

  const start = useCallback((problem: string, generations: number) => {
    if (wsRef.current) wsRef.current.close();
    demoAbortRef.current = true;
    replayAbortRef.current = true;

    problemRef.current = problem;
    generationsRef.current = generations;
    replayStepsRef.current = [];
    treeSnapshotRef.current = { nodes: [], edges: [] };

    setStatus("running");
    setEvents([]);
    setSolutions([]);
    setReportPath(null);
    setError(null);
    setTreeData({ nodes: [], edges: [] });
    setIsPaused(false);
    setIsReplaying(false);
    pendingEdgesRef.current = [];
    counterRef.current = 0;

    const ws = new WebSocket("ws://localhost:8000/ws/run");
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ problem, generations }));

    ws.onmessage = (msg) => {
      const event: CambrianEvent = JSON.parse(msg.data);

      if (event.type === "seed") {
        const d = event.data as unknown as SeedData;
        if (!d.content) return;

        addLiveEvent("seed", `Gen ${d.generation} · ${d.phenotype}`, undefined, d.generation);
        upsertNode({ id: d.id, label: d.phenotype, generation: d.generation });
        replayStepsRef.current.push({
          t: "node",
          node: { id: d.id, label: d.phenotype, generation: d.generation, score: 0, survived: true, scored: false },
        });

      } else if (event.type === "combat") {
        const d = event.data as unknown as CombatData;
        if (d.fitness_score === undefined) return;

        addLiveEvent("combat", `[${d.id}] scored`, d.fitness_score, d.generation);
        upsertNode({ id: d.id, score: d.fitness_score, scored: true, generation: d.generation });
        replayStepsRef.current.push({ t: "score", id: d.id, score: d.fitness_score });

      } else if (event.type === "cull") {
        const d = event.data as unknown as CullData;
        addLiveEvent("cull", `Gen ${d.generation}: ${d.survivors} survived, ${d.eliminated} culled`, undefined, d.generation);

      } else if (event.type === "lineage") {
        const d = event.data as { child_id: string; parent_ids: string[]; type: string };
        const edgeType = d.type === "crossover" ? "crossover" : "mutation";
        d.parent_ids.forEach(parentId => {
          const edge: VizEdge = { sourceId: parentId, targetId: d.child_id, type: edgeType };
          addEdge(edge);
          replayStepsRef.current.push({ t: "edge", edge });
        });

      } else if (event.type === "evolve") {
        const d = event.data as unknown as EvolveData;
        addLiveEvent("evolve", `Evolving → Gen ${d.generation} (${d.offspring} offspring)`, undefined, d.generation);

      } else if (event.type === "paused") {
        setIsPaused(true);
        addLiveEvent("paused", `Paused after Gen ${event.data.generation as number}`);

      } else if (event.type === "resumed") {
        setIsPaused(false);
        addLiveEvent("resumed", `Resuming Gen ${event.data.generation as number}`);

      } else if (event.type === "done") {
        const d = event.data as unknown as { top_solutions: Solution[] };
        setSolutions(d.top_solutions);

        const survivorIds = new Set(d.top_solutions.map(s => s.id));
        replayStepsRef.current.push({ t: "survivors", ids: Array.from(survivorIds) });

        setTreeData(prev => {
          const finalTree = {
            ...prev,
            nodes: prev.nodes.map(n => ({
              ...n,
              survived: survivorIds.has(n.id) ? true : (n.scored ? false : n.survived),
            })),
          };
          treeSnapshotRef.current = finalTree;

          // Save to history
          const entry: HistoryEntry = {
            id: crypto.randomUUID(),
            problem: problemRef.current,
            timestamp: Date.now(),
            generations: generationsRef.current,
            topScore: Math.max(...d.top_solutions.map(s => s.score), 0),
            solutions: d.top_solutions,
            treeData: finalTree,
          };
          saveRunToHistory(entry);

          return finalTree;
        });

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

    ws.onclose = () => { wsRef.current = null; };
  }, [addLiveEvent, upsertNode, addEdge]);

  const stop = useCallback(() => {
    wsRef.current?.close();
    demoAbortRef.current = true;
    setStatus("idle");
    setIsPaused(false);
  }, []);

  return { status, events, solutions, reportPath, error, treeData, isReplaying, isPaused, start, stop, startDemo, startReplay, pause, resume };
}
