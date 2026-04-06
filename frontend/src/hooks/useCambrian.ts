import { useState, useRef, useCallback } from "react";
import type { CambrianEvent, Solution, SeedData, CombatData, CullData, EvolveData, TreeData, VizNode, VizEdge } from "../types";

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
  const [treeData, setTreeData] = useState<TreeData>({ nodes: [], edges: [] });

  const wsRef = useRef<WebSocket | null>(null);
  const counterRef = useRef(0);

  // Pending edges accumulate until the child node's seed event confirms its id
  const pendingEdgesRef = useRef<VizEdge[]>([]);

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
      // Flush any pending edges that were waiting for this node
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
      // Node not yet arrived — queue it
      pendingEdgesRef.current.push(edge);
      return prev;
    });
  }, []);

  const start = useCallback((problem: string, generations: number) => {
    if (wsRef.current) wsRef.current.close();

    setStatus("running");
    setEvents([]);
    setSolutions([]);
    setReportPath(null);
    setError(null);
    setTreeData({ nodes: [], edges: [] });
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

      } else if (event.type === "combat") {
        const d = event.data as unknown as CombatData;
        if (d.fitness_score === undefined) return;

        addLiveEvent("combat", `[${d.id}] scored`, d.fitness_score, d.generation);
        upsertNode({ id: d.id, score: d.fitness_score, scored: true });

      } else if (event.type === "cull") {
        const d = event.data as unknown as CullData;
        addLiveEvent("cull", `Gen ${d.generation}: ${d.survivors} survived, ${d.eliminated} culled`, undefined, d.generation);

      } else if (event.type === "lineage") {
        const d = event.data as { child_id: string; parent_ids: string[]; type: string };
        const edgeType = d.type === "crossover" ? "crossover" : "mutation";
        d.parent_ids.forEach(parentId => {
          addEdge({ sourceId: parentId, targetId: d.child_id, type: edgeType });
        });

      } else if (event.type === "evolve") {
        const d = event.data as unknown as EvolveData;
        addLiveEvent("evolve", `Evolving → Gen ${d.generation} (${d.offspring} offspring)`, undefined, d.generation);

      } else if (event.type === "done") {
        const d = event.data as unknown as { top_solutions: Solution[] };
        setSolutions(d.top_solutions);

        // Mark survivors
        const survivorIds = new Set(d.top_solutions.map(s => s.id));
        setTreeData(prev => ({
          ...prev,
          nodes: prev.nodes.map(n => ({
            ...n,
            survived: survivorIds.has(n.id) ? true : (n.scored ? false : n.survived),
          })),
        }));

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
    setStatus("idle");
  }, []);

  return { status, events, solutions, reportPath, error, treeData, start, stop };
}
